-- Migration: Add comprehensive species name aliases for better search UX
-- Date: 2025-10-18
-- Description: Adds missing aliases including European Seabass variants, Dorada, and common search terms

INSERT INTO species_name_alias (name_en_alias, scientific_name) VALUES
    -- European Bass aliases (most important - add "European Seabass" as requested)
    ('European Seabass', 'Dicentrarchus labrax'),
    ('Sea Bass', 'Dicentrarchus labrax'),
    ('Seabass', 'Dicentrarchus labrax'),
    
    -- Red Mullet (generic "Mullet" searches)
    ('Mullet', 'Mullus surmuletus'),
    ('Striped Red Mullet', 'Mullus surmuletus'),
    ('Red mullet', 'Mullus surmuletus'),
    
    -- Cod (people search "cod" not "coastal cod")
    ('Cod', 'Gadus morhua'),
    ('European Cod', 'Gadus morhua'),
    
    -- Gilthead Seabream / Dorada (Mediterranean names)
    ('Dorada', 'Sparus aurata'),
    ('Gilt-head Bream', 'Sparus aurata'),
    ('Gilthead Bream', 'Sparus aurata'),
    ('Gilt-head Seabream', 'Sparus aurata'),
    
    -- White Seabream (Portuguese/Spanish)
    ('Sargo', 'Diplodus sargus'),
    ('White Bream', 'Diplodus sargus'),
    
    -- Common species - simple searches
    ('Octopus', 'Octopus vulgaris'),
    ('Cuttlefish', 'Sepia officinalis'),
    ('Squid', 'Loligo vulgaris'),
    
    -- Bogue (Mediterranean)
    ('Bogue', 'Boops boops'),
    
    -- Sardine
    ('Sardine', 'Sardina pilchardus'),
    ('Pilchard', 'Sardina pilchardus'),
    
    -- Ling
    ('Ling', 'Molva molva'),
    
    -- Haddock
    ('Haddock', 'Melanogrammus aeglefinus'),
    
    -- John Dory
    ('John Dory', 'Zeus faber'),
    ('Dory', 'Zeus faber'),
    
    -- Bluefish
    ('Bluefish', 'Pomatomus saltatrix'),
    
    -- Bonito
    ('Bonito', 'Sarda sarda'),
    
    -- Barracuda
    ('Barracuda', 'Sphyraena sphyraena'),
    
    -- Scorpionfish
    ('Scorpionfish', 'Scorpaena scrofa'),
    ('Rascasse', 'Scorpaena scrofa'),  -- French name
    
    -- Meagre
    ('Meagre', 'Argyrosomus regius'),
    ('Croaker', 'Argyrosomus regius'),
    ('Corvina', 'Argyrosomus regius'),  -- Portuguese/Spanish
    
    -- Grouper
    ('Grouper', 'Epinephelus marginatus'),
    ('Dusky Grouper', 'Epinephelus marginatus'),
    ('Mero', 'Epinephelus marginatus'),  -- Spanish
    
    -- Conger
    ('Conger', 'Conger conger'),
    ('Conger Eel', 'Conger conger'),
    
    -- Grey Mullet variants
    ('Grey Mullet', 'Chelon labrosus'),
    ('Mullet', 'Chelon labrosus'),
    ('Thick-lipped Grey Mullet', 'Chelon labrosus'),
    
    -- Brill
    ('Brill', 'Scophthalmus rhombus'),
    
    -- Megrim
    ('Megrim', 'Lepidorhombus whiffiagonis'),
    
    -- Weever
    ('Weever', 'Trachinus draco'),
    ('Greater Weever', 'Trachinus draco'),
    
    -- Gurnard variants
    ('Gurnard', 'Eutrigla gurnardus'),
    ('Grey Gurnard', 'Eutrigla gurnardus'),
    ('Gurnard', 'Chelidonichthys cuculus'),
    ('Red Gurnard', 'Chelidonichthys cuculus'),
    ('Gurnard', 'Chelidonichthys lucerna'),
    ('Tub Gurnard', 'Chelidonichthys lucerna'),
    
    -- Wrasse variants
    ('Wrasse', 'Labrus bergylta'),
    ('Wrasse', 'Labrus mixtus'),
    ('Cuckoo Wrasse', 'Labrus mixtus'),
    ('Wrasse', 'Symphodus melops'),
    ('Corkwing Wrasse', 'Symphodus melops'),
    
    -- Ray variants
    ('Ray', 'Raja clavata'),
    ('Thornback', 'Raja clavata'),
    ('Ray', 'Raja microocellata'),
    ('Small-eyed Ray', 'Raja microocellata'),
    ('Ray', 'Raja montagui'),
    ('Spotted Ray', 'Raja montagui'),
    ('Ray', 'Raja undulata'),
    ('Undulate Ray', 'Raja undulata'),
    
    -- Smoothhound
    ('Smoothhound', 'Mustelus mustelus'),
    ('Smooth-hound', 'Mustelus mustelus'),
    ('Smoothhound', 'Mustelus asterias'),
    ('Starry Smoothhound', 'Mustelus asterias'),
    
    -- Bull Huss
    ('Bull Huss', 'Scyliorhinus stellaris'),
    ('Nursehound', 'Scyliorhinus stellaris'),
    ('Greater Spotted Dogfish', 'Scyliorhinus stellaris'),
    
    -- Pandora
    ('Pandora', 'Pagellus erythrinus'),
    
    -- Comber variants
    ('Comber', 'Serranus cabrilla'),
    ('Comber', 'Serranus scriba'),
    ('Painted Comber', 'Serranus scriba'),
    
    -- Amberjack
    ('Amberjack', 'Seriola dumerili'),
    
    -- Tunny
    ('Tunny', 'Euthynnus alletteratus'),
    ('False Albacore', 'Euthynnus alletteratus'),
    
    -- Scad
    ('Horse Mackerel', 'Trachurus mediterraneus'),
    ('Mediterranean Scad', 'Trachurus mediterraneus'),
    
    -- Picarel
    ('Picarel', 'Spicara smaris'),
    
    -- Salema
    ('Salema', 'Sarpa salpa'),
    ('Saupe', 'Sarpa salpa'),
    ('Goldline', 'Sarpa salpa'),
    
    -- Sand Eel
    ('Sand Eel', 'Ammodytes tobianus'),
    ('Sandeel', 'Ammodytes tobianus'),
    ('Launce', 'Ammodytes tobianus')

ON CONFLICT (name_en_alias) DO NOTHING;

-- Add comment explaining the migration
COMMENT ON TABLE species_name_alias IS 'Maps common search terms and regional names to species scientific names for better UX';
