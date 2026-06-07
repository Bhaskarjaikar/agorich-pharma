-- ============================================
-- FIX: Issue #7 - Add Transactional Safety
-- Create Database Functions for Complex Operations
-- ============================================

CREATE OR REPLACE FUNCTION create_order_transaction(
  order_data JSONB,
  items_data JSONB[],
  user_id UUID
) RETURNS UUID AS $$
DECLARE
  new_order_id UUID;
  new_order_number TEXT;
  item JSONB;
BEGIN
  -- Insert order
  INSERT INTO orders (
    order_number, retailer_id, distributor_id, order_status, grand_total, created_by
  )
  SELECT 
    order_data->>'order_number',
    (order_data->>'retailer_id')::UUID,
    (order_data->>'distributor_id')::UUID,
    order_data->>'order_status',
    (order_data->>'grand_total')::DECIMAL,
    user_id
  RETURNING id, order_number INTO new_order_id, new_order_number;
  
  -- Insert items
  FOREACH item IN ARRAY items_data
  LOOP
    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price
    )
    VALUES (
      new_order_id,
      (item->>'product_id')::UUID,
      (item->>'quantity')::INTEGER,
      (item->>'unit_price')::DECIMAL
    );
    
    -- Deduct stock
    INSERT INTO canonical_inventory_ledger (
      transaction_id, transaction_date, product_id,
      movement_type, quantity, order_id, created_by
    )
    VALUES (
      'ORD-' || new_order_number || '-' || (item->>'product_id')::text,
      now(),
      (item->>'product_id')::UUID,
      'OUT',
      -(item->>'quantity')::INTEGER,
      new_order_id,
      user_id
    );
  END LOOP;
  
  RETURN new_order_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Order creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
