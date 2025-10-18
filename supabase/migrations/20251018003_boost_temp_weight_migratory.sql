-- Boost temperature weight for migratory species that actively follow temperature gradients
-- These species migrate seasonally to find optimal water temperatures

-- Highly migratory pelagic species (very strong temp followers)
-- These species actively track warm or cold water masses
UPDATE species SET temp_weight = 0.35 WHERE name_en IN (
  'Mackerel',                    -- Follows plankton blooms and warm water
  'Atlantic Bonito',             -- Warm water follower
  'Bluefish',                    -- Warm water migrant
  'Garfish',                     -- Surface temperature sensitive
  'Atlantic Horse Mackerel',     -- Pelagic migrant
  'Mediterranean Horse Mackerel' -- Warm water preference
);

-- Moderately migratory species (strong temp sensitivity)
-- These move with seasonal temperature changes but less extreme
UPDATE species SET temp_weight = 0.25 WHERE name_en IN (
  'Sea Bass',                    -- Moves inshore with warm water
  'Bass (Shore-Caught)',         -- Seasonal coastal migrant
  'Bogue',                       -- Mediterranean warm water species
  'Grey Mullet',                 -- Estuarine migrant, temp sensitive
  'Striped Mullet',              -- Seasonal migrant
  'Red Mullet',                  -- Summer visitor to cooler waters
  'John Dory',                   -- Offshore/inshore seasonal movement
  'Tope Shark',                  -- Migratory predator
  'Thornback Ray'                -- Seasonal inshore/offshore movement
);

-- Cold water species that avoid warm temps
-- High temp weight because they actively avoid unsuitable temps
UPDATE species SET temp_weight = 0.30 WHERE name_en IN (
  'Cod (Coastal)',               -- Cold water specialist
  'Cod (Offshore)',              -- Retreats from warming waters
  'Haddock',                     -- Cold water preference
  'Whiting',                     -- Cold-temperate species
  'Saithe'                       -- Cold water gadoid
);

-- Species that stay put regardless of temperature (lower weight)
-- Resident species that tolerate wide temp ranges
UPDATE species SET temp_weight = 0.08 WHERE name_en IN (
  'Ballan Wrasse',               -- Very resident, wide tolerance
  'Bull Huss',                   -- Resident shark
  'Lesser Spotted Dogfish',      -- Resident shark
  'Greater Spotted Dogfish',     -- Resident shark
  'Pouting',                     -- Locally resident
  'Pollack'                      -- Relatively resident around structure
);
