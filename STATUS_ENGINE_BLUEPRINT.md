# CANONICAL STATUS ENGINE - BLUEPRINT
## Phase 1: Status Engine Implementation
**Lead Transaction Systems Engineer Report**
**Date: 2026-05-16**

---

## 1. EXECUTIVE SUMMARY

This blueprint defines the **single authoritative lifecycle engine** for the entire Agorich Pharma commerce system. It unifies all status vocabularies, defines valid transitions, and provides a centralized utility layer.

### Current Problem
- **42+ status values** used across codebase and migrations
- **Conflicting status definitions** (e.g., `PARTIAL_PAID` vs `PARTIALLY_PAID`)
- **No centralized validation** - routes modify status directly
- **No audit trail** for status changes
- **Invalid transitions possible** (e.g., `DRAFT → DELIVERED`)

### Solution
- **4 canonical status domains** (Invoice, Order, Payment, Distributor Order)
- **Valid transition FSMs** for each domain
- **Centralized status utility layer**
- **Transition audit logging**
- **Backward-compatible migration strategy**

---

## 2. AUDIT: ALL STATUS VALUES FOUND

### Invoice Status (Found)
| Status | Used In | Notes |
|--------|---------|-------|
| `DRAFT` | ✅ All routes/migrations | |
| `SENT` | ✅ All routes/migrations | |
| `PROCESSING` | ✅ UI/routes | |
| `PACKING` | ✅ UI/routes/logistics | |
| `DISPATCHED` | ✅ Smart dispatch/mock UI | Missing from many constraint sets |
| `DELIVERED` | ✅ All | |
| `PARTIAL_PAID` | ✅ UI/types | Mismatch with `PARTIALLY_PAID` |
| `PARTIALLY_PAID` | ✅ Migrations | Mismatch with `PARTIAL_PAID` |
| `PAID` | ✅ All | |
| `OVERDUE` | ✅ UI/migrations | |
| `WAITING_FOR_APPROVAL` | ✅ Migrations/006 | |
| `CONFIRMED` | ⚠️ Some routes | Conflict with `PROCESSING` |
| `CANCELLED` | ✅ All | |
| `REFUNDED` | ⚠️ Webhooks only | Missing from constraint sets |
| `PAYMENT_FAILED` | ⚠️ Webhooks only | Missing from constraint sets |

### Order Status (Found)
| Status | Used In | Notes |
|--------|---------|-------|
| `DRAFT` | ✅ All | |
| `CONFIRMED` | ✅ All | |
| `CANCELLED` | ✅ All | |
| `PAYMENT_FAILED` | ⚠️ Webhooks only | Missing from constraint sets |
| `WAITING_FOR_APPROVAL` | ⚠️ UI only | Missing from constraint sets |

### Payment Status (Found)
| Status | Used In | Notes |
|--------|---------|-------|
| `PENDING` | ✅ All | |
| `PARTIALLY_PAID` | ✅ Migrations | |
| `FULLY_PAID` | ✅ Migrations | |
| `PAID` | ✅ UI/routes | Conflict with `FULLY_PAID` |
| `FAILED` | ✅ All | |
| `REFUNDED` | ⚠️ Webhooks only | |
| `verified` | ⚠️ payment_verifications (lowercase) | Case mismatch with `SUCCESS` |
| `SUCCESS` | ⚠️ payment_verifications (uppercase) | Case mismatch with `verified` |

### Distributor Order Status (Found)
| Status | Used In | Notes |
|--------|---------|-------|
| `ASSIGNED` | ✅ Mock UI/migrations | |
| `ACCEPTED` | ✅ Mock UI/migrations | |
| `PACKED` | ✅ Migrations | |
| `DISPATCHED` | ✅ Mock UI/migrations | |
| `DELIVERED` | ✅ Migrations | |
| `CANCELLED` | ✅ Migrations | |

---

## 3. CANONICAL ENUM DEFINITIONS

