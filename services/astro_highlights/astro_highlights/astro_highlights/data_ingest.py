
import json, csv, pathlib
BASE = pathlib.Path(__file__).resolve().parent.parent / 'data'
def load_meteor_showers(year:int):
    p = BASE / f'imo_showers_{year}_min.json'
    if not p.exists(): p = BASE / 'imo_showers_2025_min.json'
    return json.loads(p.read_text())
def load_eclipses(kind:str):
    fname = 'eclipses_solar_sample.csv' if kind=='solar' else 'eclipses_lunar_sample.csv'
    import csv
    rows=[]; 
    with open(BASE / fname, 'r', encoding='utf-8') as f:
        for r in csv.DictReader(f): rows.append(r)
    return rows
