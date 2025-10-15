-- Migration: Add playful_bio_en column to species table and populate with data
-- Created: 2025-10-11

-- Add the column
ALTER TABLE species ADD COLUMN IF NOT EXISTS playful_bio_en TEXT;

-- Populate the playful bios from the CSV data
UPDATE species SET playful_bio_en = 'Always around daylight, especially on a flooding tide. Not into cold shoulders — only crab.' WHERE species_code = 'ballan-wrasse' OR scientific_name ILIKE '%labrus bergylta%';

UPDATE species SET playful_bio_en = 'Catch me dawn/daylight. Big on group dates, especially with shellfish.' WHERE species_code = 'black-seabream' OR scientific_name ILIKE '%spondyliosoma cantharus%';

UPDATE species SET playful_bio_en = 'Catch me dawn/dusk drifts over sandbanks and edges. Big on group dates, especially with whole sandeel.' WHERE species_code = 'brill' OR scientific_name ILIKE '%scophthalmus rhombus%';

UPDATE species SET playful_bio_en = 'I''m most active low light and night; autumn–winter inshore peaks. Bring lug/ragworm and let''s make it a date.' WHERE species_code = 'cod' OR species_code = 'cod-coastal' OR scientific_name ILIKE '%gadus morhua%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me night with lights; spring runs in many ports. Bonus points if you''ve got squid/cuttle jigs; also takes small' WHERE species_code = 'common-cuttlefish' OR scientific_name ILIKE '%sepia officinalis%';

UPDATE species SET playful_bio_en = 'Always around dusk and dark; year-round over rough ground. Not into cold shoulders — only large fish baits.' WHERE species_code = 'common-ling' OR species_code = 'ling' OR scientific_name ILIKE '%molva molva%';

UPDATE species SET playful_bio_en = 'Catch me night and low light; autumn–winter peaks in many areas. Big on group dates, especially with egi-style octopus jigs.' WHERE species_code = 'common-octopus' OR scientific_name ILIKE '%octopus vulgaris%';

UPDATE species SET playful_bio_en = 'Always around night with lights; peaks on dusk and first dark, autumn–winter many areas. Not into cold shoulders — only egi jigs; preys on s' WHERE species_code = 'common-squid' OR scientific_name ILIKE '%loligo%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me night; over low‑light periods year‑round. Bonus points if you''ve got whole fish/squid.' WHERE species_code = 'conger-eel' OR species_code = 'conger' OR scientific_name ILIKE '%conger conger%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me daylight; over broken ground with kelp and boulders. Bonus points if you''ve got small crab and prawn baits;' WHERE species_code = 'cuckoo-wrasse' OR scientific_name ILIKE '%labrus mixtus%';

UPDATE species SET playful_bio_en = 'Always around daylight. Not into cold shoulders — only small worms.' WHERE species_code = 'dab' OR scientific_name ILIKE '%limanda limanda%';

UPDATE species SET playful_bio_en = 'I''m most active daytime. Bring live fish and let''s make it a date.' WHERE species_code = 'dentex' OR scientific_name ILIKE '%dentex dentex%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me night/dusk. Bonus points if you''ve got worms.' WHERE species_code = 'dover-sole' OR species_code = 'sole' OR scientific_name ILIKE '%solea solea%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me dawn/evening; calm days. Bonus points if you''ve got bread.' WHERE species_code = 'flathead-grey-mullet' OR species_code = 'grey-mullet' OR scientific_name ILIKE '%mugil cephalus%';

UPDATE species SET playful_bio_en = 'Catch me dusk/night and daylight in murky water; autumn–winter strong. Big on group dates, especially with worms.' WHERE species_code = 'flounder' OR scientific_name ILIKE '%platichthys flesus%';

UPDATE species SET playful_bio_en = 'Always around daylight & dusk in spring runs; also at night under lights. Not into cold shoulders — only small surface lures/float baits; ea' WHERE species_code = 'garfish' OR species_code = 'needlefish' OR scientific_name ILIKE '%belone belone%';

