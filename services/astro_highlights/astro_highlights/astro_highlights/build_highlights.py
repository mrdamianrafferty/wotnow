from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import date as date_cls, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

from .compute import load_ephemerides, sun_moon_times, detect_special_events


# -----------------------------------------------------------------------------
# Types
# -----------------------------------------------------------------------------

class Eclipse(TypedDict, total=False):
    type: str          # 'solar' | 'lunar' (or provider-specific)
    date_utc: str      # ISO UTC timestamp, e.g. '2026-08-12T18:00:00Z'
    subtype: str       # e.g. 'total', 'partial', 'annular', 'penumbral'
    notes: str         # free text


@dataclass
class Highlights:
    nights: List[Dict[str, Any]]
    eclipses: List[Eclipse]


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def _as_utc(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def filter_eclipses(rows: List[Dict[str, str]], centre_utc: datetime, window_days: int = 14) -> List[Eclipse]:
    """
    Keep eclipse rows with 'date_utc' within +/- window_days of centre_utc (timezone safe).
    Accepts rows from CSV/JSON with at least a 'date_utc' field.
    """
    out: List[Eclipse] = []
    base = _as_utc(centre_utc)
    lo = base - timedelta(days=window_days)
    hi = base + timedelta(days=window_days)

    for r in rows:
        raw = (r.get("date_utc") or "").strip()
        if not raw:
            continue
        try:
            # Accept 'Z' or offset forms
            t = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            t = _as_utc(t)
        except Exception:
            continue

        if lo <= t <= hi:
            out.append({
                "type": r.get("type", ""),
                "date_utc": raw if raw.endswith("Z") else t.isoformat().replace("+00:00", "Z"),
                "subtype": r.get("subtype", ""),
                "notes": r.get("notes", "")
            })

    return out


def read_rows_from_path(p: Optional[str]) -> List[Dict[str, str]]:
    """
    Load eclipse rows from a file path (CSV or JSON). Returns [] if path is None or missing.
    CSV must have headers including date_utc (recommended: type, subtype, notes too).
    JSON may be an array of objects with those keys.
    """
    if not p:
        return []
    path = Path(p)
    if not path.exists():
        return []
    try:
        if path.suffix.lower() == ".csv":
            with path.open("r", encoding="utf-8") as f:
                return list(csv.DictReader(f))
        else:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return [x for x in data if isinstance(x, dict)]
            # Allow {"rows":[...]}, {"data":[...]} shapes
            if isinstance(data, dict):
                for key in ("rows", "data", "eclipses"):
                    if isinstance(data.get(key), list):
                        return [x for x in data[key] if isinstance(x, dict)]
            return []
    except Exception:
        return []


# -----------------------------------------------------------------------------
# Core
# -----------------------------------------------------------------------------

def build_highlights(
    lat: float,
    lon: float,
    date_str: Optional[str],
    days: int,
    solar_path: Optional[str] = None,
    lunar_path: Optional[str] = None,
    eclipse_window_days: int = 400
) -> Highlights:
    """
    Build astronomical highlights:
      • nights[]: per-day Sun/Moon times (astronomical dark, moon rise/set, phase/illumination)
      • eclipses[]: optional filtered list if solar/lunar catalogues are provided

    Args:
      lat, lon: observer location
      date_str: 'YYYY-MM-DD' (interpreted as UTC calendar date). If None, uses today's UTC date.
      days: number of days to generate (>=1)
      solar_path: optional path to solar eclipses CSV/JSON
      lunar_path: optional path to lunar eclipses CSV/JSON
      eclipse_window_days: ±day window around the centre date for filtering eclipses
    """
    if date_str:
        y, m, d = [int(x) for x in date_str.split("-")]
        start_d = date_cls(y, m, d)
    else:
        start_d = datetime.now(timezone.utc).date()

    ephe = load_ephemerides()  # must expose ephe.eph and ephe.ts

    nights: List[Dict[str, Any]] = []
    for i in range(max(1, int(days))):
        day_d = start_d + timedelta(days=i)
        sun, moon = sun_moon_times(lat, lon, day_d, ephe.eph, ephe.ts)
        nights.append({
            "date": day_d.isoformat(),
            "sun": sun,          # expects keys like astro_dark_start/astro_dark_end (UTC ISO)
            "moon": moon,        # includes rise/set events, phase, illumination
            "dark_sky": None,    # placeholder you can fill in later (Bortle/LP map score)
            "cloud_score": None  # placeholder for cloud rating if you integrate forecast
        })

    eclipses: List[Eclipse] = []
    if solar_path or lunar_path:
        # Use centre of the window (start date + half span) to filter a big range sensibly
        centre_dt = _as_utc(datetime.combine(start_d, datetime.min.time(), tzinfo=timezone.utc)) + timedelta(days=max(1, days) // 2)
        solar_rows = read_rows_from_path(solar_path)
        lunar_rows = read_rows_from_path(lunar_path)
        if solar_rows:
            eclipses.extend(filter_eclipses(solar_rows, centre_dt, eclipse_window_days))
        if lunar_rows:
            eclipses.extend(filter_eclipses(lunar_rows, centre_dt, eclipse_window_days))

        # Sort by time ascending
        def _key(e: Eclipse) -> float:
            try:
                t = datetime.fromisoformat(e["date_utc"].replace("Z", "+00:00"))
                return _as_utc(t).timestamp()
            except Exception:
                return float("inf")
        eclipses.sort(key=_key)

    return Highlights(nights=nights, eclipses=eclipses)


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------

def main() -> None:
    p = argparse.ArgumentParser(description="Build astronomical highlights JSON")
    p.add_argument("--lat", type=float, required=True, help="Latitude (deg)")
    p.add_argument("--lon", type=float, required=True, help="Longitude (deg)")
    p.add_argument("--date", type=str, default=None, help="UTC date YYYY-MM-DD (default: today UTC)")
    p.add_argument("--days", type=int, default=1, help="Number of days to include (default: 1)")
    p.add_argument("--out", type=str, default="highlights.json", help="Output JSON path")
    p.add_argument("--solar", type=str, default=None, help="Optional path to solar eclipses CSV/JSON")
    p.add_argument("--lunar", type=str, default=None, help="Optional path to lunar eclipses CSV/JSON")
    p.add_argument("--eclipse-window-days", type=int, default=400, help="±days filtering window (default: 400)")
    args = p.parse_args()

    h = build_highlights(
        lat=args.lat,
        lon=args.lon,
        date_str=args.date,
        days=args.days,
        solar_path=args.solar,
        lunar_path=args.lunar,
        eclipse_window_days=args.eclipse_window_days,
    )

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"nights": h.nights, "eclipses": h.eclipses}, f, indent=2)
    print(f"✓ Wrote {args.out}")


if __name__ == "__main__":
    main()
