-- Make aadhaar_number optional (nullable) on sales table
ALTER TABLE sales ALTER COLUMN aadhaar_number DROP NOT NULL;

-- Add payment_mode column to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash';
-- Allowed: 'cash', 'upi', 'bank_transfer', 'credit' (udhar)

-- Add amount_paid column to sales for tracking partial payments
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0;