UPDATE species SET playful_bio_en = 'I''m most active dawn/dusk; warm months. Bring crabs and let''s make it a date.' WHERE species_code = 'gilthead-seabream' OR species_code = 'gilthead-bream' OR scientific_name ILIKE '%sparus aurata%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me dawn and late afternoon; summer into autumn. Bonus points if you''ve got livebaits (mackerel.' WHERE species_code = 'greater-amberjack' OR scientific_name ILIKE '%seriola dumerili%';

UPDATE species SET playful_bio_en = 'I''m most active sunny calm days over warm sand; also dusk. Bring small worms and prawn pieces; ambush predator on sand flats. and let''s make' WHERE species_code = 'greater-weever' OR scientific_name ILIKE '%trachinus draco%';

UPDATE species SET playful_bio_en = 'I''m most active evening/dawn; sight‑feeding in daylight on calm days. Bring bread and let''s make it a date.' WHERE species_code = 'grey-mullet' OR scientific_name ILIKE '%chelon labrosus%';

UPDATE species SET playful_bio_en = 'I''m most active daylight and dusk; autumn–spring are strongest inshore. Bring worm baits and let''s make it a date.' WHERE species_code = 'haddock' OR scientific_name ILIKE '%melanogrammus aeglefinus%';

UPDATE species SET playful_bio_en = 'Night owl over deep ground, smooth moves in the dark. Bring squid or small fish and I''m hooked.' WHERE species_code = 'hake' OR scientific_name ILIKE '%merluccius merluccius%';

UPDATE species SET playful_bio_en = 'Catch me 𐄳 (bait fish) dusk/night; winter–spring runs in many areas. Big on group dates, especially with sabiki/small spoons; plankton/small' WHERE species_code = 'herring' OR scientific_name ILIKE '%clupea harengus%';

UPDATE species SET playful_bio_en = 'Love a moonlit dinner dusk to night under lights; also at first light. Just add fine sabiki.' WHERE species_code = 'horse-mackerel' OR scientific_name ILIKE '%trachurus trachurus%';

UPDATE species SET playful_bio_en = 'Always around daytime; dawn on reefs/wrecks. Not into cold shoulders — only livebaits/squid; predator on small fish..' WHERE species_code = 'john-dory' OR scientific_name ILIKE '%zeus faber%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me first light and late afternoon; active whenever bait showers on the surface. Bonus points if you''ve got fast' WHERE species_code = 'little-tunny' OR scientific_name ILIKE '%euthynnus alletteratus%';

UPDATE species SET playful_bio_en = 'I''m most active daylight when shoals are in; dawn/evening peaks in summer. Bring feathers/sabiki and let''s make it a date.' WHERE species_code = 'mackerel' OR scientific_name ILIKE '%scomber scombrus%';

UPDATE species SET playful_bio_en = 'Always around daytime drifts. Not into cold shoulders — only small fish strips.' WHERE species_code = 'megrim' OR scientific_name ILIKE '%lepidorhombus whiffiagonis%';

UPDATE species SET playful_bio_en = 'Love a moonlit dinner daylight; calm, clear days. Just add shellfish.' WHERE species_code = 'parrotfish' OR scientific_name ILIKE '%sparisoma%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me daylight. Bonus points if you''ve got worms.' WHERE species_code = 'plaice' OR scientific_name ILIKE '%pleuronectes platessa%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me dawn/dusk; overcast days with lures. Bonus points if you''ve got artificial lures (soft plastics.' WHERE species_code = 'pollack' OR species_code = 'pollock' OR scientific_name ILIKE '%pollachius pollachius%';

UPDATE species SET playful_bio_en = 'Love a moonlit dinner daytime; dawn on calm, clear days. Just add small worms.' WHERE species_code = 'red-mullet' OR scientific_name ILIKE '%mullus surmuletus%';

UPDATE species SET playful_bio_en = 'Catch me daytime. Big on group dates, especially with crabs.' WHERE species_code = 'red-seabream' OR scientific_name ILIKE '%pagellus bogaraveo%';

