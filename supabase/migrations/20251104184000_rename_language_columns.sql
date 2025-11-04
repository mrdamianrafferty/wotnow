-- Ensure language columns use name_* format for consistency
-- The columns name_fr, name_es, name_pt, name_de, name_it already exist
-- This migration just ensures any old short-name columns are cleaned up

-- Add columns with name_* format if they don't exist (they should already exist)
ALTER TABLE species ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS name_es TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS name_pt TEXT;

-- If old short-name columns exist, copy data and drop them
-- (They likely don't exist on remote, but this handles the edge case)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'species' AND column_name = 'fr') THEN
        UPDATE species SET name_fr = fr WHERE fr IS NOT NULL AND fr != '';
        ALTER TABLE species DROP COLUMN fr;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'species' AND column_name = 'es') THEN
        UPDATE species SET name_es = es WHERE es IS NOT NULL AND es != '';
        ALTER TABLE species DROP COLUMN es;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'species' AND column_name = 'pt') THEN
        UPDATE species SET name_pt = pt WHERE pt IS NOT NULL AND pt != '';
        ALTER TABLE species DROP COLUMN pt;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'species' AND column_name = 'de') THEN
        UPDATE species SET name_de = de WHERE de IS NOT NULL AND de != '';
        ALTER TABLE species DROP COLUMN de;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'species' AND column_name = 'it') THEN
        UPDATE species SET name_it = it WHERE it IS NOT NULL AND it != '';
        ALTER TABLE species DROP COLUMN it;
    END IF;
END $$;
