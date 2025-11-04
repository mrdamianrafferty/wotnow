#!/usr/bin/env python3
"""
Generate SQL upsert statements for German translations only
Uses name_de column naming format
"""

import csv

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    if not s:
        return None
    return s.replace("'", "''")

def main():
    csv_path = '/Users/damianrafferty/Projects/WotNow/data/translations-needed-de.csv'

    print("-- SQL Upsert for German Translations")
    print("-- Generated from translations-needed-de.csv")
    print("-- Updates German names (name_de) for species in the database")
    print("-- Matches species by species_code\n")

    print("-- Add German column if it doesn't exist")
    print("ALTER TABLE species ADD COLUMN IF NOT EXISTS name_de TEXT;\n")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            species_code = row['Species Code'].strip()
            common_name = escape_sql_string(row['English Name'].strip())

            # Get German translation
            de = row['German Name'].strip() or None

            # Skip if no German translation
            if not de:
                continue

            print(f"-- {common_name}")
            print(f"UPDATE species")
            print(f"SET")
            print(f"  name_de = '{escape_sql_string(de)}'")
            print(f"WHERE species_code = '{species_code}';")
            print()

if __name__ == '__main__':
    main()
