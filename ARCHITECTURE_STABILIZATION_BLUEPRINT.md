# AGORICH PHARMA - ARCHITECTURE STABILIZATION BLUEPRINT
## Principal Systems Architect & Financial Systems Auditor Report
**Date: 2026-05-16**
**Status: NOT FOR PRODUCTION CODE YET - ARCHITECTURE ONLY**

---

## 1. CANONICAL SOURCE OF TRUTH (SOT) IDENTIFICATION

### Domain → SOT Mapping

| Domain | Canonical Source of Truth | Rationale |
|--------|---------------------------|-----------|
| **Orders** | Supabase SQL `orders` table | Primary state store for order intent and status; has proper UUID PK, constraints, and audit foundation |
| **Invoices** | Supabase SQL `invoices` table | Legal/commercial record; must remain immutable once finalized |
| **Payments** | **NEW: Unified payment ledger** (to be built) | Currently 3+ incompatible ledgers; must consolidate to single source |
| **Inventory** | **NEW: Unified inventory ledger** (to be built) | Currently 3+ stock systems; no reconciliation |
| **Profit** | Canonical financial ledger + pricing engine | Must derive from actual transaction data, not hardcoded assumptions |
| **Distributor Routing** | `distributor_pincode_assignments` + `routed_orders` | Existing distributor ecosystem tables are most complete |

### KEY OBSERVATION
The runtime codebase currently operates in **split-brain mode** with:
- Two parallel schema definitions (Prisma + Supabase SQL)
- Three payment ledgers (`invoices.payment_amount`, `invoice_payments`, `payment_verifications`)
- Three stock models (`inventory_batches`, `products.stock`, `distributor_inventory`)
- Two webhook handlers for Razorpay
- Multiple profit calculation formulas
- Multiple status vocabularies

---

## 2. SCHEMA DRIFT ANALYSIS

### Table: Schema Drift Matrix

| Entity | Column Name | Migration 001 | Migration 004 | Runtime Code | Status |
|--------|-------------|----------------|----------------|--------------|--------|
| `invoices` | `order_id` | UUID FK to `orders.id` | TEXT | TEXT (e.g., "ORD-2026-0001") | **CRITICAL DRIFT** |
| `invoices` | `status` | `DRAFT,CONFIRMED,SENT,DELIVERED,PAID,CANCELLED` | Same | `PROCESSING,PACKING,DISPATCHED,REFUNDED,PAYMENT_FAILED` | **STATUS DRIFT** |
| `invoices` | `invoice_number` / `invoice_no` | Both columns exist | Both columns exist | Used interchangeably | **DUPLICATE COLUMNS** |
| `payment_verifications` | `status` | `verified,pending,failed` (lowercase) | Same | `SUCCESS` (uppercase) | **VALUE DRIFT** |
| `orders` | `order_status` | `DRAFT,CONFIRMED,CANCELLED` | Same | (Runtime rarely uses) | **UNDERUTILIZED** |
| `orders` | `status` | (No column) | (No column) | Smart dispatch tries to write `DISPATCHED` | **NON-EXISTENT COLUMN** |

### Root Causes of Schema Drift
1. **Multiple migration sources** (migration/ directory + supabase/migrations/)
2. **No migration ordering** enforced
3. **Runtime bypasses constraints** (no transactional safety)
4. **No centralized schema authority**

---

## 3. CANONICAL DB MODEL DEFINITION

### Core Entities (Simplified)

