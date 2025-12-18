-- Seed Data for Bill Payment API
-- This provides realistic test data for API automation practice

-- ============================================
-- BILLERS (Service Providers)
-- ============================================

-- Telecom - India
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount) VALUES
('biller-airtel-prepaid', 'airtel', 'Airtel Prepaid', 'telecom', 'https://example.com/logos/airtel.png', 'Bharti Airtel prepaid mobile recharge', 'Mobile Number', '^[6-9][0-9]{9}$', 10, 5000),
('biller-airtel-postpaid', 'airtel', 'Airtel Postpaid', 'telecom', 'https://example.com/logos/airtel.png', 'Bharti Airtel postpaid bill payment', 'Mobile Number', '^[6-9][0-9]{9}$', 1, 50000),
('biller-jio-prepaid', 'jio', 'Jio Prepaid', 'telecom', 'https://example.com/logos/jio.png', 'Reliance Jio prepaid recharge', 'Mobile Number', '^[6-9][0-9]{9}$', 10, 5000),
('biller-jio-postpaid', 'jio', 'Jio Postpaid', 'telecom', 'https://example.com/logos/jio.png', 'Reliance Jio postpaid bill payment', 'Mobile Number', '^[6-9][0-9]{9}$', 1, 50000),
('biller-vi-prepaid', 'vi', 'Vi (Vodafone Idea) Prepaid', 'telecom', 'https://example.com/logos/vi.png', 'Vodafone Idea prepaid recharge', 'Mobile Number', '^[6-9][0-9]{9}$', 10, 5000),
('biller-bsnl', 'bsnl', 'BSNL Mobile', 'telecom', 'https://example.com/logos/bsnl.png', 'BSNL mobile prepaid/postpaid', 'Mobile Number', '^[6-9][0-9]{9}$', 10, 10000);

-- Telecom - USA
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount) VALUES
('biller-att-wireless', 'att', 'AT&T Wireless', 'telecom', 'https://example.com/logos/att.png', 'AT&T wireless phone bill payment', 'Account Number', '^[0-9]{9,12}$', 1, 10000),
('biller-verizon', 'verizon', 'Verizon Wireless', 'telecom', 'https://example.com/logos/verizon.png', 'Verizon wireless bill payment', 'Account Number', '^[0-9]{9,12}$', 1, 10000),
('biller-tmobile', 'tmobile', 'T-Mobile', 'telecom', 'https://example.com/logos/tmobile.png', 'T-Mobile wireless bill payment', 'Phone Number', '^[0-9]{10}$', 1, 10000),
('biller-sprint', 'sprint', 'Sprint (T-Mobile)', 'telecom', 'https://example.com/logos/sprint.png', 'Sprint wireless bill payment', 'Account Number', '^[0-9]{9,15}$', 1, 10000);

-- Electricity
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount, partial_payment_allowed) VALUES
('biller-tata-power', 'tata-power', 'Tata Power', 'electricity', 'https://example.com/logos/tatapower.png', 'Tata Power electricity bill payment', 'Consumer Number', '^[0-9]{10,15}$', 1, 100000, 1),
('biller-adani-electricity', 'adani', 'Adani Electricity Mumbai', 'electricity', 'https://example.com/logos/adani.png', 'Adani Electricity bill payment', 'Account Number', '^[0-9]{9,12}$', 1, 100000, 1),
('biller-bses-delhi', 'bses', 'BSES Rajdhani (Delhi)', 'electricity', 'https://example.com/logos/bses.png', 'BSES Delhi electricity bill', 'CA Number', '^[0-9]{9}$', 1, 100000, 1),
('biller-pg-and-e', 'pge', 'Pacific Gas & Electric', 'electricity', 'https://example.com/logos/pge.png', 'PG&E California electricity', 'Account Number', '^[0-9]{10}$', 1, 50000, 1),
('biller-con-edison', 'coned', 'Con Edison (New York)', 'electricity', 'https://example.com/logos/coned.png', 'Con Edison NY electricity', 'Account Number', '^[0-9]{10,15}$', 1, 50000, 1);

