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

-- Note: We don't delete billers as they are reference data

-- Reset sequences (SQLite auto-increment)
DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'payments', 'scheduled_payments', 'bills', 'payment_methods', 'users', 'rate_limits');

-- After running this, run seed.sql to repopulate demo data
