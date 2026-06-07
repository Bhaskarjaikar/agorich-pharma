-- Migration: Fix routed_orders status constraint to include REJECTED and RETURNED
-- This fixes the bug where reject API tries to set status='REJECTED' but constraint doesn't allow it

-- Drop the existing constraint
ALTER TABLE routed_orders DROP CONSTRAINT IF EXISTS routed_orders_status_check;

-- Add new constraint with all valid statuses including REJECTED and RETURNED
ALTER TABLE routed_orders ADD CONSTRAINT routed_orders_status_check
    CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'));

-- Also update the orders table constraint to be consistent
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
    CHECK (order_status IN ('DRAFT', 'CONFIRMED', 'CANCELLED', 'RETURNED'));

-- Drop and recreate the orders payment_status constraint with proper values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED'));
