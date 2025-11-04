#!/usr/bin/env python3
"""
Generate SQL upsert statements for Italian translations only
Uses name_it column naming format
"""

import csv

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    if not s:
        return None
    return s.replace("'", "''")

def main():
    csv_path = '/Users/damianrafferty/Projects/WotNow/data/translations-needed-it.csv'

    print("-- SQL Upsert for Italian Translations")
    print("-- Generated from translations-needed-it.csv")
    print("-- Updates Italian names (name_it) for species in the database")
    print("-- Matches species by species_code\n")

    print("-- Add Italian column if it doesn't exist")
    print("ALTER TABLE species ADD COLUMN IF NOT EXISTS name_it TEXT;\n")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            species_code = row['Species Code'].strip()
            common_name = escape_sql_string(row['English Name'].strip())

            # Get Italian translation
            it = row['Italian Name'].strip() or None

            # Skip if no Italian translation
            if not it:
                continue

            print(f"-- {common_name}")
            print(f"UPDATE species")
            print(f"SET")
            print(f"  name_it = '{escape_sql_string(it)}'")
            print(f"WHERE species_code = '{species_code}';")
            print()

if __name__ == '__main__':
    main()
