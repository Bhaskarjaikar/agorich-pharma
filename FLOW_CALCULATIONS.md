# AGORICH PHARMA - Complete Flow & Calculations Documentation

## 📊 Overview

Agorich Pharma is a B2B pharmaceutical distribution platform connecting:
- **Admin** (Wholesaler/Agorich) → **Distributors** → **Retailers**
- **Logistics Partner** handles delivery between Distributors and Retailers

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGORICH PHARMA                                   │
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│  │   ADMIN    │────▶│ DISTRIBUTOR │────▶│  RETAILER  │────▶│ LOGISTICS │ │
│  │ (Agorich)  │     │             │     │             │     │           │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └───────────┘ │
│        │                   │                   │                    │        │
│        │                   │                   │                    │        │
│   Inventory             Routed             Create               Pack &    │
│   (Wholesale)          Orders             Invoice              Deliver   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💰 Complete Money Flow & Calculations

### 1. Product Pricing Tiers

Each product has multiple price points:

| Price Type | Description | Who Pays | Example (MRP ₹100) |
|------------|-------------|----------|-------------------|
| **MRP** | Maximum Retail Price | Customer (Retailer buys at lower) | ₹100 |
| **Agorich Price** | Wholesale price (Admin → Distributor) | Distributor pays Admin | ₹60 |
| **Distributor Price** | Cost price for Distributor | Internal | ₹55 |
| **Retailer Price** | Price Distributor sells to Retailer | Retailer pays Distributor | ₹70 |
| **Retailer Margin** | Retailer's profit (MRP - Retailer Price) | Retailer keeps | ₹30 |

### 2. Invoice Calculation Formula

```
Invoice Amount = Sum of (Rate × Quantity × GST)

Where:
- Rate = Retailer Price (what retailer pays)
- GST = 5% (standard pharmaceutical GST)
- Total = Rate × Quantity + GST
```

### 3. Margin & Profit Calculations

#### Distributor Margin:
```
Distributor Margin = Retailer Price - Distributor Price
                  = ₹70 - ₹55 = ₹15 per unit
```

#### Agorich Margin:
```
Agorich Margin = Agorich Price - Distributor Price
               = ₹60 - ₹55 = ₹5 per unit
```

#### Retailer Margin:
```
Retailer Margin = MRP - Retailer Price
                = ₹100 - ₹70 = ₹30 per unit
```

### 4. Example Invoice Calculation

**Product Details:**
- MRP: ₹100
- Agorich Price (Admin sells to Distributor): ₹60
- Distributor Price (Cost): ₹55
- Retailer Price (Distributor sells to Retailer): ₹70

**Order:**
- Quantity: 10 units
- Retailer Price: ₹70

**Calculation:**
```
Subtotal = ₹70 × 10 = ₹700
GST (5%) = ₹700 × 0.05 = ₹35
Grand Total = ₹700 + ₹35 = ₹735

Retailer Payment to Distributor = ₹735
Retailer Cost Price = ₹70 × 10 = ₹700
Retailer Selling Price (MRP) = ₹100 × 10 = ₹1000
Retailer Profit = ₹1000 - ₹700 = ₹300
Retailer Margin % = (₹300 / ₹1000) × 100 = 30%
```

---

## 🔄 Complete Order Flow

### Stage 1: RETAILER Creates Order

**URL:** `http://localhost:3000/retailer/create-invoice`

```
RETAILER FLOW:
───────────────────────────────────────────────────────────────────
1. Login as Retailer
   ↓
2. Go to Create Invoice
   ↓
3. Set Search Radius (slider: 1-50 km)
   ↓
4. View Nearby Distributors (sorted by distance)
   ↓
5. Select Distributor → DISTRIBUTOR LOCKED for 24 hours
   ↓
6. View Distributor's Products (from distributor_inventory)
   ↓
7. Add Products to Cart
   ↓
8. View Invoice Preview
   - FROM: Distributor Address ✓
   - TO: Retailer Address ✓
   - Items with rates ✓
   - GST ✓
   - Total ✓
   ↓
9. Minimum Order: ₹500
   ↓
10. Select Payment Method:
    - UPI (default)
    - Net Banking
    - COD (Cash on Delivery)
    ↓
11. Pay Now → Creates Invoice + Routed Order
───────────────────────────────────────────────────────────────────
```

**API Calls:**
1. `GET /api/distributors/by-distance?lat=X&lng=Y&radius=Z`
2. `POST /api/retailer/distributor-lock`
3. `GET /api/distributor/inventory?distributor_id=X`
4. `POST /api/invoices` (creates invoice + routed_order)

### Stage 2: DISTRIBUTOR Processes Order

**URL:** `http://localhost:3000/distributor/routed-orders`

```
DISTRIBUTOR FLOW:
───────────────────────────────────────────────────────────────────
1. Login as Distributor
   ↓
2. View Routed Orders (status: ASSIGNED)
   - Shows Retailer info
   - Shows Items
   - Shows Total Amount
   ↓
3. ACCEPT Order → Status: ACCEPTED
   OR
   REJECT Order → Status: REJECTED (max 3/month)
   ↓
4. Prepare Order for Dispatch
   ↓
5. DISPATCH Order → Status: DISPATCHED
   - Invoice status also updates to DISPATCHED
   - Logistics gets notified
───────────────────────────────────────────────────────────────────
```

