#!/usr/bin/env python3
"""
Best-effort fetch using Copernicus Marine Toolbox API for CI.

This script attempts to use the `copernicusmarine` Python package to open
datasets remotely and write out NetCDFs for the four BGC product families
we use (pft, bio, nut, optics). It's intentionally tolerant: if the
toolbox is unavailable or a product can't be fetched the script will
exit non-zero only if no files were created.

Usage: set environment variable SAMPLE_DATE (YYYYMMDD) or COPERNICUS_SAMPLE_DATE
and run. Files will be written into ./data/copernicus/ with names:
  cmems_pft_<DATE>.nc, cmems_bio_<DATE>.nc, cmems_nut_<DATE>.nc, cmems_optics_<DATE>.nc

This is used by the GitHub Actions workflow as a best-effort path.
"""
import os
import sys
import datetime


def get_sample_date():
    for name in ("SAMPLE_DATE", "COPERNICUS_SAMPLE_DATE"):
        v = os.environ.get(name)
        if v:
            return v
    # default to yesterday UTC
    return (datetime.datetime.utcnow() - datetime.timedelta(days=1)).strftime("%Y%m%d")


def main():
    try:
        import copernicusmarine
    except Exception as e:
        print("copernicusmarine not installed or import failed:", e)
        sys.exit(1)

    sample_date = get_sample_date()
    start_dt = f"{sample_date} 00:00:00"
    end_dt = f"{sample_date} 00:00:00"

    out_dir = os.path.join(".", "data", "copernicus")
    os.makedirs(out_dir, exist_ok=True)

    products = [
        {
            "key": "pft",
            "dataset_id": "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m_202311",
            "variables": ["chl", "phyc", "nppv"],
            "out": f"cmems_pft_{sample_date}.nc",
        },
        {
            "key": "bio",
            "dataset_id": "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m_202311",
            "variables": ["o2"],
            "out": f"cmems_bio_{sample_date}.nc",
        },
        {
            "key": "nut",
            "dataset_id": "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1D-m_202311",
            "variables": ["no3", "po4", "si", "fe"],
            "out": f"cmems_nut_{sample_date}.nc",
        },
        {
            "key": "optics",
            "dataset_id": "cmems_mod_glo_bgc-optics_anfc_0.25deg_P1D-m_202311",
            "variables": ["kd"],
            "out": f"cmems_optics_{sample_date}.nc",
        },
    ]

    created = []
    for p in products:
        out_path = os.path.join(out_dir, p["out"])
        if os.path.exists(out_path):
            print(f"Skipping {p['key']}: {out_path} already exists")
            created.append(out_path)
            continue

        try:
            print(f"Fetching product {p['dataset_id']} variables={p['variables']} for {sample_date}")
            ds = copernicusmarine.open_dataset(
                dataset_id=p["dataset_id"],
                minimum_longitude=-180,
                maximum_longitude=180,
                minimum_latitude=-80,
                maximum_latitude=90,
                start_datetime=start_dt,
                end_datetime=end_dt,
                variables=p["variables"],
            )
            if ds is None:
                print(f"Toolbox returned None for {p['dataset_id']}")
                continue

            print(f"Writing {out_path} (this may take a moment)")
            ds.to_netcdf(out_path)
            created.append(out_path)
        except Exception as e:
            print(f"Failed to fetch/write {p['key']} ({p['dataset_id']}): {e}")

    if not created:
        print("No files were created by the Copernicus Marine Toolbox path.")
        sys.exit(1)

    print("Created files:\n" + "\n".join(created))
    sys.exit(0)


if __name__ == "__main__":
    main()
