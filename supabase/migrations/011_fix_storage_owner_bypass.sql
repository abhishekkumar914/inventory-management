-- FIX: "must be owner of table objects" error
-- This script removes the command that requires superuser/owner privileges (ALTER TABLE)
-- and focuses only on the Policy creation which you are allowed to do.

-- 1. Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create the policy.
-- Note: we skip "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY" 
-- because it's already enabled by default and causes the permission error.

DO $$
BEGIN
    -- Try to drop the policy if it exists to clean up
    BEGIN
        DROP POLICY IF EXISTS "Unrestricted Access to Images Bucket" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN
        -- If drop fails (permissions), just ignore and try to create
        NULL;
    END;
END $$;

-- 3. Create the new policy
CREATE POLICY "Unrestricted Access to Images Bucket"
ON storage.objects
FOR ALL
USING ( bucket_id = 'images' )
WITH CHECK ( bucket_id = 'images' );