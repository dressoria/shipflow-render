-- FASE 5.40C — Proposed rate limit table for label checkout.
-- Status: NOT APPLIED. Do not apply until the label payment flow is in production
--         and DB-based rate limiting is required.
--
-- Stores one row per checkout attempt for rate limiting queries.
-- No user direct access — service_role only (via assertLabelCheckoutRateLimit).
-- Old rows (>1 hour) can be pruned by a cron job or a cleanup function.

-- Create table.
CREATE TABLE IF NOT EXISTS label_checkout_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  email       text,
  ip_hash     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  purpose     text        NOT NULL DEFAULT 'label_checkout'
);

-- Indexes for rate-limit queries: count by user or IP hash within a time window.
CREATE INDEX IF NOT EXISTS label_checkout_attempts_user_created_idx
  ON label_checkout_attempts (user_id, created_at);

CREATE INDEX IF NOT EXISTS label_checkout_attempts_ip_created_idx
  ON label_checkout_attempts (ip_hash, created_at)
  WHERE ip_hash IS NOT NULL;

-- RLS: no user direct read/write. Service_role bypasses RLS.
ALTER TABLE label_checkout_attempts ENABLE ROW LEVEL SECURITY;

-- No policies needed — service_role is the only writer.
-- Regular users must not read or write this table directly.

-- Optional cleanup function (not scheduled automatically — wire up a cron if needed).
-- Deletes rows older than 1 hour to keep the table small.
CREATE OR REPLACE FUNCTION prune_label_checkout_attempts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM label_checkout_attempts
  WHERE created_at < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Verification queries (run after applying):
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'label_checkout_attempts' ORDER BY ordinal_position;
--
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'label_checkout_attempts';
-- Expected: true
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'label_checkout_attempts';
-- Expected: label_checkout_attempts_pkey, label_checkout_attempts_user_created_idx, label_checkout_attempts_ip_created_idx
