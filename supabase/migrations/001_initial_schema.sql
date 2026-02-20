-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sales Table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    aadhaar_number VARCHAR(12) NOT NULL,
    aadhaar_photo_url TEXT,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sale Items Table
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_sale DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inventory Movements Table
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'restock', 'correction', 'return')),
    quantity_change INTEGER NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for better query performance
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Function to update inventory on sale
CREATE OR REPLACE FUNCTION process_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct stock from products
    UPDATE products
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Record inventory movement
    INSERT INTO inventory_movements (product_id, type, quantity_change, reference_id)
    VALUES (NEW.product_id, 'sale', -NEW.quantity, NEW.sale_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically process inventory on sale
CREATE TRIGGER trigger_process_sale_inventory
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION process_sale_inventory();

-- Function to validate stock before sale
CREATE OR REPLACE FUNCTION validate_stock_before_sale()
RETURNS TRIGGER AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    SELECT current_stock INTO available_stock
    FROM products
    WHERE id = NEW.product_id AND is_active = true;
    
    IF available_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found or inactive';
    END IF;
    
    IF available_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', available_stock, NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate stock before inserting sale item
CREATE TRIGGER trigger_validate_stock
BEFORE INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION validate_stock_before_sale();
