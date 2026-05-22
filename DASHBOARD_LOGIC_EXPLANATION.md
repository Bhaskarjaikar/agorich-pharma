# Dashboard Logic Explanation (हिंदी में)

## 📊 **डेटा कैसे Flow होता है:**

### **1. Admin Dashboard के लिए (`/admin`):**

#### **Step 1: Data Fetch कैसे होता है**
- Admin dashboard खुलते ही एक API call जाती है: `/api/admin/metrics`
- यह API Supabase database से सारे invoices fetch करती है
- Code में देखो: `src/app/api/admin/metrics/route.ts`

#### **Step 2: Total Revenue कैसे Calculate होता है**
```javascript
// सारे invoices के grand_total को जोड़ दो
totalRevenue = invoices[0].grand_total + invoices[1].grand_total + ... सभी का
```
- **Logic**: Database से सभी invoices निकालो
- हर invoice का `grand_total` (कुल राशि) लो
- सभी को जोड़ दो = Total Revenue

#### **Step 3: Total Orders कैसे Count होते हैं**
```javascript
// सिर्फ invoices की गिनती करो
totalOrders = invoices.length
```
- **Logic**: जितने invoices database में हैं, बस उनकी संख्या गिनो

#### **Step 4: Average Order Value कैसे निकलता है**
```javascript
avgOrderValue = totalRevenue / totalOrders
// Example: ₹909 / 2 = ₹454.5 (round करके ₹455)
```

#### **Step 5: Charts में Data कैसे भरता है**

**Revenue Trend Chart (Line Chart):**
- महीने-महीने invoices को group करो
- हर महीने का total revenue निकालो
- Example:
  - May: ₹0 (कोई invoice नहीं)
  - June: ₹0
  - ...
  - November: ₹909 (2 invoices)

**Revenue by Category (Pie Chart):**
- Products को categories में divide करो
- हर category का total revenue निकालो
- Percentage calculate करो
- Example: 
  - LIVCEM-4G SYP: ₹230 out of ₹909 = 34.8%

**Top Products:**
- Last 30 days के invoice_items देखो
- हर product का total quantity और revenue जोड़ो
- Revenue के हिसाब से sort करो
- Top 5 products दिखाओ

**Top Retailers:**
- Last 30 days के invoices देखो
- हर retailer (customer_id) का total revenue जोड़ो
- Sort करो और top 5 दिखाओ

---

### **2. Retailer Dashboard के लिए (`/retailer`):**

#### **Step 1: KPI Data Fetch**
```javascript
// API call: /api/invoices?user_id=${userId}&limit=1000
// सिर्फ इस user के invoices fetch करो
```

#### **Step 2: Total Orders**
```javascript
const invoices = await fetch(`/api/invoices?user_id=${userId}`)
totalOrders = invoices.length  // इस retailer के कितने invoices हैं
```

#### **Step 3: Total Revenue**
```javascript
totalRevenue = invoices.reduce((sum, invoice) => {
  return sum + invoice.grand_total
}, 0)
// सभी invoices के grand_total को जोड़ो
```

#### **Step 4: Outstanding Balance**
```javascript
// वो invoices जो अभी PAID नहीं हुए
outstandingBalance = invoices
  .filter(invoice => invoice.status !== 'PAID')
  .reduce((sum, invoice) => sum + invoice.grand_total, 0)
```

#### **Step 5: Profit Margin**
```javascript
// Simple estimate: 20% of revenue
estimatedProfit = totalRevenue * 0.2
profitMargin = (estimatedProfit / totalRevenue) * 100  // 20%
```

#### **Step 6: Recent Orders**
- localStorage से invoices निकालो
- Date के हिसाब से sort करो (newest first)
- Top 4 दिखाओ

---

### **3. "Delivered" कैसे Determine होता है? 🔍**

#### **Important Point:**
**मैंने code में "DELIVERED" status को track किया है, लेकिन currently dashboard में सभी invoices "DRAFT" status में दिख रहे हैं।**

#### **Status Flow:**
```
DRAFT → SENT → DELIVERED → PAID
```

