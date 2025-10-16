-- Populate iNaturalist URLs for common species
-- These URLs link to the iNaturalist taxon pages for each species

UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47273-Dicentrarchus-labrax' WHERE species_code = 'bss'; -- Sea Bass
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47427-Gadus-morhua' WHERE species_code = 'cod'; -- Atlantic Cod  
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47426-Scomber-scombrus' WHERE species_code = 'mac'; -- Mackerel
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47667-Pollachius-pollachius' WHERE species_code = 'pol'; -- Pollack
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47668-Pollachius-virens' WHERE species_code = 'pok'; -- Saithe
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47520-Merlangius-merlangus' WHERE species_code = 'whg'; -- Whiting
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47510-Melanogrammus-aeglefinus' WHERE species_code = 'had'; -- Haddock
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/62883-Zeus-faber' WHERE species_code = 'jod'; -- John Dory
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47751-Scophthalmus-maximus' WHERE species_code = 'tur'; -- Turbot
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47750-Scophthalmus-rhombus' WHERE species_code = 'bll'; -- Brill
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47795-Pleuronectes-platessa' WHERE species_code = 'ple'; -- Plaice
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47798-Platichthys-flesus' WHERE species_code = 'fle'; -- Flounder
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47849-Solea-solea' WHERE species_code = 'sol'; -- Sole
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/48127-Belone-belone' WHERE species_code = 'gar'; -- Garfish
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47383-Clupea-harengus' WHERE species_code = 'her'; -- Herring
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/80656-Chelon-labrosus' WHERE species_code = 'fgm'; -- Grey Mullet
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47482-Mullus-surmuletus' WHERE species_code = 'mul'; -- Red Mullet
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47387-Sprattus-sprattus' WHERE species_code = 'spr'; -- Sprat
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47381-Sardina-pilchardus' WHERE species_code = 'pil'; -- Sardine
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/85957-Conger-conger' WHERE species_code = 'con'; -- Conger Eel
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47840-Raja-clavata' WHERE species_code = 'rjc'; -- Thornback Ray
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/51962-Squalus-acanthias' WHERE species_code = 'dgs'; -- Spurdog
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47866-Scyliorhinus-canicula' WHERE species_code = 'scy'; -- Dogfish
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/85925-Molva-molva' WHERE species_code = 'lin'; -- Ling
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47688-Trisopterus-luscus' WHERE species_code = 'bib'; -- Pouting/Bib
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/60503-Trachurus-trachurus' WHERE species_code = 'hom'; -- Horse Mackerel
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/52010-Sparus-aurata' WHERE species_code = 'sbg'; -- Gilthead Seabream
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/51999-Diplodus-sargus' WHERE species_code = 'sba'; -- White Seabream
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/51977-Spondyliosoma-cantharus' WHERE species_code = 'brs'; -- Black Seabream
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47321-Labrus-bergylta' WHERE species_code = 'wrb'; -- Ballan Wrasse
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47320-Labrus-mixtus' WHERE species_code = 'wrc'; -- Cuckoo Wrasse
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/52074-Ctenolabrus-rupestris' WHERE species_code = 'WRG'; -- Goldsinny Wrasse
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/52075-Symphodus-melops' WHERE species_code = 'WRK'; -- Corkwing Wrasse
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47698-Eutrigla-gurnardus' WHERE species_code = 'gug'; -- Gurnard
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/85919-Lophius-piscatorius' WHERE species_code = 'mon'; -- Monkfish
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47916-Octopus-vulgaris' WHERE species_code = 'oct'; -- Octopus
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47908-Sepia-officinalis' WHERE species_code = 'cut'; -- Cuttlefish
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47905-Loligo-vulgaris' WHERE species_code = 'sqc'; -- Squid

-- Mediterranean species
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/52092-Epinephelus-marginatus' WHERE species_code = 'dusk-group'; -- Dusky Grouper
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/51988-Dentex-dentex' WHERE species_code = 'dex'; -- Dentex
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47461-Sarda-sarda' WHERE species_code = 'bonito'; -- Bonito
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47453-Pomatomus-saltatrix' WHERE species_code = 'bluefish'; -- Bluefish
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/47463-Sphyraena-sphyraena' WHERE species_code = 'euro-cuda'; -- European Barracuda
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/51975-Sarpa-salpa' WHERE species_code = 'SAL'; -- Salema
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/48008-Boops-boops' WHERE species_code = 'bogue'; -- Bogue
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/60506-Trachurus-mediterraneus' WHERE species_code = 'med-scad'; -- Mediterranean Scad
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/51979-Pagellus-erythrinus' WHERE species_code = 'red-porgy'; -- Red Porgy
UPDATE public.species SET inaturalist_url = 'https://www.inaturalist.org/taxa/51973-Pagellus-acarne' WHERE species_code = 'pandora'; -- Pandora

-- Print confirmation
SELECT 'iNaturalist URLs populated for ' || COUNT(*) || ' species' as result
FROM public.species 
WHERE inaturalist_url IS NOT NULL;
