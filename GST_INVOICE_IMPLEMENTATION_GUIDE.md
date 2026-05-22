# GST Compliant Invoice System - Implementation Guide

## 🎯 Overview

This implementation provides a complete GST-compliant, closed-loop payment and invoicing system for Agorich Pharma that replaces the legacy manual WhatsApp flow.

## 📁 New Files Created

### Core Libraries
- `src/lib/gst-utils.ts` - GSTIN validation, B2B/B2C detection, state codes
- `src/lib/tax-calculator.ts` - SGST/CGST/IGST calculations
- `src/lib/invoice-sequence.ts` - Sequential invoice number generation with locking
- `src/lib/audit-logger.ts` - Comprehensive audit logging

### API Routes
- `POST /api/orders/create` - Create draft orders
- `POST /api/invoices/generate` - Generate invoice after payment
- `GET /api/invoices/[id]/pdf` - Server-side PDF generation
- `POST /api/webhooks/razorpay` - Razorpay webhook handler
- `GET /api/admin/accounts-receivable` - AR dashboard data
- `POST /api/payments/record-balance` - Record COD payments

### Frontend Components
- `src/components/payments/OrderPaymentButton.tsx` - New Order Flow button
- `src/app/(dashboard)/admin/accounts-receivable/page.tsx` - AR Dashboard

### Database
- `migrations/001_gst_compliant_invoice_system.sql` - Full schema

## 🔄 The "Golden Sequence" Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOLDEN SEQUENCE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: CREATE DRAFT ORDER
──────────────────────────
User clicks "Pay 50% Advance"
    ↓
OrderPaymentButton calls POST /api/orders/create
    ↓
Creates order in DRAFT status
Returns: { order_id, advance_amount, balance_due }


Step 2: CREATE RAZORPAY ORDER
─────────────────────────────
OrderPaymentButton calls POST /api/payments/create-order
    ↓
Creates Razorpay order with 50% amount
Stores razorpay_order_id in orders table
    ↓
Opens Razorpay checkout modal


Step 3: PROCESS PAYMENT
───────────────────────
User completes payment in Razorpay modal
    ↓
Razorpay fires payment.authorized webhook
    ↓
POST /api/webhooks/razorpay receives event
    ↓
Webhook verifies signature using RAZORPAY_WEBHOOK_SECRET


Step 4: AUTO-GENERATE INVOICE (The "Official Seal")
──────────────────────────────────────────────────
Webhook finds order by razorpay_order_id
    ↓
Calls generateInvoiceNumber() with PostgreSQL advisory lock
    ↓
Sequential number generated: AGR/2026-27/0001
    ↓
Creates invoice record with:
  - Sequential invoice number
  - GST calculations (SGST/CGST/IGST)
  - Payment tracking (advance_paid, balance_due)
  - Audit log entry
    ↓
Updates order status to CONFIRMED
    ↓
Returns 200 OK to Razorpay


Step 5: BALANCE PAYMENT (COD)
─────────────────────────────
On delivery, admin collects balance
    ↓
Admin uses "Record Balance Payment" in AR Dashboard
    ↓
POST /api/payments/record-balance
    ↓
Updates invoice payment_status to FULLY_PAID
Logs audit entry


Step 6: PDF GENERATION
──────────────────────
User/Admin clicks "Download Invoice PDF"
    ↓
GET /api/invoices/[id]/pdf
    ↓
Puppeteer generates server-side PDF
Returns PDF with all GST details
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This installs:
- Puppeteer (for PDF generation)
- All required Node.js dependencies

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
```
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
RAZORPAY_MOCK_MODE=true  # Set to false for production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Company GST Details
COMPANY_GSTIN=10XXXXXXXXXXXXX
COMPANY_STATE=Bihar
COMPANY_NAME=Agorich Pharma
```

### 3. Database Migration

Run the SQL migration in Supabase Dashboard:

```sql
-- Run this in Supabase SQL Editor
\i migrations/001_gst_compliant_invoice_system.sql
```

Or manually run each section:
1. Global settings table
2. Orders table enhancements
3. Enhanced invoices table
4. Audit logs table
5. Payment verification enhancements
6. Views and functions

### 4. Configure Razorpay Webhook

In Razorpay Dashboard > Settings > Webhooks:

```
URL: https://agorich.in/api/webhooks/razorpay
Events: payment.authorized
Secret: (copy from RAZORPAY_WEBHOOK_SECRET env var)
```

## 📋 Invoice Number Format

**Format:** `AGR/2026-27/0001`

- `AGR` - Company prefix (from global_settings)
- `2026-27` - Financial year (April-March)
- `0001` - 4-digit sequential number
- **Contains slashes** - CA filing compliant

**Fiscal Year Logic:**
- April 1 onwards: Current year + Next year short
- Before April 1: Previous year + Current year short
- Example: 2026-27 means FY 2026-2027

## 🧪 Testing the Flow

### Test 1: Invoice Sequence Generator

```bash
npx ts-node scripts/test-invoice-sequence.ts
```

