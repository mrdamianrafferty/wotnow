-- DO NOT OVERWRITE: These bios are custom Findr bios. Do not replace with guild/automatic content.
-- This migration maps multiple name variants for each species to ensure all bios are updated.

BEGIN;

CREATE TEMP TABLE incoming_bios (
  name_en TEXT PRIMARY KEY,
  playful_bio_en TEXT
);

INSERT INTO incoming_bios (name_en, playful_bio_en) VALUES
  -- Mullet variants
  ('Grey Mullet', 'Evening and dawn on calm, clear days; sight-feeder by day. Bread course works every time...'),
  ('Thicklip Grey Mullet', 'Evening and dawn on calm, clear days; sight-feeder by day. Bread course works every time...'),
  ('Thick-lipped grey mullet', 'Evening and dawn on calm, clear days; sight-feeder by day. Bread course works every time...'),
  ('Thinlip Grey Mullet', 'Dawn and dusk in estuaries and harbours. Bread, maggots, or a tiny spinner — I’m the thin-lipped local.'),
  ('Thin-lipped grey mullet', 'Dawn and dusk in estuaries and harbours. Bread, maggots, or a tiny spinner — I’m the thin-lipped local.'),
  ('Golden Grey Mullet', 'Dawn and dusk on sandy shallows. Bread, worms, and a little patience — I’m the golden ticket.'),
  ('Golden-grey mullet', 'Dawn and dusk on sandy shallows. Bread, worms, and a little patience — I’m the golden ticket.'),
  -- Red Mullet
  ('Red Mullet', 'Daytime feeder; dawn on calm, clear days is best. Small worms and a tide nudge — say no more...'),
  -- Add more variants for other ambiguous/common species as needed
  -- Example: Wrasse
  ('Ballan Wrasse', 'Catch me during the day, especially on a flooding tide over kelp and rock. Always hungry — swipe right if you’ve got crab...'),
  ('Wrasse (various)', 'Daylight over kelp and rock, especially on the flood. Love a chase that ends with crab or prawn...')
  -- (add more as needed)
;

UPDATE species s
SET playful_bio_en = i.playful_bio_en
FROM incoming_bios i
WHERE LOWER(s.name_en) = LOWER(i.name_en);

COMMIT;
