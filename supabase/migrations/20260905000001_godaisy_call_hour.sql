-- The hour the call arrives — phase 4.
--
-- NOT YET APPLIED. Nothing sends the daily call, so nothing reads this column
-- yet; onboarding keeps the hour in its cookie, which is what makes the choice
-- work for a signed-out stranger. This exists so the sender, when it is built,
-- has somewhere to read from rather than inventing a second store.
--
-- It sits on the existing preferences table rather than a new one. That table
-- already models notifications as CATEGORIES with quiet hours and a daily cap —
-- a different product from one message a day at an hour you chose. The two can
-- coexist: `call_hour` is when the call goes out, and the quiet hours still
-- govern everything else.

ALTER TABLE godaisy_notification_preferences
  ADD COLUMN IF NOT EXISTS call_hour INT
    CHECK (call_hour IS NULL OR (call_hour >= 0 AND call_hour <= 23));

COMMENT ON COLUMN godaisy_notification_preferences.call_hour IS
  'Local hour (0-23) the daily call is sent. NULL means the person has not chosen one.';
