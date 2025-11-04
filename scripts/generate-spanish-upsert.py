#!/usr/bin/env python3
"""
Generate SQL upsert statements for Spanish translations only
Uses name_es column naming format
"""

import csv

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    if not s:
        return None
    return s.replace("'", "''")

def main():
    csv_path = '/Users/damianrafferty/Projects/WotNow/data/translations-needed-es.csv'

    print("-- SQL Upsert for Spanish Translations")
    print("-- Generated from translations-needed-es.csv")
    print("-- Updates Spanish names (name_es) for species in the database")
    print("-- Matches species by species_code\n")

    print("-- Add Spanish column if it doesn't exist")
    print("ALTER TABLE species ADD COLUMN IF NOT EXISTS name_es TEXT;\n")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            species_code = row['Species Code'].strip()
            common_name = escape_sql_string(row['English Name'].strip())

            # Get Spanish translation
            es = row['Spanish Name'].strip() or None

            # Skip if no Spanish translation
            if not es:
                continue

            print(f"-- {common_name}")
            print(f"UPDATE species")
            print(f"SET")
            print(f"  name_es = '{escape_sql_string(es)}'")
            print(f"WHERE species_code = '{species_code}';")
            print()

if __name__ == '__main__':
    main()
