-- Migration: Fix SECURITY DEFINER vulnerability on views
-- Date: 2026-05-18
-- Run this in Supabase SQL Editor

-- Step 1: First get the view definitions to understand what they contain
-- SELECT viewname, definition FROM pg_views WHERE schemaname = 'public' AND viewname IN ('money_flow_summary', 'credit_aging', 'collector_performance', 'v_payment_ledger_backfill');

-- Step 2: Change SECURITY DEFINER to SECURITY INVOKER for each view
-- Run these commands one by one:

-- For money_flow_summary:
ALTER VIEW money_flow_summary SET (security_invoker = true);

-- For credit_aging:
ALTER VIEW credit_aging SET (security_invoker = true);

-- For collector_performance:
ALTER VIEW collector_performance SET (security_invoker = true);

-- For v_payment_ledger_backfill:
ALTER VIEW v_payment_ledger_backfill SET (security_invoker = true);

-- Step 3: Verify the changes
SELECT
  schemaname,
  viewname,
  security_barrier
FROM pg_views
WHERE viewname IN ('money_flow_summary', 'credit_aging', 'collector_performance', 'v_payment_ledger_backfill')
AND schemaname = 'public';

-- If security_barrier shows f (false), it means SECURITY INVOKER is now active