UPDATE species SET playful_bio_en = 'Always around dawn/dusk; overcast days fish well with lures. Not into cold shoulders — only metal jigs.' WHERE species_code = 'saithe' OR scientific_name ILIKE '%pollachius virens%';

UPDATE species SET playful_bio_en = 'Love a moonlit dinner daylight and dusk when shoals move along the beach; night with lights in some harbours. Just add tiny sabiki or small' WHERE species_code = 'sand-eel' OR species_code = 'sandeel' OR scientific_name ILIKE '%ammodytes%';

UPDATE species SET playful_bio_en = 'Always around 𐄳 (bait fish) night under lights; dawn when bait shoals push in. Not into cold shoulders — only tiny sabiki; plankton feeder..' WHERE species_code = 'sardine' OR scientific_name ILIKE '%sardina pilchardus%';

UPDATE species SET playful_bio_en = 'Always around dawn/dusk; warm months. Not into cold shoulders — only crab.' WHERE species_code = 'sea-bass' OR species_code = 'bass' OR scientific_name ILIKE '%dicentrarchus labrax%';

UPDATE species SET playful_bio_en = 'I''m most active dawn/dusk; warm months. Bring crab and let''s make it a date.' WHERE species_code = 'sea-bream' OR species_code = 'dorada' OR scientific_name ILIKE '%sparus%';

UPDATE species SET playful_bio_en = 'Love a moonlit dinner dawn/dusk; at night in clear, calm conditions; spring/autumn coastal runs. Just add spinners.' WHERE species_code = 'sea-trout' OR scientific_name ILIKE '%salmo trutta%';

UPDATE species SET playful_bio_en = 'I''m most active night. Bring smelly fish/squid baits; scavenger and let''s make it a date.' WHERE species_code = 'small-spotted-catshark' OR species_code = 'catshark' OR scientific_name ILIKE '%scyliorhinus canicula%';

UPDATE species SET playful_bio_en = 'I''m most active dawn/dusk; warm months and at night over quiet beaches. Bring crabs and let''s make it a date.' WHERE species_code = 'spotted-bass' OR scientific_name ILIKE '%dicentrarchus punctatus%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me 𐄳 (bait fish) night under lights; winter harbours. Bonus points if you''ve got very fine sabiki; plankton fee' WHERE species_code = 'sprat' OR scientific_name ILIKE '%sprattus sprattus%';

UPDATE species SET playful_bio_en = 'Always around dusk/night with moving tide. Not into cold shoulders — only whole squid.' WHERE species_code = 'thornback-ray' OR species_code = 'thornback' OR scientific_name ILIKE '%raja clavata%';

UPDATE species SET playful_bio_en = 'Always around daytime. Not into cold shoulders — only small fish.' WHERE species_code = 'tub-gurnard' OR species_code = 'gurnard' OR scientific_name ILIKE '%chelidonichthys lucerna%';

UPDATE species SET playful_bio_en = 'Looking for someone who gets me dawn/dusk drifts over sandbanks. Bonus points if you''ve got whole sandeel.' WHERE species_code = 'turbot' OR scientific_name ILIKE '%scophthalmus maximus%';

UPDATE species SET playful_bio_en = 'I''m most active night & low‑light; peaks in colder months inshore. Bring small strips of mackerel/squid and let''s make it a date.' WHERE species_code = 'whiting' OR scientific_name ILIKE '%merlangius merlangus%';

UPDATE species SET playful_bio_en = 'Love a moonlit dinner daylight, especially flood tide over kelp/rocks. Just add crab.' WHERE species_code = 'wrasse' OR scientific_name ILIKE '%labrus%';

UPDATE species SET playful_bio_en = 'Tiny but social — love warm summer nights and shimmering lights. Swipe right if you''re plankton-rich.' WHERE species_code = 'anchovy' OR scientific_name ILIKE '%engraulis encrasicolus%';

-- Add a comment to the column
COMMENT ON COLUMN species.playful_bio_en IS 'Playful, Tinder-style bio for each species in English. Used for engaging fish prediction cards.';

-- Create an index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_species_playful_bio_en ON species(playful_bio_en) WHERE playful_bio_en IS NOT NULL;
