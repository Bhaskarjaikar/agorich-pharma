# PHASE 1 — CANONICAL PRICING & PROFIT ENGINE BLUEPRINT

## Core Problem
Right now profit is calculated in **multiple places with multiple formulas**:
1. Retailer dashboard: 40% hardcoded
2. Retailer summary: MRP - agorich_price
3. Pricing engine: 60% / 77%
4. Invoice calculation: 40% of MRP
5. Smart dispatch: books at MRP

**NO SINGLE SOURCE OF TRUTH FOR PRICING OR PROFIT!**

---

## 1. Canonical Pricing Model

### Table: `canonical_product_pricing`
```sql
CREATE TABLE canonical_product_pricing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  cost_price DECIMAL(12,2) NOT NULL,
  mrp DECIMAL(12,2) NOT NULL,
  agorich_price DECIMAL(12,2) NOT NULL,
  retailer_margin_percent DECIMAL(5,2) NOT NULL,
  agorich_margin_percent DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (product_id, effective_from)
);
```

---

## 2. Canonical Profit Ledger

### Table: `canonical_profit_ledger`
```sql
CREATE TABLE canonical_profit_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  invoice_item_id UUID,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  sell_price DECIMAL(12,2) NOT NULL,
  mrp DECIMAL(12,2) NOT NULL,
  retailer_margin_amount DECIMAL(12,2) NOT NULL,
  agorich_margin_amount DECIMAL(12,2) NOT NULL,
  total_profit DECIMAL(12,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);
```

---

## 3. Canonical Profit Formula (ONLY ONE!)

### Formula
```
retailer_margin_amount = (agorich_price - cost_price) * quantity
agorich_margin_amount = (sell_price - agorich_price) * quantity
total_profit = retailer_margin_amount + agorich_margin_amount
```

### OR (if sell_price = agorich_price):
```
total_profit = (agorich_price - cost_price) * quantity
```

---

## 4. Current vs Canonical Flow

| Step | Current | Canonical |
|------|---------|-----------|
| **Order Creation** | No profit tracked | Record profit estimate |
| **Invoice Generation** | No profit tracked | Record actual profit |
| **Payment Received** | No profit tracked | Confirm profit realization |
| **Reporting** | Multiple formulas | Single canonical source |

---

## 5. Files to Refactor
| File | Current Profit Use |
|------|-------------------|
| `src/app/(dashboard)/retailer/page.tsx` | Hardcoded 40% |
| `src/app/api/admin/retailers/summary/route.ts` | MRP - agorich_price |
| `src/lib/pricing-engine.ts` | 60% / 77% |
| `src/lib/invoice-calculations.ts` | 40% of MRP |
| `smart_dispatch_function.sql` | Books at MRP |

---

## 6. Safest Implementation Order
1. Create pricing + profit ledger DB migration
2. Create pricing/profit utility layer
3. Backfill existing invoices to profit ledger
4. Dual-write profit to canonical ledger