**Status कहाँ सेट होता है:**

1. **Invoice Create होते समय:**
   - Default status: `DRAFT`
   - Code: `src/app/api/invoices/route.ts`
   ```javascript
   status: 'DRAFT'  // जब invoice create होता है
   ```

2. **Status Update होता है:**
   - Code: `src/app/api/invoices/[id]/status/route.ts`
   - Allowed transitions:
     - DRAFT → SENT
     - SENT → DELIVERED
     - DELIVERED → PAID
     - OVERDUE → PAID

3. **"DELIVERED" कब Set होता है:**
   - जब admin या warehouse team manually status update करता है
   - या delivery tracking system automatically update करता है

#### **Dashboard में "Delivered" कैसे Count होता है:**

**Admin Dashboard:**
- Currently code में सभी invoices count हो रहे हैं (status के बिना filter)
- Fix करने के लिए:
  ```javascript
  // Only count DELIVERED or PAID invoices
  const deliveredInvoices = invoices.filter(inv => 
    inv.status === 'DELIVERED' || inv.status === 'PAID'
  )
  totalRevenue = deliveredInvoices.reduce(...)
  ```

**Retailer Dashboard:**
- Currently सभी invoices (DRAFT भी) count हो रहे हैं
- Same fix लगाना होगा

---

### **4. Complete Data Flow Diagram:**

```
┌─────────────────┐
│  User Action    │  (Invoice create करता है)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Invoice │  POST /api/invoices
│  Status: DRAFT   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase DB    │  invoices table में save
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Status Update  │  Admin manually update करता है
│  DRAFT → SENT   │  POST /api/invoices/[id]/status
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Status Update  │  Delivery team update करता है
│  SENT → DELIVERED│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Payment        │  Customer payment करता है
│  DELIVERED → PAID│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dashboard API  │  GET /api/admin/metrics
│  Data Fetch      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Calculations   │
│  - Total Revenue│
│  - Total Orders  │
│  - Charts        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │  Dashboard display
│  Display        │
└─────────────────┘
```

---

### **5. Key Files और उनका काम:**

1. **`src/app/api/admin/metrics/route.ts`**
   - Admin dashboard के लिए सारा data calculate करता है
   - Invoices से revenue, orders, charts का data निकालता है

2. **`src/app/(dashboard)/admin/page.tsx`**
   - Frontend component
   - API से data fetch करता है
   - UI में display करता है

3. **`src/app/(dashboard)/retailer/page.tsx`**
   - Retailer dashboard
   - User के अपने invoices fetch करता है
   - KPIs calculate करता है

4. **`src/app/api/invoices/[id]/status/route.ts`**
   - Invoice status update करता है
   - Status transitions handle करता है

5. **Database Schema (`invoices` table):**
   ```sql
   status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'PAID' | 'OVERDUE'
   grand_total: DECIMAL(10,2)  -- Invoice का total amount
   created_at: TIMESTAMP       -- Invoice create होने का time
   ```

---

### **6. Important Notes:**

⚠️ **Current Issue:**
- Dashboard में सभी invoices (DRAFT भी) count हो रहे हैं
- "Delivered" invoices को अलग से filter नहीं किया गया है

✅ **Fix करने के लिए:**
- Metrics API में status filter add करना होगा
- Only `DELIVERED` या `PAID` invoices count करने होंगे
- या business logic के हिसाब से सभी invoices count कर सकते हैं

---

### **7. Summary (संक्षेप में):**

1. **Data Source:** Supabase Database (`invoices` table)
2. **Data Fetch:** API routes (`/api/admin/metrics`, `/api/invoices`)
3. **Calculation:** JavaScript में reduce, filter, map functions
4. **Display:** React components में UI
5. **Status Tracking:** Invoice status column में store होता है
6. **"Delivered" Logic:** Status === 'DELIVERED' या 'PAID' होने पर count करो

**सबसे important बात:** Data हमेशा database से real-time fetch होता है, calculations client-side या server-side पर होती हैं।


