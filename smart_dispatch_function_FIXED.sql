-- ======================================
-- SMART DISPATCH POSTGRESQL FUNCTION (FIXED)
-- Atomic transaction for Smart Dispatch button
-- ======================================

CREATE OR REPLACE FUNCTION smart_dispatch_order(
    p_order_id UUID,
    p_distributor_id UUID,
    p_margin_percentage NUMERIC DEFAULT 15
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_order_total NUMERIC;
    v_margin_amount NUMERIC;
    v_item RECORD;
BEGIN
    -- 1. Get order details
    SELECT total_amount INTO v_order_total
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- 2. Calculate margin amount
    v_margin_amount := (v_order_total * p_margin_percentage) / 100;

    -- 3. Decrement distributor inventory (atomic)
    -- Fixed: Declare v_item as RECORD type properly
    FOR v_item IN
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        UPDATE distributor_inventory
        SET quantity = quantity - v_item.quantity,
            last_updated = NOW()
        WHERE distributor_id = p_distributor_id
          AND product_id = v_item.product_id
          AND quantity >= v_item.quantity;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_item.product_id;
        END IF;
    END LOOP;

    -- 4. Record distributor earnings
    INSERT INTO distributor_margins (
        distributor_id,
        order_id,
        margin_amount,
        margin_percentage,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_distributor_id,
        p_order_id,
        v_margin_amount,
        p_margin_percentage,
        'PENDING',
        NOW(),
        NOW()
    );

    -- 5. Update order status to DISPATCHED
    UPDATE orders
    SET status = 'DISPATCHED',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 6. Also update routed_orders if exists
    UPDATE routed_orders
    SET status = 'DISPATCHED',
        dispatched_at = NOW(),
        updated_at = NOW()
    WHERE order_id = p_order_id;

    -- 7. Insert into distributor_inventory_ledger
    -- Fixed: Use v_item RECORD properly
    FOR v_item IN
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        INSERT INTO distributor_inventory_ledger (
            distributor_id,
            product_id,
            transaction_type,
            quantity_change,
            quantity_before,
            quantity_after,
            unit_price,
            total_amount,
            reference_id,
            reference_type,
            created_at
        )
        SELECT
            p_distributor_id,
            v_item.product_id,
            'SALE',
            -v_item.quantity,
            di.quantity + v_item.quantity,
            di.quantity,
            p.mrp,
            (p.mrp * v_item.quantity),
            p_order_id,
            'ORDER_DISPATCH',
            NOW()
        FROM distributor_inventory di
        JOIN products p ON p.id = v_item.product_id
        WHERE di.distributor_id = p_distributor_id
          AND di.product_id = v_item.product_id;
    END LOOP;

    -- Prepare result
    v_result := jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'distributor_id', p_distributor_id,
        'total_amount', v_order_total,
        'margin_amount', v_margin_amount,
        'margin_percentage', p_margin_percentage,
        'message', 'Order dispatched successfully'
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Dispatch failed'
        );
        RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- ANALYTICS SNAPSHOT TRIGGER FUNCTION (FIXED)
-- Auto-creates analytics snapshot on order creation
-- ======================================

CREATE OR REPLACE FUNCTION create_analytics_snapshot_on_order()
RETURNS TRIGGER AS $$
DECLARE
    v_snapshot_date DATE;
    v_item RECORD;
BEGIN
    v_snapshot_date := CURRENT_DATE;

    -- Fixed: Declare v_item as RECORD
    FOR v_item IN
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id
    LOOP
        INSERT INTO analytics_snapshots (
            snapshot_date,
            snapshot_type,
            product_id,
            total_units_ordered,
            total_orders,
            created_at,
            updated_at
        ) VALUES (
            v_snapshot_date,
            'DEMAND',
            v_item.product_id,
            v_item.quantity,
            1,
            NOW(),
            NOW()
        )
        ON CONFLICT (snapshot_date, snapshot_type, product_id)
        DO UPDATE SET
            total_units_ordered = analytics_snapshots.total_units_ordered + EXCLUDED.total_units_ordered,
            total_orders = analytics_snapshots.total_orders + 1,
            updated_at = NOW();
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table (SAFE)
DROP TRIGGER IF EXISTS trigger_analytics_snapshot_on_order ON orders;
CREATE TRIGGER trigger_analytics_snapshot_on_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_analytics_snapshot_on_order();

-- ======================================
-- Done!
-- ======================================
