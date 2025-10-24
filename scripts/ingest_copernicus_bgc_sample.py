#!/usr/bin/env python3
"""Prototype: fetch one-day surface subset from Copernicus BGC ARCO Zarrs,
regrid to 0.25deg NOAA grid, compute diagnostics, and write a NetCDF sample.

This script is intentionally defensive: it probes available variables in each
ARCO product and only processes variables that exist.

Run: python3 scripts/ingest_copernicus_bgc_sample.py
"""
from __future__ import annotations
import sys
import math
import numpy as np
import xarray as xr
import fsspec
import os
import base64
from pathlib import Path


PRODUCTS = {
    "pft": {
        "url": "https://s3.waw3-1.cloudferro.com/mdl-arco-time-006/arco/GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m_202311/timeChunked.zarr",
        "want": ["chl", "phyc", "nppv"],
    },
    "bio": {
        "url": "https://s3.waw3-1.cloudferro.com/mdl-arco-time-006/arco/GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m_202311/timeChunked.zarr",
        "want": ["o2"],
    },
    "nut": {
        "url": "https://s3.waw3-1.cloudferro.com/mdl-arco-time-006/arco/GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-nut_anfc_0.25deg_P1D-m_202311/timeChunked.zarr",
        "want": ["no3", "po4", "si", "fe"],
    },
    "optics": {
        "url": "https://s3.waw3-1.cloudferro.com/mdl-arco-time-006/arco/GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-optics_anfc_0.25deg_P1D-m_202311/timeChunked.zarr",
        "want": ["kd"],
    },
}

DESIRED = [v for p in PRODUCTS.values() for v in p["want"]]


def open_zarr(url: str) -> xr.Dataset:
    print(f"Opening Zarr: {url}")
    # If a local directory is provided via env, prefer local NetCDF files (one-per-product)
    local_dir = os.environ.get("COPERNICUS_LOCAL_DIR")
    sample_date = os.environ.get("COPERNICUS_SAMPLE_DATE")
    if local_dir and sample_date:
        # map known product keywords to filenames
        if "pft" in url:
            candidate = os.path.join(local_dir, f"cmems_pft_{sample_date}.nc")
        elif "bio" in url and "bgc-bio" in url:
            candidate = os.path.join(local_dir, f"cmems_bio_{sample_date}.nc")
        elif "nut" in url:
            candidate = os.path.join(local_dir, f"cmems_nut_{sample_date}.nc")
        elif "optics" in url:
            candidate = os.path.join(local_dir, f"cmems_optics_{sample_date}.nc")
        else:
            candidate = None
        if candidate and os.path.exists(candidate):
            print(f"Found local file for product: {candidate}")
            return xr.open_dataset(candidate)

    # First try anonymous open
    try:
        mapper = fsspec.get_mapper(url)
        ds = xr.open_zarr(mapper, consolidated=True)
        return ds
    except Exception as e:
        # If access denied and Copernicus credentials are available, try HTTP auth
        msg = str(e)
        if "403" in msg or "Forbidden" in msg or os.environ.get("COPERNICUS_USERNAME"):
            user = os.environ.get("COPERNICUS_USERNAME")
            pwd = os.environ.get("COPERNICUS_PASSWORD")
            if user and pwd:
                print("Anonymous access failed; trying HTTP basic auth with COPERNICUS credentials (from env)")
                auth_raw = f"{user}:{pwd}".encode("utf-8")
                auth_b64 = base64.b64encode(auth_raw).decode("ascii")
                headers = {"Authorization": f"Basic {auth_b64}"}
                try:
                    fs = fsspec.filesystem("https", headers=headers)
                    mapper = fs.get_mapper(url)
                    ds = xr.open_zarr(mapper, consolidated=True)
                    return ds
                except Exception as e2:
                    print("Authenticated attempt failed:", e2)
        # re-raise original
        raise


def find_coord_names(ds: xr.Dataset):
    # Returns names for lat/lon/time/elevation coords used in this dataset
    lat = None
    lon = None
    elev = None
    time = None
    for c in ds.coords:
        nc = c.lower()
        if nc in ("lat", "latitude"):
            lat = c
        if nc in ("lon", "longitude"):
            lon = c
        if nc in ("elevation", "depth"):
            elev = c
        if nc == "time":
            time = c
    return lat, lon, elev, time


def select_surface(ds: xr.Dataset, elev_name: str) -> xr.Dataset:
    elev = ds[elev_name].values
    # choose index with value closest to zero (surface)
    idx = int(np.argmin(np.abs(elev - 0)))
    print(f"Selecting elevation index {idx} (value {elev[idx]}) as surface")
    return ds.isel({elev_name: idx})


