-- Add rotation support to grow_garden_beds
-- rotation_mode: 'rotating' (structured 3-year rotation) or 'mixed' (no rotation)
-- dedicated_group: which crop family this bed is assigned to this season

ALTER TABLE grow_garden_beds
  ADD COLUMN rotation_mode TEXT DEFAULT NULL
    CHECK (rotation_mode IN ('rotating', 'mixed')),
  ADD COLUMN dedicated_group TEXT DEFAULT NULL
    CHECK (dedicated_group IN ('brassica','legume','root_allium','solanaceae','cucurbit'));