-- Water
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount) VALUES
('biller-delhi-jal', 'djb', 'Delhi Jal Board', 'water', 'https://example.com/logos/djb.png', 'Delhi water bill payment', 'K Number', '^[A-Z][0-9]{8}$', 1, 50000),
('biller-mcgm-water', 'mcgm', 'MCGM Water (Mumbai)', 'water', 'https://example.com/logos/mcgm.png', 'Mumbai water bill', 'Consumer Number', '^[0-9]{10}$', 1, 50000);

-- Gas
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount) VALUES
('biller-mahanagar-gas', 'mgl', 'Mahanagar Gas (Mumbai)', 'gas', 'https://example.com/logos/mgl.png', 'MGL piped gas bill payment', 'BP Number', '^[0-9]{10}$', 1, 25000),
('biller-igl', 'igl', 'Indraprastha Gas (Delhi)', 'gas', 'https://example.com/logos/igl.png', 'IGL piped gas bill', 'BP Number', '^[0-9]{10}$', 1, 25000);

-- Broadband & Internet
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount) VALUES
('biller-jio-fiber', 'jiofiber', 'JioFiber Broadband', 'broadband', 'https://example.com/logos/jiofiber.png', 'Reliance JioFiber internet', 'Account Number', '^[0-9]{10}$', 199, 10000),
('biller-airtel-fiber', 'airtelxstream', 'Airtel Xstream Fiber', 'broadband', 'https://example.com/logos/airtelfiber.png', 'Airtel broadband internet', 'Account Number', '^[0-9]{10,12}$', 499, 10000),
('biller-act-fibernet', 'act', 'ACT Fibernet', 'broadband', 'https://example.com/logos/act.png', 'ACT broadband internet', 'Customer ID', '^[A-Z0-9]{8,12}$', 399, 10000),
('biller-comcast-xfinity', 'xfinity', 'Xfinity (Comcast)', 'broadband', 'https://example.com/logos/xfinity.png', 'Comcast Xfinity internet USA', 'Account Number', '^[0-9]{8,16}$', 1, 5000),
('biller-att-internet', 'attinternet', 'AT&T Internet', 'broadband', 'https://example.com/logos/attinternet.png', 'AT&T internet service', 'Account Number', '^[0-9]{9,12}$', 1, 5000);

-- DTH (Satellite TV)
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount) VALUES
('biller-tata-play', 'tataplay', 'Tata Play (Tata Sky)', 'dth', 'https://example.com/logos/tataplay.png', 'Tata Play DTH recharge', 'Subscriber ID', '^[0-9]{10}$', 50, 10000),
('biller-airtel-dth', 'airteldth', 'Airtel Digital TV', 'dth', 'https://example.com/logos/airteldth.png', 'Airtel DTH recharge', 'Customer ID', '^[0-9]{10}$', 50, 10000),
('biller-dish-tv', 'dishtv', 'Dish TV', 'dth', 'https://example.com/logos/dishtv.png', 'Dish TV DTH recharge', 'Viewing Card Number', '^[0-9]{11}$', 50, 10000);

-- Insurance
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount, partial_payment_allowed) VALUES
('biller-lic', 'lic', 'LIC of India', 'insurance', 'https://example.com/logos/lic.png', 'Life Insurance Corporation premium', 'Policy Number', '^[0-9]{8,10}$', 100, 500000, 0),
('biller-icici-prudential', 'icicipru', 'ICICI Prudential Life', 'insurance', 'https://example.com/logos/icicipru.png', 'ICICI Prudential premium payment', 'Policy Number', '^[0-9]{8,12}$', 100, 500000, 0),
('biller-hdfc-life', 'hdfclife', 'HDFC Life Insurance', 'insurance', 'https://example.com/logos/hdfclife.png', 'HDFC Life premium payment', 'Policy Number', '^[A-Z0-9]{10,15}$', 100, 500000, 0);