```sql
-- ============================================
-- CANONICAL ORDER ENTITY
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL, -- Human-readable: ORD-YYYY-XXXX
  draft_number TEXT UNIQUE, -- DRAFT-YYYY-XXXX
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  grand_total DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'WAITING_FOR_APPROVAL', 'CONFIRMED', 'CANCELLED'
  )),
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN (
    'PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'FAILED', 'REFUNDED'
  )),
  invoice_id UUID REFERENCES invoices(id),
  distributor_id UUID REFERENCES profiles(id),
  razorpay_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  INDEX idx_canonical_orders_customer (customer_id),
  INDEX idx_canonical_orders_status (status),
  INDEX idx_canonical_orders_payment_status (payment_status)
);

-- ============================================
-- CANONICAL INVOICE ENTITY
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT UNIQUE, -- Legal number: AGR/YYYY-XX/XXXX
  order_id UUID REFERENCES canonical_orders(id) NOT NULL,
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  grand_total DECIMAL(12,2) NOT NULL,
  sgst_amount DECIMAL(12,2) DEFAULT 0,
  cgst_amount DECIMAL(12,2) DEFAULT 0,
  igst_amount DECIMAL(12,2) DEFAULT 0,
  total_gst DECIMAL(12,2) GENERATED ALWAYS AS (sgst_amount + cgst_amount + igst_amount) STORED,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'
  )),
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN (
    'PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'FAILED', 'REFUNDED', 'OVERDUE'
  )),
  is_cancelled BOOLEAN DEFAULT FALSE,
  invoice_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  INDEX idx_canonical_invoices_order (order_id),
  INDEX idx_canonical_invoices_customer (customer_id),
  INDEX idx_canonical_invoices_status (status),
  INDEX idx_canonical_invoices_payment_status (payment_status)
);

-- ============================================
-- CANONICAL PAYMENT LEDGER (SINGLE SOURCE OF TRUTH)
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_payment_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES canonical_invoices(id) NOT NULL,
  order_id UUID REFERENCES canonical_orders(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'RAZORPAY', 'UPI', 'NET_BANKING', 'CASH', 'CREDIT_NOTE', 'BALANCE_ADJUSTMENT'
  )),
  transaction_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'
  )),
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'ADVANCE', 'PARTIAL', 'BALANCE', 'FULL', 'COD'
  )),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  INDEX idx_payment_ledger_invoice (invoice_id),
  INDEX idx_payment_ledger_order (order_id),
  INDEX idx_payment_ledger_status (status),
  INDEX idx_payment_ledger_recorded_at (recorded_at DESC)
);

-- ============================================
-- CANONICAL INVENTORY LEDGER (SINGLE SOURCE OF TRUTH)
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) NOT NULL,
  batch_id TEXT,
  distributor_id UUID REFERENCES profiles(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'RESERVE', 'RELEASE', 'PICK', 'PACK', 'DISPATCH', 'DELIVER', 'RETURN', 'RESTOCK', 'ADJUSTMENT'
  )),
  quantity_change INTEGER NOT NULL, -- +ve = in, -ve = out
  quantity_after INTEGER NOT NULL,
  reference_type TEXT NOT NULL, -- ORDER, INVOICE, RETURN, ADJUSTMENT
  reference_id UUID NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  INDEX idx_inventory_ledger_product (product_id),
  INDEX idx_inventory_ledger_distributor (distributor_id),
  INDEX idx_inventory_ledger_reference (reference_type, reference_id),
  INDEX idx_inventory_ledger_performed_at (performed_at DESC)
);

-- ============================================
-- CANONICAL TRANSACTION LEDGER (PROFIT SOURCE)
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_transaction_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES canonical_invoices(id),
  order_id UUID REFERENCES canonical_orders(id),
  product_id UUID REFERENCES products(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'SALE', 'RETURN', 'DISCOUNT', 'COMMISSION', 'TAX', 'OTHER'
  )),
  amount DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2),
  sell_price DECIMAL(12,2),
  margin_amount DECIMAL(12,2) GENERATED ALWAYS AS (sell_price - cost_price) STORED,
  margin_percentage DECIMAL(5,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  INDEX idx_transaction_ledger_invoice (invoice_id),
  INDEX idx_transaction_ledger_order (order_id),
  INDEX idx_transaction_ledger_product (product_id),
  INDEX idx_transaction_ledger_recorded_at (recorded_at DESC)
);
```

---

## 4. CANONICAL STATUS ENGINE DEFINITION