def build_target_grid():
    # NOAA grid_025deg centers: lon -180..179.75 step 0.25; lat -80..89.75 step 0.25
    lons = np.arange(-180.0, 180.0, 0.25)
    lats = np.arange(-80.0, 90.0, 0.25)
    return lons, lats


def regrid_da(da: xr.DataArray, lat_name: str, lon_name: str, target_lats, target_lons):
    # xarray interp expects named coords; create new coords if needed
    kwargs = {}
    if lat_name in da.coords:
        kwargs[lat_name] = target_lats
    else:
        # try common names
        if "latitude" in da.coords:
            kwargs["latitude"] = target_lats
        elif "lat" in da.coords:
            kwargs["lat"] = target_lats
    if lon_name in da.coords:
        kwargs[lon_name] = target_lons
    else:
        if "longitude" in da.coords:
            kwargs["longitude"] = target_lons
        elif "lon" in da.coords:
            kwargs["lon"] = target_lons

    # xarray.DataArray.interp accepts kwargs like latitude=..., longitude=...
    print(f"Regridding {da.name} to target grid ({len(target_lats)} x {len(target_lons)})")
    try:
        regr = da.interp(**kwargs, method="linear")
    except Exception as e:
        print("Linear interp failed, trying nearest:\n", e)
        regr = da.interp(**kwargs, method="nearest")
    return regr


def summarize_da(da: xr.DataArray):
    arr = da.values
    valid = np.isfinite(arr)
    count = int(np.sum(valid))
    total = int(arr.size)
    pct = 100.0 * count / total if total else 0.0
    mn = float(np.nanmean(arr)) if count else math.nan
    mx = float(np.nanmax(arr)) if count else math.nan
    std = float(np.nanstd(arr)) if count else math.nan
    return {
        "count": count,
        "total": total,
        "coverage_pct": pct,
        "mean": mn,
        "min": mx if count else math.nan,
        "max": mx,
        "std": std,
    }


def main():
    out_vars = {}
    diagnostics = {}
    target_lons, target_lats = build_target_grid()

    for name, meta in PRODUCTS.items():
        url = meta["url"]
        try:
            ds = open_zarr(url)
        except Exception as e:
            print(f"Failed to open {name} at {url}: {e}")
            continue

        lat_name, lon_name, elev_name, time_name = find_coord_names(ds)
        if time_name is None or lat_name is None or lon_name is None:
            print(f"Missing expected coords in {name}: lat={lat_name} lon={lon_name} time={time_name}")
            continue

        want = meta["want"]
        found = [v for v in want if v in ds.data_vars]
        if not found:
            print(f"No desired variables found in {name}; available: {list(ds.data_vars)}")
            continue

        ds_surface = select_surface(ds, elev_name)

        # choose a single time: use last available time (recent)
        t_idx = -1
        try:
            da_time = ds_surface[time_name].isel({time_name: t_idx}).values
            # format date
            import pandas as pd

            t_str = pd.to_datetime(int(da_time)).strftime("%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            # fallback: use first
            t_idx = 0
            da_time = ds_surface[time_name].isel({time_name: t_idx}).values
            t_str = str(da_time)

        print(f"Processing product {name} time index {t_idx} => {t_str}")

        for var in found:
            try:
                da = ds_surface[var].isel({time_name: t_idx})
                # ensure name set
                da.name = var
                regr = regrid_da(da, lat_name, lon_name, target_lats, target_lons)
                diagnostics[var] = summarize_da(regr)
                out_vars[var] = regr
            except Exception as e:
                print(f"Failed to process variable {var} in {name}: {e}")

    if not out_vars:
        print("No variables processed; exiting.")
        sys.exit(2)

    # combine into dataset and save
    xr_ds = xr.Dataset()
    for var, da in out_vars.items():
        # rename dims to standard lat/lon names
        da = da.rename({"latitude": "lat", "longitude": "lon"}) if "latitude" in da.dims else da
        xr_ds[var] = da

    # attach coordinates
    xr_ds = xr_ds.assign_coords({"lon": ("lon", target_lons), "lat": ("lat", target_lats)})

    out_dir = Path("./tmp_copernicus_sample")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"copernicus_bgc_sample_{t_str.replace(':','')}.nc"
    print(f"Writing sample NetCDF to {out_path}")
    xr_ds.to_netcdf(out_path)

    print("\nDiagnostics summary:")
    for v, d in diagnostics.items():
        print(f"- {v}: coverage {d['coverage_pct']:.2f}% ({d['count']}/{d['total']}), mean={d['mean']:.4g}, std={d['std']:.4g}")


if __name__ == "__main__":
    main()