-- Credit Cards
INSERT OR REPLACE INTO billers (id, name, display_name, category, logo_url, description, customer_id_label, customer_id_pattern, min_amount, max_amount, partial_payment_allowed) VALUES
('biller-hdfc-cc', 'hdfccc', 'HDFC Bank Credit Card', 'credit_card', 'https://example.com/logos/hdfc.png', 'HDFC credit card bill payment', 'Card Number (Last 4)', '^[0-9]{4}$', 100, 1000000, 1),
('biller-icici-cc', 'icicicc', 'ICICI Bank Credit Card', 'credit_card', 'https://example.com/logos/icici.png', 'ICICI credit card bill payment', 'Card Number (Last 4)', '^[0-9]{4}$', 100, 1000000, 1),
('biller-sbi-cc', 'sbicc', 'SBI Credit Card', 'credit_card', 'https://example.com/logos/sbi.png', 'SBI credit card bill payment', 'Card Number (Last 4)', '^[0-9]{4}$', 100, 1000000, 1),
('biller-amex', 'amex', 'American Express', 'credit_card', 'https://example.com/logos/amex.png', 'Amex credit card payment', 'Card Number (Last 5)', '^[0-9]{5}$', 100, 1000000, 1);

-- ============================================
-- DEMO USERS
-- ============================================
INSERT OR REPLACE INTO users (id, email, phone, first_name, last_name, password_hash, kyc_status, address_line1, city, state, postal_code, country, created_by) VALUES
('user-demo-001', 'john.doe@example.com', '+919876543210', 'John', 'Doe', 'password123', 'verified', '123 Main Street, Apt 4B', 'Mumbai', 'Maharashtra', '400001', 'IN', 'system'),
('user-demo-002', 'jane.smith@example.com', '+919876543211', 'Jane', 'Smith', 'password123', 'verified', '456 Oak Avenue', 'Delhi', 'Delhi', '110001', 'IN', 'system'),
('user-demo-003', 'bob.wilson@example.com', '+14155551234', 'Bob', 'Wilson', 'password123', 'verified', '789 Pine Road', 'San Francisco', 'CA', '94102', 'US', 'system'),
('user-demo-004', 'alice.kumar@example.com', '+919876543212', 'Alice', 'Kumar', 'password123', 'pending', '321 Elm Street', 'Bangalore', 'Karnataka', '560001', 'IN', 'system');

-- ============================================
-- DEMO PAYMENT METHODS
-- ============================================
INSERT OR REPLACE INTO payment_methods (id, user_id, type, display_name, is_default, upi_id, created_by) VALUES
('pm-upi-001', 'user-demo-001', 'upi', 'Primary UPI', 1, 'john@okaxis', 'system'),
('pm-upi-002', 'user-demo-002', 'upi', 'Jane UPI', 1, 'jane@okicici', 'system');

INSERT OR REPLACE INTO payment_methods (id, user_id, type, display_name, is_default, card_last_four, card_network, card_expiry_month, card_expiry_year, card_holder_name, created_by) VALUES
('pm-card-001', 'user-demo-001', 'credit_card', 'HDFC Credit Card', 0, '4242', 'visa', 12, 2027, 'JOHN DOE', 'system'),
('pm-card-002', 'user-demo-001', 'debit_card', 'ICICI Debit Card', 0, '1234', 'mastercard', 6, 2026, 'JOHN DOE', 'system'),
('pm-card-003', 'user-demo-003', 'credit_card', 'Chase Sapphire', 1, '5678', 'visa', 9, 2028, 'BOB WILSON', 'system');

INSERT OR REPLACE INTO payment_methods (id, user_id, type, display_name, is_default, bank_name, bank_account_last_four, created_by) VALUES
('pm-nb-001', 'user-demo-002', 'net_banking', 'HDFC Savings', 0, 'HDFC Bank', '9876', 'system');

INSERT OR REPLACE INTO payment_methods (id, user_id, type, display_name, is_default, wallet_provider, wallet_id, created_by) VALUES
('pm-wallet-001', 'user-demo-004', 'wallet', 'Paytm Wallet', 1, 'paytm', 'wallet-alice-001', 'system');

