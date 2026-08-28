-- Mobile Care online store migration
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS online_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS online_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    delivery_address TEXT NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    order_status VARCHAR(40) NOT NULL DEFAULT 'Placed',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_orders_status ON online_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_online_orders_payment ON online_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_online_orders_created ON online_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_order_items_order ON online_order_items(order_id);
