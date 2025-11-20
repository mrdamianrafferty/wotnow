-- Make notification_log columns nullable for daily digest emails
--
-- Daily digest emails don't have a specific species_id, confidence_at_send, or threshold_value
-- because they cover multiple species grouped by confidence bands

ALTER TABLE notification_log
  ALTER COLUMN species_id DROP NOT NULL,
  ALTER COLUMN confidence_at_send DROP NOT NULL,
  ALTER COLUMN threshold_value DROP NOT NULL;

-- Update comments to reflect that these columns are optional
COMMENT ON COLUMN notification_log.species_id IS 'Species identifier that triggered the notification (nullable for digest emails)';
COMMENT ON COLUMN notification_log.confidence_at_send IS 'Confidence score when notification was sent (nullable for digest emails)';
COMMENT ON COLUMN notification_log.threshold_value IS 'Threshold that triggered this notification (nullable for digest emails)';
