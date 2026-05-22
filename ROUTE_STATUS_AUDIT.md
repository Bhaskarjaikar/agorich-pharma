# ROUTE-BY-ROUTE STATUS AUDIT
## Phase 1: Status Engine Implementation
**Date: 2026-05-16**

---

## SUMMARY

| Route | Status Writes | Uses Canonical Statuses? | Has Transition Guards? | Priority |
|-------|----------------|---------------------------|------------------------|----------|
| `/api/invoices/[id]/status` | ✅ | ⚠️ Partial | ✅ Yes (basic) | P0 |
| `/api/invoices/generate` | ✅ | ❌ No | ❌ No | P0 |
| `/api/invoices/[id]/confirm-order` | ✅ | ❌ No | ❌ No | P0 |
| `/api/invoices/[id]/delivery-confirm` | ✅ | ❌ No | ❌ No | P0 |
| `/api/logistic/pack-order` | ✅ | ❌ No | ❌ No | P0 |
| `/api/payments/webhook` | ✅ | ❌ No | ❌ No | P0 |
| `/api/webhooks/razorpay` | ✅ | ❌ No | ❌ No | P0 |
| `/api/orders/create` | ✅ | ✅ Yes | ❌ No | P1 |
| All other routes | ✅ | ❌ No | ❌ No | P2 |

---

## 1. `/api/invoices/[id]/status/route.ts`
**Status**: ✅ Already has basic transition guards (best starting point)

### Current Status Writes
```typescript
// Line 7-15: allowedTransitions already defined!
const allowedTransitions: Record<string, string[]> = {
  DRAFT: ['SENT', 'PACKING', 'PAID'],
  SENT: ['PROCESSING'],
  PROCESSING: ['PACKING'],
  PACKING: ['DELIVERED'],
  DELIVERED: ['PAID', 'OVERDUE'],
  OVERDUE: ['PAID'],
  PAID: []
};
```

### Issues Found
1. Missing `WAITING_FOR_APPROVAL` in transitions
2. Missing `DISPATCHED` in transitions
3. Uses `PAID` instead of `FULLY_PAID`
4. Missing audit logging

### Refactor Plan
1. Replace local `allowedTransitions` with canonical status engine
2. Add audit logging
3. Expand transitions to include full canonical set
4. Normalize to `FULLY_PAID`

---

## 2. `/api/invoices/generate/route.ts`
**Status**: ❌ No transition guards

### Current Status Writes
```typescript
// Line 208-235: Writes 'CONFIRMED' directly
status: 'CONFIRMED', // ← NOT IN CANONICAL INVOICE STATUS SET
```

### Issues Found
1. Writes invalid status `CONFIRMED` (should use `SENT` or `PROCESSING`)
2. No transition guards
3. No audit logging

### Refactor Plan
1. Use canonical status engine
2. Validate transition
3. Write correct canonical status
4. Add audit logging

---

## 3. `/api/invoices/[id]/confirm-order/route.ts`
**Status**: ❌ No transition guards

### Current Status Writes
```typescript
// Line 76-110: Writes 'PROCESSING' directly
```

### Issues Found
1. No transition guards
2. No audit logging

### Refactor Plan
1. Use canonical status engine
2. Validate transition from current status
3. Add audit logging

---

## 4. `/api/invoices/[id]/delivery-confirm/route.ts`
**Status**: ❌ No transition guards

### Current Status Writes
```typescript
// Line 96-153: Writes 'DELIVERED' directly
```

### Issues Found
1. No transition guards
2. No audit logging

### Refactor Plan
1. Use canonical status engine
2. Validate transition from current status
3. Add audit logging

---

## 5. `/api/logistic/pack-order/route.ts`
**Status**: ❌ No transition guards

### Current Status Writes
```typescript
// Line 81-145: Writes 'PACKING' directly
```

### Issues Found
1. No transition guards
2. No audit logging

### Refactor Plan
1. Use canonical status engine
2. Validate transition from current status
3. Add audit logging

---

## 6. `/api/payments/webhook/route.ts`
**Status**: ❌ No transition guards

### Current Status Writes
```typescript
// Line 137-138: Writes 'PAID'
// Line 271-272: Writes 'PAID'
// Line 345: Writes 'DRAFT'
// Line 365: Writes 'REFUNDED'
```

### Issues Found
1. Uses `PAID` instead of `FULLY_PAID`
2. No transition guards
3. No audit logging

### Refactor Plan
1. Use canonical status engine
2. Normalize to `FULLY_PAID`
3. Validate transitions
4. Add audit logging

---

## 7. `/api/webhooks/razorpay/route.ts`
**Status**: ❌ No transition guards (DUPLICATE OF `/api/payments/webhook`)

### Current Status Writes
Same as `/api/payments/webhook` - duplicate logic!

### Issues Found
1. Duplicate of `/api/payments/webhook`
2. Same issues as above

### Refactor Plan
1. Deprecate this route (keep for backward compatibility but forward to canonical)
2. Or delete if not used

---

## 8. `/api/orders/create/route.ts`
**Status**: ✅ Uses basic canonical order statuses

### Current Status Writes
```typescript
// Line 315: status: 'DRAFT'
// Line 351: order_status: 'DRAFT'
// Line 392: order_status: 'DRAFT'
```

### Issues Found
1. No transition guards
2. No audit logging

### Refactor Plan
1. Use canonical status engine
2. Add audit logging

---

## REFACTOR ORDER (SAFE)

1. `/api/invoices/[id]/status` - already has basic guards; easiest to refactor first
2. `/api/invoices/[id]/confirm-order`
3. `/api/invoices/[id]/delivery-confirm`
4. `/api/logistic/pack-order`
5. `/api/invoices/generate`
6. `/api/payments/webhook`
7. `/api/webhooks/razorpay` (deprecate/forward)
8. `/api/orders/create`
9. All other routes