**API Calls:**
1. `GET /api/distributor/routed-orders`
2. `POST /api/distributor/routed-orders/accept`
3. `POST /api/distributor/routed-orders/reject`
4. `POST /api/distributor/routed-orders/dispatch`

### Stage 3: LOGISTICS Delivers

**URL:** `http://localhost:3000/logistic`

```
LOGISTICS FLOW:
───────────────────────────────────────────────────────────────────
1. Login as Logistics Partner
   ↓
2. View Dispatched Invoices (from Distributors)
   - Invoice details
   - Customer address
   ↓
3. PACK Order → Status: PACKING
   ↓
4. Mark as DISPATCHED for Delivery
   ↓
5. OUT FOR DELIVERY
   ↓
6. DELIVER → Status: DELIVERED
   - Invoice DELIVERED
   - Routed Order DELIVERED
───────────────────────────────────────────────────────────────────
```

**API Calls:**
1. `GET /api/logistic/invoices`
2. `POST /api/logistic/pack-order`
3. `POST /api/invoices/[id]/delivery-confirm`

### Stage 4: ADMIN Overview

**URL:** `http://localhost:3000/admin`

```
ADMIN FLOW:
───────────────────────────────────────────────────────────────────
1. View All Orders
   - By Status
   - By Distributor
   - By Retailer
   ↓
2. Inventory Management
   - Add/Edit Products
   - Set Agorich Prices
   ↓
3. Distributor Management
   - Approve Distributors
   - View Performance
   ↓
4. Accounts Receivable
   - View Pending Payments
   - Track Distributor Payments
───────────────────────────────────────────────────────────────────
```

---

## 📊 Status Flow Diagram

### Invoice Status Flow:
```
DRAFT → SENT → PROCESSING → PACKING → DISPATCHED → DELIVERED → PAID
  ↓        ↓         ↓          ↓          ↓            ↓          ↓
(Edit)  (Sent)   (Being    (Being     (Out for    (Received   (Payment
      to Dist)  Prepared)  Packed)    Delivery)   by Customer) Received)
```

### Routed Order Status Flow:
```
ASSIGNED → ACCEPTED → PACKING → PACKED → DISPATCHED → IN_TRANSIT → DELIVERED
   ↓           ↓          ↓        ↓         ↓            ↓             ↓
(New      (Dist      (Order   (Ready   (Handed to   (On the     (Delivered
Order)    Accepted)  Being    for      Logistics)   Way)         to Retailer)
                    Prepared)
```

### Rejection Flow:
```
ASSIGNED → REJECTED
   ↓           ↓
(Can be   (Counts against
reassigned) Distributor's
           monthly limit)
           
If Distributor reaches 3 rejections in a month → DELISTED
```

---

## 🔢 Financial Calculations Summary

### Per Unit Economics (Example: MRP ₹100 product)

| Entity | Cost Price | Sell Price | Profit | Margin % |
|--------|-----------|------------|--------|----------|
| **Admin (Agorich)** | ₹55 | ₹60 | ₹5 | 9.1% |
| **Distributor** | ₹60 | ₹70 | ₹10 | 16.7% |
| **Retailer** | ₹70 | ₹100 | ₹30 | 30% |

### Order Economics (10 units of ₹70 product)

| Component | Amount |
|-----------|--------|
| Subtotal | ₹700 |
| GST (5%) | ₹35 |
| **Grand Total** | **₹735** |

**Who gets what:**
- Retailer pays: ₹735
- Distributor receives: ₹735
- Distributor cost: ₹600 (₹60 × 10)
- Distributor profit: ₹135
- Admin cost: ₹550 (₹55 × 10)
- Admin receives from Distributor: ₹600
- Admin profit: ₹50

---

## 🛡️ Business Rules

### 1. Minimum Order Value
- **Minimum:** ₹500 per order
- If order < ₹500 → Error shown

### 2. Distributor Lock Period
- **Lock Duration:** 24 hours
- Purpose: Prevent retailer from jumping between distributors
- After 24 hours: Lock auto-expires

### 3. Rejection Limits
- **Max Rejections:** 3 per month per distributor
- If exceeded: Distributor is temporarily delisted
- Resets on 1st of next month

### 4. Delivery Radius
- **Default Search Radius:** 5 km (configurable)
- **Max Delivery Radius:** 50 km (configurable)
- Distributors outside range won't appear

### 5. Payment Methods
- **UPI:** Default, instant verification
- **Net Banking:** Bank transfer
- **COD:** Cash on Delivery (logistics collects)

---

## 📁 Database Tables Involved

### Core Tables:

| Table | Purpose |
|-------|---------|
| `profiles` | All users (Admin, Distributor, Retailer, Logistics) |
| `products` | Admin's product catalog |
| `distributor_inventory` | Distributor's product stock & pricing |
| `invoices` | Created invoices with customer/distributor data |
| `invoice_items` | Line items for each invoice |
| `routed_orders` | Orders routed to distributors |
| `retailer_distributor_lock` | Locks to prevent distributor switching |
| `payments` | Payment records |
| `notifications` | User notifications |