### Order Lifecycle (Status FSM)
```
DRAFT 
  → [Retailer submits] → WAITING_FOR_APPROVAL (if credit)
  → [Credit approved OR prepaid] → CONFIRMED
  → [Cancelled] → CANCELLED (terminal)
```

### Invoice Lifecycle (Status FSM)
```
DRAFT
  → [Generated] → SENT
  → [Admin confirms] → PROCESSING
  → [Logistics packs] → PACKING
  → [Dispatched] → DISPATCHED
  → [Delivered] → DELIVERED (terminal)
  → [Cancelled at any step before DELIVERED] → CANCELLED (terminal)
```

### Payment Lifecycle (Status FSM)
```
PENDING
  → [Partial payment received] → PARTIALLY_PAID
  → [Full payment received] → FULLY_PAID (terminal)
  → [Payment failed] → FAILED
  → [Overdue] → OVERDUE
  → [Refunded] → REFUNDED (terminal)
```

### INVALID TRANSITIONS (Blocked)
- `DRAFT → DELIVERED`
- `SENT → DISPATCHED` (must go through PROCESSING/PACKING)
- `DELIVERED → PROCESSING`
- `FULLY_PAID → PENDING`
- `CANCELLED → *` (cancelled is terminal)

---

## 5. RISK DETECTION & PRIORITIZATION

### P0 - DATA CORRUPTION RISKS

| # | Issue | Root Cause | Business Impact | Technical Impact | Files Involved | Safest Correction Path |
|---|-------|------------|-----------------|------------------|----------------|------------------------|
| 1 | `invoices.order_id` type drift | Migration 001 sets UUID FK; Migration 004 changes to TEXT; runtime writes TEXT IDs | Orphaned orders/invoices; impossible to reconcile | Constraint violations; broken joins | `migrations/001_gst_compliant_invoice_system.sql:108-110`, `migrations/004_conditional_invoice_numbering.sql:18-24`, `src/app/api/orders/create/route.ts:272-321` | 1. Create `orders.order_number` (TEXT) for human ID; 2. Keep `orders.id` as UUID PK; 3. Update `invoices.order_id` to reference `orders.id` (UUID) |
| 2 | Invalid status values written | Runtime writes statuses not in DB CHECK constraints | Silent failures; stuck workflows; unreportable states | Constraint exceptions; invalid state transitions | `src/app/api/invoices/generate/route.ts:208-235`, `src/app/api/payments/verify/route.ts:225-302`, `src/app/api/payments/webhook/route.ts:331-350`, `smart_dispatch_function.sql:69-80` | 1. Expand DB CHECK constraints to include all valid statuses; 2. Add status validation middleware; 3. Add status transition guard function |
| 3 | `payment_verifications.status` case mismatch | DB expects lowercase; runtime writes `SUCCESS` | Payment records marked as failed; reconciliation errors | Silent data inconsistency | `migrations/001_gst_compliant_invoice_system.sql:232-233`, `src/app/api/payments/verify/route.ts:205-218` | 1. Normalize to lowercase in DB; 2. Normalize on write; 3. Migrate existing records |
| 4 | `orders.status` column doesn't exist | Smart dispatch tries to write to non-existent column | Dispatch workflow broken | Runtime exceptions | `smart_dispatch_function.sql:69-80` | Fix smart dispatch to use `orders.order_status` or create canonical status column |
| 5 | Invoice approval uses wrong number generator | `/invoices/[id]/approve` calls `generateOrderNumber()` for `invoice_number` | Corrupted invoice number sequence; duplicate number risk | Sequence out of sync; audit trail broken | `src/app/api/invoices/[id]/approve/route.ts:42-49`, `src/lib/invoice-sequence.ts:342-365` | Call correct number generator function |

### P1 - FINANCIAL INCONSISTENCY RISKS

