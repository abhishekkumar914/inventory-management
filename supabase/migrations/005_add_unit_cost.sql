-- Add unit_cost to inventory_movements to track cost price of restocks
ALTER TABLE IF EXISTS public.inventory_movements 
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2);

-- Also add a column for total cost if needed, but unit_cost is sufficient usually
-- Comment: This allows calculating COGS (Cost of Goods Sold) later by FIFO/LIFO methods if they want.
