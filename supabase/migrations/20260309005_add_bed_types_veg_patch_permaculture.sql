-- Add 'veg_patch' and 'permaculture_space' bed types
-- These extend the existing grow_garden_beds type CHECK constraint

ALTER TABLE grow_garden_beds
  DROP CONSTRAINT IF EXISTS grow_garden_beds_type_check;

ALTER TABLE grow_garden_beds
  ADD CONSTRAINT grow_garden_beds_type_check
  CHECK (type IN ('raised_bed','container','in_ground','greenhouse','polytunnel','other','veg_patch','permaculture_space'));
