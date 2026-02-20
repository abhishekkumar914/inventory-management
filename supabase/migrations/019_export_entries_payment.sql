-- Add payment tracking to export_entries
ALTER TABLE export_entries ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;
ALTER TABLE export_entries ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash';
