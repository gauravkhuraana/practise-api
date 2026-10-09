-- Reduce D1 rows_read on the users list endpoint.
-- Without these, `ORDER BY created_at DESC LIMIT n` scans and sorts the
-- whole users table on every call.

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_kyc_created ON users(kyc_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
