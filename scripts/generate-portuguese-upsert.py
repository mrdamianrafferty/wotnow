#!/usr/bin/env python3
"""
Generate SQL upsert statements for Portuguese translations only
Uses name_pt column naming format
"""

import csv

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    if not s:
        return None
    return s.replace("'", "''")

def main():
    csv_path = '/Users/damianrafferty/Projects/WotNow/data/translations-needed-pt.csv'

    print("-- SQL Upsert for Portuguese Translations")
    print("-- Generated from translations-needed-pt.csv")
    print("-- Updates Portuguese names (name_pt) for species in the database")
    print("-- Matches species by species_code\n")

    print("-- Add Portuguese column if it doesn't exist")
    print("ALTER TABLE species ADD COLUMN IF NOT EXISTS name_pt TEXT;\n")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            species_code = row['Species Code'].strip()
            common_name = escape_sql_string(row['English Name'].strip())

            # Get Portuguese translation
            pt = row['Portuguese Name'].strip() or None

            # Skip if no Portuguese translation
            if not pt:
                continue

            print(f"-- {common_name}")
            print(f"UPDATE species")
            print(f"SET")
            print(f"  name_pt = '{escape_sql_string(pt)}'")
            print(f"WHERE species_code = '{species_code}';")
            print()

if __name__ == '__main__':
    main()
