-- NUCLEAR OPTION: FIX STORAGE PERMISSIONS
-- Run this in Supabase SQL Editor

-- 1. Create the bucket 'images' if it doesn't exist
-- We ensure it is set to public = true
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop all previous policies related to this bucket to clean up conflicts
DROP POLICY IF EXISTS "Public Access to Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Upload Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Update Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Delete Images" ON storage.objects;
DROP POLICY IF EXISTS "Unrestricted Access to Images Bucket" ON storage.objects;

-- 3. Create a single, simple PERMISSIVE policy
-- This allows both ANONYMOUS and AUTHENTICATED users to do everything.
-- This is the surest way to fix "row-level security" errors during development.
CREATE POLICY "Unrestricted Access to Images Bucket"
ON storage.objects
FOR ALL
USING ( bucket_id = 'images' )
WITH CHECK ( bucket_id = 'images' );

-- 4. Ensure RLS is enabled (standard)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
