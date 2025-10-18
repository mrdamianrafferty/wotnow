-- Confident updates: set verified true
ALTER TABLE public.species ADD COLUMN IF NOT EXISTS inat_taxon_id integer;
ALTER TABLE public.species ADD COLUMN IF NOT EXISTS inat_taxon_verified boolean DEFAULT false;
UPDATE public.species SET inat_taxon_id = 118712, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Spicara smaris';
UPDATE public.species SET inat_taxon_id = 113533, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Symphodus melops';
-- REVIEW: Sphyraena sphyraena → candidate ID 47251 (closest Sphyraena barracuda)
-- UPDATE public.species SET inat_taxon_id = 47251, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sphyraena sphyraena';
-- UNRESOLVED: Labridae spp. (no candidates)
UPDATE public.species SET inat_taxon_id = 108196, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pagrus pagrus';
UPDATE public.species SET inat_taxon_id = 118652, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Trachinus draco';
UPDATE public.species SET inat_taxon_id = 118674, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Serranus scriba';
UPDATE public.species SET inat_taxon_id = 118667, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Diplodus vulgaris';
UPDATE public.species SET inat_taxon_id = 118657, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pagellus bogaraveo';
UPDATE public.species SET inat_taxon_id = 69841, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scomber colias';
UPDATE public.species SET inat_taxon_id = 228496, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pollachius virens';
UPDATE public.species SET inat_taxon_id = 118600, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sardina pilchardus';
UPDATE public.species SET inat_taxon_id = 112860, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sparisoma cretense';
UPDATE public.species SET inat_taxon_id = 103911, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Labrus bergylta';
UPDATE public.species SET inat_taxon_id = 324558, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Loligo vulgaris';
UPDATE public.species SET inat_taxon_id = 1494783, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sparus aurata';
UPDATE public.species SET inat_taxon_id = 118694, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Trachurus mediterraneus';
UPDATE public.species SET inat_taxon_id = 63740, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Gadus morhua';
-- REVIEW: Sarda sarda → candidate ID 78832 (closest Ranunculus sardous)
-- UPDATE public.species SET inat_taxon_id = 78832, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sarda sarda';
UPDATE public.species SET inat_taxon_id = 118663, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sarpa salpa';
UPDATE public.species SET inat_taxon_id = 118655, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Spondyliosoma cantharus';
UPDATE public.species SET inat_taxon_id = 416585, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scophthalmus maximus';
UPDATE public.species SET inat_taxon_id = 324532, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sprattus sprattus';
UPDATE public.species SET inat_taxon_id = 118619, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mullus surmuletus';
UPDATE public.species SET inat_taxon_id = 50984, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pomatomus saltatrix';
UPDATE public.species SET inat_taxon_id = 106253, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mustelus asterias';
UPDATE public.species SET inat_taxon_id = 118678, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scomber scombrus';
UPDATE public.species SET inat_taxon_id = 120614, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Euthynnus alletteratus';
UPDATE public.species SET inat_taxon_id = 118628, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Chelidonichthys lucerna';
UPDATE public.species SET inat_taxon_id = 47523, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pleuronectes platessa';
UPDATE public.species SET inat_taxon_id = 56050, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mustelus mustelus';
UPDATE public.species SET inat_taxon_id = 98753, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Ctenolabrus rupestris';
UPDATE public.species SET inat_taxon_id = 118675, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Serranus cabrilla';
UPDATE public.species SET inat_taxon_id = 151429, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sepia officinalis';
UPDATE public.species SET inat_taxon_id = 125291, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Molva molva';
-- REVIEW: Gilthead Seabream → candidate ID 1494783 (closest Sparus aurata)
-- UPDATE public.species SET inat_taxon_id = 1494783, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Gilthead Seabream';
UPDATE public.species SET inat_taxon_id = 118679, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Argyrosomus regius';
UPDATE public.species SET inat_taxon_id = 84861, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scorpaena scrofa';
UPDATE public.species SET inat_taxon_id = 118695, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Trachurus trachurus';
UPDATE public.species SET inat_taxon_id = 109631, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Platichthys flesus';
UPDATE public.species SET inat_taxon_id = 118616, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Dicentrarchus punctatus';
UPDATE public.species SET inat_taxon_id = 68118, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Epinephelus aeneus';
UPDATE public.species SET inat_taxon_id = 118720, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Eutrigla gurnardus';
UPDATE public.species SET inat_taxon_id = 51549, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Seriola dumerili';
UPDATE public.species SET inat_taxon_id = 367966, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Ammodytes tobianus';
-- UNRESOLVED: Saithe/Pollock (no candidates)
UPDATE public.species SET inat_taxon_id = 99269, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Dicentrarchus labrax';
UPDATE public.species SET inat_taxon_id = 118589, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Conger conger';
UPDATE public.species SET inat_taxon_id = 47518, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Salmo trutta';
UPDATE public.species SET inat_taxon_id = 49315, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Octopus vulgaris';
UPDATE public.species SET inat_taxon_id = 61752, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja microocellata';
UPDATE public.species SET inat_taxon_id = 48397, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja clavata';
UPDATE public.species SET inat_taxon_id = 100119, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Epinephelus marginatus';
UPDATE public.species SET inat_taxon_id = 118709, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Lichia amia';
UPDATE public.species SET inat_taxon_id = 61387, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Limanda limanda';
UPDATE public.species SET inat_taxon_id = 82351, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Melanogrammus aeglefinus';
UPDATE public.species SET inat_taxon_id = 97345, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Chelon labrosus';
UPDATE public.species SET inat_taxon_id = 118622, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Zeus faber';
-- REVIEW: Oblada melanura → candidate ID 118662 (closest Oblada melanurus)
-- UPDATE public.species SET inat_taxon_id = 118662, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Oblada melanura';
UPDATE public.species SET inat_taxon_id = 103913, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Labrus mixtus';
UPDATE public.species SET inat_taxon_id = 118659, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pagellus erythrinus';
-- REVIEW: Solea solea → candidate ID 148565 (closest Temenis laothoe)
-- UPDATE public.species SET inat_taxon_id = 148565, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Solea solea';
UPDATE public.species SET inat_taxon_id = 112381, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scyliorhinus stellaris';
UPDATE public.species SET inat_taxon_id = 118597, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Belone belone';
UPDATE public.species SET inat_taxon_id = 481840, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Lepidorhombus whiffiagonis';
UPDATE public.species SET inat_taxon_id = 106222, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Mugil cephalus';
UPDATE public.species SET inat_taxon_id = 47260, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Sphyraena viridensis';
UPDATE public.species SET inat_taxon_id = 51543, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Chelidonichthys cuculus';
UPDATE public.species SET inat_taxon_id = 112372, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scyliorhinus canicula';
UPDATE public.species SET inat_taxon_id = 430553, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Merlangius merlangus';
UPDATE public.species SET inat_taxon_id = 111527, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja montagui';
UPDATE public.species SET inat_taxon_id = 118664, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Boops boops';
UPDATE public.species SET inat_taxon_id = 118669, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Diplodus sargus';
UPDATE public.species SET inat_taxon_id = 111535, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Raja undulata';
UPDATE public.species SET inat_taxon_id = 118636, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Scophthalmus rhombus';
UPDATE public.species SET inat_taxon_id = 332553, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Pollachius pollachius';
UPDATE public.species SET inat_taxon_id = 96913, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Centrolabrus exoletus';
UPDATE public.species SET inat_taxon_id = 97990, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Clupea harengus';
UPDATE public.species SET inat_taxon_id = 118654, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = 'Dentex dentex';