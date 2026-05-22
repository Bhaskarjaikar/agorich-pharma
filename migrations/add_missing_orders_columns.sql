-- Add missing columns to orders table

-- Add draft_number column (increased length for fallback formats)
ALTER TABLE orders ALTER COLUMN draft_number TYPE VARCHAR(50);

-- Add customer_id column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add order_id column (text unique)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_id TEXT UNIQUE;

-- Add items JSONB column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB;

-- Add grand_total column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS grand_total DECIMAL(12,2);

-- Add order_status column with check constraint
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'DRAFT';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check CHECK (order_status IN ('DRAFT', 'CONFIRMED', 'CANCELLED'));

-- Add payment_status column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED'));

-- Add invoice_id column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- Add razorpay_order_id column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Add unique index for draft_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_draft_number_unique 
ON orders(draft_number) 
WHERE draft_number IS NOT NULL;

-- Add index for orders lookup by draft number
CREATE INDEX IF NOT EXISTS idx_orders_draft_number_lookup 
ON orders(draft_number, order_status) 
WHERE order_status = 'DRAFT';

-- Add updated_at trigger if not exists
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verify changes
SELECT 'Orders table columns updated successfully!' as status;
