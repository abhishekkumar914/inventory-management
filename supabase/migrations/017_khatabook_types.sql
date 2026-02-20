-- Update customer_transactions to support khatabook types: advance, udhar
-- Remove the old CHECK constraint and add a new one that includes all types
ALTER TABLE public.customer_transactions DROP CONSTRAINT IF EXISTS customer_transactions_type_check;
ALTER TABLE public.customer_transactions ADD CONSTRAINT customer_transactions_type_check 
  CHECK (type IN ('credit', 'debit', 'payment_in', 'payment_out', 'advance', 'udhar', 'withdraw'));
