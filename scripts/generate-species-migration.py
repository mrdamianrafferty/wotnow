#!/usr/bin/env python3
"""
Generate comprehensive species migration SQL from CSV data.
Handles shore/boat advice, playful bios, and name aliases.
"""

import csv
import json
from typing import Dict, Tuple
from collections import defaultdict

# Species name to scientific name mapping
SPECIES_SCIENTIFIC_NAMES = {
    'Sea Bass': 'Dicentrarchus labrax',
    'Mackerel': 'Scomber scombrus',
    'Horse Mackerel': 'Trachurus trachurus',
    'Common Squid': 'Loligo vulgaris',
    'Conger Eel': 'Conger conger',
    'Red Mullet': 'Mullus surmuletus',
    'Sea Bream (Dorada)': 'Sparus aurata',
    'Garfish (Needlefish)': 'Belone belone',
    'Wrasse (various)': 'Labridae spp.',
    'Grey Mullet': 'Chelon labrosus',
    'Cod (Coastal)': 'Gadus morhua',
    'Whiting': 'Merlangius merlangus',
    'Saithe (Pollachius virens)': 'Pollachius virens',
    'Flounder': 'Platichthys flesus',
    'Sardine': 'Sardina pilchardus',
    'Herring': 'Clupea harengus',
    'Sprat': 'Sprattus sprattus',
    'Sand Eel': 'Ammodytes tobianus',
    'Pollack': 'Pollachius pollachius',
    'Plaice': 'Pleuronectes platessa',
    'Dab': 'Limanda limanda',
    'Dover Sole': 'Solea solea',
    'Thornback Ray': 'Raja clavata',
    'Tub Gurnard': 'Chelidonichthys lucerna',
    'John Dory': 'Zeus faber',
    'Turbot (Small)': 'Scophthalmus maximus',
    'Brill': 'Scophthalmus rhombus',
    'Megrim': 'Lepidorhombus whiffiagonis',
    'Common Ling': 'Molva molva',
    'Haddock': 'Melanogrammus aeglefinus',
    'Ballan Wrasse': 'Labrus bergylta',
    'Cuckoo Wrasse': 'Labrus mixtus',
    'Black Seabream': 'Spondyliosoma cantharus',
    'Red Seabream': 'Pagellus bogaraveo',
    'Dentex': 'Dentex dentex',
    'Greater Weever': 'Trachinus draco',
    'Common Octopus': 'Octopus vulgaris',
    'Common Cuttlefish': 'Sepia officinalis',
    'Sea Trout': 'Salmo trutta',
    'Small-spotted Catshark': 'Scyliorhinus canicula',
    'Greater Amberjack': 'Seriola dumerili',
    'Little Tunny': 'Euthynnus alletteratus',
    'Spotted Bass': 'Dicentrarchus punctatus',
    'Flathead Grey Mullet': 'Mugil cephalus',
    'Parrotfish': 'Sparisoma cretense',
}

# ICES species codes
SPECIES_CODES = {
    'Sea Bass': 'bss',
    'Mackerel': 'mac',
    'Horse Mackerel': 'hom',
    'Common Squid': 'sqc',
    'Conger Eel': 'con',
    'Red Mullet': 'mul',
    'Sea Bream (Dorada)': 'sbr',
    'Garfish (Needlefish)': 'gar',
    'Wrasse (various)': 'wra',
    'Grey Mullet': 'mug',
    'Cod (Coastal)': 'cod',
    'Whiting': 'whg',
    'Saithe (Pollachius virens)': 'pok',
    'Flounder': 'fle',
    'Sardine': 'pil',
    'Herring': 'her',
    'Sprat': 'spr',
    'Sand Eel': 'san',
    'Pollack': 'pol',
    'Plaice': 'ple',
    'Dab': 'dab',
    'Dover Sole': 'sol',
    'Thornback Ray': 'rjc',
    'Tub Gurnard': 'gug',
    'John Dory': 'jod',
    'Turbot (Small)': 'tur',
    'Brill': 'bll',
    'Megrim': 'ldb',
    'Common Ling': 'lin',
    'Haddock': 'had',
        'Ballan Wrasse': 'wrb',
    'Cuckoo Wrasse': 'wrc',
    'Black Seabream': 'brs',
    'Red Seabream': 'sbr',  # Pagellus bogaraveo
    'Gilthead Seabream': 'sbg',  # Sparus aurata - SKIP (duplicate of Sea Bream)
    'Sea Bream (Dorada)': 'sba',  # Sparus aurata - use different code to avoid conflict
    'Dentex': 'dex',
    'Greater Weever': 'wee',
    'Common Octopus': 'oct',
    'Common Cuttlefish': 'cut',
    'Sea Trout': 'trs',
    'Small-spotted Catshark': 'scy',
    'Greater Amberjack': 'gaj',
    'Little Tunny': 'lta',
    'Spotted Bass': 'bsp',
    'Flathead Grey Mullet': 'fgm',
    'Parrotfish': 'par',
}

