#!/usr/bin/env python3
import csv
import os
import time
import requests
from pathlib import Path
from typing import Optional

IUCN_BASE_URL = "https://apiv3.iucnredlist.org/api/v3"
IUCN_TOKEN = os.getenv("IUCN_API_TOKEN")

INPUT_CSV = Path("species_meta_rows-iucn.csv")
OUTPUT_CSV = Path("species_meta_rows-iucn.filled.csv")

CATEGORY_MAP = {
    "LC": "LC",
    "Least Concern": "LC",
    "NT": "NT",
    "Near Threatened": "NT",
    "VU": "VU",
    "Vulnerable": "VU",
    "EN": "EN",
    "Endangered": "EN",
    "CR": "CR",
    "Critically Endangered": "CR",
    "DD": "DD",
    "Data Deficient": "DD",
    "NE": "NE",
    "Not Evaluated": "NE",
}


def normalise_category(category: Optional[str]) -> Optional[str]:
    if not category:
        return None
    cat = category.strip()
    return CATEGORY_MAP.get(cat, None)


def lookup_iucn_status(scientific_name: str) -> Optional[str]:
    if not IUCN_TOKEN:
        print("⚠️  No IUCN_API_TOKEN set; skipping live lookups.")
        return None

    params = {"token": IUCN_TOKEN}
    url = f"{IUCN_BASE_URL}/species/{requests.utils.quote(scientific_name)}"

    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            print(f"⚠️  IUCN lookup failed for '{scientific_name}': {resp.status_code}")
            return None

        data = resp.json()
        results = data.get("result") or []
        if not results:
            print(f"❓ No IUCN result for '{scientific_name}'")
            return None

        category_raw = results[0].get("category")
        code = normalise_category(category_raw)
        if code:
            print(f"✅ {scientific_name} → IUCN '{category_raw}' → '{code}'")
        else:
            print(f"❓ Could not normalise category '{category_raw}' for '{scientific_name}'")
        return code
    except Exception as e:
        print(f"⚠️  Error looking up '{scientific_name}': {e}")
        return None


def main():
    if not INPUT_CSV.exists():
        raise SystemExit(f"Input CSV not found: {INPUT_CSV}")

    rows = []
    with INPUT_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        fieldnames = reader.fieldnames or []
        if "scientific_name" not in fieldnames:
            raise SystemExit("CSV must contain a 'scientific_name' column.")
        if "conservation_status" not in fieldnames:
            raise SystemExit("CSV must contain a 'conservation_status' column.")
        for row in reader:
            rows.append(row)

    for row in rows:
        sci = (row.get("scientific_name") or "").strip()
        status = (row.get("conservation_status") or "").strip()

        if not sci or status:
            continue

        code = lookup_iucn_status(sci)
        if code:
            row["conservation_status"] = code

        time.sleep(0.5)

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys(), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    print(f"✅ Finished. Wrote updated file to: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()#!/usr/bin/env python3
import csv
import os
import time
import requests
from pathlib import Path
from typing import Optional

IUCN_BASE_URL = "https://apiv3.iucnredlist.org/api/v3"
IUCN_TOKEN = os.getenv("IUCN_API_TOKEN")

INPUT_CSV = Path("species_meta_rows-iucn.csv")
OUTPUT_CSV = Path("species_meta_rows-iucn.filled.csv")

CATEGORY_MAP = {
    "LC": "LC",
    "Least Concern": "LC",
    "NT": "NT",
    "Near Threatened": "NT",
    "VU": "VU",
    "Vulnerable": "VU",
    "EN": "EN",
    "Endangered": "EN",
    "CR": "CR",
    "Critically Endangered": "CR",
    "DD": "DD",
    "Data Deficient": "DD",
    "NE": "NE",
    "Not Evaluated": "NE",
}


def normalise_category(category: Optional[str]) -> Optional[str]:
    if not category:
        return None
    cat = category.strip()
    return CATEGORY_MAP.get(cat, None)


def lookup_iucn_status(scientific_name: str) -> Optional[str]:
    if not IUCN_TOKEN:
        print("⚠️  No IUCN_API_TOKEN set; skipping live lookups.")
        return None

    params = {"token": IUCN_TOKEN}
    url = f"{IUCN_BASE_URL}/species/{requests.utils.quote(scientific_name)}"

    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            print(f"⚠️  IUCN lookup failed for '{scientific_name}': {resp.status_code}")
            return None

        data = resp.json()
        results = data.get("result") or []
        if not results:
            print(f"❓ No IUCN result for '{scientific_name}'")
            return None

        category_raw = results[0].get("category")
        code = normalise_category(category_raw)
        if code:
            print(f"✅ {scientific_name} → IUCN '{category_raw}' → '{code}'")
        else:
            print(f"❓ Could not normalise category '{category_raw}' for '{scientific_name}'")
        return code
    except Exception as e:
        print(f"⚠️  Error looking up '{scientific_name}': {e}")
        return None


def main():
    if not INPUT_CSV.exists():
        raise SystemExit(f"Input CSV not found: {INPUT_CSV}")

    rows = []
    with INPUT_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        fieldnames = reader.fieldnames or []
        if "scientific_name" not in fieldnames:
            raise SystemExit("CSV must contain a 'scientific_name' column.")
        if "conservation_status" not in fieldnames:
            raise SystemExit("CSV must contain a 'conservation_status' column.")
        for row in reader:
            rows.append(row)

    for row in rows:
        sci = (row.get("scientific_name") or "").strip()
        status = (row.get("conservation_status") or "").strip()

        if not sci or status:
            continue

        code = lookup_iucn_status(sci)
        if code:
            row["conservation_status"] = code

        time.sleep(0.5)  # be polite

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys(), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    print(f"✅ Finished. Wrote updated file to: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