Expected output:
```
🧪 Testing GST Invoice Sequence Generator
==================================================

📊 Test 1: Current Invoice Settings
----------------------------------------
Current Fiscal Year: 2026-27
Last Sequence: 0
Invoice Prefix: AGR

🔍 Test 2: Preview Next Invoice Number
----------------------------------------
Next Invoice Number: AGR/2026-27/0001

🎫 Test 3: Generate Sequential Invoice Numbers
----------------------------------------
Generating 5 invoice numbers sequentially...

  ✅ Invoice #1: AGR/2026-27/0001 (Sequence: 1, FY: 2026-27)
  ✅ Invoice #2: AGR/2026-27/0002 (Sequence: 2, FY: 2026-27)
  ✅ Invoice #3: AGR/2026-27/0003 (Sequence: 3, FY: 2026-27)
  ✅ Invoice #4: AGR/2026-27/0004 (Sequence: 4, FY: 2026-27)
  ✅ Invoice #5: AGR/2026-27/0005 (Sequence: 5, FY: 2026-27)

✅ Invoice Sequence Generator is working correctly!
```

### Test 2: Full Payment Flow (Mock Mode)

1. Set `RAZORPAY_MOCK_MODE=true` in `.env.local`
2. Navigate to invoice creation page
3. Use `OrderPaymentButton` component:

```tsx
import { OrderPaymentButton } from '@/components/payments/OrderPaymentButton'

// In your component:
<OrderPaymentButton
  items={[
    {
      product_name: "Paracetamol 500mg",
      hsn_code: "3004",
      quantity: 10,
      unit: "strips",
      rate_per_unit: 25.00,
      gst_percentage: 5
    }
  ]}
  customerId="customer-uuid-here"
  onSuccess={(invoiceId) => console.log('Invoice:', invoiceId)}
/>
```

4. Click the button
5. Watch console logs:
```
✅ Draft order created: ORD-TMP-1234567890-ABCD
✅ Razorpay order created: mock_order_1234567890
🧪 MOCK MODE: Simulating Razorpay payment success...
✅ MOCK Payment completed: { razorpay_payment_id, razorpay_order_id }
✅ Webhook received payment.authorized
✅ Found order: uuid-for-order
✅ Generated invoice number: AGR/2026-27/0001
🎉 Invoice auto-generated via webhook: AGR/2026-27/0001
```

### Test 3: View Invoice

Navigate to `/admin/accounts-receivable` to see:
- Outstanding invoices with balance due
- Summary cards showing totals
- Record Balance Payment button
- PDF download links

## 🔒 Security Features

### 1. Webhook Signature Verification
```typescript
// In /api/webhooks/razorpay
const isValid = verifyWebhookSignature(body, signature, webhookSecret)
if (!isValid) return 400
```

### 2. Advisory Locks for Invoice Numbers
```typescript
// In invoice-sequence.ts
await supabase.rpc('acquire_invoice_lock')
// Generate number atomically
await supabase.rpc('release_invoice_lock')
```

### 3. No Hard Deletes
- Invoices: `is_cancelled` flag with audit log
- Orders: `order_status` changes only

### 4. Audit Logging
Every state change is logged:
- Order created
- Order confirmed
- Invoice generated
- Payment received
- Balance payment recorded

## 📊 GST Compliance Features

### B2B vs B2C Detection
```typescript
const gstType = determineGSTType(customerGSTIN)
// Returns: 'B2B' if valid GSTIN, 'B2C' otherwise
```

### Tax Calculations
**Intra-State (Bihar):**
- SGST: 2.5%
- CGST: 2.5%
- Total GST: 5%

**Inter-State:**
- IGST: 5%

**PDF Output:**
- Invoice with GST breakdown
- Place of Supply
- Customer GSTIN (if B2B)
- HSN codes for all items

## 🚨 Troubleshooting

### Issue: Webhook not triggering
**Check:**
1. RAZORPAY_WEBHOOK_SECRET is set correctly
2. Webhook URL is publicly accessible
3. Razorpay Dashboard shows webhook as active

### Issue: Duplicate invoice numbers
**Check:**
1. Advisory lock functions exist in database:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'acquire_invoice_lock';
   ```
2. No concurrent requests bypassing the lock

### Issue: PDF generation fails
**Check:**
1. Puppeteer installed: `npm list puppeteer`
2. Chrome/Chromium available in production
3. Consider using `@sparticuz/chromium` for serverless

### Issue: Mock mode not working
**Check:**
1. RAZORPAY_MOCK_MODE=true in .env.local
2. Server restarted after env change

## 📝 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders/create` | POST | Create draft order |
| `/api/invoices/generate` | POST | Generate invoice (manual) |
| `/api/invoices/[id]/pdf` | GET | Download invoice PDF |
| `/api/webhooks/razorpay` | POST | Receive payment webhooks |
| `/api/admin/accounts-receivable` | GET | AR dashboard data |
| `/api/payments/record-balance` | POST | Record COD payment |
| `/api/payments/create-order` | POST | Create Razorpay order |

## 🎉 Success!

Your GST-compliant invoicing system is now ready!

**Key Achievements:**
✅ Sequential invoice numbers with zero gaps
✅ PostgreSQL advisory locks for concurrency
✅ GST calculations (SGST/CGST/IGST)
✅ B2B/B2C detection and validation
✅ Server-side PDF generation
✅ Audit logging for compliance
✅ Webhook-based auto-invoice generation
✅ Accounts Receivable dashboard
✅ Balance payment recording

**Next Steps:**
1. Deploy to production
2. Configure Razorpay webhooks
3. Train staff on AR dashboard
4. Test with real transactions

**Support:**
For issues, check logs for:
- `✅` - Success indicators
- `❌` - Error indicators
- `🧪` - Mock mode indicators
