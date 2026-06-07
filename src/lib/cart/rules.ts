export type CartValidationStatus = 'VALID' | 'INVALID_DISTRIBUTOR_MISMATCH' | 'BELOW_MOV' | 'EMPTY_CART' | 'ITEM_UNAVAILABLE';

export interface CartItem {
  batchId: string;
  productId: string;
  productName: string;
  distributorId: string;
  quantity: number;
  ptr: number;
  ptd: number;
  mrp: number;
  isProprietary: boolean;
  expiryDate: Date;
}

export interface Cart {
  retailerId: string;
  distributorId: string | null;
  distributorName: string | null;
  items: CartItem[];
  subtotal: number;
  deliverySurcharge: number;
  grandTotal: number;
  minOrderValue: number;
  shortfall: number;
}

export interface CartValidationResult {
  valid: boolean;
  status: CartValidationStatus;
  cart?: Cart;
  error?: string;
  errorCode?: string;
  distributorConflict?: {
    existingDistributorId: string;
    existingDistributorName: string;
    newDistributorId: string;
    newDistributorName: string;
  };
  movShortfall?: {
    minOrderValue: number;
    currentSubtotal: number;
    shortfall: number;
  };
}

export interface AddToCartRequest {
  retailerId: string;
  batchId: string;
  quantity: number;
}

export interface CartCheckoutValidation {
  canCheckout: boolean;
  cart: Cart;
  issues: string[];
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export function calculateCartTotals(
  items: CartItem[],
  deliverySurcharge: number
): { subtotal: number; grandTotal: number } {
  const subtotal = items.reduce((sum, item) => sum + (item.ptr * item.quantity), 0);
  return {
    subtotal: roundToTwo(subtotal),
    grandTotal: roundToTwo(subtotal + deliverySurcharge)
  };
}

export function validateSingleDistributor(
  existingItems: CartItem[],
  newItemDistributorId: string,
  newItemDistributorName: string
): CartValidationResult['distributorConflict'] | null {
  if (existingItems.length === 0) return null;

  const existingDistributorId = existingItems[0].distributorId;
  if (existingDistributorId !== newItemDistributorId) {
    const existingDistributorName = existingItems[0].productName;
    return {
      existingDistributorId,
      existingDistributorName: existingDistributorName,
      newDistributorId: newItemDistributorId,
      newDistributorName: newItemDistributorName
    };
  }

  return null;
}

export function validateMOV(
  subtotal: number,
  minOrderValue: number
): CartValidationResult['movShortfall'] | null {
  if (subtotal >= minOrderValue) return null;

  return {
    minOrderValue: roundToTwo(minOrderValue),
    currentSubtotal: roundToTwo(subtotal),
    shortfall: roundToTwo(minOrderValue - subtotal)
  };
}

export function validateCartForCheckout(
  cart: Cart
): CartCheckoutValidation {
  const issues: string[] = [];

  if (cart.items.length === 0) {
    issues.push('Cart is empty');
  }

  if (!cart.distributorId) {
    issues.push('No distributor selected');
  }

  if (cart.minOrderValue > 0 && cart.subtotal < cart.minOrderValue) {
    issues.push(`Below minimum order value. Add ₹${roundToTwo(cart.minOrderValue - cart.subtotal)} more`);
  }

  return {
    canCheckout: issues.length === 0,
    cart,
    issues
  };
}

export function mergeCartItems(
  existingItems: CartItem[],
  newItem: CartItem,
  additionalQuantity: number
): CartItem[] {
  const existingIndex = existingItems.findIndex(item => item.batchId === newItem.batchId);

  if (existingIndex >= 0) {
    const updated = [...existingItems];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: updated[existingIndex].quantity + additionalQuantity
    };
    return updated;
  }

  return [...existingItems, { ...newItem, quantity: additionalQuantity }];
}

export function removeCartItem(
  existingItems: CartItem[],
  batchId: string
): CartItem[] {
  return existingItems.filter(item => item.batchId !== batchId);
}

export function updateCartItemQuantity(
  existingItems: CartItem[],
  batchId: string,
  newQuantity: number
): CartItem[] {
  if (newQuantity <= 0) {
    return removeCartItem(existingItems, batchId);
  }

  return existingItems.map(item =>
    item.batchId === batchId ? { ...item, quantity: newQuantity } : item
  );
}

export class AgorichCartEngine {
  static readonly ERROR_CODES = {
    DISTRIBUTOR_MISMATCH: 'ERR_DISTRIBUTOR_MISMATCH',
    BELOW_MOV: 'ERR_BELOW_MOV',
    EMPTY_CART: 'ERR_EMPTY_CART',
    ITEM_UNAVAILABLE: 'ERR_ITEM_UNAVAILABLE',
    INVALID_QUANTITY: 'ERR_INVALID_QUANTITY'
  };

  static calculateCartTotals = calculateCartTotals;
  static validateSingleDistributor = validateSingleDistributor;
  static validateMOV = validateMOV;
  static validateCartForCheckout = validateCartForCheckout;
  static mergeCartItems = mergeCartItems;
  static removeCartItem = removeCartItem;
  static updateCartItemQuantity = updateCartItemQuantity;
  static roundToTwo = roundToTwo;
}
