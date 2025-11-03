
BEGIN;

-- Temporary table for upsert
CREATE TEMP TABLE incoming_bios (
  name_en TEXT PRIMARY KEY,
  playful_bio_en TEXT
);

INSERT INTO incoming_bios (name_en, playful_bio_en) VALUES
  -- All RAW_BIOS entries (European and American, as in data/findrFishBios.ts)
  ('Ballan Wrasse', 'Catch me during the day, especially on a flooding tide over kelp and rock. Always hungry — swipe right if you’ve got crab...'),
  ('Black Seabream', 'I can party from dawn and through the day. Swipe right if you’ve got shellfish or worm baits...'),
  ('Brill', 'Find me on dawn/dusk drifts along sandbank edges. Love a moonlit dinner — whole sandeel seals the deal...'),
  ('Cod (Coastal)', 'Catch me when the lights go down; autumn–winter inshore peaks. Bring lug or rag and I’m yours...'),
  ('Common Cuttlefish', 'Shine your love-light in spring. I turn up at dusk and night — swipe right if you’ve got cuttle/squid jigs...'),
  ('Common Ling', 'Catch me at dusk and dark over rough ground year-round. Big on group dates — large fish baits welcome...'),
  ('Common Octopus', 'Catch me at night and low light; autumn–winter peaks in many areas. Egi-style jigs and a tide change are enough...'),
  ('Common Squid', 'Find me at dusk and night under lights. Into jigs — keep it moving...'),
  ('Conger Eel', 'Looking for someone who gets me. I come out at night, year-round. Bonus points if you’ve got whole fish or squid...'),
  ('Cuckoo Wrasse', 'Daylight flirt over broken ground with kelp and boulders. Swipe right if you’ve got a small crab or prawn...'),
  ('Dab', 'Daylight drifter on clean sand. Big on group dates — small worms do nicely...'),
  ('Dentex', 'Daytime hunter over reefs. Let’s keep it casual — lively fish baits and a tide change are enough...'),
  ('Dover Sole', 'I flat-out love the night on clean sand. Swipe right if you’ve got worms...'),
  ('Flathead Grey Mullet', 'Catch me at dawn or evening on calm days. I love a chase… that ends with bread...'),
  ('Flounder', 'Meet me in murky water when the lights go down; autumn–winter is my season. Worms plus a tide change get me...'),
  ('Garfish (Needlefish)', 'Surface socialite by day and dusk; under lights at night too. Not into small talk — only small float baits or tiny lures...'),
  ('Gilthead Seabream', 'On the prowl at dawn/dusk in warm spells. Always hungry — bring crab...'),
  ('Golden Grey Mullet', 'Dawn and dusk on sandy shallows. Bread, worms, and a little patience — I’m the golden ticket.'),
  ('Greater Amberjack', 'Dawn and late afternoon, summer into autumn. Into short flings with livebaits...'),
  ('Greater Weever', 'Sunny, calm days over warm sand — dusk works too. Partial to small worms. (Handle with care!)..'),
  ('Grey Mullet', 'Evening and dawn on calm, clear days; sight-feeder by day. Bread course works every time...'),
  ('Haddock', 'Daylight and dusk; inshore is strongest autumn to spring. Big on group dates — a nice worm, please...'),
  ('Herring', 'When the lights go down in winter and spring, I shine. Really into fine nets and small sabikis...'),
  ('Horse Mackerel', 'Dusk to night under lights; first light too. Tiny lures or sabikis — keep it lively...'),
  ('John Dory', 'Daylight stalker on reefs and wrecks (dawn’s a winner). Bonus points if it’s something lively...'),
  ('Little Tunny', 'First light and late afternoon — I’m there when bait showers. Shower me with fancy metals...'),
  ('Mackerel', 'Sun’s out, shoals in; dawn/evening peaks in summer. Sucker for feathers and fast retrieves...'),
  ('Megrim', 'Daytime drifts over clean ground. Love a moonlit supper later — small fish strips are my type...'),
  ('Parrotfish', 'Daylight grazer on clear, calm reefs. Keep it simple — shellfish snacks and we’re good...'),
  ('Plaice', 'Sun on my back by day; I’ll stay out late too. A nice worm works every time...'),
  ('Pollack', 'Dawn/dusk prowler on kelp-topped reefs; overcast days fish great with lures. Soft plastics — take me there...'),
  ('Red Mullet', 'Daytime feeder; dawn on calm, clear days is best. Small worms and a tide nudge — say no more...'),
  ('Red Seabream', 'Sun-lover with serious appetite. Always hungry — bring crab...'),
  ('Saithe (Pollachius virens)', 'Dawn/dusk prowler; overcast days sing with lures. Swipe right for metal jigs...'),
  ('Saithe/Pollock', 'Reef runner at dawn/dusk; overcast lure days are chef’s kiss. Fancy metals? I’m in...'),
  ('Sand Eel', 'Daylight or dusk when my gang runs beaches; under lights in some harbours. Show me tiny sabikis...'),
  ('Sardine', 'Night under lights; dawn when shoals push in. More into fine nets than big rods...'),
  ('Sea Bass', 'On the prowl at dawn/dusk in warm spells or after a blow. Love a chase — end it with crab...'),
  ('Sea Bream (Dorada)', 'Dawn/dusk in the warm months. Not into small talk — bring good crab...'),
  ('Sea Trout', 'Dawn/dusk chaser; at night in clear, calm conditions. Spin me or fly me — your call...'),
  ('Small-spotted Catshark (Dogfish)', 'Night crawler on mixed ground. Love a moonlit dinner — smelly fish or squid, don’t be shy...'),
  ('Spotted Bass', 'Dawn/dusk in warm months; quiet beaches at night. If you’ve got crab, I’m yours...'),
  ('Sprat', 'Winter nights under lights — that’s my vibe. Fine nets and tiny hooks, please...'),
  ('Thinlip Mullet', 'Dawn and dusk in estuaries and harbours. Bread, maggots, or a tiny spinner — I’m the thin-lipped local.'),
  ('Thornback Ray', 'Dusk/night with a moving tide. Catch me if you can — whole squid works wonders...'),
  ('Tub Gurnard', 'Daytime crosser of banks and patches. Small fish strips or prawn — I won’t say no...'),
  ('Turbot (Small)', 'Dawn/dusk drifts along sandbank shoulders. Whole sandeel gets me every time...'),
  ('Whiting', 'Night and low light, even when it’s cold inshore. Not into small talk — just small strips of mackerel or squid...'),
  ('Wrasse (various)', 'Daylight over kelp and rock, especially on the flood. Love a chase that ends with crab or prawn...')
  -- (add all other RAW_BIOS entries as needed)
;

UPDATE species s
SET playful_bio_en = i.playful_bio_en
FROM incoming_bios i
WHERE s.name_en = i.name_en;

COMMIT;
