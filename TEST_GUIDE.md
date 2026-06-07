# 🧪 AGORICH PHARMA - Complete Test Guide

## Prerequisites

### 1. Start the Development Server
```bash
npm run dev
# or
npm run dev -- --turbo
```

### 2. Clear Browser Cache
- Press `Ctrl + Shift + R` (Hard Refresh)
- Or use Incognito/Private window

### 3. Database Setup Required
Make sure these tables exist in Supabase:
- `profiles` (retailers, distributors, admin)
- `distributor_inventory` (products with distributor_id)
- `retailer_distributor_lock` (for locking mechanism)
- `invoices` (for storing created invoices)
- `routed_orders` (for distributor acceptance/rejection)
- `logistics_partners` (for delivery partners)

---

## 📋 Complete Test Flow

### STEP 1: Login as RETAILER
**URL:** `http://localhost:3000/`

1. Login with retailer credentials
2. Verify dashboard loads
3. Note: Retailer's store_lat, store_lng should be set in their profile

---

### STEP 2: Test DISTRIBUTOR SELECTION (Create Invoice Page)
**URL:** `http://localhost:3000/retailer/create-invoice`

#### Mobile & Desktop Test:

#### ✅ Test A: Slider Works
1. Look for **"Search Radius"** slider at top
2. Drag slider (1-50 km)
3. Radius value should update (e.g., "5 km", "25 km", "50 km")

#### ✅ Test B: Distributors List Loads
1. Below slider, should see list of distributors
2. Each should show:
   - Business name
   - Address, City, State
   - Distance in km
   - Rejection status badge (e.g., "0/3", "1/3")
3. Distributors within selected radius only

#### ✅ Test C: Select a Distributor
1. Tap/Click on a distributor card
2. Should show:
   - Green checkmark
   - "Distributor Selected" confirmation
   - "Change" button
3. Products should load in the list below
4. Invoice preview should update with distributor info

#### ✅ Test D: Change Distributor
1. Click "Change" button
2. Selection should clear
3. Slider and distributors list should reappear

---

### STEP 3: Test PRODUCT ADD TO CART
**URL:** `http://localhost:3000/retailer/create-invoice`

#### ✅ Test E: Search Products
1. Type in search box (e.g., "Crocin")
2. Products should filter in real-time

#### ✅ Test F: Add to Cart
1. Tap the **+** (Plus) button on a product
2. Cart count should increase
3. Product card should show quantity controls (+/-)

#### ✅ Test G: Update Quantity
1. Tap **+** to increase quantity
2. Tap **-** to decrease quantity
3. Quantity should update

#### ✅ Test H: View Cart
1. Switch to "Cart" tab (top of page)
2. Should see all added products
3. Should see subtotal, GST, grand total

---

### STEP 4: Test INVOICE CREATION
**URL:** `http://localhost:3000/retailer/create-invoice`

#### ✅ Test I: Invoice Preview
1. In Cart tab, look at invoice preview on right
2. Should show:
   - **FROM:** Distributor's name, address, GSTIN, phone, drug license
   - **TO:** Retailer's name, address, GSTIN
   - Invoice number (DRAFT-XXXXX)
   - Product list with rates
   - Total amounts

#### ✅ Test J: Payment Flow
1. Click "Pay Now" button
2. Should show UPI payment modal
3. Test UPI payment flow

---

### STEP 5: Test DISTRIBUTOR SIDE
**URL:** `http://localhost:3000/distributor/login`

#### ✅ Test K: Login as Distributor
1. Login with distributor credentials
2. Dashboard should load

#### ✅ Test L: View Routed Orders
**URL:** `http://localhost:3000/distributor/routed-orders`

1. Should see incoming orders from retailers
2. Each order should show:
   - Retailer name and address
   - Order items
   - Grand total
   - Status badge (ASSIGNED, ACCEPTED, REJECTED, etc.)

#### ✅ Test M: Accept Order
1. Find an order with "ASSIGNED" status
2. Click "Accept" button
3. Status should change to "ACCEPTED"

#### ✅ Test N: Reject Order
1. Find an order with "ASSIGNED" status
2. Click "Reject" button
3. Status should change to "REJECTED"
4. (If rejected 3 times in a month, distributor should be delisted)

