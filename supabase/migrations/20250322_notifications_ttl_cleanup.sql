-- Migration: Add 7-day TTL cleanup for notifications
-- Description: Creates a function and scheduled job to automatically delete notifications older than 7 days
-- Date: 2025-03-22

-- Create a function to delete notifications older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete notifications older than 7 days
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up notifications older than 7 days at %', NOW();
END;
$$;

-- Create a scheduled job using pg_cron (if pg_cron extension is enabled)
-- Uncomment and adjust the schedule as needed
/*
-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run daily at 3 AM
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *', -- Every day at 3:00 AM
  'SELECT cleanup_old_notifications();'
);
*/

-- Alternative: Create a simple SQL command that can be run manually or via a cron job
-- This is safer if you don't want to enable pg_cron
COMMENT ON FUNCTION cleanup_old_notifications() IS 
'Deletes notifications older than 7 days. Can be called manually or scheduled.';

-- Create an index to speed up the cleanup query (if not already exists)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at);

-- Optional: Create a view to see notifications that will be cleaned up
CREATE OR REPLACE VIEW notifications_to_cleanup AS
SELECT 
  id,
  title,
  message,
  created_at,
  AGE(NOW(), created_at) as age
FROM notifications
WHERE created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at ASC;

COMMENT ON VIEW notifications_to_cleanup IS 
'Shows notifications that are older than 7 days and will be cleaned up.';

-- Manual cleanup command (run this to test or manually clean up)
-- SELECT cleanup_old_notifications();