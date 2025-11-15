# MedusaJS Integration - Testing Guide

## Pre-Testing Setup

Before testing, ensure:

1. ✅ MedusaJS backend is running (`cd backend && npm run dev`)
2. ✅ Next.js app is running (`npm run dev`)
3. ✅ PostgreSQL database is configured
4. ✅ Environment variables are set (`.env.local`)

## Test Checklist

### Phase 1: Backend Health Check

#### Test 1.1: MedusaJS Server Status

```bash
# Terminal
curl http://localhost:9000/health
```

**Expected Response:**
```json
{
  "message": "medusa is healthy"
}
```

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 1.2: Admin Panel Access

1. Open browser: http://localhost:7001
2. Login with admin credentials (from ENV)

**Expected**: Admin panel loads successfully

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 1.3: Next.js API Proxy

```bash
curl http://localhost:3000/api/medusa/products
```

**Expected Response:**
```json
{
  "success": true,
  "products": []
}
```

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 2: Authentication Flow

#### Test 2.1: User Login (Supabase)

1. Open: http://localhost:3000
2. Click "Sign In"
3. Login with test credentials or Google OAuth

**Expected**: Redirect to dashboard

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 2.2: Session Persistence

1. Login to the app
2. Refresh the page
3. Navigate to different pages

**Expected**: User stays logged in, no re-login required

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 3: Product Management (Admin)

#### Test 3.1: View Product List

1. Login as SUPER_ADMIN
2. Navigate to Admin Dashboard
3. Click "Inventory Management"

**Expected**: Product list loads (empty or with existing products)

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 3.2: Add New Product

1. In Inventory Management, click "Add Product"
2. Fill in all required fields:
   - Name: "Test Medicine A"
   - Stock: 100
   - MRP: ₹500
   - Agorich Price: ₹400
   - Pack Size: "10 tablets"
   - Batch Number: "BATCH001"
   - Expiry Date: 2025-12
   - Manufacturer: "Test Pharma"
3. Click "Add Product"

**Expected**:
- Success message appears
- Product appears in the list
- Margin calculated automatically (20%)

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 3.3: Edit Product

1. Find "Test Medicine A" in the list
2. Click "Edit" icon
3. Change Stock to 150
4. Click "Save Changes"

**Expected**:
- Product updated successfully
- Stock shows 150 in the list

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 3.4: Delete Product

1. Find "Test Medicine A" in the list
2. Click "Delete" icon
3. Confirm deletion

**Expected**:
- Product removed from list
- Confirmation message shown

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 3.5: CSV Import

1. Prepare a test CSV file:

```csv
name,stock,mrp,agorich_price,pack_size,batch_number,expiry_date,mfg
Medicine B,50,300,250,20 capsules,BATCH002,2025-06,Pharma Co
Medicine C,75,450,380,15 tablets,BATCH003,2025-09,Health Ltd
```

2. Click "Import" button
3. Select the CSV file
4. Wait for import to complete

**Expected**:
- Success message with import count
- Both products appear in the list
- All fields populated correctly

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 4: Invoice Creation (Retailer)

#### Test 4.1: View Products

1. Login as RETAILER
2. Navigate to "Create Invoice"
3. View product list

**Expected**:
- Products load from MedusaJS
- All product details visible
- Search works correctly

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 4.2: Search Products

1. In "Create Invoice", type product name in search
2. Try searching by manufacturer

**Expected**:
- Results filter as you type
- Both name and manufacturer search works

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 4.3: Add to Cart

1. Click "+ Add" on a product
2. Add multiple quantities
3. Add different products

**Expected**:
- Products added to cart
- Quantity updates correctly
- Total calculates properly

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 4.4: View Invoice Preview

1. Add products to cart
2. Click "Preview Invoice"
3. Review invoice details

**Expected**:
- Invoice preview displays correctly
- All product details shown
- Subtotal, tax, total calculated correctly
- Bank details visible at bottom
- Expiry dates shown as MM-YYYY format

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 4.5: Save Invoice

1. In invoice preview, click "Save Invoice"
2. Navigate to "My Invoices"

**Expected**:
- Invoice saved successfully
- Appears in invoice list
- Can view/download later

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 5: MedusaJS Admin Panel

#### Test 5.1: View Products in Admin Panel

1. Open http://localhost:7001
2. Login with admin credentials
3. Navigate to Products section

**Expected**:
- All products from your app visible
- Custom pharma fields displayed
- Can edit products directly

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 5.2: Verify Custom Fields

1. In MedusaJS admin, click on a product
2. Check for pharma-specific fields

