-- Add frost sensitivity fields to plant_species for personalized frost protection recommendations
-- Phase 2 of personalized tasks implementation

-- Add frost tolerance classification
ALTER TABLE plant_species
  ADD COLUMN IF NOT EXISTS frost_tolerance TEXT CHECK (frost_tolerance IN ('hardy', 'half_hardy', 'tender'));

-- Add minimum temperature plant can survive (Celsius)
ALTER TABLE plant_species
  ADD COLUMN IF NOT EXISTS min_temp_c INTEGER;

-- Flag for plants that need frost protection when growing outdoors
ALTER TABLE plant_species
  ADD COLUMN IF NOT EXISTS frost_protection_needed BOOLEAN DEFAULT false;

-- Add comment explaining the values
COMMENT ON COLUMN plant_species.frost_tolerance IS 'Frost tolerance classification: hardy (survives frost, e.g. kale), half_hardy (tolerates light frost, e.g. lettuce), tender (killed by frost, e.g. tomatoes)';
COMMENT ON COLUMN plant_species.min_temp_c IS 'Minimum temperature in Celsius the plant can survive';
COMMENT ON COLUMN plant_species.frost_protection_needed IS 'Whether this plant needs frost protection when grown outdoors in frost-prone areas';

-- Create index for frost-sensitive plant queries
CREATE INDEX IF NOT EXISTS idx_plant_species_frost_tolerance ON plant_species(frost_tolerance);

-- Populate frost data for common species
-- Tender plants (killed by frost) - need protection
UPDATE plant_species SET
  frost_tolerance = 'tender',
  min_temp_c = 10,
  frost_protection_needed = true
WHERE slug IN ('tomato', 'tomatoes', 'pepper', 'peppers', 'chilli', 'chillies', 'aubergine', 'eggplant', 'cucumber', 'cucumbers', 'courgette', 'courgettes', 'zucchini', 'squash', 'pumpkin', 'melon', 'watermelon');

UPDATE plant_species SET
  frost_tolerance = 'tender',
  min_temp_c = 5,
  frost_protection_needed = true
WHERE slug IN ('basil', 'coriander', 'cilantro');

UPDATE plant_species SET
  frost_tolerance = 'tender',
  min_temp_c = -2,
  frost_protection_needed = true
WHERE slug IN ('lemon', 'lemon-tree', 'lime', 'lime-tree', 'orange', 'orange-tree', 'grapefruit', 'mandarin', 'citrus');

UPDATE plant_species SET
  frost_tolerance = 'tender',
  min_temp_c = -7,
  frost_protection_needed = true
WHERE slug IN ('pomegranate', 'pomegranate-tree', 'fig', 'fig-tree', 'olive', 'olive-tree');

UPDATE plant_species SET
  frost_tolerance = 'tender',
  min_temp_c = 0,
  frost_protection_needed = true
WHERE slug IN ('dahlia', 'dahlias', 'begonia', 'begonias', 'fuchsia', 'canna', 'cannas', 'geranium', 'geraniums');

UPDATE plant_species SET
  frost_tolerance = 'tender',
  min_temp_c = 5,
  frost_protection_needed = true
WHERE slug IN ('sweet-potato', 'okra', 'french-bean', 'runner-bean', 'french-beans', 'runner-beans');

-- Half-hardy plants (survive light frost)
UPDATE plant_species SET
  frost_tolerance = 'half_hardy',
  min_temp_c = -2,
  frost_protection_needed = false
WHERE slug IN ('lettuce', 'spinach', 'chard', 'swiss-chard', 'rocket', 'arugula', 'pak-choi', 'bok-choy');

UPDATE plant_species SET
  frost_tolerance = 'half_hardy',
  min_temp_c = -5,
  frost_protection_needed = false
WHERE slug IN ('pea', 'peas', 'broad-bean', 'broad-beans', 'mange-tout', 'sugar-snap');

UPDATE plant_species SET
  frost_tolerance = 'half_hardy',
  min_temp_c = -3,
  frost_protection_needed = false
WHERE slug IN ('parsley', 'chives', 'dill', 'fennel');

UPDATE plant_species SET
  frost_tolerance = 'half_hardy',
  min_temp_c = -5,
  frost_protection_needed = false
WHERE slug IN ('potato', 'potatoes', 'carrot', 'carrots', 'beetroot', 'beet', 'turnip', 'turnips', 'radish', 'radishes');

UPDATE plant_species SET
  frost_tolerance = 'half_hardy',
  min_temp_c = -5,
  frost_protection_needed = false
WHERE slug IN ('cabbage', 'cauliflower', 'broccoli');

-- Hardy plants (survive hard frost)
UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -15,
  frost_protection_needed = false
WHERE slug IN ('kale', 'brussels-sprout', 'brussels-sprouts', 'leek', 'leeks', 'winter-cabbage', 'savoy-cabbage');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -20,
  frost_protection_needed = false
WHERE slug IN ('onion', 'onions', 'garlic', 'shallot', 'shallots');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -10,
  frost_protection_needed = false
WHERE slug IN ('rosemary', 'thyme', 'sage', 'oregano', 'mint', 'bay', 'lavender');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -25,
  frost_protection_needed = false
WHERE slug IN ('apple', 'apple-tree', 'pear', 'pear-tree', 'plum', 'plum-tree', 'cherry', 'cherry-tree', 'damson');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -15,
  frost_protection_needed = false
WHERE slug IN ('raspberry', 'raspberries', 'blackberry', 'blackberries', 'gooseberry', 'currant', 'blackcurrant', 'redcurrant', 'whitecurrant');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -10,
  frost_protection_needed = false
WHERE slug IN ('strawberry', 'strawberries', 'blueberry', 'blueberries', 'grape', 'grapevine');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -15,
  frost_protection_needed = false
WHERE slug IN ('parsnip', 'parsnips', 'swede', 'jerusalem-artichoke', 'horseradish');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -20,
  frost_protection_needed = false
WHERE slug IN ('rhubarb', 'asparagus', 'artichoke', 'globe-artichoke');

-- Hardy perennial flowers
UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -20,
  frost_protection_needed = false
WHERE slug IN ('rose', 'roses', 'hydrangea', 'clematis', 'wisteria', 'honeysuckle', 'jasmine');

UPDATE plant_species SET
  frost_tolerance = 'hardy',
  min_temp_c = -15,
  frost_protection_needed = false
WHERE slug IN ('tulip', 'tulips', 'daffodil', 'daffodils', 'crocus', 'snowdrop', 'snowdrops', 'hyacinth', 'allium');
