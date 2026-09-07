-- Reset and reseed the database
-- Use this for weekly data cleanup

-- Drop all existing data (but keep schema)
DELETE FROM transactions;
DELETE FROM payments;
DELETE FROM scheduled_payments;
DELETE FROM bills;
DELETE FROM payment_methods;
DELETE FROM users;
DELETE FROM rate_limits;

-- Tables added in 0002 for the API automation practice features
DELETE FROM webhook_deliveries;
DELETE FROM webhook_subscriptions;
DELETE FROM jobs;
DELETE FROM idempotency_keys;

-- Note: We don't delete billers as they are reference data

-- Reset sequences (SQLite auto-increment)
DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'payments', 'scheduled_payments', 'bills', 'payment_methods', 'users', 'rate_limits', 'jobs', 'idempotency_keys', 'webhook_subscriptions', 'webhook_deliveries');

-- After running this, run seed.sql to repopulate demo data