### CanonicalInvoiceStatus
```typescript
type CanonicalInvoiceStatus =
  | 'DRAFT'
  | 'WAITING_FOR_APPROVAL'
  | 'SENT'
  | 'PROCESSING'
  | 'PACKING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';
```

### CanonicalInvoicePaymentStatus
```typescript
type CanonicalInvoicePaymentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'OVERDUE';
```
- **Resolution**: Use `PARTIALLY_PAID` (not `PARTIAL_PAID`), `FULLY_PAID` (not `PAID`) for consistency

### CanonicalOrderStatus
```typescript
type CanonicalOrderStatus =
  | 'DRAFT'
  | 'WAITING_FOR_APPROVAL'
  | 'CONFIRMED'
  | 'CANCELLED';
```

### CanonicalOrderPaymentStatus
```typescript
type CanonicalOrderPaymentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID'
  | 'FAILED'
  | 'REFUNDED';
```

### CanonicalPaymentVerificationStatus
```typescript
type CanonicalPaymentVerificationStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED';
```
- **Resolution**: Normalize to uppercase, use `SUCCESS` (not `verified`)

### CanonicalDistributorOrderStatus
```typescript
type CanonicalDistributorOrderStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';
```

---

## 4. CANONICAL STATE MACHINES (FSM)

### Invoice Status FSM
```
DRAFT
  ├─→ [Retailer submits credit] → WAITING_FOR_APPROVAL
  ├─→ [Prepaid OR credit approved] → SENT
  └─→ [Cancel] → CANCELLED (terminal)

WAITING_FOR_APPROVAL
  ├─→ [Approved] → SENT
  └─→ [Rejected/Cancel] → CANCELLED (terminal)

SENT
  ├─→ [Admin confirms] → PROCESSING
  └─→ [Cancel] → CANCELLED (terminal)

PROCESSING
  ├─→ [Logistics packs] → PACKING
  └─→ [Cancel] → CANCELLED (terminal)

PACKING
  ├─→ [Dispatched] → DISPATCHED
  └─→ [Cancel] → CANCELLED (terminal)

DISPATCHED
  ├─→ [Delivered] → DELIVERED (terminal)
  └─→ [Cancel] → CANCELLED (terminal)

DELIVERED
  └─→ (Terminal state - no outgoing transitions)

CANCELLED
  └─→ (Terminal state - no outgoing transitions)
```

### Invoice Payment Status FSM
```
PENDING
  ├─→ [Partial payment] → PARTIALLY_PAID
  ├─→ [Full payment] → FULLY_PAID (terminal)
  ├─→ [Payment failed] → FAILED
  └─→ [Due date passed] → OVERDUE

PARTIALLY_PAID
  ├─→ [More partial payments] → PARTIALLY_PAID
  ├─→ [Full payment] → FULLY_PAID (terminal)
  └─→ [Due date passed] → OVERDUE

FAILED
  ├─→ [Retry payment] → PENDING
  └─→ [Cancel] → (linked to invoice CANCELLED)

OVERDUE
  ├─→ [Payment received] → PARTIALLY_PAID or FULLY_PAID
  └─→ [Cancel] → (linked to invoice CANCELLED)

FULLY_PAID
  └─→ (Terminal state - only REFUND allowed via separate process)

REFUNDED
  └─→ (Terminal state)
```

---

## 5. CENTRALIZED STATUS UTILITY LAYER DESIGN

### File Structure
```
src/lib/status-engine/
  ├── index.ts                 # Public API
  ├── types.ts                 # Canonical enum definitions
  ├── transitions.ts           # Valid transition maps
  ├── guards.ts                # Transition guard functions
  ├── audit.ts                 # Audit logging functions
  └── constants.ts             # Status constants
```

### Core Utilities
- `isValidInvoiceStatus(status: string): status is CanonicalInvoiceStatus`
- `isValidInvoiceTransition(from: CanonicalInvoiceStatus, to: CanonicalInvoiceStatus): boolean`
- `guardInvoiceTransition(from: string, to: string): { valid: boolean; error?: string }`
- `logStatusTransition(...)` - Audit log function