-- ============================================
-- DEMO BILLS
-- ============================================
INSERT OR REPLACE INTO bills (id, user_id, biller_id, customer_identifier, customer_name, nickname, amount, due_date, bill_date, bill_period, status, created_by) VALUES
('bill-001', 'user-demo-001', 'biller-airtel-postpaid', '9876543210', 'John Doe', 'My Airtel Mobile', 599.00, '2025-12-25', '2025-12-01', 'Dec 2025', 'pending', 'system'),
('bill-002', 'user-demo-001', 'biller-tata-power', '1234567890123', 'John Doe', 'Home Electricity', 2450.50, '2025-12-20', '2025-12-05', 'Nov 2025', 'pending', 'system'),
('bill-003', 'user-demo-001', 'biller-jio-fiber', '9876543210', 'John Doe', 'Home Internet', 999.00, '2025-12-28', '2025-12-10', 'Dec 2025', 'pending', 'system'),
('bill-004', 'user-demo-002', 'biller-jio-postpaid', '9876543211', 'Jane Smith', 'Jio Mobile', 749.00, '2025-12-22', '2025-12-01', 'Dec 2025', 'pending', 'system'),
('bill-005', 'user-demo-002', 'biller-mahanagar-gas', '9988776655', 'Jane Smith', 'Home Gas', 850.25, '2025-12-30', '2025-12-15', 'Dec 2025', 'pending', 'system'),
('bill-006', 'user-demo-003', 'biller-att-wireless', '123456789', 'Bob Wilson', 'AT&T Phone', 89.99, '2025-12-20', '2025-12-01', 'Dec 2025', 'pending', 'system'),
('bill-007', 'user-demo-003', 'biller-pg-and-e', '1234567890', 'Bob Wilson', 'Home Electric', 156.78, '2025-12-18', '2025-12-01', 'Nov 2025', 'overdue', 'system'),
('bill-008', 'user-demo-001', 'biller-hdfc-cc', '4242', 'John Doe', 'HDFC Credit Card', 15670.00, '2025-12-15', '2025-12-01', 'Nov 2025', 'overdue', 'system');

-- ============================================
-- DEMO PAYMENTS (Historical)
-- ============================================
INSERT OR REPLACE INTO payments (id, bill_id, user_id, amount, convenience_fee, total_amount, payment_method_id, payment_method_type, status, transaction_id, reference_number, processed_at, created_by) VALUES
('pay-001', 'bill-001', 'user-demo-001', 499.00, 0.00, 499.00, 'pm-upi-001', 'upi', 'completed', 'TXN20251101001', 'REF001122334455', '2025-11-15 10:30:00', 'system'),
('pay-002', 'bill-002', 'user-demo-001', 2100.00, 5.00, 2105.00, 'pm-card-001', 'credit_card', 'completed', 'TXN20251115002', 'REF001122334456', '2025-11-20 14:45:00', 'system'),
('pay-003', 'bill-006', 'user-demo-003', 85.00, 0.00, 85.00, 'pm-card-003', 'credit_card', 'completed', 'TXN20251120003', 'REF001122334457', '2025-11-22 09:15:00', 'system');

-- ============================================
-- DEMO TRANSACTIONS
-- ============================================
INSERT OR REPLACE INTO transactions (id, payment_id, user_id, type, amount, status, description, created_by) VALUES
('txn-001', 'pay-001', 'user-demo-001', 'payment', 499.00, 'completed', 'Airtel Postpaid - Nov 2025', 'system'),
('txn-002', 'pay-002', 'user-demo-001', 'payment', 2105.00, 'completed', 'Tata Power - Oct 2025', 'system'),
('txn-003', 'pay-002', 'user-demo-001', 'fee', 5.00, 'completed', 'Convenience fee for credit card payment', 'system'),
('txn-004', 'pay-003', 'user-demo-003', 'payment', 85.00, 'completed', 'AT&T Wireless - Nov 2025', 'system'),
('txn-005', NULL, 'user-demo-001', 'cashback', -25.00, 'completed', 'Cashback on electricity bill payment', 'system');