**Expected Fields**:
- ✅ Manufacturer
- ✅ Pack Size
- ✅ Batch Number
- ✅ Expiry Date
- ✅ Agorich Price
- ✅ Retailer Price
- ✅ Margin

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 6: Data Migration

#### Test 6.1: Run Migration Script

**Only if you have existing products in Supabase**

```bash
node scripts/migrate-to-medusa.js
```

**Expected**:
- Script connects to Supabase
- Fetches products
- Transforms data
- Imports to MedusaJS
- Shows success summary

**Status**: ⬜ Pass / ⬜ Fail / ⬜ N/A (no existing products)

---

#### Test 6.2: Verify Migrated Data

1. Check product count in MedusaJS admin
2. Compare with Supabase product count
3. Verify random sample products

**Expected**:
- Same number of products
- All fields migrated correctly
- No data loss

**Status**: ⬜ Pass / ⬜ Fail / ⬜ N/A

---

### Phase 7: Mobile Responsiveness

#### Test 7.1: Mobile Login

1. Open app on mobile or resize browser to mobile size
2. Click "Sign In" button
3. Complete login

**Expected**:
- Sign in button visible at top-right
- Login flow works on mobile
- Dashboard accessible

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 7.2: Mobile Product Search

1. On mobile, go to "Create Invoice"
2. Search for products
3. Add to cart

**Expected**:
- Search input responsive
- Product cards display properly
- Add to cart works smoothly

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 7.3: Mobile Invoice Preview

1. Add products on mobile
2. View invoice preview

**Expected**:
- Mobile-optimized invoice layout
- All details readable
- Save/download buttons accessible
- Bank details visible

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 8: Error Handling

#### Test 8.1: Backend Offline

1. Stop MedusaJS backend (`Ctrl+C` in backend terminal)
2. Try to load products in the app
3. Try to add a product

**Expected**:
- Error message displayed
- "Please ensure MedusaJS backend is running"
- App doesn't crash
- Can still access other features

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 8.2: Network Error Recovery

1. Simulate network error (throttle in browser DevTools)
2. Try product operations
3. Restore network
4. Retry operation

**Expected**:
- Error handled gracefully
- Works after network restored
- No stuck states

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 8.3: Invalid Data

1. Try to add product with missing fields
2. Try to add product with negative prices
3. Try to upload invalid CSV

**Expected**:
- Validation errors shown
- Helpful error messages
- Form doesn't submit with invalid data

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 9: Performance

#### Test 9.1: Large Product List

1. Add 50+ products (via CSV or script)
2. View product list
3. Search and filter

**Expected**:
- List loads in < 2 seconds
- Scrolling is smooth
- Search is responsive

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 9.2: Large Invoice

1. Add 20+ products to cart
2. Generate invoice preview
3. Save invoice

**Expected**:
- Invoice generates quickly
- Preview renders correctly
- Save completes successfully

**Status**: ⬜ Pass / ⬜ Fail

---

### Phase 10: Integration Points

#### Test 10.1: Product Sync

1. Add product in Next.js app
2. Check MedusaJS admin panel
3. Edit product in admin panel
4. Refresh Next.js app

**Expected**:
- Product appears in admin panel immediately
- Changes in admin panel reflect in app
- No sync issues

**Status**: ⬜ Pass / ⬜ Fail

---

#### Test 10.2: Inventory Updates

1. Create invoice with products
2. Check stock levels
3. Verify inventory deduction (future feature)

**Expected**:
- Stock levels tracked correctly
- Low stock warnings (if implemented)

**Status**: ⬜ Pass / ⬜ Fail / ⬜ Pending (feature not implemented)

---

## Test Summary

**Total Tests**: 28
**Passed**: ___
**Failed**: ___
**N/A**: ___
**Pending**: ___

## Issues Found

| Test ID | Issue Description | Severity | Status |
|---------|------------------|----------|--------|
| Example: 3.2 | Product margin not calculating | High | Fixed |
|  |  |  |  |
|  |  |  |  |

## Notes

- Add any additional observations here
- Performance metrics
- Browser compatibility notes
- Mobile device testing notes

## Sign-off

**Tested By**: _____________
**Date**: _____________
**Environment**: Development / Staging / Production
**Browser(s)**: _____________
**Mobile Device(s)**: _____________

---

## Quick Smoke Test (5 minutes)

For rapid verification:

1. ✅ Backend running: `curl http://localhost:9000/health`
2. ✅ Login works
3. ✅ Add one product (admin)
4. ✅ View product in invoice (retailer)
5. ✅ Create and save invoice
6. ✅ Check product in MedusaJS admin panel

If all pass → Integration is working! 🎉
