### Key Columns:

**profiles:**
- `role`: ADMIN, DISTRIBUTOR, RETAILER, LOGISTIC
- `store_lat`, `store_lng`: Location coordinates
- `business_name`, `address`, `city`, `state`, `pincode`

**distributor_inventory:**
- `distributor_id`: FK to profiles
- `product_id`: FK to products
- `stock`: Available quantity
- `retailer_price`: Price to retailer
- `distributor_price`: Cost price

**invoices:**
- `customer_id`: FK to retailer profile
- `distributor_id`: FK to distributor profile
- `grand_total`: Total with GST
- `status`: DRAFT, SENT, PROCESSING, etc.

**routed_orders:**
- `distributor_id`: FK to distributor
- `order_id`: FK to invoice
- `status`: ASSIGNED, ACCEPTED, REJECTED, etc.
- `margin`: Distributor's profit

---

## 🔗 API Endpoints Summary

### Retailer APIs:
| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/api/distributors/by-distance` | GET | Find distributors by radius |
| `/api/retailer/distributor-lock` | POST/GET/DELETE | Lock/unlock distributor |
| `/api/distributor/inventory` | GET | Get distributor's products |
| `/api/invoices` | GET/POST | Create/list invoices |

### Distributor APIs:
| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/api/distributor/routed-orders` | GET | View assigned orders |
| `/api/distributor/routed-orders/accept` | POST | Accept order |
| `/api/distributor/routed-orders/reject` | POST | Reject order |
| `/api/distributor/routed-orders/dispatch` | POST | Dispatch order |

### Logistics APIs:
| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/api/logistic/invoices` | GET | View dispatched invoices |
| `/api/logistic/pack-order` | POST | Mark as packing |
| `/api/invoices/[id]/delivery-confirm` | POST | Confirm delivery |

### Admin APIs:
| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/api/products` | GET/POST | Manage products |
| `/api/admin/distributors` | GET | View distributors |
| `/api/admin/analytics` | GET | Dashboard analytics |

---

## 📱 Testing Checklist

### Retailer Flow:
- [ ] Login as Retailer
- [ ] View distributors within radius
- [ ] Select distributor (lock created)
- [ ] View distributor's products
- [ ] Add products to cart
- [ ] View invoice preview (correct FROM/TO)
- [ ] Make payment (UPI/COD)
- [ ] Invoice created with status
- [ ] Routed order created for distributor

### Distributor Flow:
- [ ] Login as Distributor
- [ ] View routed orders (ASSIGNED)
- [ ] Accept order (status → ACCEPTED)
- [ ] Reject order (status → REJECTED, count increases)
- [ ] Dispatch order (status → DISPATCHED, invoice also updates)
- [ ] Cannot accept already accepted order

### Logistics Flow:
- [ ] Login as Logistics
- [ ] View DISPATCHED invoices
- [ ] Select invoice for packing
- [ ] Mark as PACKING → PACKED
- [ ] Mark as OUT FOR DELIVERY
- [ ] Confirm delivery (status → DELIVERED)

### Admin Flow:
- [ ] Login as Admin
- [ ] View all orders
- [ ] Manage products
- [ ] View distributor performance
- [ ] View accounts receivable

---

## 🧪 Mock Data Available

For testing without real database:

### Distributors API:
Returns 2 mock distributors when no real data:
- Test Distributor Pharma (0.5 km)
- Demo Medical Store (2.1 km)

### Inventory API:
Returns 5 mock products when no real inventory:
- Paracetamol 500mg (₹50 MRP)
- Azithromycin 500mg (₹120 MRP)
- Crocin Advance 500mg (₹80 MRP)
- Dolo 650mg (₹30 MRP)
- Shelcal 500mg (₹180 MRP)

### Logistics Invoices API:
Returns 2 mock invoices when no real data:
- MOCK-INV-001 (₹1,500)
- MOCK-INV-002 (₹2,500)

---

## 🚨 Troubleshooting

### Issue: No distributors showing
**Solutions:**
1. Check retailer's `store_lat`, `store_lng` are set
2. Increase search radius to 50km
3. Check distributors have valid lat/lng
4. Clear sessionStorage and retry

### Issue: No products showing
**Solutions:**
1. Check `distributor_inventory` has products
2. Verify distributor_id matches
3. Check products have `status = 'ACTIVE'`
4. Mock data will show if no real data

### Issue: Invoice not routing to distributor
**Solutions:**
1. Check `routed_orders` table was created
2. Verify `distributor_id` is valid UUID
3. Check invoice creation API response

### Issue: Payment verification failing
**Solutions:**
1. Check Razorpay credentials in .env
2. Verify UPI ID is correct
3. Check network connectivity
4. Try COD if UPI fails

---

## 📞 Support

For issues or questions:
- Check browser console (F12)
- Check server logs
- Verify database constraints
- Test with mock data first

---

**Document Version:** 1.0  
**Last Updated:** June 2026  
**Author:** Agorich Pharma Development Team
