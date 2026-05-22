# INVENTORY FLOW MAP - CANONICAL
## Agorich Pharma B2B Platform
**Status: Stabilization Blueprint**

---

## SINGLE SOURCE OF TRUTH: canonical_inventory_ledger

---

## DOUBLE-ENTRY INVENTORY LEDGER

```
Every transaction has:
- product_id
- batch_id
- transaction_type
- quantity_change (+/-)
- quantity_after (running balance)
- reference_type/order_id
```

---

## INVENTORY FLOW LIFECYCLE

```
┌───────────────────────────────────────────────────────────────┐
│  ORDER CONFIRMED (Payment/Credit Approved)                    │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
         ┌───────────────────────────────────┐
         │ canonical_inventory_ledger        │
         │  - transaction_type: RESERVE      │
         │  - quantity_change: -N            │
         │  - (FEFO batch selection)         │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ ADMIN CONFIRMS → PROCESSING       │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ LOGISTICS PACKS                   │
         └───────────┬───────────────────────┘
                     │
                     ├─→ canonical_inventory_ledger
                     │    - transaction_type: PICK
                     │    - quantity_change: -N
                     │
                     └─→ canonical_inventory_ledger
                          - transaction_type: PACK
                          - quantity_change: 0 (status marker)
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ INVOICE STATUS → PACKING          │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ DISTRIBUTOR DISPATCHES            │
         └───────────┬───────────────────────┘
                     │
                     └─→ canonical_inventory_ledger
                          - transaction_type: DISPATCH
                          - quantity_change: -N (from dist inventory)
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ INVOICE STATUS → DISPATCHED       │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ DELIVERY CONFIRMED                 │
         └───────────┬───────────────────────┘
                     │
                     └─→ canonical_inventory_ledger
                          - transaction_type: DELIVER
                          - quantity_change: 0 (status marker)
                     │
                     ▼
         ┌───────────────────────────────────┐
         │ INVOICE STATUS → DELIVERED        │
         │ (Terminal)                         │
         └───────────────────────────────────┘
```

---

## RETURN/RESTOCK FLOW

```
┌───────────────────────────────────┐
│ PRODUCT RETURNED                  │
└───────────┬───────────────────────┘
            │
            ▼
canonical_inventory_ledger
  - transaction_type: RETURN
  - quantity_change: +N
  - reference: RETURN_ID
            │
            ▼
canonical_inventory_ledger
  - transaction_type: RESTOCK
  - quantity_change: +N
  - reference: RETURN_ID
```

---

## INVENTORY DRIFT (CURRENT STATE)
- **3+ stock systems**: inventory_batches, products.stock, distributor_inventory
- **No reconciliation**: No running balance ledger
- **Risk**: Overselling, double-counting, lost inventory

## INVENTORY STABILIZATION
- **1 ledger**: canonical_inventory_ledger only
- **Running balance**: quantity_after stored per transaction
- **FEFO enforced**: At reservation time
- **Audit trail**: Every stock movement tracked
