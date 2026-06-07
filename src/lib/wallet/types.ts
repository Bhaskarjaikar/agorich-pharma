export type LedgerEntryType =
  | 'STOCK_DEBT'
  | 'GST_ADVANCE'
  | 'SALE_CREDIT'
  | 'PLATFORM_FEE'
  | 'WITHDRAWAL'
  | 'DEBT_SETTLEMENT'
  | 'DISCOUNT_CREDIT'
  | 'PENALTY'
  | 'ADJUSTMENT';

export type WalletTransactionType =
  | 'CREDIT'
  | 'DEBIT'
  | 'DEBT_INCREASE'
  | 'DEBT_DECREASE'
  | 'WITHDRAWAL'
  | 'REFUND'
  | 'ADJUSTMENT';

export interface CreditLedgerEntry {
  id: string;
  distributorId: string;
  entryType: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  relatedOrderId?: string;
  relatedBatchId?: string;
  note?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface WalletSnapshot {
  distributorId: string;
  currentBalance: number;
  totalDebt: number;
  availableForWithdrawal: number;
  lastTransactionAt?: Date;
}

export interface FlexiSettleOption {
  action: 'WITHDRAW_TO_BANK' | 'SETTLE_DEBT';
  amount?: number;
  notes?: string;
}

export interface WithdrawToBankRequest {
  distributorId: string;
  amount: number;
  bankAccountId?: string;
  notes?: string;
}

export interface SettleDebtRequest {
  distributorId: string;
  amount: number;
  notes?: string;
}

export interface DebtSettlementResult {
  success: boolean;
  amountSettled: number;
  newDebtBalance: number;
  discountCreditEarned?: number;
  error?: string;
}

export interface WithdrawalResult {
  success: boolean;
  amountWithdrawn: number;
  newBalance: number;
  error?: string;
}

export interface AgreementEnforcement {
  distributorId: string;
  creditCycleDays: number;
  lateFeePercent: number;
  maxCreditLimit: number;
  isOverdue: boolean;
  daysOverdue: number;
  withdrawEnabled: boolean;
  autoRedirectPercent: number;
}

export interface DiscountCredit {
  id: string;
  distributorId: string;
  amount: number;
  earnedAt: Date;
  usedAt?: Date;
  usedForOrderId?: string;
  expiresAt: Date;
  isActive: boolean;
}

export interface LedgerSummary {
  distributorId: string;
  totalCredits: number;
  totalDebits: number;
  totalDebt: number;
  totalWithdrawals: number;
  totalDebtSettlements: number;
  pendingDiscountCredits: number;
  lastEntryAt?: Date;
}

export function isOverdue(lastSettlementDate: Date | null, creditCycleDays: number): boolean {
  if (!lastSettlementDate) return false;
  const now = new Date();
  const diffTime = now.getTime() - new Date(lastSettlementDate).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > creditCycleDays;
}

export function calculateDaysOverdue(lastSettlementDate: Date | null, creditCycleDays: number): number {
  if (!lastSettlementDate) return 0;
  const now = new Date();
  const diffTime = now.getTime() - new Date(lastSettlementDate).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays - creditCycleDays);
}

export function calculateDiscountCredit(debtSettled: number): number {
  return Math.round(debtSettled * 0.02 * 100) / 100;
}

export function canWithdraw(wallet: WalletSnapshot, enforcement: AgreementEnforcement): boolean {
  if (enforcement.isOverdue) return false;
  if (wallet.availableForWithdrawal <= 0) return false;
  return enforcement.withdrawEnabled;
}
