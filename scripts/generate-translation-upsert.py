#!/usr/bin/env python3
"""
Generate SQL upsert statements from translations CSV
"""

import csv
import json

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    if not s:
        return None
    return s.replace("'", "''")

def main():
    csv_path = '/Users/damianrafferty/Projects/WotNow/data/translations-needed-high-priority.csv'

    print("-- SQL Upsert for High Priority Translations")
    print("-- Generated from translations-needed-high-priority.csv")
    print("-- Updates localized names (fr, es, de, it, pt) for species in the database")
    print("-- Matches species by species_code\n")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            species_code = row['Species Code'].strip()
            common_name = escape_sql_string(row['English Name'].strip())
            scientific_name = escape_sql_string(row['Scientific Name'].strip())

            # Get translations, handle empty strings
            fr = row['French'].strip() or None
            es = row['Spanish'].strip() or None
            de = row['German'].strip() or None
            it = row['Italian'].strip() or None

            # Handle Portuguese - CSV has extra column, data is in None key
            # If 'Portuguese' column exists but is empty, check the None key
            pt_value = row.get('Portuguese', '').strip()
            if not pt_value and None in row:
                # The Portuguese data is in the extra unnamed column
                pt_extra = row[None]
                if isinstance(pt_extra, list) and len(pt_extra) > 0:
                    pt_value = pt_extra[0].strip()
            pt = pt_value or None

            # Skip if no translations at all
            if not any([fr, es, de, it, pt]):
                print(f"-- Skipping {common_name} ({species_code}) - no translations")
                continue

            # Build UPDATE statement for existing species using name_* format
            updates = []
            if fr:
                updates.append(f"  name_fr = '{escape_sql_string(fr)}'")
            if es:
                updates.append(f"  name_es = '{escape_sql_string(es)}'")
            if de:
                updates.append(f"  name_de = '{escape_sql_string(de)}'")
            if it:
                updates.append(f"  name_it = '{escape_sql_string(it)}'")
            if pt:
                updates.append(f"  name_pt = '{escape_sql_string(pt)}'")

            update_clause = ',\n'.join(updates)

            print(f"-- {common_name}")
            print(f"UPDATE species")
            print(f"SET")
            print(update_clause)
            print(f"WHERE species_code = '{species_code}';")
            print()

if __name__ == '__main__':
    main()