| # | Issue | Root Cause | Business Impact | Technical Impact | Files Involved | Safest Correction Path |
|---|-------|------------|-----------------|------------------|----------------|------------------------|
| 6 | 3+ parallel payment ledgers | No canonical payment ledger defined | Cash reconciliation impossible; lost revenue; over/under billing | No single source of truth; multiple conflicting values | `src/app/api/invoices/[id]/payments/route.ts:60-100`, `src/app/api/payments/record-balance/route.ts:154-245`, `src/app/api/payments/verify/route.ts:205-264`, `src/app/api/admin/accounts-receivable/route.ts:128-159` | Build canonical payment ledger first; migrate all existing payment records; deprecate old columns |
| 7 | Multiple profit formulas (40%, 30%, 60%, 77%) | No centralized pricing/profit engine | Inconsistent profit reporting; misleading business decisions; retailer distrust | No single source of truth for profit | `src/app/(dashboard)/retailer/page.tsx:262-296`, `src/app/(dashboard)/retailer/page.tsx:313-325`, `src/app/(dashboard)/distributor/routed-orders/page.tsx:99-205`, `src/lib/pricing-engine.ts:18-42`, `src/lib/invoice-calculations.ts:22-25` | Build canonical pricing/profit engine; store all cost/sell prices at time of transaction in ledger |
| 8 | Smart dispatch books at MRP, not sell price | `distributor_margins` uses MRP instead of actual sale price | Incorrect margin calculations; profit overstated | Financial ledger incorrect | `smart_dispatch_function.sql:88-117` | Use actual transactional sell price from order/invoice |
| 9 | AR depends on `advance_paid`/`balance_due`, not actual payments | AR view pulls from denormalized columns instead of payment ledger | Stale AR; incorrect cash flow forecasting | Reporting out of sync with reality | `src/app/api/admin/accounts-receivable/route.ts:128-159`, `migrations/001_gst_compliant_invoice_system.sql:340-365` | Rebuild AR view to sum from canonical payment ledger |

### P2 - OPERATIONAL INEFFICIENCY

| # | Issue | Root Cause | Business Impact | Technical Impact | Files Involved | Safest Correction Path |
|---|-------|------------|-----------------|------------------|----------------|------------------------|
| 10 | 3+ parallel stock systems | No canonical inventory ledger | Stock double-counting; overselling; lost inventory | No single source of truth for stock | `src/app/api/orders/create/route.ts:67-181`, `src/lib/stock-adjustments.ts:46-171`, `src/app/api/logistic/pack-order/route.ts:81-145`, `smart_dispatch_function.sql:32-117` | Build canonical inventory ledger with double-entry; deprecate old stock columns |
| 11 | Duplicate webhook handlers | Two Razorpay webhook endpoints exist | Duplicate payment processing; double counting | Payment duplication risk | `src/app/api/payments/webhook/route.ts:427-520`, `src/app/api/webhooks/razorpay/route.ts:427-520` | Pick one canonical webhook handler; delete/disable the other |
| 12 | Multiple invoice generation paths | Two+ ways to create invoice | Invoice duplication; sequence number collisions | Duplicate legal documents | `src/app/api/invoices/generate/route.ts:149-347`, `src/app/api/payments/webhook/route.ts:235-355` | Create single canonical invoice generation service |
| 13 | No transactional safety around critical workflows | Most routes lack proper database transactions | Partial state updates; inconsistent data | Race conditions; data corruption | (Nearly all API routes) | Add BEGIN/COMMIT transactions around all state-mutating operations |

### P3 - UI/REPORTING MISMATCH

| # | Issue | Root Cause | Business Impact | Technical Impact | Files Involved | Safest Correction Path |
|---|-------|------------|-----------------|------------------|----------------|------------------------|
| 14 | UI shows mock routed orders data | Distributor routed orders use hardcoded mock data | Distributors see incorrect orders; trust erosion | No real data integration | `src/app/(dashboard)/distributor/routed-orders/page.tsx:99-205` | Connect to real `routed_orders` table |
| 15 | Profit metrics hardcoded in UI | Retailer dashboard uses 40%/30% hardcoded | Misleading profit reporting | No real-time calculation | `src/app/(dashboard)/retailer/page.tsx:262-296`, `src/app/(dashboard)/retailer/page.tsx:313-325` | Pull real profit from canonical transaction ledger |

