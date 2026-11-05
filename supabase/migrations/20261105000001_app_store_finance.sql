-- =============================================================================
-- App Store finance reports (FINANCE_DETAIL), pulled daily by
-- /api/cron/godaisy/store-stats instead of downloaded by hand.
--
-- One report per Apple fiscal period covers the whole vendor account, so these
-- tables are keyed by vendor_number, not by app_id: Rise Daisy's subscriptions
-- and any future app on the account land in the same rows.
--
--   app_store_finance_periods  one row per fiscal period tried: its dates,
--                              what happened, and the totals block
--   app_store_finance_rows     the detail lines, replaced per period on each
--                              fetch; row_key (content hash + ordinal among
--                              identical rows) makes a re-run idempotent
--
-- Amounts are in the currency Apple settles in (partner_share_currency); there
-- is no conversion. Written and read by service_role only, like
-- store_stats_daily.
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_store_finance_periods (
  vendor_number  TEXT        NOT NULL,
  fiscal_year    INTEGER     NOT NULL,
  fiscal_period  INTEGER     NOT NULL CHECK (fiscal_period BETWEEN 1 AND 12),
  -- From the file's own Start Date / End Date rows; NULL until a report arrives
  start_date     DATE,
  end_date       DATE,
  -- ok | mismatch (rows stored, but they disagree with the totals block)
  -- | not_ready (Apple 404) | no_access (key lacks the Finance role) | error
  status         TEXT        NOT NULL CHECK (status IN ('ok', 'mismatch', 'not_ready', 'no_access', 'error')),
  detail         TEXT,
  row_count      INTEGER     NOT NULL DEFAULT 0,
  -- [{country, currency, quantity, extended_partner_share}] as Apple sent them
  totals         JSONB,
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_number, fiscal_year, fiscal_period)
);

CREATE TABLE IF NOT EXISTS app_store_finance_rows (
  vendor_number          TEXT          NOT NULL,
  fiscal_year            INTEGER       NOT NULL,
  fiscal_period          INTEGER       NOT NULL,
  row_key                TEXT          NOT NULL,
  transaction_date       DATE          NOT NULL,
  settlement_date        DATE,
  apple_identifier       TEXT          NOT NULL DEFAULT '',
  sku                    TEXT          NOT NULL DEFAULT '',
  title                  TEXT          NOT NULL DEFAULT '',
  developer_name         TEXT          NOT NULL DEFAULT '',
  product_type           TEXT          NOT NULL DEFAULT '',
  country                TEXT          NOT NULL DEFAULT '',
  quantity               INTEGER       NOT NULL DEFAULT 0,
  partner_share          NUMERIC(14,4) NOT NULL DEFAULT 0,
  extended_partner_share NUMERIC(14,4) NOT NULL DEFAULT 0,
  partner_share_currency TEXT          NOT NULL DEFAULT '',
  customer_price         NUMERIC(14,4) NOT NULL DEFAULT 0,
  customer_currency      TEXT          NOT NULL DEFAULT '',
  -- S sale | R return (refund quantities and amounts are negative, as Apple sends them)
  sale_or_return         TEXT          NOT NULL DEFAULT '',
  promo_code             TEXT          NOT NULL DEFAULT '',
  order_type             TEXT          NOT NULL DEFAULT '',
  region                 TEXT          NOT NULL DEFAULT '',
  -- Columns Apple adds that this table does not have yet
  extra                  JSONB         NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (vendor_number, fiscal_year, fiscal_period, row_key),
  FOREIGN KEY (vendor_number, fiscal_year, fiscal_period)
    REFERENCES app_store_finance_periods (vendor_number, fiscal_year, fiscal_period) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_store_finance_rows_txn
  ON app_store_finance_rows (vendor_number, transaction_date DESC);

ALTER TABLE app_store_finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_store_finance_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on app_store_finance_periods"
  ON app_store_finance_periods
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on app_store_finance_rows"
  ON app_store_finance_rows
  FOR ALL
  USING (auth.role() = 'service_role');

-- Supabase no longer auto-grants new tables; the cron and /admin/dashboard both
-- run as service_role. Nothing here is for signed-in or signed-out users.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_store_finance_periods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_store_finance_rows TO service_role;
