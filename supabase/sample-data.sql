-- Sample data for testing the inventory management system
-- Run this in Supabase SQL Editor after running the main migrations

-- Insert sample products
INSERT INTO products (name, sku, current_stock, unit_price, is_active) VALUES
('Laptop - Dell Inspiron 15', 'DELL-INSP-15', 25, 45000.00, true),
('Wireless Mouse', 'MOUSE-WL-001', 150, 599.00, true),
('USB-C Cable (2m)', 'CABLE-USBC-2M', 200, 299.00, true),
('Mechanical Keyboard', 'KB-MECH-001', 45, 2499.00, true),
('Monitor 24" Full HD', 'MON-24-FHD', 30, 12999.00, true),
('Laptop Bag', 'BAG-LAPTOP-001', 75, 899.00, true),
('Webcam HD', 'WEBCAM-HD-001', 60, 1999.00, true),
('Headphones Bluetooth', 'HP-BT-001', 85, 1499.00, true),
('External HDD 1TB', 'HDD-EXT-1TB', 40, 3999.00, true),
('Power Bank 10000mAh', 'PB-10K-001', 120, 799.00, true),
('HDMI Cable 3m', 'CABLE-HDMI-3M', 180, 399.00, true),
('Wireless Charger', 'CHRG-WL-001', 95, 699.00, true),
('Phone Stand', 'STAND-PHONE', 5, 249.00, true),
('Screen Protector', 'SCRN-PROT-001', 3, 199.00, true),
('Cleaning Kit', 'CLEAN-KIT-001', 65, 349.00, true);

-- Note: To add sample sales, you would need to:
-- 1. Log in to the application
-- 2. Use the Sales page to create transactions
-- This ensures all triggers and validations work correctly
-- and maintains data integrity

-- You can verify the data was inserted:
SELECT * FROM products ORDER BY created_at DESC;
