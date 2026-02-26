-- Make phone optional on export_customers table (mirror of 020 for shop customers)

ALTER TABLE public.export_customers ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.export_customers DROP CONSTRAINT IF EXISTS export_customers_phone_key;
DROP INDEX IF EXISTS export_customers_phone_key;

-- Partial unique index: phone unique only when provided
CREATE UNIQUE INDEX export_customers_phone_unique ON public.export_customers (phone) WHERE phone IS NOT NULL AND phone != '';