---

## 6. MIGRATION STRATEGY (ROLLBACK-SAFE)

### Phase 0: Preparation & Safety
1. **Snapshot database** (full backup)
2. **Freeze deployments** to main branch
3. **Enable read-only mode** (if needed)
4. **Establish migration runbook**

### Phase 1: Build Canonical Ledgers (Non-Destructive)
1. Create `canonical_payment_ledger` table
2. Create `canonical_inventory_ledger` table
3. Create `canonical_transaction_ledger` table
4. Create **backfill views** from existing data
5. **NO CODE CHANGES YET** - just tables/views

### Phase 2: Backfill Existing Data
1. Migrate all payment records to `canonical_payment_ledger`
2. Migrate all stock movements to `canonical_inventory_ledger`
3. Migrate all sales transactions to `canonical_transaction_ledger`
4. **Validation step**: Compare totals to ensure no data loss

### Phase 3: Fix Schema Drift
1. Fix `invoices.order_id` type (UUID FK)
2. Fix status constraints (add all valid statuses)
3. Fix `payment_verifications.status` case
4. Fix numbering functions
5. **Rollback-safe**: Use CREATE OR REPLACE and ALTER TABLE IF EXISTS

### Phase 4: Refactor Runtime Code (Gradual)
1. Add middleware for status validation
2. Add transaction wrappers
3. Update payment routes to write to canonical ledger
4. Update inventory routes to write to canonical ledger
5. **Dual-write first**: Write to both old and new; verify; then stop writing to old

### Phase 5: Deprecate Legacy Columns
1. Mark legacy columns as deprecated
2. Remove writes to legacy columns
3. Add views for backward compatibility
4. Schedule deletion in Phase 6

### Phase 6: Cleanup
1. Delete legacy payment columns
2. Delete legacy stock columns
3. Delete deprecated webhook handlers
4. Final validation & performance testing

---

## 7. REFACTOR SEQUENCE (SAFE ORDER)

### Sequence 1: Payment Ledger Unification (Week 1)
1. Create canonical payment ledger table
2. Backfill existing payments
3. Update `/api/payments/*` routes to dual-write
4. Update `/api/invoices/[id]/payments` to dual-write
5. Verify reconciliation
6. Switch reads to canonical ledger

### Sequence 2: Inventory Ledger Unification (Week 2)
1. Create canonical inventory ledger table
2. Backfill existing stock movements
3. Update `/api/orders/create` to write ledger
4. Update `/api/logistic/*` routes to write ledger
5. Update stock adjustment functions
6. Verify stock balances match

### Sequence 3: Status Engine & Schema Fixes (Week 3)
1. Fix `invoices.order_id` type drift
2. Fix status constraints
3. Add status transition guard function
4. Add middleware for status validation
5. Fix numbering functions
6. Fix smart dispatch

### Sequence 4: Profit Engine & Reporting (Week 4)
1. Create canonical pricing/profit engine
2. Build transaction ledger
3. Update AR view to use payment ledger
4. Update dashboards to pull from canonical sources
5. Remove hardcoded profit values

---

## 8. ROLLBACK-SAFE IMPLEMENTATION PLAN

### Safety Principles
- **NO DESTRUCTIVE CHANGES FIRST** - always add, never delete
- **DUAL-WRITE BEFORE SWITCH** - write to old and new, verify, then switch
- **FULL BACKUPS BEFORE EACH PHASE**
- **CANARY RELEASES** - test with internal users first
- **FEATURE FLAGS** - easily roll back if issues

### Rollback Triggers
- Constraint violation rate > 0.1%
- Payment reconciliation error > ₹100
- Stock discrepancy > 5 units
- Any data corruption detected
- Business workflow stuck for > 1 hour

