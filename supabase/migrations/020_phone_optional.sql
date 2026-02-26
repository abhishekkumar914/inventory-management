-- Make phone optional on customers table
-- Some walk-in customers may only have a name

-- Drop the NOT NULL constraint on phone
ALTER TABLE public.customers ALTER COLUMN phone DROP NOT NULL;

-- Drop the old unique constraint/index on phone
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;
DROP INDEX IF EXISTS customers_phone_key;

-- Create a partial unique index: phone must be unique, but only when it's not null/empty
CREATE UNIQUE INDEX customers_phone_unique ON public.customers (phone) WHERE phone IS NOT NULL AND phone != '';
