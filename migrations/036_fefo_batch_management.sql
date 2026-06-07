-- ======================================
-- TASK 2: FEFO BATCH & EXPIRY MANAGEMENT
-- Pharma-grade inventory with batch tracking
-- ======================================

-- ======================================
-- 1. Ensure product_batches table exists (enhanced)
-- Links to products and tracks batch details
-- ======================================

CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    mfg_date DATE,
    expiry_date DATE NOT NULL,
    batch_stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_batch_per_distributor UNIQUE (product_id, distributor_id, batch_number),
    CONSTRAINT non_negative_batch_stock CHECK (batch_stock >= 0),
    CONSTRAINT non_negative_reserved CHECK (reserved_stock >= 0),
    CONSTRAINT reserved_lte_stock CHECK (reserved_stock <= batch_stock)
);

CREATE INDEX IF NOT EXISTS idx_product_batches_fefo 
    ON product_batches(product_id, distributor_id, expiry_date ASC) 
    WHERE is_active = TRUE AND batch_stock > 0;

CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_distributor ON product_batches(distributor_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);

COMMENT ON TABLE product_batches IS 'Pharma-grade batch tracking for FEFO (First Expiry First Out) inventory management';
COMMENT ON COLUMN product_batches.batch_number IS 'Unique batch number for traceability';
COMMENT ON COLUMN product_batches.mfg_date IS 'Manufacturing date';
COMMENT ON COLUMN product_batches.expiry_date IS 'Expiry date - used for FEFO sorting';
COMMENT ON COLUMN product_batches.batch_stock IS 'Total stock quantity in this batch';
COMMENT ON COLUMN product_batches.reserved_stock IS 'Stock reserved for pending orders';

-- ======================================
-- 2. Add batch_id to distributor_inventory table (if exists)
-- Reference specific batches instead of generic product
-- ======================================

DO $$ BEGIN
    ALTER TABLE distributor_inventory
        ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_table THEN
        CREATE TABLE IF NOT EXISTS distributor_inventory (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 0,
            batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
END $$;

CREATE INDEX IF NOT EXISTS idx_distributor_inventory_batch ON distributor_inventory(batch_id);

-- ======================================
-- 3. Add FEFO fields to invoice_items for traceability
-- ======================================

DO $$ BEGIN
    ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS batch_number TEXT,
        ADD COLUMN IF NOT EXISTS mfg_date DATE;
EXCEPTION
    WHEN undefined_table THEN
        CREATE TABLE IF NOT EXISTS invoice_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1,
            rate_per_unit DECIMAL(10,2),
            batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
            batch_number TEXT,
            mfg_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_items_batch ON invoice_items(batch_id);

-- ======================================
-- 4. RPC Function: get_fefo_batch_for_product
-- Returns the batch with closest expiry date for a product
-- ======================================

CREATE OR REPLACE FUNCTION get_fefo_batch_for_product(
    p_product_id UUID,
    p_distributor_id UUID,
    p_quantity_needed INTEGER DEFAULT 1
)
RETURNS TABLE (
    batch_id UUID,
    batch_number TEXT,
    mfg_date DATE,
    expiry_date DATE,
    available_stock INTEGER,
    quantity_reserved INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.id,
        pb.batch_number,
        pb.mfg_date,
        pb.expiry_date,
        pb.batch_stock - pb.reserved_stock AS available_stock,
        pb.reserved_stock
    FROM product_batches pb
    WHERE 
        pb.product_id = p_product_id
        AND pb.distributor_id = p_distributor_id
        AND pb.is_active = TRUE
        AND pb.batch_stock > pb.reserved_stock
        AND pb.batch_stock - pb.reserved_stock >= p_quantity_needed
    ORDER BY 
        pb.expiry_date ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ======================================
-- 5. RPC Function: deduct_fefo_batch_stock
-- Atomically deducts stock from the nearest expiry batch
-- ======================================

CREATE OR REPLACE FUNCTION deduct_fefo_batch_stock(
    p_product_id UUID,
    p_distributor_id UUID,
    p_quantity INTEGER
)
RETURNS TABLE (
    batch_id UUID,
    batch_number TEXT,
    previous_stock INTEGER,
    new_stock INTEGER,
    success BOOLEAN
) AS $$
DECLARE
    v_batch RECORD;
    v_new_stock INTEGER;
BEGIN
    SELECT INTO v_batch
        pb.id,
        pb.batch_number,
        pb.batch_stock,
        pb.reserved_stock
    FROM product_batches pb
    WHERE 
        pb.product_id = p_product_id
        AND pb.distributor_id = p_distributor_id
        AND pb.is_active = TRUE
        AND pb.batch_stock > pb.reserved_stock
    ORDER BY 
        pb.expiry_date ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 0, 0, FALSE;
        RETURN;
    END IF;

    v_new_stock := v_batch.batch_stock - p_quantity;

    UPDATE product_batches
    SET 
        batch_stock = v_new_stock,
        updated_at = NOW()
    WHERE id = v_batch.id;

    RETURN QUERY SELECT v_batch.id, v_batch.batch_number, v_batch.batch_stock, v_new_stock, TRUE;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 6. Enhanced Smart Dispatch with FEFO
-- ======================================

CREATE OR REPLACE FUNCTION smart_dispatch_order_fefo(
    p_order_id UUID,
    p_distributor_id UUID,
    p_margin_percentage NUMERIC DEFAULT 15
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_order_total NUMERIC;
    v_margin_amount NUMERIC;
    v_batch RECORD;
    v_item RECORD;
BEGIN
    SELECT total_amount INTO v_order_total
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    v_margin_amount := (v_order_total * p_margin_percentage) / 100;

    FOR v_item IN
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        SELECT INTO v_batch
            pb.id,
            pb.batch_number,
            pb.batch_stock
        FROM product_batches pb
        WHERE 
            pb.product_id = v_item.product_id
            AND pb.distributor_id = p_distributor_id
            AND pb.is_active = TRUE
            AND pb.batch_stock > pb.reserved_stock
        ORDER BY 
            pb.expiry_date ASC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_item.product_id;
        END IF;

        UPDATE product_batches
        SET 
            batch_stock = batch_stock - v_item.quantity,
            reserved_stock = reserved_stock + v_item.quantity,
            updated_at = NOW()
        WHERE id = v_batch.id;

        UPDATE distributor_inventory
        SET quantity = quantity - v_item.quantity,
            updated_at = NOW()
        WHERE distributor_id = p_distributor_id
          AND product_id = v_item.product_id;
    END LOOP;

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

    UPDATE orders
    SET status = 'DISPATCHED',
        updated_at = NOW()
    WHERE id = p_order_id;

    UPDATE routed_orders
    SET status = 'DISPATCHED',
        dispatched_at = NOW(),
        updated_at = NOW()
    WHERE order_id = p_order_id;

    v_result := jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'distributor_id', p_distributor_id,
        'total_amount', v_order_total,
        'margin_amount', v_margin_amount,
        'margin_percentage', p_margin_percentage,
        'message', 'Order dispatched with FEFO batch deduction'
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
-- 7. Verification
-- ======================================

SELECT 'FEFO batch management migration completed!' as status;