---

## 9. SYSTEM STABILIZATION ROADMAP

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Payment Ledger Unification | Canonical payment ledger; backfilled data; dual-write routes |
| 2 | Inventory Ledger Unification | Canonical inventory ledger; backfilled stock movements; dual-write routes |
| 3 | Status Engine & Schema Fixes | Fixed schema drift; status validation middleware; safe transitions |
| 4 | Profit Engine & Reporting | Canonical profit calculation; fixed AR; dashboards from real data |
| 5 | Cleanup & Validation | Remove deprecated code; full audit; performance tuning |

---

## 10. TRANSACTION FLOW MAP (CANONICAL)

```
[RETAILER]
    ↓
[CREATE DRAFT ORDER]
    ↓ (records order intent; NO stock reserve yet)
    ├─→ Creates canonical_orders (DRAFT)
    └─→ Creates invoice_items (linked)
    ↓
[PAYMENT INITIATION]
    ↓ (if prepaid)
    ├─→ Creates canonical_payment_ledger (INITIATED)
    ├─→ Redirects to Razorpay
    └─→ Waits for webhook/verify
    ↓ (if credit)
    └─→ canonical_orders.status → WAITING_FOR_APPROVAL
    ↓
[PAYMENT VERIFIED / CREDIT APPROVED]
    ↓
[CONFIRM ORDER]
    ├─→ canonical_orders.status → CONFIRMED
    ├─→ canonical_inventory_ledger (RESERVE)
    ├─→ Creates canonical_invoices (SENT)
    └─→ Assigns distributor (if not assigned)
    ↓
[ADMIN CONFIRMS]
    ↓
    └─→ canonical_invoices.status → PROCESSING
    ↓
[LOGISTICS PACK]
    ├─→ canonical_inventory_ledger (PICK/PACK)
    └─→ canonical_invoices.status → PACKING
    ↓
[DISPATCHED]
    ├─→ canonical_inventory_ledger (DISPATCH)
    └─→ canonical_invoices.status → DISPATCHED
    ↓
[DELIVERED]
    ├─→ canonical_inventory_ledger (DELIVER)
    ├─→ canonical_invoices.status → DELIVERED
    ├─→ Records COD payment (if applicable)
    └─→ canonical_transaction_ledger (SALE)
    ↓
[FULL PAYMENT RECEIVED]
    ├─→ canonical_payment_ledger (SUCCESS)
    └─→ canonical_invoices.payment_status → FULLY_PAID
    ↓
[PROFIT REALIZED]
    └─→ Derived from canonical_transaction_ledger
```

---

## 11. CONCLUSION & NEXT STEPS

### Immediate Actions (Before Any New Features)
1. **FREEZE ALL NEW FEATURE DEVELOPMENT**
2. **TAKE FULL DATABASE BACKUP**
3. **EXECUTE PHASE 0 PREPARATION**
4. **START PHASE 1: CANONICAL PAYMENT LEDGER**

### Stability Guarantee
Once stabilization complete:
- Single source of truth for all domains
- Transactional safety for all workflows
- Validated status transitions only
- Reconciliable financial ledger
- Audit trail for all changes
- Rollback-safe architecture

---

## APPENDIX: REFERENCES

### Key Files Reviewed
- `migrations/001_gst_compliant_invoice_system.sql`
- `migrations/004_conditional_invoice_numbering.sql`
- `migrations/FINAL_SAFE_GST_MIGRATION.sql`
- `smart_dispatch_function.sql`
- `src/app/api/orders/create/route.ts`
- `src/app/api/invoices/generate/route.ts`
- `src/app/api/payments/*`
- `src/app/api/logistic/*`
- `src/lib/pricing-engine.ts`
- `src/lib/invoice-calculations.ts`

### Data Model Sources
- Supabase SQL migrations (primary)
- Prisma schema (secondary, drift detected)
- Runtime API routes (tertiary, drift detected)
