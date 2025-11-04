#!/usr/bin/env python3
"""
Generate SQL upsert statements for French translations only
Uses name_fr column naming format
"""

import csv

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    if not s:
        return None
    return s.replace("'", "''")

def main():
    csv_path = '/Users/damianrafferty/Projects/WotNow/data/translations-needed-fr.csv'

    print("-- SQL Upsert for French Translations")
    print("-- Generated from translations-needed-fr.csv")
    print("-- Updates French names (name_fr) for species in the database")
    print("-- Matches species by species_code\n")

    print("-- Add French column if it doesn't exist")
    print("ALTER TABLE species ADD COLUMN IF NOT EXISTS name_fr TEXT;\n")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            species_code = row['Species Code'].strip()
            common_name = escape_sql_string(row['English Name'].strip())

            # Get French translation
            fr = row['French Name'].strip() or None

            # Skip if no French translation
            if not fr:
                continue

            print(f"-- {common_name}")
            print(f"UPDATE species")
            print(f"SET")
            print(f"  name_fr = '{escape_sql_string(fr)}'")
            print(f"WHERE species_code = '{species_code}';")
            print()

if __name__ == '__main__':
    main()
