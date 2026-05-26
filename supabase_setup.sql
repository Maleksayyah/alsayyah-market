-- =========================================================
-- AL SAYYAH Mini Market - Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- =========================================================

-- 1. Admin Table
CREATE TABLE IF NOT EXISTS store_admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

INSERT INTO store_admins (username, password_hash)
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50) DEFAULT '🛒',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert sample categories
INSERT INTO categories (name, icon) VALUES
  ('Fresh Fruits', '🍎'),
  ('Vegetables', '🥦'),
  ('Dairy', '🥛'),
  ('Beverages', '🥤'),
  ('Snacks', '🍪'),
  ('Cleaning', '🧹')
ON CONFLICT (name) DO NOTHING;

-- 3. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

INSERT INTO system_settings (key, value)
VALUES ('usd_to_lb_rate', '90000')
ON CONFLICT (key) DO NOTHING;

-- 4. Items Table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    price_lb INT NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert sample items
INSERT INTO items (barcode, item_name, price_usd, price_lb, category_id) VALUES
  ('6281234567890', 'Almarai Milk 1L', 1.50, 135000, 3),
  ('6287001234567', 'Lays Chips Classic', 0.80, 72000, 5),
  ('6290000123456', 'Coca Cola 500ml', 0.70, 63000, 4),
  ('6281000111222', 'Banana (1kg)', 1.20, 108000, 1),
  ('6281000333444', 'Tomatoes (1kg)', 0.90, 81000, 2)
ON CONFLICT (barcode) DO NOTHING;

-- Enable Row Level Security (RLS) - allow public reads
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_admins ENABLE ROW LEVEL SECURITY;

-- Public can read categories, items, system_settings
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read items" ON items FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON system_settings FOR SELECT USING (true);

-- Only authenticated (admin via anon key with service role) can write
-- For simplicity with anon key, allow all operations (adjust for production)
CREATE POLICY "Admin write categories" ON categories FOR ALL USING (true);
CREATE POLICY "Admin write items" ON items FOR ALL USING (true);
CREATE POLICY "Admin write settings" ON system_settings FOR ALL USING (true);
CREATE POLICY "Admin read admins" ON store_admins FOR SELECT USING (true);
