# CANONICAL PAYMENT LEDGER - BLUEPRINT
## Phase 1: Stabilization Only
**Date: 2026-05-16**

---

## 🎯 SCOPE
- Single source of truth for all payments
- No new features, only unification
- Zero-downtime migration
- Backward compatible

---

## 🚨 CURRENT PROBLEM
3+ parallel payment ledgers exist:
1. `invoices.payment_amount` + `advance_paid` + `balance_due`
2. `invoice_payments` table
3. `payment_verifications` table

No reconciliation between them — AR and cash flow reporting are inconsistent.

---

## 📋 CANONICAL PAYMENT LEDGER TABLE
```sql
CREATE TABLE IF NOT EXISTS canonical_payment_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (
    payment_method IN (
      'RAZORPAY',
      'UPI',
      'NET_BANKING',
      'CASH',
      'CREDIT_NOTE',
      'BALANCE_ADJUSTMENT',
      'COD'
    )
  ),
  transaction_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL CHECK (
    status IN (
      'INITIATED',
      'PENDING',
      'SUCCESS',
      'FAILED',
      'REFUNDED'
    )
  ),
  payment_type TEXT NOT NULL CHECK (
    payment_type IN (
      'ADVANCE',
      'PARTIAL',
      'BALANCE',
      'FULL',
      'COD'
    )
  ),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  INDEX idx_canonical_payment_invoice (invoice_id),
  INDEX idx_canonical_payment_order (order_id),
  INDEX idx_canonical_payment_status (status),
  INDEX idx_canonical_payment_recorded_at (recorded_at DESC)
);
```

---

## 🔄 MIGRATION STRATEGY (ZERO-DOWNTIME)
1. Create `canonical_payment_ledger` table
2. Backfill existing payments from all 3 sources
3. Dual-write to old and new tables
4. Switch reads to new ledger
5. Deprecate old columns/tables

---

## 📊 SINGLE SOURCE OF TRUTH RULES
- Every rupee must be in `canonical_payment_ledger`
- `invoice.payment_status` = derived from ledger
- AR = sum(ledger where status = SUCCESS and invoice not FULLY_PAID)
- No direct writes to legacy columns

---

## 📝 NEXT STEPS
1. Create DB migration for `canonical_payment_ledger`
2. Create payment ledger utility layer
3. Dual-write to old + new tables
4. Verify reconciliation
5. Switch reads
