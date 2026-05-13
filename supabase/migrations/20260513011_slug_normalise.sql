-- Slug normalisation — remove category prefixes, fix duplicates, enforce canonical form.
-- See GROW_DAISY_SLUG_STRATEGY.md for the full rationale and decisions.
--
-- This migration:
--   1. Upgrades 10 FK constraints from NO ACTION to ON UPDATE CASCADE.
--   2. Renames 32 slugs (simple — no target slug exists yet).
--   3. Merges 3 duplicate-into-existing rows (catmint, dill, sweet-chestnut).
--   4. Merges 3 true duplicates (onion-bulb→onion, chive+herb-chives-common→chives,
--      herb-coriander-leaf→coriander).
--
-- Non-FK tables (grow_user_plants, grow_planting_calendar, grow_nursery_inventory,
-- grow_seed_listings, grow_user_tasks, perenual_sync_logs,
-- because they carry no FK constraint to plant_species.slug.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Upgrade FK constraints to ON UPDATE CASCADE
--    All had confupdtype='a' (NO ACTION). ON DELETE behaviour is preserved.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE cultivars
  DROP CONSTRAINT cultivars_species_slug_fkey,
  ADD  CONSTRAINT cultivars_species_slug_fkey
    FOREIGN KEY (species_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE custom_species_suggestions
  DROP CONSTRAINT custom_species_suggestions_promoted_to_species_slug_fkey,
  ADD  CONSTRAINT custom_species_suggestions_promoted_to_species_slug_fkey
    FOREIGN KEY (promoted_to_species_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE guild_blueprint
  DROP CONSTRAINT guild_blueprint_focal_slug_fkey,
  ADD  CONSTRAINT guild_blueprint_focal_slug_fkey
    FOREIGN KEY (focal_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE guild_blueprint_member
  DROP CONSTRAINT guild_blueprint_member_plant_slug_fkey,
  ADD  CONSTRAINT guild_blueprint_member_plant_slug_fkey
    FOREIGN KEY (plant_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE plant_companions
  DROP CONSTRAINT plant_companions_companion_slug_fkey,
  ADD  CONSTRAINT plant_companions_companion_slug_fkey
    FOREIGN KEY (companion_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE plant_companions
  DROP CONSTRAINT plant_companions_plant_slug_fkey,
  ADD  CONSTRAINT plant_companions_plant_slug_fkey
    FOREIGN KEY (plant_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE plant_function
  DROP CONSTRAINT plant_function_plant_slug_fkey,
  ADD  CONSTRAINT plant_function_plant_slug_fkey
    FOREIGN KEY (plant_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE plant_task_calendar_default
  DROP CONSTRAINT plant_task_calendar_default_plant_slug_fkey,
  ADD  CONSTRAINT plant_task_calendar_default_plant_slug_fkey
    FOREIGN KEY (plant_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE plant_task_calendar_override
  DROP CONSTRAINT plant_task_calendar_override_plant_slug_fkey,
  ADD  CONSTRAINT plant_task_calendar_override_plant_slug_fkey
    FOREIGN KEY (plant_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE species_contributors
  DROP CONSTRAINT species_contributors_species_slug_fkey,
  ADD  CONSTRAINT species_contributors_species_slug_fkey
    FOREIGN KEY (species_slug) REFERENCES plant_species(slug)
    ON UPDATE CASCADE ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Simple renames
--    For each: UPDATE plant_species (FK tables cascade), INSERT alias,
--    then UPDATE the 8 non-FK tables manually.
-- ─────────────────────────────────────────────────────────────────────────────

-- fruit-apple → apple
UPDATE plant_species SET slug = 'apple' WHERE slug = 'fruit-apple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-apple', 'apple');
UPDATE grow_user_plants            SET species_slug = 'apple' WHERE species_slug = 'fruit-apple';
UPDATE grow_planting_calendar      SET plant_slug   = 'apple' WHERE plant_slug   = 'fruit-apple';
UPDATE grow_nursery_inventory      SET plant_slug   = 'apple' WHERE plant_slug   = 'fruit-apple';
UPDATE grow_seed_listings          SET plant_slug   = 'apple' WHERE plant_slug   = 'fruit-apple';
UPDATE grow_user_tasks             SET plant_slug   = 'apple' WHERE plant_slug   = 'fruit-apple';
UPDATE perenual_sync_logs          SET our_slug     = 'apple' WHERE our_slug     = 'fruit-apple';
UPDATE user_task_completions       SET plant_slug   = 'apple' WHERE plant_slug   = 'fruit-apple';

-- fruit-pear → pear
UPDATE plant_species SET slug = 'pear' WHERE slug = 'fruit-pear';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-pear', 'pear');
UPDATE grow_user_plants            SET species_slug = 'pear' WHERE species_slug = 'fruit-pear';
UPDATE grow_planting_calendar      SET plant_slug   = 'pear' WHERE plant_slug   = 'fruit-pear';
UPDATE grow_nursery_inventory      SET plant_slug   = 'pear' WHERE plant_slug   = 'fruit-pear';
UPDATE grow_seed_listings          SET plant_slug   = 'pear' WHERE plant_slug   = 'fruit-pear';
UPDATE grow_user_tasks             SET plant_slug   = 'pear' WHERE plant_slug   = 'fruit-pear';
UPDATE perenual_sync_logs          SET our_slug     = 'pear' WHERE our_slug     = 'fruit-pear';
UPDATE user_task_completions       SET plant_slug   = 'pear' WHERE plant_slug   = 'fruit-pear';

-- fruit-plum → plum
UPDATE plant_species SET slug = 'plum' WHERE slug = 'fruit-plum';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-plum', 'plum');
UPDATE grow_user_plants            SET species_slug = 'plum' WHERE species_slug = 'fruit-plum';
UPDATE grow_planting_calendar      SET plant_slug   = 'plum' WHERE plant_slug   = 'fruit-plum';
UPDATE grow_nursery_inventory      SET plant_slug   = 'plum' WHERE plant_slug   = 'fruit-plum';
UPDATE grow_seed_listings          SET plant_slug   = 'plum' WHERE plant_slug   = 'fruit-plum';
UPDATE grow_user_tasks             SET plant_slug   = 'plum' WHERE plant_slug   = 'fruit-plum';
UPDATE perenual_sync_logs          SET our_slug     = 'plum' WHERE our_slug     = 'fruit-plum';
UPDATE user_task_completions       SET plant_slug   = 'plum' WHERE plant_slug   = 'fruit-plum';

-- fruit-cherry-sweet → sweet-cherry
UPDATE plant_species SET slug = 'sweet-cherry' WHERE slug = 'fruit-cherry-sweet';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-cherry-sweet', 'sweet-cherry');
UPDATE grow_user_plants            SET species_slug = 'sweet-cherry' WHERE species_slug = 'fruit-cherry-sweet';
UPDATE grow_planting_calendar      SET plant_slug   = 'sweet-cherry' WHERE plant_slug   = 'fruit-cherry-sweet';
UPDATE grow_nursery_inventory      SET plant_slug   = 'sweet-cherry' WHERE plant_slug   = 'fruit-cherry-sweet';
UPDATE grow_seed_listings          SET plant_slug   = 'sweet-cherry' WHERE plant_slug   = 'fruit-cherry-sweet';
UPDATE grow_user_tasks             SET plant_slug   = 'sweet-cherry' WHERE plant_slug   = 'fruit-cherry-sweet';
UPDATE perenual_sync_logs          SET our_slug     = 'sweet-cherry' WHERE our_slug     = 'fruit-cherry-sweet';
UPDATE user_task_completions       SET plant_slug   = 'sweet-cherry' WHERE plant_slug   = 'fruit-cherry-sweet';

-- fruit-fig → fig
UPDATE plant_species SET slug = 'fig' WHERE slug = 'fruit-fig';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-fig', 'fig');
UPDATE grow_user_plants            SET species_slug = 'fig' WHERE species_slug = 'fruit-fig';
UPDATE grow_planting_calendar      SET plant_slug   = 'fig' WHERE plant_slug   = 'fruit-fig';
UPDATE grow_nursery_inventory      SET plant_slug   = 'fig' WHERE plant_slug   = 'fruit-fig';
UPDATE grow_seed_listings          SET plant_slug   = 'fig' WHERE plant_slug   = 'fruit-fig';
UPDATE grow_user_tasks             SET plant_slug   = 'fig' WHERE plant_slug   = 'fruit-fig';
UPDATE perenual_sync_logs          SET our_slug     = 'fig' WHERE our_slug     = 'fruit-fig';
UPDATE user_task_completions       SET plant_slug   = 'fig' WHERE plant_slug   = 'fruit-fig';

-- fruit-feijoa → feijoa
UPDATE plant_species SET slug = 'feijoa' WHERE slug = 'fruit-feijoa';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-feijoa', 'feijoa');
UPDATE grow_user_plants            SET species_slug = 'feijoa' WHERE species_slug = 'fruit-feijoa';
UPDATE grow_planting_calendar      SET plant_slug   = 'feijoa' WHERE plant_slug   = 'fruit-feijoa';
UPDATE grow_nursery_inventory      SET plant_slug   = 'feijoa' WHERE plant_slug   = 'fruit-feijoa';
UPDATE grow_seed_listings          SET plant_slug   = 'feijoa' WHERE plant_slug   = 'fruit-feijoa';
UPDATE grow_user_tasks             SET plant_slug   = 'feijoa' WHERE plant_slug   = 'fruit-feijoa';
UPDATE perenual_sync_logs          SET our_slug     = 'feijoa' WHERE our_slug     = 'fruit-feijoa';
UPDATE user_task_completions       SET plant_slug   = 'feijoa' WHERE plant_slug   = 'fruit-feijoa';

-- fruit-blackcurrant → blackcurrant
UPDATE plant_species SET slug = 'blackcurrant' WHERE slug = 'fruit-blackcurrant';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-blackcurrant', 'blackcurrant');
UPDATE grow_user_plants            SET species_slug = 'blackcurrant' WHERE species_slug = 'fruit-blackcurrant';
UPDATE grow_planting_calendar      SET plant_slug   = 'blackcurrant' WHERE plant_slug   = 'fruit-blackcurrant';
UPDATE grow_nursery_inventory      SET plant_slug   = 'blackcurrant' WHERE plant_slug   = 'fruit-blackcurrant';
UPDATE grow_seed_listings          SET plant_slug   = 'blackcurrant' WHERE plant_slug   = 'fruit-blackcurrant';
UPDATE grow_user_tasks             SET plant_slug   = 'blackcurrant' WHERE plant_slug   = 'fruit-blackcurrant';
UPDATE perenual_sync_logs          SET our_slug     = 'blackcurrant' WHERE our_slug     = 'fruit-blackcurrant';
UPDATE user_task_completions       SET plant_slug   = 'blackcurrant' WHERE plant_slug   = 'fruit-blackcurrant';

-- fruit-autumn-olive → autumn-olive
UPDATE plant_species SET slug = 'autumn-olive' WHERE slug = 'fruit-autumn-olive';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-autumn-olive', 'autumn-olive');
UPDATE grow_user_plants            SET species_slug = 'autumn-olive' WHERE species_slug = 'fruit-autumn-olive';
UPDATE grow_planting_calendar      SET plant_slug   = 'autumn-olive' WHERE plant_slug   = 'fruit-autumn-olive';
UPDATE grow_nursery_inventory      SET plant_slug   = 'autumn-olive' WHERE plant_slug   = 'fruit-autumn-olive';
UPDATE grow_seed_listings          SET plant_slug   = 'autumn-olive' WHERE plant_slug   = 'fruit-autumn-olive';
UPDATE grow_user_tasks             SET plant_slug   = 'autumn-olive' WHERE plant_slug   = 'fruit-autumn-olive';
UPDATE perenual_sync_logs          SET our_slug     = 'autumn-olive' WHERE our_slug     = 'fruit-autumn-olive';
UPDATE user_task_completions       SET plant_slug   = 'autumn-olive' WHERE plant_slug   = 'fruit-autumn-olive';

-- fruit-hazelnut → hazelnut
UPDATE plant_species SET slug = 'hazelnut' WHERE slug = 'fruit-hazelnut';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-hazelnut', 'hazelnut');
UPDATE grow_user_plants            SET species_slug = 'hazelnut' WHERE species_slug = 'fruit-hazelnut';
UPDATE grow_planting_calendar      SET plant_slug   = 'hazelnut' WHERE plant_slug   = 'fruit-hazelnut';
UPDATE grow_nursery_inventory      SET plant_slug   = 'hazelnut' WHERE plant_slug   = 'fruit-hazelnut';
UPDATE grow_seed_listings          SET plant_slug   = 'hazelnut' WHERE plant_slug   = 'fruit-hazelnut';
UPDATE grow_user_tasks             SET plant_slug   = 'hazelnut' WHERE plant_slug   = 'fruit-hazelnut';
UPDATE perenual_sync_logs          SET our_slug     = 'hazelnut' WHERE our_slug     = 'fruit-hazelnut';
UPDATE user_task_completions       SET plant_slug   = 'hazelnut' WHERE plant_slug   = 'fruit-hazelnut';

-- fruit-hardy-kiwi → hardy-kiwi
UPDATE plant_species SET slug = 'hardy-kiwi' WHERE slug = 'fruit-hardy-kiwi';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-hardy-kiwi', 'hardy-kiwi');
UPDATE grow_user_plants            SET species_slug = 'hardy-kiwi' WHERE species_slug = 'fruit-hardy-kiwi';
UPDATE grow_planting_calendar      SET plant_slug   = 'hardy-kiwi' WHERE plant_slug   = 'fruit-hardy-kiwi';
UPDATE grow_nursery_inventory      SET plant_slug   = 'hardy-kiwi' WHERE plant_slug   = 'fruit-hardy-kiwi';
UPDATE grow_seed_listings          SET plant_slug   = 'hardy-kiwi' WHERE plant_slug   = 'fruit-hardy-kiwi';
UPDATE grow_user_tasks             SET plant_slug   = 'hardy-kiwi' WHERE plant_slug   = 'fruit-hardy-kiwi';
UPDATE perenual_sync_logs          SET our_slug     = 'hardy-kiwi' WHERE our_slug     = 'fruit-hardy-kiwi';
UPDATE user_task_completions       SET plant_slug   = 'hardy-kiwi' WHERE plant_slug   = 'fruit-hardy-kiwi';

-- fruit-jostaberry-treeform → jostaberry
UPDATE plant_species SET slug = 'jostaberry' WHERE slug = 'fruit-jostaberry-treeform';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-jostaberry-treeform', 'jostaberry');
UPDATE grow_user_plants            SET species_slug = 'jostaberry' WHERE species_slug = 'fruit-jostaberry-treeform';
UPDATE grow_planting_calendar      SET plant_slug   = 'jostaberry' WHERE plant_slug   = 'fruit-jostaberry-treeform';
UPDATE grow_nursery_inventory      SET plant_slug   = 'jostaberry' WHERE plant_slug   = 'fruit-jostaberry-treeform';
UPDATE grow_seed_listings          SET plant_slug   = 'jostaberry' WHERE plant_slug   = 'fruit-jostaberry-treeform';
UPDATE grow_user_tasks             SET plant_slug   = 'jostaberry' WHERE plant_slug   = 'fruit-jostaberry-treeform';
UPDATE perenual_sync_logs          SET our_slug     = 'jostaberry' WHERE our_slug     = 'fruit-jostaberry-treeform';
UPDATE user_task_completions       SET plant_slug   = 'jostaberry' WHERE plant_slug   = 'fruit-jostaberry-treeform';

-- fruit-juniper-berry → juniper
UPDATE plant_species SET slug = 'juniper' WHERE slug = 'fruit-juniper-berry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-juniper-berry', 'juniper');
UPDATE grow_user_plants            SET species_slug = 'juniper' WHERE species_slug = 'fruit-juniper-berry';
UPDATE grow_planting_calendar      SET plant_slug   = 'juniper' WHERE plant_slug   = 'fruit-juniper-berry';
UPDATE grow_nursery_inventory      SET plant_slug   = 'juniper' WHERE plant_slug   = 'fruit-juniper-berry';
UPDATE grow_seed_listings          SET plant_slug   = 'juniper' WHERE plant_slug   = 'fruit-juniper-berry';
UPDATE grow_user_tasks             SET plant_slug   = 'juniper' WHERE plant_slug   = 'fruit-juniper-berry';
UPDATE perenual_sync_logs          SET our_slug     = 'juniper' WHERE our_slug     = 'fruit-juniper-berry';
UPDATE user_task_completions       SET plant_slug   = 'juniper' WHERE plant_slug   = 'fruit-juniper-berry';

-- fruit-lime → lime
UPDATE plant_species SET slug = 'lime' WHERE slug = 'fruit-lime';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-lime', 'lime');
UPDATE grow_user_plants            SET species_slug = 'lime' WHERE species_slug = 'fruit-lime';
UPDATE grow_planting_calendar      SET plant_slug   = 'lime' WHERE plant_slug   = 'fruit-lime';
UPDATE grow_nursery_inventory      SET plant_slug   = 'lime' WHERE plant_slug   = 'fruit-lime';
UPDATE grow_seed_listings          SET plant_slug   = 'lime' WHERE plant_slug   = 'fruit-lime';
UPDATE grow_user_tasks             SET plant_slug   = 'lime' WHERE plant_slug   = 'fruit-lime';
UPDATE perenual_sync_logs          SET our_slug     = 'lime' WHERE our_slug     = 'fruit-lime';
UPDATE user_task_completions       SET plant_slug   = 'lime' WHERE plant_slug   = 'fruit-lime';

-- fruit-mandarin → mandarin
UPDATE plant_species SET slug = 'mandarin' WHERE slug = 'fruit-mandarin';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-mandarin', 'mandarin');
UPDATE grow_user_plants            SET species_slug = 'mandarin' WHERE species_slug = 'fruit-mandarin';
UPDATE grow_planting_calendar      SET plant_slug   = 'mandarin' WHERE plant_slug   = 'fruit-mandarin';
UPDATE grow_nursery_inventory      SET plant_slug   = 'mandarin' WHERE plant_slug   = 'fruit-mandarin';
UPDATE grow_seed_listings          SET plant_slug   = 'mandarin' WHERE plant_slug   = 'fruit-mandarin';
UPDATE grow_user_tasks             SET plant_slug   = 'mandarin' WHERE plant_slug   = 'fruit-mandarin';
UPDATE perenual_sync_logs          SET our_slug     = 'mandarin' WHERE our_slug     = 'fruit-mandarin';
UPDATE user_task_completions       SET plant_slug   = 'mandarin' WHERE plant_slug   = 'fruit-mandarin';

-- fruit-orange → orange
UPDATE plant_species SET slug = 'orange' WHERE slug = 'fruit-orange';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-orange', 'orange');
UPDATE grow_user_plants            SET species_slug = 'orange' WHERE species_slug = 'fruit-orange';
UPDATE grow_planting_calendar      SET plant_slug   = 'orange' WHERE plant_slug   = 'fruit-orange';
UPDATE grow_nursery_inventory      SET plant_slug   = 'orange' WHERE plant_slug   = 'fruit-orange';
UPDATE grow_seed_listings          SET plant_slug   = 'orange' WHERE plant_slug   = 'fruit-orange';
UPDATE grow_user_tasks             SET plant_slug   = 'orange' WHERE plant_slug   = 'fruit-orange';
UPDATE perenual_sync_logs          SET our_slug     = 'orange' WHERE our_slug     = 'fruit-orange';
UPDATE user_task_completions       SET plant_slug   = 'orange' WHERE plant_slug   = 'fruit-orange';

-- tree-alder-common → alder
UPDATE plant_species SET slug = 'alder' WHERE slug = 'tree-alder-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-alder-common', 'alder');
UPDATE grow_user_plants            SET species_slug = 'alder' WHERE species_slug = 'tree-alder-common';
UPDATE grow_planting_calendar      SET plant_slug   = 'alder' WHERE plant_slug   = 'tree-alder-common';
UPDATE grow_nursery_inventory      SET plant_slug   = 'alder' WHERE plant_slug   = 'tree-alder-common';
UPDATE grow_seed_listings          SET plant_slug   = 'alder' WHERE plant_slug   = 'tree-alder-common';
UPDATE grow_user_tasks             SET plant_slug   = 'alder' WHERE plant_slug   = 'tree-alder-common';
UPDATE perenual_sync_logs          SET our_slug     = 'alder' WHERE our_slug     = 'tree-alder-common';
UPDATE user_task_completions       SET plant_slug   = 'alder' WHERE plant_slug   = 'tree-alder-common';

-- tree-hawthorn-common → hawthorn
UPDATE plant_species SET slug = 'hawthorn' WHERE slug = 'tree-hawthorn-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-hawthorn-common', 'hawthorn');
UPDATE grow_user_plants            SET species_slug = 'hawthorn' WHERE species_slug = 'tree-hawthorn-common';
UPDATE grow_planting_calendar      SET plant_slug   = 'hawthorn' WHERE plant_slug   = 'tree-hawthorn-common';
UPDATE grow_nursery_inventory      SET plant_slug   = 'hawthorn' WHERE plant_slug   = 'tree-hawthorn-common';
UPDATE grow_seed_listings          SET plant_slug   = 'hawthorn' WHERE plant_slug   = 'tree-hawthorn-common';
UPDATE grow_user_tasks             SET plant_slug   = 'hawthorn' WHERE plant_slug   = 'tree-hawthorn-common';
UPDATE perenual_sync_logs          SET our_slug     = 'hawthorn' WHERE our_slug     = 'tree-hawthorn-common';
UPDATE user_task_completions       SET plant_slug   = 'hawthorn' WHERE plant_slug   = 'tree-hawthorn-common';

-- tree-holly → holly
UPDATE plant_species SET slug = 'holly' WHERE slug = 'tree-holly';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-holly', 'holly');
UPDATE grow_user_plants            SET species_slug = 'holly' WHERE species_slug = 'tree-holly';
UPDATE grow_planting_calendar      SET plant_slug   = 'holly' WHERE plant_slug   = 'tree-holly';
UPDATE grow_nursery_inventory      SET plant_slug   = 'holly' WHERE plant_slug   = 'tree-holly';
UPDATE grow_seed_listings          SET plant_slug   = 'holly' WHERE plant_slug   = 'tree-holly';
UPDATE grow_user_tasks             SET plant_slug   = 'holly' WHERE plant_slug   = 'tree-holly';
UPDATE perenual_sync_logs          SET our_slug     = 'holly' WHERE our_slug     = 'tree-holly';
UPDATE user_task_completions       SET plant_slug   = 'holly' WHERE plant_slug   = 'tree-holly';

-- walnut-english → walnut
UPDATE plant_species SET slug = 'walnut' WHERE slug = 'walnut-english';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('walnut-english', 'walnut');
UPDATE grow_user_plants            SET species_slug = 'walnut' WHERE species_slug = 'walnut-english';
UPDATE grow_planting_calendar      SET plant_slug   = 'walnut' WHERE plant_slug   = 'walnut-english';
UPDATE grow_nursery_inventory      SET plant_slug   = 'walnut' WHERE plant_slug   = 'walnut-english';
UPDATE grow_seed_listings          SET plant_slug   = 'walnut' WHERE plant_slug   = 'walnut-english';
UPDATE grow_user_tasks             SET plant_slug   = 'walnut' WHERE plant_slug   = 'walnut-english';
UPDATE perenual_sync_logs          SET our_slug     = 'walnut' WHERE our_slug     = 'walnut-english';
UPDATE user_task_completions       SET plant_slug   = 'walnut' WHERE plant_slug   = 'walnut-english';

-- herb-borage → borage
UPDATE plant_species SET slug = 'borage' WHERE slug = 'herb-borage';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-borage', 'borage');
UPDATE grow_user_plants            SET species_slug = 'borage' WHERE species_slug = 'herb-borage';
UPDATE grow_planting_calendar      SET plant_slug   = 'borage' WHERE plant_slug   = 'herb-borage';
UPDATE grow_nursery_inventory      SET plant_slug   = 'borage' WHERE plant_slug   = 'herb-borage';
UPDATE grow_seed_listings          SET plant_slug   = 'borage' WHERE plant_slug   = 'herb-borage';
UPDATE grow_user_tasks             SET plant_slug   = 'borage' WHERE plant_slug   = 'herb-borage';
UPDATE perenual_sync_logs          SET our_slug     = 'borage' WHERE our_slug     = 'herb-borage';
UPDATE user_task_completions       SET plant_slug   = 'borage' WHERE plant_slug   = 'herb-borage';

-- herb-comfrey → comfrey
UPDATE plant_species SET slug = 'comfrey' WHERE slug = 'herb-comfrey';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-comfrey', 'comfrey');
UPDATE grow_user_plants            SET species_slug = 'comfrey' WHERE species_slug = 'herb-comfrey';
UPDATE grow_planting_calendar      SET plant_slug   = 'comfrey' WHERE plant_slug   = 'herb-comfrey';
UPDATE grow_nursery_inventory      SET plant_slug   = 'comfrey' WHERE plant_slug   = 'herb-comfrey';
UPDATE grow_seed_listings          SET plant_slug   = 'comfrey' WHERE plant_slug   = 'herb-comfrey';
UPDATE grow_user_tasks             SET plant_slug   = 'comfrey' WHERE plant_slug   = 'herb-comfrey';
UPDATE perenual_sync_logs          SET our_slug     = 'comfrey' WHERE our_slug     = 'herb-comfrey';
UPDATE user_task_completions       SET plant_slug   = 'comfrey' WHERE plant_slug   = 'herb-comfrey';

-- herb-sage-common → sage
UPDATE plant_species SET slug = 'sage' WHERE slug = 'herb-sage-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-sage-common', 'sage');
UPDATE grow_user_plants            SET species_slug = 'sage' WHERE species_slug = 'herb-sage-common';
UPDATE grow_planting_calendar      SET plant_slug   = 'sage' WHERE plant_slug   = 'herb-sage-common';
UPDATE grow_nursery_inventory      SET plant_slug   = 'sage' WHERE plant_slug   = 'herb-sage-common';
UPDATE grow_seed_listings          SET plant_slug   = 'sage' WHERE plant_slug   = 'herb-sage-common';
UPDATE grow_user_tasks             SET plant_slug   = 'sage' WHERE plant_slug   = 'herb-sage-common';
UPDATE perenual_sync_logs          SET our_slug     = 'sage' WHERE our_slug     = 'herb-sage-common';
UPDATE user_task_completions       SET plant_slug   = 'sage' WHERE plant_slug   = 'herb-sage-common';

-- herb-thyme-common → thyme
UPDATE plant_species SET slug = 'thyme' WHERE slug = 'herb-thyme-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-thyme-common', 'thyme');
UPDATE grow_user_plants            SET species_slug = 'thyme' WHERE species_slug = 'herb-thyme-common';
UPDATE grow_planting_calendar      SET plant_slug   = 'thyme' WHERE plant_slug   = 'herb-thyme-common';
UPDATE grow_nursery_inventory      SET plant_slug   = 'thyme' WHERE plant_slug   = 'herb-thyme-common';
UPDATE grow_seed_listings          SET plant_slug   = 'thyme' WHERE plant_slug   = 'herb-thyme-common';
UPDATE grow_user_tasks             SET plant_slug   = 'thyme' WHERE plant_slug   = 'herb-thyme-common';
UPDATE perenual_sync_logs          SET our_slug     = 'thyme' WHERE our_slug     = 'herb-thyme-common';
UPDATE user_task_completions       SET plant_slug   = 'thyme' WHERE plant_slug   = 'herb-thyme-common';

-- herb-basil-greek → basil-greek
UPDATE plant_species SET slug = 'basil-greek' WHERE slug = 'herb-basil-greek';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-basil-greek', 'basil-greek');
UPDATE grow_user_plants            SET species_slug = 'basil-greek' WHERE species_slug = 'herb-basil-greek';
UPDATE grow_planting_calendar      SET plant_slug   = 'basil-greek' WHERE plant_slug   = 'herb-basil-greek';
UPDATE grow_nursery_inventory      SET plant_slug   = 'basil-greek' WHERE plant_slug   = 'herb-basil-greek';
UPDATE grow_seed_listings          SET plant_slug   = 'basil-greek' WHERE plant_slug   = 'herb-basil-greek';
UPDATE grow_user_tasks             SET plant_slug   = 'basil-greek' WHERE plant_slug   = 'herb-basil-greek';
UPDATE perenual_sync_logs          SET our_slug     = 'basil-greek' WHERE our_slug     = 'herb-basil-greek';
UPDATE user_task_completions       SET plant_slug   = 'basil-greek' WHERE plant_slug   = 'herb-basil-greek';

-- herb-parsley-curly → parsley-curly
UPDATE plant_species SET slug = 'parsley-curly' WHERE slug = 'herb-parsley-curly';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-parsley-curly', 'parsley-curly');
UPDATE grow_user_plants            SET species_slug = 'parsley-curly' WHERE species_slug = 'herb-parsley-curly';
UPDATE grow_planting_calendar      SET plant_slug   = 'parsley-curly' WHERE plant_slug   = 'herb-parsley-curly';
UPDATE grow_nursery_inventory      SET plant_slug   = 'parsley-curly' WHERE plant_slug   = 'herb-parsley-curly';
UPDATE grow_seed_listings          SET plant_slug   = 'parsley-curly' WHERE plant_slug   = 'herb-parsley-curly';
UPDATE grow_user_tasks             SET plant_slug   = 'parsley-curly' WHERE plant_slug   = 'herb-parsley-curly';
UPDATE perenual_sync_logs          SET our_slug     = 'parsley-curly' WHERE our_slug     = 'herb-parsley-curly';
UPDATE user_task_completions       SET plant_slug   = 'parsley-curly' WHERE plant_slug   = 'herb-parsley-curly';

-- herb-parsley-flat → parsley-flat
UPDATE plant_species SET slug = 'parsley-flat' WHERE slug = 'herb-parsley-flat';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-parsley-flat', 'parsley-flat');
UPDATE grow_user_plants            SET species_slug = 'parsley-flat' WHERE species_slug = 'herb-parsley-flat';
UPDATE grow_planting_calendar      SET plant_slug   = 'parsley-flat' WHERE plant_slug   = 'herb-parsley-flat';
UPDATE grow_nursery_inventory      SET plant_slug   = 'parsley-flat' WHERE plant_slug   = 'herb-parsley-flat';
UPDATE grow_seed_listings          SET plant_slug   = 'parsley-flat' WHERE plant_slug   = 'herb-parsley-flat';
UPDATE grow_user_tasks             SET plant_slug   = 'parsley-flat' WHERE plant_slug   = 'herb-parsley-flat';
UPDATE perenual_sync_logs          SET our_slug     = 'parsley-flat' WHERE our_slug     = 'herb-parsley-flat';
UPDATE user_task_completions       SET plant_slug   = 'parsley-flat' WHERE plant_slug   = 'herb-parsley-flat';

-- pepper → sweet-pepper
UPDATE plant_species SET slug = 'sweet-pepper' WHERE slug = 'pepper';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('pepper', 'sweet-pepper');
UPDATE grow_user_plants            SET species_slug = 'sweet-pepper' WHERE species_slug = 'pepper';
UPDATE grow_planting_calendar      SET plant_slug   = 'sweet-pepper' WHERE plant_slug   = 'pepper';
UPDATE grow_nursery_inventory      SET plant_slug   = 'sweet-pepper' WHERE plant_slug   = 'pepper';
UPDATE grow_seed_listings          SET plant_slug   = 'sweet-pepper' WHERE plant_slug   = 'pepper';
UPDATE grow_user_tasks             SET plant_slug   = 'sweet-pepper' WHERE plant_slug   = 'pepper';
UPDATE perenual_sync_logs          SET our_slug     = 'sweet-pepper' WHERE our_slug     = 'pepper';
UPDATE user_task_completions       SET plant_slug   = 'sweet-pepper' WHERE plant_slug   = 'pepper';

-- pepper-chilli → chilli
UPDATE plant_species SET slug = 'chilli' WHERE slug = 'pepper-chilli';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('pepper-chilli', 'chilli');
UPDATE grow_user_plants            SET species_slug = 'chilli' WHERE species_slug = 'pepper-chilli';
UPDATE grow_planting_calendar      SET plant_slug   = 'chilli' WHERE plant_slug   = 'pepper-chilli';
UPDATE grow_nursery_inventory      SET plant_slug   = 'chilli' WHERE plant_slug   = 'pepper-chilli';
UPDATE grow_seed_listings          SET plant_slug   = 'chilli' WHERE plant_slug   = 'pepper-chilli';
UPDATE grow_user_tasks             SET plant_slug   = 'chilli' WHERE plant_slug   = 'pepper-chilli';
UPDATE perenual_sync_logs          SET our_slug     = 'chilli' WHERE our_slug     = 'pepper-chilli';
UPDATE user_task_completions       SET plant_slug   = 'chilli' WHERE plant_slug   = 'pepper-chilli';

-- hop-common → hop
UPDATE plant_species SET slug = 'hop' WHERE slug = 'hop-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('hop-common', 'hop');
UPDATE grow_user_plants            SET species_slug = 'hop' WHERE species_slug = 'hop-common';
UPDATE grow_planting_calendar      SET plant_slug   = 'hop' WHERE plant_slug   = 'hop-common';
UPDATE grow_nursery_inventory      SET plant_slug   = 'hop' WHERE plant_slug   = 'hop-common';
UPDATE grow_seed_listings          SET plant_slug   = 'hop' WHERE plant_slug   = 'hop-common';
UPDATE grow_user_tasks             SET plant_slug   = 'hop' WHERE plant_slug   = 'hop-common';
UPDATE perenual_sync_logs          SET our_slug     = 'hop' WHERE our_slug     = 'hop-common';
UPDATE user_task_completions       SET plant_slug   = 'hop' WHERE plant_slug   = 'hop-common';

-- cabbage-savoy → savoy-cabbage
UPDATE plant_species SET slug = 'savoy-cabbage' WHERE slug = 'cabbage-savoy';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('cabbage-savoy', 'savoy-cabbage');
UPDATE grow_user_plants            SET species_slug = 'savoy-cabbage' WHERE species_slug = 'cabbage-savoy';
UPDATE grow_planting_calendar      SET plant_slug   = 'savoy-cabbage' WHERE plant_slug   = 'cabbage-savoy';
UPDATE grow_nursery_inventory      SET plant_slug   = 'savoy-cabbage' WHERE plant_slug   = 'cabbage-savoy';
UPDATE grow_seed_listings          SET plant_slug   = 'savoy-cabbage' WHERE plant_slug   = 'cabbage-savoy';
UPDATE grow_user_tasks             SET plant_slug   = 'savoy-cabbage' WHERE plant_slug   = 'cabbage-savoy';
UPDATE perenual_sync_logs          SET our_slug     = 'savoy-cabbage' WHERE our_slug     = 'cabbage-savoy';
UPDATE user_task_completions       SET plant_slug   = 'savoy-cabbage' WHERE plant_slug   = 'cabbage-savoy';

-- daikon-radish → daikon
UPDATE plant_species SET slug = 'daikon' WHERE slug = 'daikon-radish';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('daikon-radish', 'daikon');
UPDATE grow_user_plants            SET species_slug = 'daikon' WHERE species_slug = 'daikon-radish';
UPDATE grow_planting_calendar      SET plant_slug   = 'daikon' WHERE plant_slug   = 'daikon-radish';
UPDATE grow_nursery_inventory      SET plant_slug   = 'daikon' WHERE plant_slug   = 'daikon-radish';
UPDATE grow_seed_listings          SET plant_slug   = 'daikon' WHERE plant_slug   = 'daikon-radish';
UPDATE grow_user_tasks             SET plant_slug   = 'daikon' WHERE plant_slug   = 'daikon-radish';
UPDATE perenual_sync_logs          SET our_slug     = 'daikon' WHERE our_slug     = 'daikon-radish';
UPDATE user_task_completions       SET plant_slug   = 'daikon' WHERE plant_slug   = 'daikon-radish';

-- squash-winter → winter-squash
UPDATE plant_species SET slug = 'winter-squash' WHERE slug = 'squash-winter';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('squash-winter', 'winter-squash');
UPDATE grow_user_plants            SET species_slug = 'winter-squash' WHERE species_slug = 'squash-winter';
UPDATE grow_planting_calendar      SET plant_slug   = 'winter-squash' WHERE plant_slug   = 'squash-winter';
UPDATE grow_nursery_inventory      SET plant_slug   = 'winter-squash' WHERE plant_slug   = 'squash-winter';
UPDATE grow_seed_listings          SET plant_slug   = 'winter-squash' WHERE plant_slug   = 'squash-winter';
UPDATE grow_user_tasks             SET plant_slug   = 'winter-squash' WHERE plant_slug   = 'squash-winter';
UPDATE perenual_sync_logs          SET our_slug     = 'winter-squash' WHERE our_slug     = 'squash-winter';
UPDATE user_task_completions       SET plant_slug   = 'winter-squash' WHERE plant_slug   = 'squash-winter';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Merge into existing rows
--    These target slugs already exist as separate plant_species rows.
--    Strategy: canonical row keeps its content; old row's FK references and
--    non-FK references are redirected to canonical, then old row is deleted.
-- ─────────────────────────────────────────────────────────────────────────────

-- herb-catmint-ornamental → catmint  (catmint row already exists)
UPDATE cultivars              SET species_slug = 'catmint' WHERE species_slug = 'herb-catmint-ornamental';
UPDATE guild_blueprint        SET focal_slug   = 'catmint' WHERE focal_slug   = 'herb-catmint-ornamental';
UPDATE guild_blueprint_member SET plant_slug   = 'catmint' WHERE plant_slug   = 'herb-catmint-ornamental';
UPDATE plant_function         SET plant_slug   = 'catmint' WHERE plant_slug   = 'herb-catmint-ornamental';
UPDATE grow_user_plants SET species_slug = 'catmint' WHERE species_slug = 'herb-catmint-ornamental' AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'catmint');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-catmint-ornamental';
UPDATE grow_planting_calendar SET plant_slug   = 'catmint' WHERE plant_slug   = 'herb-catmint-ornamental';
UPDATE grow_nursery_inventory SET plant_slug   = 'catmint' WHERE plant_slug   = 'herb-catmint-ornamental';
UPDATE grow_seed_listings     SET plant_slug   = 'catmint' WHERE plant_slug   = 'herb-catmint-ornamental';
UPDATE grow_user_tasks        SET plant_slug   = 'catmint' WHERE plant_slug   = 'herb-catmint-ornamental';
UPDATE perenual_sync_logs     SET our_slug     = 'catmint' WHERE our_slug     = 'herb-catmint-ornamental';
UPDATE user_task_completions  SET plant_slug   = 'catmint' WHERE plant_slug   = 'herb-catmint-ornamental';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-catmint-ornamental', 'catmint');
DELETE FROM plant_species WHERE slug = 'herb-catmint-ornamental';

-- herb-dill-leaf → dill  (dill row already exists)
UPDATE cultivars              SET species_slug = 'dill' WHERE species_slug = 'herb-dill-leaf';
UPDATE guild_blueprint        SET focal_slug   = 'dill' WHERE focal_slug   = 'herb-dill-leaf';
UPDATE guild_blueprint_member SET plant_slug   = 'dill' WHERE plant_slug   = 'herb-dill-leaf';
UPDATE plant_function         SET plant_slug   = 'dill' WHERE plant_slug   = 'herb-dill-leaf';
UPDATE grow_user_plants SET species_slug = 'dill' WHERE species_slug = 'herb-dill-leaf' AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'dill');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-dill-leaf';
UPDATE grow_planting_calendar SET plant_slug   = 'dill' WHERE plant_slug   = 'herb-dill-leaf';
UPDATE grow_nursery_inventory SET plant_slug   = 'dill' WHERE plant_slug   = 'herb-dill-leaf';
UPDATE grow_seed_listings     SET plant_slug   = 'dill' WHERE plant_slug   = 'herb-dill-leaf';
UPDATE grow_user_tasks        SET plant_slug   = 'dill' WHERE plant_slug   = 'herb-dill-leaf';
UPDATE perenual_sync_logs     SET our_slug     = 'dill' WHERE our_slug     = 'herb-dill-leaf';
UPDATE user_task_completions  SET plant_slug   = 'dill' WHERE plant_slug   = 'herb-dill-leaf';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-dill-leaf', 'dill');
DELETE FROM plant_species WHERE slug = 'herb-dill-leaf';

-- tree-sweet-chestnut → sweet-chestnut  (sweet-chestnut row already exists)
UPDATE cultivars              SET species_slug = 'sweet-chestnut' WHERE species_slug = 'tree-sweet-chestnut';
UPDATE guild_blueprint        SET focal_slug   = 'sweet-chestnut' WHERE focal_slug   = 'tree-sweet-chestnut';
UPDATE guild_blueprint_member SET plant_slug   = 'sweet-chestnut' WHERE plant_slug   = 'tree-sweet-chestnut';
UPDATE plant_function         SET plant_slug   = 'sweet-chestnut' WHERE plant_slug   = 'tree-sweet-chestnut';
UPDATE grow_user_plants SET species_slug = 'sweet-chestnut' WHERE species_slug = 'tree-sweet-chestnut' AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'sweet-chestnut');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-sweet-chestnut';
UPDATE grow_planting_calendar SET plant_slug   = 'sweet-chestnut' WHERE plant_slug   = 'tree-sweet-chestnut';
UPDATE grow_nursery_inventory SET plant_slug   = 'sweet-chestnut' WHERE plant_slug   = 'tree-sweet-chestnut';
UPDATE grow_seed_listings     SET plant_slug   = 'sweet-chestnut' WHERE plant_slug   = 'tree-sweet-chestnut';
UPDATE grow_user_tasks        SET plant_slug   = 'sweet-chestnut' WHERE plant_slug   = 'tree-sweet-chestnut';
UPDATE perenual_sync_logs     SET our_slug     = 'sweet-chestnut' WHERE our_slug     = 'tree-sweet-chestnut';
UPDATE user_task_completions  SET plant_slug   = 'sweet-chestnut' WHERE plant_slug   = 'tree-sweet-chestnut';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-sweet-chestnut', 'sweet-chestnut');
DELETE FROM plant_species WHERE slug = 'tree-sweet-chestnut';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Duplicate merges
-- ─────────────────────────────────────────────────────────────────────────────

-- onion-bulb → onion
-- onion exists but has no advice; onion-bulb has advice — copy it across first.
UPDATE plant_species
  SET advice = (SELECT advice FROM plant_species WHERE slug = 'onion-bulb')
  WHERE slug = 'onion';
UPDATE cultivars              SET species_slug = 'onion' WHERE species_slug = 'onion-bulb';
UPDATE guild_blueprint        SET focal_slug   = 'onion' WHERE focal_slug   = 'onion-bulb';
UPDATE guild_blueprint_member SET plant_slug   = 'onion' WHERE plant_slug   = 'onion-bulb';
UPDATE plant_function         SET plant_slug   = 'onion' WHERE plant_slug   = 'onion-bulb';
UPDATE grow_user_plants SET species_slug = 'onion' WHERE species_slug = 'onion-bulb' AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'onion');
DELETE FROM grow_user_plants WHERE species_slug = 'onion-bulb';
UPDATE grow_planting_calendar SET plant_slug   = 'onion' WHERE plant_slug   = 'onion-bulb';
UPDATE grow_nursery_inventory SET plant_slug   = 'onion' WHERE plant_slug   = 'onion-bulb';
UPDATE grow_seed_listings     SET plant_slug   = 'onion' WHERE plant_slug   = 'onion-bulb';
UPDATE grow_user_tasks        SET plant_slug   = 'onion' WHERE plant_slug   = 'onion-bulb';
UPDATE perenual_sync_logs     SET our_slug     = 'onion' WHERE our_slug     = 'onion-bulb';
UPDATE user_task_completions  SET plant_slug   = 'onion' WHERE plant_slug   = 'onion-bulb';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('onion-bulb', 'onion');
DELETE FROM plant_species WHERE slug = 'onion-bulb';

