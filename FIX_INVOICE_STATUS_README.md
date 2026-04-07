# Invoice Status Update - Complete Fix Guide

## Problem Summary
Invoice status updates from SENT to PROCESSING were failing due to:
1. Database CHECK constraint missing PROCESSING/PACKING statuses
2. Missing RLS policies for admin access
3. Code bug with undefined variable
4. Missing database columns

## Solution Files Created

### 1. `fix_invoice_status_complete.sql`
Complete database migration that fixes all issues. **Run this in Supabase SQL Editor first.**

### 2. Code Fix
Fixed undefined variable bug in `src/app/api/invoices/[id]/confirm-order/route.ts`

## Installation Steps

### Step 1: Run Database Migration (CRITICAL)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy entire content from `fix_invoice_status_complete.sql`
4. Paste and execute
5. Check for success messages in output

**What this migration does:**
- Updates status CHECK constraint to include PROCESSING and PACKING
- Adds missing columns (processing_started_at, status_updated_at, etc.)
- Creates admin RLS policies for UPDATE and SELECT
- Creates performance indexes
- Verifies all changes

### Step 2: Restart Dev Server

**IMPORTANT**: After running SQL migration, restart your Next.js dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

This ensures:
- Environment variables load properly
- Service role key is detected
- All database changes are recognized

### Step 3: Verify Migration Success

After running the SQL, check the verification queries output:

1. **Status Constraint**: Should show PROCESSING and PACKING in allowed values
2. **Columns**: All required columns should exist
3. **RLS Policies**: Two admin policies should be listed
4. **Indexes**: Three indexes should be created

### Step 4: Test

1. Open invoice flow dashboard: `http://localhost:3000/admin/invoice-flow`
2. Move an invoice from SENT to PROCESSING
3. **Manual refresh** the page
4. Verify status is still PROCESSING (not reverted to SENT)

## Expected Console Output

After fixes, you should see:
- `✅ Invoice-flow API: Using service role client (RLS bypassed)`
- `✅ Using service role client for admin invoice update (RLS bypassed)`
- `✅ Invoice updated successfully and verified`

**No more warnings about:**
- Service role key not found
- RLS blocking admin reads
- Invoice update failures

## Troubleshooting

### If status still reverts after refresh:

1. **Check SQL migration ran successfully**
   - Run verification queries at bottom of `fix_invoice_status_complete.sql`
   - Ensure all policies and constraints show in results

2. **Verify service role key**
   ```bash
   # Check .env.local has:
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Check dev server restarted**
   - Stop and restart: `npm run dev`
   - Environment variables load on startup

4. **Check RLS policies**
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE tablename = 'invoices' 
   AND policyname LIKE '%Admin%';
   ```
   Should show 2 policies.

### If update still fails:

1. Check browser console for specific error
2. Check server console (terminal) for detailed error
3. Verify invoice exists and is in SENT status
4. Check user has SUPER_ADMIN role in profiles table

## Files Modified

- `src/app/api/invoices/[id]/confirm-order/route.ts` - Fixed undefined variable bug
- `fix_invoice_status_complete.sql` - Complete database migration (NEW)

## Success Criteria

✅ Database accepts PROCESSING status  
✅ Admin can update any invoice  
✅ Status persists after refresh  
✅ No code errors  
✅ Service role client loads  
✅ RLS allows admin operations  

---

**Note**: This fix is idempotent - you can run the SQL migration multiple times safely.










