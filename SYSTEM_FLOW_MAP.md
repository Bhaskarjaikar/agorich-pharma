# SYSTEM FLOW MAP - CANONICAL
## Agorich Pharma B2B Platform
**Status: Stabilization Blueprint**

---

## RETAILER → ORDER → DISTRIBUTOR → INVENTORY → INVOICE → PAYMENT → PROFIT

---

### STAGE 1: RETAILER ORDER INITIATION
```
┌──────────────────┐
│  Retailer User   │
└────────┬─────────┘
         │
         ▼
┌───────────────────────────────────┐
│  Create Draft Order               │
│  (api/orders/create)              │
└────────┬──────────────────────────┘
         │
         ├─→ Creates: canonical_orders (DRAFT)
         ├─→ Creates: invoice_items
         └─→ NO stock reservation yet (safety first)
         │
         ▼
┌───────────────────────────────────┐
│  Payment/Credit Decision          │
└────────┬──────────────────────────┘
         │
    ┌────┴────┐
    │         │
 PREPAID    CREDIT
    │         │
    ▼         ▼
```

---

### STAGE 2: PAYMENT OR CREDIT APPROVAL
```
┌──────────────────┐     ┌──────────────────┐
│  Prepaid Path    │     │  Credit Path     │
└────────┬─────────┘     └────────┬─────────┘
         │                           │
         ▼                           ▼
┌──────────────────┐     ┌──────────────────┐
│ Create Payment   │     │ Order → WAITING  │
│ Intent           │     │ FOR APPROVAL     │
│ (Razorpay)       │     │                  │
└────────┬─────────┘     └────────┬─────────┘
         │                           │
         ▼                           ▼
┌──────────────────┐     ┌──────────────────┐
│ Webhook / Verify │     │ Admin Approval   │
│ Payment          │     │                  │
└────────┬─────────┘     └────────┬─────────┘
         │                           │
         └──────────┬────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  Order CONFIRMED │
         └────────┬─────────┘
```

---

### STAGE 3: FULFILLMENT & LOGISTICS
```
                    │
                    ▼
         ┌──────────────────┐
         │ Reserve Stock    │
         │ (FEFO)           │
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Generate Invoice │
         │ (SENT)           │
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Admin Confirm    │
         │ → PROCESSING     │
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Logistics Pack   │
         │ → PACKING        │
         │ (Decrement Stock)│
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Distributor      │
         │ Dispatch         │
         │ → DISPATCHED     │
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Delivery         │
         │ → DELIVERED      │
         │ (Record COD if   │
         │  applicable)     │
         └────────┬─────────┘
```

---

### STAGE 4: PAYMENT & FINANCIAL CLOSURE
```
                    │
                    ▼
         ┌──────────────────┐
         │ Record Full/     │
         │ Partial Payment  │
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Payment Status   │
         │ → FULLY_PAID     │
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Record Sale in   │
         │ Transaction      │
         │ Ledger           │
         └────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ PROFIT REALIZED  │
         │ (From Transaction│
         │  Ledger)         │
         └──────────────────┘
```

---

## KEY SAFETY POINTS IN CANONICAL FLOW

1. **NO stock reservation before payment/credit approval**
2. **All state changes go through status FSM**
3. **All financial writes to single payment ledger**
4. **All inventory writes to single inventory ledger**
5. **Audit trail for every state change**