-- chive → chives  (rename — becomes the canonical row)
-- herb-chives-common → chives  (merge into the renamed row)
UPDATE plant_species SET slug = 'chives' WHERE slug = 'chive';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('chive', 'chives');
UPDATE grow_user_plants SET species_slug = 'chives' WHERE species_slug = 'chive' AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'chives');
DELETE FROM grow_user_plants WHERE species_slug = 'chive';
UPDATE grow_planting_calendar      SET plant_slug   = 'chives' WHERE plant_slug   = 'chive';
UPDATE grow_nursery_inventory      SET plant_slug   = 'chives' WHERE plant_slug   = 'chive';
UPDATE grow_seed_listings          SET plant_slug   = 'chives' WHERE plant_slug   = 'chive';
UPDATE grow_user_tasks             SET plant_slug   = 'chives' WHERE plant_slug   = 'chive';
UPDATE perenual_sync_logs          SET our_slug     = 'chives' WHERE our_slug     = 'chive';
UPDATE user_task_completions       SET plant_slug   = 'chives' WHERE plant_slug   = 'chive';

UPDATE cultivars              SET species_slug = 'chives' WHERE species_slug = 'herb-chives-common';
UPDATE guild_blueprint        SET focal_slug   = 'chives' WHERE focal_slug   = 'herb-chives-common';
UPDATE guild_blueprint_member SET plant_slug   = 'chives' WHERE plant_slug   = 'herb-chives-common';
UPDATE plant_function         SET plant_slug   = 'chives' WHERE plant_slug   = 'herb-chives-common';
UPDATE grow_user_plants SET species_slug = 'chives' WHERE species_slug = 'herb-chives-common' AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'chives');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-chives-common';
UPDATE grow_planting_calendar SET plant_slug   = 'chives' WHERE plant_slug   = 'herb-chives-common';
UPDATE grow_nursery_inventory SET plant_slug   = 'chives' WHERE plant_slug   = 'herb-chives-common';
UPDATE grow_seed_listings     SET plant_slug   = 'chives' WHERE plant_slug   = 'herb-chives-common';
UPDATE grow_user_tasks        SET plant_slug   = 'chives' WHERE plant_slug   = 'herb-chives-common';
UPDATE perenual_sync_logs     SET our_slug     = 'chives' WHERE our_slug     = 'herb-chives-common';
UPDATE user_task_completions  SET plant_slug   = 'chives' WHERE plant_slug   = 'herb-chives-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-chives-common', 'chives');
DELETE FROM plant_species WHERE slug = 'herb-chives-common';

