-- Enable RLS on storage.objects if not already enabled (it usually is)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Ensure the bucket exists (in case it wasn't created properly via UI)
-- The ID must match what is used in the code: 'customer images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer images', 'customer images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Allow anyone to view images (SELECT)
-- This is required for getPublicUrl to work properly if the bucket isn't fully public by default
DROP POLICY IF EXISTS "Public Access to Customer Images" ON storage.objects;
CREATE POLICY "Public Access to Customer Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'customer images' );

-- 3. Policy: Allow authenticated users to upload (INSERT)
DROP POLICY IF EXISTS "Authenticated Users Can Upload Customer Images" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload Customer Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer images' 
  AND auth.role() = 'authenticated'
);

-- 4. Policy: Allow authenticated users to update/delete their uploads or all uploads (for admin)
DROP POLICY IF EXISTS "Authenticated Users Can Update Customer Images" ON storage.objects;
CREATE POLICY "Authenticated Users Can Update Customer Images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'customer images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Users Can Delete Customer Images" ON storage.objects;
CREATE POLICY "Authenticated Users Can Delete Customer Images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'customer images' AND auth.role() = 'authenticated' );
