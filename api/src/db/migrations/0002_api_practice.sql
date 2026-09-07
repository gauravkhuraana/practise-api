-- Migration 0002: API automation practice features
-- Adds support for: idempotency keys, async jobs (202 + polling), and webhooks.

-- ============================================
-- Idempotency Keys
-- Stores the first response for a given Idempotency-Key so that a retry of the
-- same request replays the original result instead of creating a duplicate.
-- ============================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key                 TEXT PRIMARY KEY,
  endpoint            TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  response_status     INTEGER NOT NULL,
  response_body       TEXT NOT NULL,
  resource_id         TEXT,
  created_at          TEXT NOT NULL,
  expires_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================
-- Async Jobs
-- A job is created by a 202 Accepted endpoint and progresses through
-- queued -> processing -> completed/failed based on elapsed wall-clock time,
-- so polling behaves realistically without a background worker.
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'queued',
  progress       INTEGER NOT NULL DEFAULT 0,
  request_body   TEXT,
  result_body    TEXT,
  error_code     TEXT,
  error_message  TEXT,
  should_fail    INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  processing_at  TEXT NOT NULL,
  ready_at       TEXT NOT NULL,
  completed_at   TEXT,
  created_by     TEXT DEFAULT 'user'
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- ============================================
-- Webhook Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id          TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  events      TEXT NOT NULL,
  secret      TEXT NOT NULL,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  created_by  TEXT DEFAULT 'user'
);

CREATE INDEX IF NOT EXISTS idx_webhook_subs_active ON webhook_subscriptions(is_active);

-- ============================================
-- Webhook Deliveries (attempt log)
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  event           TEXT NOT NULL,
  payload         TEXT NOT NULL,
  signature       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  status_code     INTEGER,
  attempt         INTEGER NOT NULL DEFAULT 1,
  error           TEXT,
  duration_ms     INTEGER,
  created_at      TEXT NOT NULL,
  delivered_at    TEXT,
  FOREIGN KEY (subscription_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_sub ON webhook_deliveries(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at);
