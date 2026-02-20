-- Policies for the new 'images' bucket

-- 1. Ensure the bucket exists (in case it wasn't created properly via UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Allow anyone to view images (SELECT)
DROP POLICY IF EXISTS "Public Access to Images" ON storage.objects;
CREATE POLICY "Public Access to Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- 3. Policy: Allow authenticated users to upload (INSERT)
DROP POLICY IF EXISTS "Authenticated Users Can Upload Images" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

-- 4. Policy: Allow authenticated users to update/delete
DROP POLICY IF EXISTS "Authenticated Users Can Update Images" ON storage.objects;
CREATE POLICY "Authenticated Users Can Update Images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Users Can Delete Images" ON storage.objects;
CREATE POLICY "Authenticated Users Can Delete Images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'images' AND auth.role() = 'authenticated' );