-- herb-coriander-leaf → coriander  (coriander row already exists)
UPDATE cultivars              SET species_slug = 'coriander' WHERE species_slug = 'herb-coriander-leaf';
UPDATE guild_blueprint        SET focal_slug   = 'coriander' WHERE focal_slug   = 'herb-coriander-leaf';
UPDATE guild_blueprint_member SET plant_slug   = 'coriander' WHERE plant_slug   = 'herb-coriander-leaf';
UPDATE plant_function         SET plant_slug   = 'coriander' WHERE plant_slug   = 'herb-coriander-leaf';
UPDATE grow_user_plants SET species_slug = 'coriander' WHERE species_slug = 'herb-coriander-leaf' AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'coriander');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-coriander-leaf';
UPDATE grow_planting_calendar SET plant_slug   = 'coriander' WHERE plant_slug   = 'herb-coriander-leaf';
UPDATE grow_nursery_inventory SET plant_slug   = 'coriander' WHERE plant_slug   = 'herb-coriander-leaf';
UPDATE grow_seed_listings     SET plant_slug   = 'coriander' WHERE plant_slug   = 'herb-coriander-leaf';
UPDATE grow_user_tasks        SET plant_slug   = 'coriander' WHERE plant_slug   = 'herb-coriander-leaf';
UPDATE perenual_sync_logs     SET our_slug     = 'coriander' WHERE our_slug     = 'herb-coriander-leaf';
UPDATE user_task_completions  SET plant_slug   = 'coriander' WHERE plant_slug   = 'herb-coriander-leaf';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-coriander-leaf', 'coriander');
DELETE FROM plant_species WHERE slug = 'herb-coriander-leaf';

COMMIT;
