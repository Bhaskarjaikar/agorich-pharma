// ============================================
// CANONICAL STATUS TRANSITION GUARDS
// ============================================

import {
  CanonicalInvoiceStatus,
  CanonicalOrderStatus,
  CanonicalDistributorOrderStatus,
  StatusTransition
} from './types';
import {
  INVOICE_STATUS_TRANSITIONS,
  ORDER_STATUS_TRANSITIONS,
  DISTRIBUTOR_ORDER_STATUS_TRANSITIONS
} from './transitions';
import {
  CANONICAL_INVOICE_STATUSES,
  CANONICAL_ORDER_STATUSES,
  CANONICAL_DISTRIBUTOR_ORDER_STATUSES,
  TERMINAL_INVOICE_STATUSES,
  TERMINAL_ORDER_STATUSES,
  TERMINAL_DISTRIBUTOR_ORDER_STATUSES
} from './constants';

export function normalizeStatus(status: string | null | undefined): string {
  if (!status || !status.trim()) {
    return 'UNKNOWN';
  }
  return status.trim().toUpperCase();
}

export function isValidInvoiceStatus(status: string): status is CanonicalInvoiceStatus {
  return CANONICAL_INVOICE_STATUSES.has(status);
}

export function isValidOrderStatus(status: string): status is CanonicalOrderStatus {
  return CANONICAL_ORDER_STATUSES.has(status);
}

export function isValidDistributorOrderStatus(status: string): status is CanonicalDistributorOrderStatus {
  return CANONICAL_DISTRIBUTOR_ORDER_STATUSES.has(status);
}

export function isTerminalInvoiceStatus(status: string): boolean {
  return TERMINAL_INVOICE_STATUSES.has(status);
}

export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL_ORDER_STATUSES.has(status);
}

export function isTerminalDistributorOrderStatus(status: string): boolean {
  return TERMINAL_DISTRIBUTOR_ORDER_STATUSES.has(status);
}

export function guardInvoiceTransition(fromRaw: string, toRaw: string): StatusTransition {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);

  if (!isValidInvoiceStatus(to)) {
    return {
      from,
      to,
      valid: false,
      error: `Invalid invoice status: ${to}`
    };
  }

  if (isTerminalInvoiceStatus(from)) {
    return {
      from,
      to,
      valid: false,
      error: `Cannot transition from terminal status: ${from}`
    };
  }

  const allowedTransitions = INVOICE_STATUS_TRANSITIONS[from];
  if (!allowedTransitions || !allowedTransitions.has(to)) {
    return {
      from,
      to,
      valid: false,
      error: `Invalid transition from ${from} to ${to}`
    };
  }

  return {
    from,
    to,
    valid: true
  };
}

export function guardOrderTransition(fromRaw: string, toRaw: string): StatusTransition {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);

  if (!isValidOrderStatus(to)) {
    return {
      from,
      to,
      valid: false,
      error: `Invalid order status: ${to}`
    };
  }

  if (isTerminalOrderStatus(from)) {
    return {
      from,
      to,
      valid: false,
      error: `Cannot transition from terminal status: ${from}`
    };
  }

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[from];
  if (!allowedTransitions || !allowedTransitions.has(to)) {
    return {
      from,
      to,
      valid: false,
      error: `Invalid transition from ${from} to ${to}`
    };
  }

  return {
    from,
    to,
    valid: true
  };
}

export function guardDistributorOrderTransition(fromRaw: string, toRaw: string): StatusTransition {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);

  if (!isValidDistributorOrderStatus(to)) {
    return {
      from,
      to,
      valid: false,
      error: `Invalid distributor order status: ${to}`
    };
  }

  if (isTerminalDistributorOrderStatus(from)) {
    return {
      from,
      to,
      valid: false,
      error: `Cannot transition from terminal status: ${from}`
    };
  }

  const allowedTransitions = DISTRIBUTOR_ORDER_STATUS_TRANSITIONS[from];
  if (!allowedTransitions || !allowedTransitions.has(to)) {
    return {
      from,
      to,
      valid: false,
      error: `Invalid transition from ${from} to ${to}`
    };
  }

  return {
    from,
    to,
    valid: true
  };
}
