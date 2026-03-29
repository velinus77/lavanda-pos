ALTER TABLE sales ADD COLUMN surcharge_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN tendered_amount REAL;
ALTER TABLE sales ADD COLUMN change_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'captured';
ALTER TABLE sales ADD COLUMN sale_state TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE sales ADD COLUMN receipt_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sales ADD COLUMN parked_at INTEGER;
ALTER TABLE sales ADD COLUMN completed_at INTEGER;

CREATE INDEX sales_payment_status_idx ON sales (payment_status);
CREATE INDEX sales_sale_state_idx ON sales (sale_state);

CREATE TABLE sale_payments (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL,
  method TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'captured',
  reference TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

CREATE INDEX sale_payments_sale_idx ON sale_payments (sale_id);
CREATE INDEX sale_payments_method_idx ON sale_payments (method);
CREATE INDEX sale_payments_status_idx ON sale_payments (status);
