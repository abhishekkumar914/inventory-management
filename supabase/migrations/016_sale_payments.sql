-- Create sale_payments table for split/multiple payment modes per sale
CREATE TABLE IF NOT EXISTS public.sale_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'cash',
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- Create permissive policy (same pattern as other tables)
CREATE POLICY "Allow full access to sale_payments"
ON public.sale_payments
FOR ALL
USING (true);
