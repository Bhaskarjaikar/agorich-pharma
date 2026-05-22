# PHASE 1 — STABILIZATION ONLY
## NO NEW FEATURES — ONLY FIX 4 ENGINES
**Strategic Sequence Confirmed: Stabilization → Automation → Intelligence**
**Date: 2026-05-16**

---

## 🎯 PHASE 1 SCOPE (STRICTLY LIMITED)

### ONLY THESE 4 ENGINES TO FIX:
1. ✅ **Canonical Status Engine** (already blueprint complete)
2. ⏳ **Canonical Payment Ledger** (next)
3. ⏳ **Canonical Inventory Ledger** (next)
4. ⏳ **Canonical Pricing/Profit Engine** (next)

### NO NEW FEATURES ALLOWED IN PHASE 1:
- ❌ Auto-routing
- ❌ Auto-credit-control
- ❌ Predictive inventory
- ❌ AR risk scoring
- ❌ Distributor performance scoring
- ❌ Hedge-fund style admin dashboard
- ❌ Live risk monitoring
- ❌ Profit heatmap
- ❌ Cashflow radar
- ❌ Supply pressure index
- ❌ Any other fancy features

---

## 📋 PHASE 1 EXECUTION ORDER

### Step 1: Canonical Status Engine (IN PROGRESS)
- Blueprint complete: `STATUS_ENGINE_BLUEPRINT.md`
- Transition map complete: `STATUS_TRANSITION_MAP.md`
- Route audit complete: `ROUTE_STATUS_AUDIT.md`
- Next: Implement utility layer + DB migrations + route refactors

### Step 2: Canonical Payment Ledger (NEXT)
- Single source of truth for all payments
- Unify: `invoices.payment_amount`, `invoice_payments`, `payment_verifications`
- Double-entry financial ledger
- Reconciliation-ready
- Blueprint to be created: `PAYMENT_LEDGER_BLUEPRINT.md`

### Step 3: Canonical Inventory Ledger (NEXT)
- Single source of truth for all stock movements
- Unify: `inventory_batches`, `products.stock`, `distributor_inventory`
- Double-entry inventory ledger
- FEFO-enforced
- Blueprint to be created: `INVENTORY_LEDGER_BLUEPRINT.md`

### Step 4: Canonical Pricing/Profit Engine (NEXT)
- Single source of truth for pricing
- Single profit formula
- Store cost/sell prices at transaction time
- Blueprint to be created: `PRICING_PROFIT_BLUEPRINT.md`

---

## 🚀 PHASE 2 — OPERATIONAL AUTOMATION (LATER)
(Only after Phase 1 is 100% stable)
- Auto-routing
- Auto-credit-control
- Predictive inventory
- AR risk scoring
- Distributor performance scoring

---

## 🧠 PHASE 3 — COMMAND CENTER INTELLIGENCE (LATER)
(Only after Phase 2 is complete)
- Hedge-fund style admin dashboard
- Live risk monitoring
- Profit heatmap
- Cashflow radar
- Supply pressure index

---

## 🎯 PHASE 1 SUCCESS CRITERIA
- Single source of truth for status
- Single source of truth for payments
- Single source of truth for inventory
- Single source of truth for pricing/profit
- No data corruption
- No financial inconsistency
- Full audit trail
- Rollback-safe
