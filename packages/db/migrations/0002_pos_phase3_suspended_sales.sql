CREATE TABLE IF NOT EXISTS suspended_sales (
  id TEXT PRIMARY KEY NOT NULL,
  cashier_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  cart_snapshot TEXT NOT NULL,
  checkout_currency TEXT NOT NULL DEFAULT 'EGP',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  rate_mode TEXT NOT NULL DEFAULT 'auto',
  manual_rate_input TEXT NOT NULL DEFAULT '',
  cash_received_input TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS suspended_sales_cashier_idx ON suspended_sales(cashier_id);
CREATE INDEX IF NOT EXISTS suspended_sales_updated_at_idx ON suspended_sales(updated_at);
CREATE INDEX IF NOT EXISTS suspended_sales_created_at_idx ON suspended_sales(created_at);
