#!/usr/bin/env python3
"""
Merge German and Italian translations from individual CSV files
into the high-priority translations CSV.
"""

import csv
from pathlib import Path

# File paths
base_dir = Path(__file__).parent.parent / 'data'
high_priority_file = base_dir / 'translations-needed-high-priority.csv'
german_file = base_dir / 'translations-needed-de.csv'
italian_file = base_dir / 'translations-needed-it.csv'
output_file = base_dir / 'translations-needed-high-priority.csv'

# Read German translations
german_translations = {}
with open(german_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = (row['English Name'], row['Scientific Name'])
        german_translations[key] = row['German Name']

# Read Italian translations
italian_translations = {}
with open(italian_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = (row['English Name'], row['Scientific Name'])
        italian_translations[key] = row['Italian Name']

# Read and update high-priority file
updated_rows = []
with open(high_priority_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = list(reader.fieldnames)

    # Remove None values from fieldnames (caused by empty columns)
    fieldnames = [f for f in fieldnames if f is not None]

    for row in reader:
        # Remove None keys from row dict
        row = {k: v for k, v in row.items() if k is not None}

        key = (row['English Name'], row['Scientific Name'])

        # Update German translation
        if key in german_translations:
            row['German'] = german_translations[key]

        # Update Italian translation
        if key in italian_translations:
            row['Italian'] = italian_translations[key]

        updated_rows.append(row)

# Write updated file
with open(output_file, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(updated_rows)

print(f"✅ Merged translations into {output_file}")
print(f"   German translations: {sum(1 for v in german_translations.values() if v)}")
print(f"   Italian translations: {sum(1 for v in italian_translations.values() if v)}")
