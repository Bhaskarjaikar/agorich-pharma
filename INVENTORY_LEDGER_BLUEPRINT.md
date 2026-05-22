# PHASE 1 — CANONICAL INVENTORY LEDGER BLUEPRINT

## Core Problem
Right now inventory is managed in **3+ separate systems** with NO unified ledger:
1. `inventory_batches` (FEFO reservation)
2. `products.stock` (simple decrement)
3. `distributor_inventory` (distributor stock)

## Canonical Source of Truth
**Single inventory ledger: `canonical_inventory_ledger` (double-entry style)

---

## 1. Canonical Inventory Ledger Schema

### Table: `canonical_inventory_ledger`
```sql
CREATE TABLE canonical_inventory_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  batch_id UUID,
  distributor_id UUID REFERENCES profiles(id),
  warehouse_id UUID,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'RESERVE', 'RELEASE', 'DECREMENT', 'INCREMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN', 'DAMAGED', 'ADJUSTMENT'
    )
  ),
  quantity_change INTEGER NOT NULL, -- +ve for in, -ve for out
  balance_after INTEGER NOT NULL,
  reference_type TEXT, -- 'ORDER', 'INVOICE', 'RETURN', 'ADJUSTMENT'
  reference_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);
```

### Indexes
```sql
CREATE INDEX idx_inventory_ledger_product ON canonical_inventory_ledger(product_id);
CREATE INDEX idx_inventory_ledger_batch ON canonical_inventory_ledger(batch_id);
CREATE INDEX idx_inventory_ledger_distributor ON canonical_inventory_ledger(distributor_id);
CREATE INDEX idx_inventory_ledger_performed_at ON canonical_inventory_ledger(performed_at DESC);
```

---

## 2. Canonical Transaction Types
| Type | Description |
|------|-------------|
| `RESERVE` | FEFO reserve for order |
| `RELEASE` | Unreserve stock |
| `DECREMENT` | Fulfill order |
| `INCREMENT` | Receive stock |
| `TRANSFER_IN` | Receive from warehouse/distributor |
| `TRANSFER_OUT` | Send to warehouse/distributor |
| `RETURN` | Return from customer |
| `DAMAGED` | Mark as damaged |
| `ADJUSTMENT` | Manual adjustment |

---

## 3. Current vs Canonical Flow Map

| Step | Current | Canonical |
|------|---------|------------|
| **Order Creation | Reserve on `inventory_batches` | Reserve + ledger |
| **Packing** | Decrement `products.stock` | Decrement + ledger |
| **Delivery** | No change | Confirm + ledger |
| **Return** | No standard | Return + ledger |
| **Distributor Dispatch** | Decrement `distributor_inventory` | Decrement + ledger |

---

## 4. Migration Plan

### Phase 1a: Create table + indexes
- Create `canonical_inventory_ledger`
- Create indexes
- Create RLS policies

### Phase 1b: Backfill existing stock
- From `products.stock` → initial balance
- From `inventory_batches` → initial reserve
- From `distributor_inventory` → initial distributor stock

### Phase 1c: Dual-write
- Every inventory changes → write to both old tables AND canonical ledger

---

## 5. Files to Refactor
| File | Current Inventory Use |
|------|-----------------|
| `src/app/api/orders/create/route.ts` | FEFO reservation |
| `src/lib/stock-adjustments.ts` | Stock decrement |
| `src/app/api/logistic/pack-order/route.ts` | Packing decrement |
| `smart_dispatch_function.sql` | Distributor dispatch |

---

## 6. Safest Implementation Order
1. Create inventory ledger DB migration
2. Create inventory ledger utility layer
3. Backfill existing stock
4. Dual-write to old + new tables