#### ✅ Test O: Dispatch Order
1. Find an order with "ACCEPTED" status
2. Click "Dispatch" button
3. Status should change to "DISPATCHED"
4. Invoice status should also update to "DISPATCHED"

---

### STEP 6: Test LOGISTICS SIDE
**URL:** `http://localhost:3000/logistics/login`

#### ✅ Test P: View Invoices
1. Should see invoices with "DISPATCHED" status
2. Should NOT see invoices with "PAID" or "DRAFT" status

#### ✅ Test Q: Pack and Deliver
1. Select a dispatched invoice
2. Mark as "PACKED"
3. Mark as "OUT_FOR_DELIVERY"
4. Mark as "DELIVERED"
5. Invoice status should update to "DELIVERED"

---

## 🔍 What to Check If Something Goes Wrong

### Problem: Slider not visible
**Solution:**
- Check browser console for errors
- Verify `selected_distributor` state is not set (should show slider only when no lock)
- Clear sessionStorage: `sessionStorage.clear()` in browser console

### Problem: Distributors list empty
**Solutions:**
1. Verify retailer has `store_lat` and `store_lng` in profile
2. Check database has distributors with location data
3. Increase slider radius to 50 km

### Problem: Products not loading
**Solutions:**
1. Check `distributor_inventory` table has products for selected distributor
2. Verify `selected_distributor_id` is set in sessionStorage
3. Check browser console for API errors

### Problem: Invoice preview shows "SELECT DISTRIBUTOR"
**Solutions:**
1. Go back to slider and select a distributor
2. Verify `selectedDistributorInfo` state is set
3. Check sessionStorage has `selected_distributor_info`

### Problem: Can't accept/reject orders
**Solutions:**
1. Verify routed_orders table exists
2. Check order status is "ASSIGNED" (can't accept already accepted orders)
3. Verify distributor ID matches

---

## 📊 Expected Database State After Testing

### After Retailer Creates Order:
```
invoices table:
- status: PAID
- distributor_data: { business_name, address, ... }

routed_orders table:
- status: ASSIGNED
- distributor_id: <selected_distributor_id>
- retailer_id: <current_retailer_id>
```

### After Distributor Accepts:
```
routed_orders table:
- status: ACCEPTED
```

### After Distributor Dispatches:
```
invoices table:
- status: DISPATCHED

routed_orders table:
- status: DISPATCHED
```

### After Logistics Delivers:
```
invoices table:
- status: DELIVERED

routed_orders table:
- status: DELIVERED
```

---

## 🆘 Need Help?

If tests fail, check:
1. **Browser Console** (F12) for errors
2. **Network Tab** for failed API calls
3. **Database** for data integrity
4. **Server Terminal** for backend errors

---

## ✅ Test Checklist (Copy & Paste)

Mark each as you test:

```
[ ] STEP 1: Login as Retailer
[ ] STEP 2A: Slider works (1-50 km)
[ ] STEP 2B: Distributors list loads
[ ] STEP 2C: Can select distributor
[ ] STEP 2D: Can change distributor
[ ] STEP 3E: Can search products
[ ] STEP 3F: Can add product to cart
[ ] STEP 3G: Can update quantity
[ ] STEP 3H: Can view cart
[ ] STEP 4I: Invoice preview correct
[ ] STEP 4J: Payment flow works
[ ] STEP 5K: Login as Distributor
[ ] STEP 5L: View routed orders
[ ] STEP 5M: Accept order
[ ] STEP 5N: Reject order
[ ] STEP 5O: Dispatch order
[ ] STEP 6P: Logistics view invoices
[ ] STEP 6Q: Pack and deliver
```

---

## 📱 Mobile Testing Tips

1. **Use Chrome DevTools Mobile View:**
   - Press F12 → Click phone icon (Toggle device toolbar)
   - Or press `Ctrl + Shift + M`

2. **Test on Actual Phone:**
   - Use ngrok or similar for local URL exposure
   - Or deploy to Vercel/Netlify preview

3. **Rotate Device:**
   - Test both portrait and landscape modes

---

**Happy Testing! 🚀**
