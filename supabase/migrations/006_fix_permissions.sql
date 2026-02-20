-- Fix permissions for customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing specific policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Allow full access to customers" ON public.customers;

-- Create a broad policy for authenticated users 
CREATE POLICY "Enable all access for authenticated users" 
ON public.customers 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- Also allow anon access just in case your auth isn't fully set up yet
-- (You can remove this later for security)
CREATE POLICY "Enable read/write for anon" 
ON public.customers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Fix permissions for ledger
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to transactions" ON public.customer_transactions;

CREATE POLICY "Enable all access for transactions" 
ON public.customer_transactions 
FOR ALL 
USING (true) 
WITH CHECK (true);
