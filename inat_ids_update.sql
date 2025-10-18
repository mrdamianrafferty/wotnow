
-- Confident updates: set verified true
ALTER TABLE public.species ADD COLUMN IF NOT EXISTS inat_taxon_id integer;
ALTER TABLE public.species ADD COLUMN IF NOT EXISTS inat_taxon_verified boolean DEFAULT false;

-- Generated from species_rows-nat.csv (resolved_exact rows)
UPDATE public.species SET inat_taxon_id = 118712, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Spicara smaris'; -- matched Spicara smaris
UPDATE public.species SET inat_taxon_id = 113533, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Symphodus melops'; -- matched Symphodus melops
UPDATE public.species SET inat_taxon_id = 47255, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sphyraena sphyraena'; -- closest Sphyraena barracuda
UPDATE public.species SET inat_taxon_id = 49284, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Labridae spp.'; -- no candidates (family-level)
UPDATE public.species SET inat_taxon_id = 108196, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pagrus pagrus'; -- matched Pagrus pagrus
UPDATE public.species SET inat_taxon_id = 118652, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Trachinus draco'; -- matched Trachinus draco
UPDATE public.species SET inat_taxon_id = 118674, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Serranus scriba'; -- matched Serranus scriba
UPDATE public.species SET inat_taxon_id = 118667, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Diplodus vulgaris'; -- matched Diplodus vulgaris
UPDATE public.species SET inat_taxon_id = 118657, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pagellus bogaraveo'; -- matched Pagellus bogaraveo
UPDATE public.species SET inat_taxon_id = 69841, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scomber colias'; -- matched Scomber colias
UPDATE public.species SET inat_taxon_id = 228496, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pollachius virens'; -- matched Pollachius virens
UPDATE public.species SET inat_taxon_id = 118600, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sardina pilchardus'; -- matched Sardina pilchardus
UPDATE public.species SET inat_taxon_id = 112860, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sparisoma cretense'; -- matched Sparisoma cretense
UPDATE public.species SET inat_taxon_id = 103911, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Labrus bergylta'; -- matched Labrus bergylta
UPDATE public.species SET inat_taxon_id = 324558, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Loligo vulgaris'; -- matched Loligo vulgaris
UPDATE public.species SET inat_taxon_id = 1494783, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sparus aurata'; -- matched Sparus aurata
UPDATE public.species SET inat_taxon_id = 118694, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Trachurus mediterraneus'; -- matched Trachurus mediterraneus
UPDATE public.species SET inat_taxon_id = 63740, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Gadus morhua'; -- matched Gadus morhua
UPDATE public.species SET inat_taxon_id = 56940, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sarda sarda'; -- Matched Sarda sarda
UPDATE public.species SET inat_taxon_id = 118663, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sarpa salpa'; -- matched Sarpa salpa
UPDATE public.species SET inat_taxon_id = 118655, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Spondyliosoma cantharus'; -- matched Spondyliosoma cantharus
UPDATE public.species SET inat_taxon_id = 416585, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scophthalmus maximus'; -- matched Scophthalmus maximus
UPDATE public.species SET inat_taxon_id = 324532, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sprattus sprattus'; -- matched Sprattus sprattus
UPDATE public.species SET inat_taxon_id = 118619, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mullus surmuletus'; -- matched Mullus surmuletus
UPDATE public.species SET inat_taxon_id = 50984, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pomatomus saltatrix'; -- matched Pomatomus saltatrix
UPDATE public.species SET inat_taxon_id = 106253, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mustelus asterias'; -- matched Mustelus asterias
UPDATE public.species SET inat_taxon_id = 118678, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scomber scombrus'; -- matched Scomber scombrus
UPDATE public.species SET inat_taxon_id = 120614, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Euthynnus alletteratus'; -- matched Euthynnus alletteratus
UPDATE public.species SET inat_taxon_id = 118628, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Chelidonichthys lucerna'; -- matched Chelidonichthys lucerna
UPDATE public.species SET inat_taxon_id = 47523, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pleuronectes platessa'; -- matched Pleuronectes platessa
UPDATE public.species SET inat_taxon_id = 56050, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mustelus mustelus'; -- matched Mustelus mustelus
UPDATE public.species SET inat_taxon_id = 98753, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Ctenolabrus rupestris'; -- matched Ctenolabrus rupestris
UPDATE public.species SET inat_taxon_id = 118675, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Serranus cabrilla'; -- matched Serranus cabrilla
UPDATE public.species SET inat_taxon_id = 151429, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sepia officinalis'; -- matched Sepia officinalis
UPDATE public.species SET inat_taxon_id = 125291, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Molva molva'; -- matched Molva molva
-- Alias handled: Gilthead Seabream → Sparus aurata
UPDATE public.species SET inat_taxon_id = 1494783, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sparus aurata'; -- Matched Sparus aurata (from Gilthead Seabream)
UPDATE public.species SET inat_taxon_id = 118679, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Argyrosomus regius'; -- matched Argyrosomus regius
UPDATE public.species SET inat_taxon_id = 84861, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scorpaena scrofa'; -- matched Scorpaena scrofa
UPDATE public.species SET inat_taxon_id = 118695, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Trachurus trachurus'; -- matched Trachurus trachurus
UPDATE public.species SET inat_taxon_id = 109631, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Platichthys flesus'; -- matched Platichthys flesus
UPDATE public.species SET inat_taxon_id = 118616, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Dicentrarchus punctatus'; -- matched Dicentrarchus punctatus
UPDATE public.species SET inat_taxon_id = 68118, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Epinephelus aeneus'; -- matched Epinephelus aeneus
UPDATE public.species SET inat_taxon_id = 118720, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Eutrigla gurnardus'; -- matched Eutrigla gurnardus
UPDATE public.species SET inat_taxon_id = 51549, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Seriola dumerili'; -- matched Seriola dumerili
UPDATE public.species SET inat_taxon_id = 367966, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Ammodytes tobianus'; -- matched Ammodytes tobianus
-- Alias handled: Saithe/Pollock → Pollachius virens
UPDATE public.species SET inat_taxon_id = 228496, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pollachius virens'; -- Matched Pollachius virens (from Saithe/Pollock)
UPDATE public.species SET inat_taxon_id = 99269, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Dicentrarchus labrax'; -- matched Dicentrarchus labrax
UPDATE public.species SET inat_taxon_id = 118589, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Conger conger'; -- matched Conger conger
UPDATE public.species SET inat_taxon_id = 47518, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Salmo trutta'; -- matched Salmo trutta
UPDATE public.species SET inat_taxon_id = 49315, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Octopus vulgaris'; -- matched Octopus vulgaris
UPDATE public.species SET inat_taxon_id = 61752, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja microocellata'; -- matched Raja microocellata
UPDATE public.species SET inat_taxon_id = 48397, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja clavata'; -- matched Raja clavata
UPDATE public.species SET inat_taxon_id = 100119, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Epinephelus marginatus'; -- matched Epinephelus marginatus
UPDATE public.species SET inat_taxon_id = 118709, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Lichia amia'; -- matched Lichia amia
UPDATE public.species SET inat_taxon_id = 61387, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Limanda limanda'; -- matched Limanda limanda
UPDATE public.species SET inat_taxon_id = 82351, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Melanogrammus aeglefinus'; -- matched Melanogrammus aeglefinus
UPDATE public.species SET inat_taxon_id = 97345, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Chelon labrosus'; -- matched Chelon labrosus
UPDATE public.species SET inat_taxon_id = 118622, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Zeus faber'; -- matched Zeus faber
UPDATE public.species SET inat_taxon_id = 118662, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Oblada melanura'; -- matched Oblada melanurus
UPDATE public.species SET inat_taxon_id = 103913, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Labrus mixtus'; -- matched Labrus mixtus
UPDATE public.species SET inat_taxon_id = 118659, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pagellus erythrinus'; -- matched Pagellus erythrinus
UPDATE public.species SET inat_taxon_id = 55396, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Solea solea'; -- matched Solea solea
UPDATE public.species SET inat_taxon_id = 112381, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scyliorhinus stellaris'; -- matched Scyliorhinus stellaris
UPDATE public.species SET inat_taxon_id = 118597, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Belone belone'; -- matched Belone belone
UPDATE public.species SET inat_taxon_id = 481840, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Lepidorhombus whiffiagonis'; -- matched Lepidorhombus whiffiagonis
UPDATE public.species SET inat_taxon_id = 106222, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mugil cephalus'; -- matched Mugil cephalus
UPDATE public.species SET inat_taxon_id = 47260, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sphyraena viridensis'; -- matched Sphyraena viridensis
UPDATE public.species SET inat_taxon_id = 51543, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Chelidonichthys cuculus'; -- matched Chelidonichthys cuculus
UPDATE public.species SET inat_taxon_id = 112372, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scyliorhinus canicula'; -- matched Scyliorhinus canicula
UPDATE public.species SET inat_taxon_id = 430553, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Merlangius merlangus'; -- matched Merlangius merlangus
UPDATE public.species SET inat_taxon_id = 111527, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja montagui'; -- matched Raja montagui
UPDATE public.species SET inat_taxon_id = 118664, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Boops boops'; -- matched Boops boops
UPDATE public.species SET inat_taxon_id = 118669, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Diplodus sargus'; -- matched Diplodus sargus
UPDATE public.species SET inat_taxon_id = 111535, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja undulata'; -- matched Raja undulata
UPDATE public.species SET inat_taxon_id = 118636, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scophthalmus rhombus'; -- matched Scophthalmus rhombus
UPDATE public.species SET inat_taxon_id = 332553, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pollachius pollachius'; -- matched Pollachius pollachius
UPDATE public.species SET inat_taxon_id = 96913, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Centrolabrus exoletus'; -- matched Centrolabrus exoletus
UPDATE public.species SET inat_taxon_id = 97990, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Clupea harengus'; -- matched Clupea harengus
UPDATE public.species SET inat_taxon_id = 118654, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Dentex dentex'; -- matched Dentex dentex