# RISK FLOW MAP - CANONICAL
## Agorich Pharma B2B Platform
**Status: Stabilization Blueprint**

---

## RISK CATEGORY MATRIX

| Category | P0 (Data Corruption) | P1 (Financial) | P2 (Operational) | P3 (UI/Reporting) |
|----------|-----------------------|-----------------|-------------------|--------------------|
| **Schema Drift** | ✓ | | | |
| **Status Mismatch** | ✓ | | | |
| **Payment Ledgers** | | ✓ | | |
| **Inventory Ledgers** | ✓ | ✓ | | |
| **Profit Calculation** | | ✓ | | ✓ |
| **Duplicate Logic** | | | ✓ | |
| **Race Conditions** | ✓ | | ✓ | |
| **State Transitions** | ✓ | | ✓ | |

---

## RISK FLOW LIFECYCLE (CURRENT STATE)

```
┌───────────────────────────────────────────────────────────────┐
│  RETAILER PLACES ORDER                                         │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
         ┌───────────────────────────────────┐
         │ RISK: invoices.order_id TYPE DRIFT│
         │ (TEXT written to UUID FK column)  │
         │ P0 - DATA CORRUPTION               │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ RISK: PREMATURE STOCK RESERVE     │
         │ (before payment/credit approved)  │
         │ P2 - OPERATIONAL                   │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ PAYMENT INITIATED                   │
         └───────────┬───────────────────────┘
                     │
         ┌───────────┴───────────────────────────┐
         │                                       │
         ▼                                       ▼
┌───────────────────┐                   ┌───────────────────┐
│ RISK: DUAL WEBHOOK│                   │ RISK: INVALID     │
│ HANDLERS          │                   │ STATUS VALUES      │
│ (duplicate pay)   │                   │ (SUCCESS vs verified)│
│ P1 - FINANCIAL    │                   │ P0 - DATA CORRUPTION│
└───────────┬───────┘                   └───────────┬───────┘
            │                                       │
            └───────────┬───────────────────────────┘
                        │
                        ▼
         ┌───────────────────────────────────┐
         │ ORDER CONFIRMED                    │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ RISK: 3+ STOCK SYSTEMS            │
         │ (no reconciliation)               │
         │ P0/P1 - DATA/FINANCIAL            │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ FULFILLMENT                        │
         └───────────┬───────────────────────┘
                     │
         ┌───────────┴───────────────────────────┐
         │                                       │
         ▼                                       ▼
┌───────────────────┐                   ┌───────────────────┐
│ RISK: NO TRANSACT │                   │ RISK: INVALID STATE│
│ SAFETY            │                   │ TRANSITIONS        │
│ (partial updates) │                   │ (DRAFT→DELIVERED) │
│ P0 - DATA CORRUPT │                   │ P0/P2              │
└───────────┬───────┘                   └───────────┬───────┘
            │                                       │
            └───────────┬───────────────────────────┘
                        │
                        ▼
         ┌───────────────────────────────────┐
         │ DELIVERY & PAYMENT                 │
         └───────────┬───────────────────────┘
                     │
         ┌───────────┴───────────────────────────┐
         │                                       │
         ▼                                       ▼
┌───────────────────┐                   ┌───────────────────┐
│ RISK: 3+ PAYMENT  │                   │ RISK: MULTIPLE     │
│ LEDGERS           │                   │ PROFIT FORMULAS   │
│ (no reconciliation)│                   │ (40%, 30%, etc.) │
│ P1 - FINANCIAL    │                   │ P1/P3 - FINANCIAL │
└───────────┬───────┘                   └───────────┬───────┘
            │                                       │
            └───────────┬───────────────────────────┘
                        │
                        ▼
         ┌───────────────────────────────────┐
         │ REPORTING                         │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ RISK: AR FROM DENORMALIZED COLS   │
         │ (not from payment ledger)         │
         │ P1 - FINANCIAL                    │
         └───────────────────────────────────┘
```

---

## P0 MITIGATION FIRST

### P0 RISKS (DATA CORRUPTION)
1. Fix `invoices.order_id` type drift
2. Fix status constraints + invalid status values
3. Fix `payment_verifications.status` case mismatch
4. Add transaction safety around all workflows
5. Fix non-existent `orders.status` column

---

## RISK MITIGATION FLOW

```
PHASE 0: PREPARE
  ├─ Backup DB
  ├─ Freeze deployments
  └─ Create runbook

PHASE 1: P0 MITIGATION
  ├─ Fix schema drift
  ├─ Fix status constraints
  └─ Add transaction wrappers

PHASE 2: P1 MITIGATION
  ├─ Build canonical payment ledger
  ├─ Build canonical inventory ledger
  ├─ Build canonical profit engine
  └─ Backfill existing data

PHASE 3: P2/P3 MITIGATION
  ├─ Remove duplicate logic
  ├─ Fix status transitions
  └─ Fix reporting
```

---

## ROLLBACK TRIGGERS
- Constraint violation rate > 0.1%
- Payment reconciliation error > ₹100
- Stock discrepancy > 5 units
- Any data corruption detected
- Workflow stuck > 1 hour
