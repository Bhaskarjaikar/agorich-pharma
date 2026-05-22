# CASH FLOW MAP - CANONICAL
## Agorich Pharma B2B Platform
**Status: Stabilization Blueprint**

---

## SINGLE SOURCE OF TRUTH: canonical_payment_ledger

---

## CASH FLOW LIFECYCLE

```
┌───────────────────────────────────────────────────────────────┐
│  RETAILER CASH INITIATION                                      │
└───────────────────────────┬───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   PREPAID           PARTIAL PREPAY         CREDIT/COD
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Razorpay Pay  │  │ Razorpay Part │  │ No Upfront    │
│ (Full)        │  │ (Advance)     │  │ Payment       │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                   │                   │
        └───────────┬───────┴───────────────────┘
                    │
                    ▼
         ┌───────────────────────────┐
         │ canonical_payment_ledger  │
         │  - status: INITIATED      │
         │  - payment_type: ADVANCE  │
         │    or PARTIAL or FULL     │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ PAYMENT VERIFIED           │
         │ (Webhook or Manual Verify) │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ canonical_payment_ledger  │
         │  - status: SUCCESS        │
         │  - recorded_at: NOW()     │
         └───────────┬───────────────┘
                     │
         ┌───────────┴───────────────────────────┐
         │                                       │
         ▼                                       ▼
┌───────────────────┐                   ┌───────────────────┐
│ FULL PAYMENT      │                   │ PARTIAL PAYMENT   │
│                   │                   │                   │
│ - Invoice: FULLY_ │                   │ - Invoice: PARTIAL│
│   PAID            │                   │   _PAID           │
│ - Balance: 0      │                   │ - Balance: >0     │
└───────────┬───────┘                   └───────────┬───────┘
            │                                       │
            └───────────┬───────────────────────────┘
                        │
                        ▼
         ┌───────────────────────────┐
         │ ACCOUNTS RECEIVABLE (AR)  │
         │  (DERIVED FROM LEDGER)    │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ DELIVERY + COD (if appl)  │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ canonical_payment_ledger  │
         │  - payment_type: COD      │
         │  - status: SUCCESS        │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ FULLY_PAID (Terminal)     │
         │ CASH FLOW CLOSED           │
         └───────────────────────────┘
```

---

## CASH RECONCILIATION RULES

### RULE 1: Every rupee must be in canonical_payment_ledger
### RULE 2: invoice.payment_status = derived from ledger
### RULE 3: AR = sum(ledger where status=SUCCESS and invoice not FULLY_PAID)
### RULE 4: No direct writes to denormalized columns (payment_amount, advance_paid, etc.)

---

## CASH FLOW DRIFT (CURRENT STATE)
- **3+ ledgers**: invoices.payment_amount, invoice_payments, payment_verifications
- **No reconciliation**: No single source
- **Risk**: Lost revenue, double counting, incorrect AR

## CASH FLOW STABILIZATION
- **1 ledger**: canonical_payment_ledger only
- **Dual-write first**: Write to old + new
- **Switch reads**: Verify, then read from canonical
- **Deprecate old**: Remove old columns
