-- Add aadhaar_number to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);

-- Backfill data from sales table where available
-- This finds the most recent sale for each customer that has an aadhaar number
UPDATE public.customers c
SET aadhaar_number = subquery.aadhaar_number
FROM (
    SELECT DISTINCT ON (phone) phone, aadhaar_number
    FROM public.sales
    WHERE aadhaar_number IS NOT NULL AND aadhaar_number != ''
    ORDER BY phone, created_at DESC
) AS subquery
WHERE c.phone = subquery.phone;
