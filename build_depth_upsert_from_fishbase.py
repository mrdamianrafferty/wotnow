#!/usr/bin/env python3
# build_depth_upsert_from_fishbase.py
# Reads FishBase/WoRMS/OBIS-enriched depth CSV or Parquet and emits a Postgres UPSERT
# that updates species.environmental_preferences->'depth' (optimal_min/max, min/max, source).

import argparse, sys, os, json
from pathlib import Path

def load_df(path):
    import pandas as pd
    p = Path(path).expanduser()
    if not p.exists():
        sys.exit(f"ERROR: file not found: {p}")
    if p.suffix.lower() in (".csv", ".tsv"):
        df = pd.read_csv(p)
    elif p.suffix.lower() in (".parquet", ".pq"):
        try:
            df = pd.read_parquet(p, engine="pyarrow")
        except Exception:
            # fallback to duckdb if available
            try:
                import duckdb
                df = duckdb.connect().execute("SELECT * FROM read_parquet(?)", [str(p)]).df()
            except Exception as e:
                sys.exit("ERROR: cannot read parquet. Install pyarrow or duckdb.")
    else:
        sys.exit("ERROR: input must be .csv or .parquet")
    return df

def sql_quote(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parquet", help="Path to species_depth_enriched.parquet")
    ap.add_argument("--csv", help="Path to species_depth_enriched.csv")
    ap.add_argument("--out", required=True, help="Output SQL file")
    args = ap.parse_args()

    src = args.csv or args.parquet
    if not src:
        sys.exit("Provide either --csv or --parquet")

    df = load_df(src)

    required = ["scientific_name","opt_min","opt_max","min_depth","max_depth","depth_source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        sys.exit(f"ERROR: input missing columns: {missing}\nHave: {list(df.columns)}")

    # Keep only needed columns & drop rows with missing sci name
    df = df[required].copy()
    df = df[df["scientific_name"].notna()]

    # Build VALUES rows; environmental_preferences value contains only {depth: {...}}
    values_sql = []
    for _, r in df.iterrows():
        sci = sql_quote(r["scientific_name"])
        def num(x):
            try:
                return "NULL" if x is None or (isinstance(x, float) and (x!=x)) else str(float(x))
            except Exception:
                return "NULL"
        depth_obj = {
            "optimal_min": None if r["opt_min"]!=r["opt_min"] else float(r["opt_min"]),
            "optimal_max": None if r["opt_max"]!=r["opt_max"] else float(r["opt_max"]),
            "min": None if r["min_depth"]!=r["min_depth"] else float(r["min_depth"]),
            "max": None if r["max_depth"]!=r["max_depth"] else float(r["max_depth"]),
            "source": None if r["depth_source"]!=r["depth_source"] else str(r["depth_source"]),
        }
        depth_json = sql_quote(json.dumps({"depth": depth_obj}))
        values_sql.append(f"({sci}, {depth_json})")

    sql = f"""\
BEGIN;

-- Upsert depth environmental preferences onto species
-- NOTE: EXCLUDED.environmental_preferences contains only the 'depth' key
INSERT INTO public.species (scientific_name, environmental_preferences)
VALUES
{",\n".join(values_sql)}
ON CONFLICT (scientific_name)
DO UPDATE SET
  environmental_preferences = jsonb_set(
    COALESCE(public.species.environmental_preferences, '{{}}'::jsonb),
    '{{depth}}',
    EXCLUDED.environmental_preferences->'depth',
    true
  );

COMMIT;
"""
    out = Path(args.out).expanduser()
    out.write_text(sql)
    print(f"Wrote {out} with {len(values_sql)} rows.")

if __name__ == "__main__":
    main()