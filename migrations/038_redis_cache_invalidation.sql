-- ======================================
-- TASK: REDIS CACHE INVALIDATION TRIGGERS
-- Supabase database triggers for automatic cache invalidation
-- ======================================

-- ======================================
-- 1. Create HTTP extension if not exists (for webhook calls)
-- ======================================

DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS http;
EXCEPTION
    WHEN undefined_extension THEN null;
END $$;

-- ======================================
-- 2. Create cache invalidation function
-- ======================================

CREATE OR REPLACE FUNCTION invalidate_redis_cache()
RETURNS TRIGGER AS $$
DECLARE
    v_distributor_id TEXT;
    v_payload JSONB;
    v_webhook_url TEXT;
BEGIN
    v_webhook_url := current_setting('app.cache_invalidation_webhook', true);
    
    IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'distributor_inventory' THEN
        v_distributor_id := COALESCE(NEW.distributor_id::TEXT, OLD.distributor_id::TEXT);
        
        v_payload := jsonb_build_object(
            'type', 'STOCK_UPDATE',
            'distributor_id', v_distributor_id,
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', NOW()
        );
        
        PERFORM http_post(
            v_webhook_url,
            v_payload::TEXT,
            'application/json'
        );
        
    ELSIF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
        IF OLD.role = 'DISTRIBUTOR' AND (
            NEW.store_lat IS DISTINCT FROM OLD.store_lat OR
            NEW.store_lng IS DISTINCT FROM OLD.store_lng OR
            NEW.location IS DISTINCT FROM OLD.location OR
            NEW.is_active IS DISTINCT FROM OLD.is_active OR
            NEW.is_delisted IS DISTINCT FROM OLD.is_delisted
        ) THEN
            v_distributor_id := NEW.id::TEXT;
            
            v_payload := jsonb_build_object(
                'type', 'LOCATION_UPDATE',
                'distributor_id', v_distributor_id,
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'timestamp', NOW()
            );
            
            PERFORM http_post(
                v_webhook_url,
                v_payload::TEXT,
                'application/json'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- 3. Create trigger for distributor_inventory changes
-- ======================================

DROP TRIGGER IF EXISTS trigger_invalidate_inventory_cache ON distributor_inventory;
CREATE TRIGGER trigger_invalidate_inventory_cache
    AFTER INSERT OR UPDATE OR DELETE ON distributor_inventory
    FOR EACH ROW EXECUTE FUNCTION invalidate_redis_cache();

-- ======================================
-- 4. Create trigger for profiles location changes
-- ======================================

DROP TRIGGER IF EXISTS trigger_invalidate_location_cache ON profiles;
CREATE TRIGGER trigger_invalidate_location_cache
    AFTER UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION invalidate_redis_cache();

-- ======================================
-- 5. Create trigger for product_batches changes (FEFO)
-- ======================================

DROP TRIGGER IF EXISTS trigger_invalidate_batch_cache ON product_batches;
CREATE TRIGGER trigger_invalidate_batch_cache
    AFTER INSERT OR UPDATE OR DELETE ON product_batches
    FOR EACH ROW EXECUTE FUNCTION invalidate_redis_cache();

-- ======================================
-- 6. Create function to manually invoke cache invalidation
-- ======================================

CREATE OR REPLACE FUNCTION trigger_cache_invalidation(
    p_type VARCHAR(50),
    p_distributor_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_webhook_url TEXT;
    v_payload JSONB;
BEGIN
    v_webhook_url := current_setting('app.cache_invalidation_webhook', true);
    
    IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
        RAISE NOTICE 'Cache invalidation webhook not configured';
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'type', p_type,
        'distributor_id', COALESCE(p_distributor_id::TEXT, ''),
        'timestamp', NOW()
    );

    PERFORM http_post(
        v_webhook_url,
        v_payload::TEXT,
        'application/json'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- 7. Verification
-- ======================================

SELECT 'Cache invalidation triggers created successfully!' as status;
SELECT 'Triggers: trigger_invalidate_inventory_cache, trigger_invalidate_location_cache, trigger_invalidate_batch_cache' as active_triggers;

-- ======================================
-- SETUP INSTRUCTIONS:
-- 1. Set the webhook URL in Supabase:
--    ALTER DATABASE your_database SET app.cache_invalidation_webhook TO 'https://your-app.vercel.app/api/cache/invalidate';
--
-- 2. Or set per-session:
--    SET app.cache_invalidation_webhook TO 'https://your-app.vercel.app/api/cache/invalidate';
--
-- 3. Verify triggers are working:
--    SELECT * FROM pg_trigger WHERE tgname LIKE '%invalidate%';
-- ======================================