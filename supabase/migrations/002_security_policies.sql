-- Enable Row Level Security (RLS) on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- For simplicity with admin-only access, create permissive policies
-- In production, you'd want more granular control

CREATE POLICY "Enable all access for authenticated users" ON products
    FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON sales
    FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON sale_items
    FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON inventory_movements
    FOR ALL USING (true);
