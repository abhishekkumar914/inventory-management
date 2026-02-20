-- Add aadhaar_photo_url to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS aadhaar_photo_url TEXT;

-- Backfill data from sales table where available
-- This finds the most recent sale for each customer that has an aadhaar photo
UPDATE public.customers c
SET aadhaar_photo_url = subquery.aadhaar_photo_url
FROM (
    SELECT DISTINCT ON (phone) phone, aadhaar_photo_url
    FROM public.sales
    WHERE aadhaar_photo_url IS NOT NULL AND aadhaar_photo_url != ''
    ORDER BY phone, created_at DESC
) AS subquery
WHERE c.phone = subquery.phone;
