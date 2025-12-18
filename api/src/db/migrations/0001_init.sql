-- Migration: 0001_init.sql
-- Bill Payment API Database Schema

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    password_hash TEXT, -- For demo purposes, stores plain text
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'IN',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT -- API key that created this record
);

-- ============================================
-- BILLERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('telecom', 'electricity', 'water', 'gas', 'broadband', 'dth', 'insurance', 'credit_card', 'loan', 'municipal_tax')),
    logo_url TEXT,
    description TEXT,
    supported_payment_modes TEXT DEFAULT '["upi","credit_card","debit_card","net_banking","wallet"]', -- JSON array
    fetch_bill_supported INTEGER DEFAULT 1, -- boolean
    partial_payment_allowed INTEGER DEFAULT 0,
    min_amount REAL DEFAULT 1.00,
    max_amount REAL DEFAULT 100000.00,
    customer_id_label TEXT DEFAULT 'Customer ID', -- What to show in UI (Mobile Number, Account Number, etc.)
    customer_id_pattern TEXT, -- Regex pattern for validation
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- BILLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    biller_id TEXT NOT NULL,
    customer_identifier TEXT NOT NULL, -- Mobile number, account number, etc.
    customer_name TEXT,
    nickname TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    due_date TEXT,
    bill_date TEXT,
    bill_period TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid', 'cancelled')),
    bill_details TEXT, -- JSON for biller-specific details
    auto_pay_enabled INTEGER DEFAULT 0,
    auto_pay_method_id TEXT,
    auto_pay_max_amount REAL,
    auto_pay_days_before INTEGER DEFAULT 3,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (biller_id) REFERENCES billers(id)
);

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('upi', 'credit_card', 'debit_card', 'net_banking', 'wallet')),
    display_name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    -- UPI fields
    upi_id TEXT,
    -- Card fields (masked for security)
    card_last_four TEXT,
    card_network TEXT CHECK (card_network IN ('visa', 'mastercard', 'amex', 'rupay', 'discover', NULL)),
    card_expiry_month INTEGER,
    card_expiry_year INTEGER,
    card_holder_name TEXT,
    -- Net Banking fields
    bank_name TEXT,
    bank_account_last_four TEXT,
    -- Wallet fields
    wallet_provider TEXT,
    wallet_id TEXT,
    -- Common fields
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    convenience_fee REAL DEFAULT 0.00,
    total_amount REAL NOT NULL,
    payment_method_id TEXT,
    payment_method_type TEXT NOT NULL,
    payment_method_details TEXT, -- JSON with masked details
    status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'pending_refund')),
    transaction_id TEXT UNIQUE,
    reference_number TEXT,
    biller_reference TEXT,
    failure_reason TEXT,
    failure_code TEXT,
    scheduled_at TEXT,
    processed_at TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

-- ============================================
-- TRANSACTIONS TABLE (Audit Log)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    payment_id TEXT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'reversal', 'cashback', 'fee')),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    balance_before REAL,
    balance_after REAL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    description TEXT,
    metadata TEXT, -- JSON for additional details
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- SCHEDULED PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_payments (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    payment_method_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    scheduled_date TEXT NOT NULL,
    recurrence TEXT CHECK (recurrence IN ('once', 'weekly', 'monthly', 'quarterly', 'yearly', NULL)),
    next_run_date TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'failed')),
    last_run_at TEXT,
    last_run_status TEXT,
    run_count INTEGER DEFAULT 0,
    max_runs INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

-- ============================================
-- RATE LIMITING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY, -- IP address or API key
    request_count INTEGER DEFAULT 0,
    window_start TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_biller_id ON bills(biller_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_billers_category ON billers(category);
CREATE INDEX IF NOT EXISTS idx_billers_is_active ON billers(is_active);