---

## 6. MIGRATION PLAN (ZERO-DOWNTIME)

### Phase 1: DB Constraint Expansion (Safe)
- Expand all CHECK constraints to include ALL canonical status values
- Normalize `payment_verifications.status` to uppercase
- Add `status_updated_at` where missing
- Add audit log table if missing
- **NO CODE CHANGES YET**

### Phase 2: Deploy Utility Layer (Backward Compatible)
- Add `src/lib/status-engine`
- Add type definitions
- Add transition guards
- Add audit logging
- **NO ROUTE CHANGES YET** - utility is optional

### Phase 3: Route-by-Route Refactor (Gradual)
- Update each route one by one to use status engine
- Keep old status writes for backward compatibility (dual-write)
- Add transition audit logging
- **NO DELETIONS YET**

### Phase 4: Deprecate Legacy Status Usage
- Remove dual-write
- Deprecate old status enums
- Add warnings for non-canonical status usage
- **NO DELETIONS YET**

### Phase 5: Cleanup
- Remove unused status values
- Simplify constraints to canonical set only
- Final validation

---

## 7. ROLLBACK STRATEGY

### Rollback Triggers
- Constraint violation rate > 0.1%
- Invalid transition errors > 5/hour
- Business workflow stuck > 1 hour
- Any data corruption detected

### Rollback Steps
1. Revert DB constraints to previous version
2. Revert status engine utility layer
3. Revert route changes (if any)
4. Restore from backup (if needed)

---

## 8. EXACT FILES TO CHANGE

### DB Migrations
- `migrations/008_expand_status_constraints.sql` (to be created)
- `migrations/009_normalize_payment_verifications_status.sql` (to be created)

### New Files
- `src/lib/status-engine/index.ts`
- `src/lib/status-engine/types.ts`
- `src/lib/status-engine/transitions.ts`
- `src/lib/status-engine/guards.ts`
- `src/lib/status-engine/audit.ts`
- `src/lib/status-engine/constants.ts`

### Routes to Refactor (Order of Priority)
1. `src/app/api/invoices/[id]/status/route.ts` - already has basic transition rules
2. `src/app/api/invoices/generate/route.ts`
3. `src/app/api/invoices/[id]/confirm-order/route.ts`
4. `src/app/api/invoices/[id]/delivery-confirm/route.ts`
5. `src/app/api/logistic/pack-order/route.ts`
6. `src/app/api/payments/webhook/route.ts`
7. `src/app/api/webhooks/razorpay/route.ts`
8. `src/app/api/orders/create/route.ts`
9. All other invoice/payment/logistic routes

---

## 9. SAFEST IMPLEMENTATION ORDER

1. **Create DB migration to expand constraints** (no downtime)
2. **Deploy status engine utility layer** (no downtime, backward compatible)
3. **Update `/api/invoices/[id]/status` route** to use engine first
4. **Gradually refactor other routes** one by one
5. **Add audit logging to all transitions**
6. **Validate for 1 week**
7. **Deprecate legacy usage**
8. **Final cleanup**

---

## 10. ORPHAN/DEAD/CONFLICTING STATUS SUMMARY

| Status | Category | Resolution |
|--------|----------|------------|
| `PAID` (invoice status) | Conflicting | Use `FULLY_PAID` for payment status; keep `PAID` only for backward compatibility |
| `PARTIAL_PAID` | Conflicting | Use `PARTIALLY_PAID` |
| `verified` (payment_verifications) | Orphan/Case mismatch | Normalize to `SUCCESS` |
| `CONFIRMED` (invoice status) | Conflicting | Use `PROCESSING` instead |
| `PAYMENT_FAILED` (invoice/order status) | Orphan | Use `FAILED` |
| `OUT_FOR_DELIVERY` | Dead | Not used; remove from comments |
