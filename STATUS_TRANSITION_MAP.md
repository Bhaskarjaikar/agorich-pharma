# CANONICAL STATUS TRANSITION MAP
## Phase 1: Status Engine Implementation
**Date: 2026-05-16**

---

## 1. INVOICE STATUS TRANSITION MAP

### From → To Matrix
| From | Can Transition To | Notes |
|------|------------------|-------|
| `DRAFT` | `WAITING_FOR_APPROVAL`, `SENT`, `CANCELLED` | |
| `WAITING_FOR_APPROVAL` | `SENT`, `CANCELLED` | |
| `SENT` | `PROCESSING`, `CANCELLED` | |
| `PROCESSING` | `PACKING`, `CANCELLED` | |
| `PACKING` | `DISPATCHED`, `CANCELLED` | |
| `DISPATCHED` | `DELIVERED`, `CANCELLED` | |
| `DELIVERED` | `(none)` | Terminal state |
| `CANCELLED` | `(none)` | Terminal state |

### Transition Diagram
```
      ┌─────────┐
      │  DRAFT  │
      └────┬────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌──────────────────┐   ┌──────────┐
│WAITING_FOR_APPROV│   │   SENT   │
│       AL         │   └────┬─────┘
└────────┬─────────┘        │
         │                  │
         └──────┬───────────┘
                │
                ▼
         ┌──────────────┐
         │  PROCESSING  │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │   PACKING    │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  DISPATCHED  │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  DELIVERED   │ (Terminal)
         └──────────────┘

CANCELLED (Terminal) ← Any state before DELIVERED
```

---

## 2. INVOICE PAYMENT STATUS TRANSITION MAP

### From → To Matrix
| From | Can Transition To | Notes |
|------|------------------|-------|
| `PENDING` | `PARTIALLY_PAID`, `FULLY_PAID`, `FAILED`, `OVERDUE` | |
| `PARTIALLY_PAID` | `PARTIALLY_PAID`, `FULLY_PAID`, `OVERDUE` | |
| `FAILED` | `PENDING` | |
| `OVERDUE` | `PARTIALLY_PAID`, `FULLY_PAID`, `CANCELLED` | |
| `FULLY_PAID` | `REFUNDED` | Terminal except refund |
| `REFUNDED` | `(none)` | Terminal |

---

## 3. ORDER STATUS TRANSITION MAP

### From → To Matrix
| From | Can Transition To | Notes |
|------|------------------|-------|
| `DRAFT` | `WAITING_FOR_APPROVAL`, `CONFIRMED`, `CANCELLED` | |
| `WAITING_FOR_APPROVAL` | `CONFIRMED`, `CANCELLED` | |
| `CONFIRMED` | `CANCELLED` | |
| `CANCELLED` | `(none)` | Terminal |

---

## 4. DISTRIBUTOR ORDER STATUS TRANSITION MAP

### From → To Matrix
| From | Can Transition To | Notes |
|------|------------------|-------|
| `ASSIGNED` | `ACCEPTED`, `CANCELLED` | |
| `ACCEPTED` | `PACKED`, `CANCELLED` | |
| `PACKED` | `DISPATCHED`, `CANCELLED` | |
| `DISPATCHED` | `DELIVERED`, `CANCELLED` | |
| `DELIVERED` | `(none)` | Terminal |
| `CANCELLED` | `(none)` | Terminal |

---

## 5. INVALID TRANSITIONS (BLOCKED)

### Always Invalid
- `DRAFT → DELIVERED`
- `DRAFT → DISPATCHED`
- `SENT → DISPATCHED` (must go through PROCESSING → PACKING)
- `DELIVERED → *` (except REFUND via separate process)
- `CANCELLED → *`
- `FULLY_PAID → PENDING`
- `REFUNDED → *`