def parse_advice_csv(filepath: str) -> Dict[str, Dict]:
    """Parse fishing advice CSV and structure by species with shore/boat contexts."""
    species_data = defaultdict(lambda: {
        'shore': {},
        'boat': {},
        'conservation_status': '',
        'fun_fact': '',
        'regions': '',
        'edibility': 5
    })
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            species_name = row['Species'].strip()
            context = row['Context'].strip().lower()
            
            advice_entry = {
                'regions': row['Regions'],
                'best_time': row['Best Time'],
                'tide_sensitivity': row['Tide Sensitivity'],
                'baits_diet': row['Favourite Baits & Natural Diet'],
                'temperature_effect': row['Effect of Temperature'],
                'weather_effect': row['Effect of Weather'],
                'distance_depth': row['Typical Distance/Depth'],
                'restrictions': row['Restrictions/Notes'],
                'authority': row['Trusted Authority (rules)']
            }
            
            if context == 'shore':
                species_data[species_name]['shore'] = advice_entry
            elif context == 'boat':
                species_data[species_name]['boat'] = advice_entry
            
            # Store shared data
            species_data[species_name]['conservation_status'] = row['Conservation Status']
            species_data[species_name]['fun_fact'] = row['Fun Fact']
            species_data[species_name]['regions'] = row['Regions']
            try:
                # Database has CHECK constraint: eating_quality BETWEEN 1 AND 5
                # Scale CSV's 1-10 edibility down to 1-5
                edibility = int(row['Edibility (/10)'])
                species_data[species_name]['edibility'] = max(min((edibility + 1) // 2, 5), 1)
            except:
                species_data[species_name]['edibility'] = 3  # Default to middle value
    
    return dict(species_data)

def parse_playful_bios(filepath: str) -> Dict[str, str]:
    """Parse playful bios CSV."""
    bios = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            species = row['Species'].strip()
            bio = row['Playful Bio'].strip()
            bios[species] = bio
    return bios

def escape_sql_string(s: str) -> str:
    """Escape string for SQL."""
    if not s:
        return ''
    return s.replace("'", "''").replace('\\', '\\\\')

def generate_sql_migration(advice_data: Dict, bio_data: Dict) -> Tuple[str, list]:
    """Generate complete SQL migration."""
    sql_lines = [
        "-- Migration: Populate species table with comprehensive data",
        "-- Date: 2025-10-11",
        "-- Description: Adds 45 unique species with shore/boat advice, playful bios, and aliases",
        "",
        "-- Add playful_bio_en column if it doesn't exist",
        "ALTER TABLE species ADD COLUMN IF NOT EXISTS playful_bio_en TEXT;",
        "",
        "-- Create index for playful_bio_en",
        "CREATE INDEX IF NOT EXISTS idx_species_playful_bio_en ON species(playful_bio_en) WHERE playful_bio_en IS NOT NULL;",
        "",
        "-- Begin transaction for atomic insert",
        "BEGIN;",
        "",
        "-- Temporarily disable triggers to speed up bulk insert",
        "SET session_replication_role = replica;",
        "",
        "-- Clear existing species data (if any) to avoid conflicts",
        "-- This ensures clean population on repeated migrations",
        "DELETE FROM species;",
        "",
        "-- Insert species data",
        ""
    ]
    
    # Track scientific names and create aliases for duplicates
    seen_scientific_names = {}
    species_aliases = []
    skipped_species = []
    
    for species_name, data in sorted(advice_data.items()):
        scientific_name = SPECIES_SCIENTIFIC_NAMES.get(species_name, species_name)
        species_code = SPECIES_CODES.get(species_name, species_name.lower()[:3])
        
        # If scientific name was already seen, create an alias instead
        if scientific_name in seen_scientific_names:
            canonical_name = seen_scientific_names[scientific_name]
            species_aliases.append((species_name, scientific_name))
            skipped_species.append(f"{species_name} → alias to {canonical_name}")
            continue
        
        seen_scientific_names[scientific_name] = species_name
        
        # Build advice JSONB
        advice_json = {}
        if data['shore']:
            advice_json['shore'] = data['shore']
        if data['boat']:
            advice_json['boat'] = data['boat']
        
        advice_json_str = json.dumps(advice_json, ensure_ascii=False)
        
        # Get playful bio
        playful_bio = bio_data.get(species_name, '')
        
        # Generate INSERT statement
        sql_lines.append(f"""
-- {species_name} ({scientific_name})
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    '{escape_sql_string(species_code)}',
    '{escape_sql_string(scientific_name)}',
    '{escape_sql_string(species_name)}',
    '{escape_sql_string(advice_json_str)}'::jsonb,
    {f"'{escape_sql_string(playful_bio)}'" if playful_bio else 'NULL'},
    {data['edibility']}
);
""")
    
    # Add aliases
    sql_lines.extend([
        "",
        "-- Re-enable triggers",
        "SET session_replication_role = DEFAULT;",
        "",
        "-- Commit transaction", 
        "COMMIT;",
        "",
        "-- Populate species name aliases",
        "INSERT INTO species_name_alias (name_en_alias, scientific_name) VALUES",
    ])
    
    # Add standard aliases
    standard_aliases = [
        ("'Sole'", "'Solea solea'"),
        ("'Dover Sole'", "'Solea solea'"),
        ("'Common Sole'", "'Solea solea'"),
        ("'Pollock'", "'Pollachius pollachius'"),
        ("'Pollack'", "'Pollachius pollachius'"),
        ("'Saithe'", "'Pollachius virens'"),
        ("'Saithe/Pollock'", "'Pollachius virens'"),
        ("'Coalfish'", "'Pollachius virens'"),
        ("'Atlantic Mackerel'", "'Scomber scombrus'"),
        ("'European Sea Bass'", "'Dicentrarchus labrax'"),
        ("'Bass'", "'Dicentrarchus labrax'"),
        ("'Scad'", "'Trachurus trachurus'"),
        ("'Gilthead Seabream'", "'Sparus aurata'"),
    ]
    
    # Add duplicate species as aliases
    for alias_name, sci_name in species_aliases:
        standard_aliases.append((f"'{escape_sql_string(alias_name)}'", f"'{escape_sql_string(sci_name)}'"))
    
    alias_lines = [f"    ({alias}, {sci})" for alias, sci in standard_aliases]
    sql_lines.append(",\n".join(alias_lines))
    sql_lines.append("\nON CONFLICT (name_en_alias) DO NOTHING;")
    
    return "\n".join(sql_lines), skipped_species

def main():
    advice_data = parse_advice_csv('docs/fishing_advice_all_species_master_with_status_funfacts.csv')
    bio_data = parse_playful_bios('docs/fish_tinder_bios_playful.csv')
    
    print(f"Parsed {len(advice_data)} species from advice CSV")
    print(f"Parsed {len(bio_data)} species from bios CSV")
    
    sql, skipped = generate_sql_migration(advice_data, bio_data)
    
    if skipped:
        print(f"\nCreated {len(skipped)} aliases for duplicate species:")
        for s in skipped:
            print(f"  - {s}")
    
    output_path = 'supabase/migrations/20251011002_populate_species_table.sql'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"\nGenerated migration: {output_path}")
    print(f"Total lines: {len(sql.splitlines())}")

if __name__ == '__main__':
    main()
