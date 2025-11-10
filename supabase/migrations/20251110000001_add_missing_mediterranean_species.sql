-- Migration: Add missing Mediterranean and Atlantic species
-- Date: 2025-11-10
-- Description: Adds 9 species that appear in predictions but are missing from database
-- Species: Painted Comber, Comber, Meagre, Parrotfish, Leerfish, Two-banded Seabream, Saddled Seabream, European Barracuda, Bluefish

-- Painted Comber (Serranus scriba)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('CMP', 'Serranus scriba', 'Painted Comber', 'Reef cruiser with painted stripes - loves daylight and rocky hideouts.')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- Comber (Serranus cabrilla)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('CMB', 'Serranus cabrilla', 'Comber', 'Rocky reef resident - swipe right for small baits and calm seas.')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- Meagre (Argyrosomus regius)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('MEAGRE', 'Argyrosomus regius', 'Meagre', 'Powerful drum that loves dusk/dawn hunts. Bring big baits and patience.')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- European Barracuda (Sphyraena sphyraena)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('EURO-CUDA', 'Sphyraena sphyraena', 'European Barracuda', 'Fast striker with sharp teeth - loves lures and warm blue water.')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- Leerfish (Lichia amia)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('LEERFISH', 'Lichia amia', 'Leerfish', 'Powerful hunter that crashes baitfish schools. Bring strong tackle!')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- Bluefish (Pomatomus saltatrix)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('BLUEFISH', 'Pomatomus saltatrix', 'Bluefish', 'Aggressive pack hunter with sharp teeth - explosive topwater action!')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- Two-banded Seabream (Diplodus vulgaris)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('2BD-BREAM', 'Diplodus vulgaris', 'Two-banded Seabream', 'Striped seabream that loves rocks and weed. Light tackle champion!')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- Saddled Seabream (Oblada melanura)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('SADD-BREAM', 'Oblada melanura', 'Saddled Seabream', 'Schooling bream with distinctive tail spot. Fun on light tackle!')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();

-- Parrotfish (Sparisoma cretense)
INSERT INTO species (species_code, scientific_name, name_en, playful_bio_en)
VALUES ('PAR', 'Sparisoma cretense', 'Parrotfish', 'Colorful reef grazer - more often admired than caught. Handle with care!')
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();
