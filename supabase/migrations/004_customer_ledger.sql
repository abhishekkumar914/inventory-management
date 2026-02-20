-- Create the customer_transactions table
CREATE TABLE IF NOT EXISTS public.customer_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('credit', 'debit', 'payment_in', 'payment_out')),
    amount NUMERIC NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

-- Allow full access to transactions
CREATE POLICY "Allow full access to transactions" 
ON public.customer_transactions 
FOR ALL 
USING (auth.role() = 'authenticated');
