-- Create exports table to track agricultural export items
CREATE TABLE IF NOT EXISTS exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_key TEXT NOT NULL UNIQUE,
    quantity DECIMAL(12,2) DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    rate_per_unit DECIMAL(10,2) DEFAULT 0,
    buyer_name TEXT,
    buyer_phone TEXT,
    notes TEXT,
    export_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create export_entries table for individual transactions
CREATE TABLE IF NOT EXISTS export_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    export_item_key TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit TEXT DEFAULT 'kg',
    rate_per_unit DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    buyer_name TEXT,
    buyer_phone TEXT,
    vehicle_number TEXT,
    notes TEXT,
    export_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_entries ENABLE ROW LEVEL SECURITY;

-- Policies for exports
CREATE POLICY "Allow all operations on exports" ON exports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on export_entries" ON export_entries FOR ALL USING (true) WITH CHECK (true);

-- Insert default export items
INSERT INTO exports (item_name, item_key) VALUES 
    ('Sweetpotato', 'sweetpotato'),
    ('Paddy (Lamba)', 'paddy_lamba'),
    ('Paddy (Mota)', 'paddy_mota'),
    ('Wheat', 'wheat'),
    ('Sarso', 'sarso'),
    ('Madua', 'madua')
ON CONFLICT (item_key) DO NOTHING;
