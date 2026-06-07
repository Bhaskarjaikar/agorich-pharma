import {
  LedgerEntryType,
  WalletSnapshot,
  FlexiSettleOption,
  WithdrawToBankRequest,
  SettleDebtRequest,
  DebtSettlementResult,
  WithdrawalResult,
  AgreementEnforcement,
  LedgerSummary,
  CreditLedgerEntry,
  calculateDiscountCredit,
  isOverdue,
  calculateDaysOverdue
} from './types';

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function writeLedgerEntry(
  supabase: any,
  entry: {
    distributorId: string;
    entryType: LedgerEntryType;
    amount: number;
    relatedOrderId?: string;
    relatedBatchId?: string;
    note?: string;
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; entry?: CreditLedgerEntry; error?: string }> {
  const errorId = generateErrorId();

  try {
    const { data: wallet } = await supabase
      .from('distributor_wallets')
      .select('current_balance, total_debt, available_for_withdrawal')
      .eq('distributor_id', entry.distributorId)
      .single();

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    let newBalance = Number(wallet.current_balance);
    let newDebt = Number(wallet.total_debt);

    switch (entry.entryType) {
      case 'STOCK_DEBT':
        newDebt += entry.amount;
        break;
      case 'GST_ADVANCE':
        break;
      case 'SALE_CREDIT':
        newBalance += entry.amount;
        break;
      case 'PLATFORM_FEE':
        break;
      case 'WITHDRAWAL':
        newBalance -= entry.amount;
        break;
      case 'DEBT_SETTLEMENT':
        newBalance -= entry.amount;
        newDebt -= entry.amount;
        break;
      case 'DISCOUNT_CREDIT':
        newBalance += entry.amount;
        break;
      case 'PENALTY':
        newBalance -= entry.amount;
        newDebt += entry.amount;
        break;
      case 'ADJUSTMENT':
        if (entry.amount > 0) {
          newBalance += entry.amount;
        } else {
          newBalance -= Math.abs(entry.amount);
        }
        break;
    }

    newBalance = roundToTwo(newBalance);
    newDebt = roundToTwo(newDebt);

    if (newBalance < 0) {
      return { success: false, error: 'Insufficient balance' };
    }

    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('distributor_credit_ledger')
      .insert({
        distributor_id: entry.distributorId,
        entry_type: entry.entryType,
        amount: entry.amount,
        balance_after: entry.entryType === 'STOCK_DEBT' || entry.entryType === 'GST_ADVANCE' || entry.entryType === 'PENALTY' ? wallet.current_balance : newBalance,
        related_order_id: entry.relatedOrderId,
        related_batch_id: entry.relatedBatchId,
        note: entry.note,
        metadata: entry.metadata
      })
      .select()
      .single();

    if (ledgerError) {
      console.error(JSON.stringify({ errorId, context: 'ledger_write_failed', error: ledgerError }));
      return { success: false, error: 'Failed to write ledger entry' };
    }

    const availableForWithdrawal = entry.entryType === 'STOCK_DEBT' || entry.entryType === 'PENALTY'
      ? Number(wallet.available_for_withdrawal)
      : roundToTwo(newBalance);

    await supabase
      .from('distributor_wallets')
      .update({
        current_balance: newBalance,
        total_debt: newDebt,
        available_for_withdrawal: Math.max(0, availableForWithdrawal),
        last_transaction_at: new Date().toISOString()
      })
      .eq('distributor_id', entry.distributorId);

    return {
      success: true,
      entry: {
        ...ledgerEntry,
        balanceAfter: newBalance
      }
    };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'ledger_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function getWalletSnapshot(
  supabase: any,
  distributorId: string
): Promise<WalletSnapshot | null> {
  const { data, error } = await supabase
    .from('distributor_wallets')
    .select('*')
    .eq('distributor_id', distributorId)
    .single();

  if (error || !data) return null;

  return {
    distributorId: data.distributor_id,
    currentBalance: Number(data.current_balance),
    totalDebt: Number(data.total_debt),
    availableForWithdrawal: Number(data.available_for_withdrawal),
    lastTransactionAt: data.last_transaction_at ? new Date(data.last_transaction_at) : undefined
  };
}

export async function getAgreementEnforcement(
  supabase: any,
  distributorId: string
): Promise<AgreementEnforcement | null> {
  const { data: agreement } = await supabase
    .from('distributor_agreements')
    .select('*')
    .eq('distributor_id', distributorId)
    .eq('is_active', true)
    .single();

  if (!agreement) {
    return {
      distributorId,
      creditCycleDays: 30,
      lateFeePercent: 2,
      maxCreditLimit: 100000,
      isOverdue: false,
      daysOverdue: 0,
      withdrawEnabled: true,
      autoRedirectPercent: 0
    };
  }

  const { data: wallet } = await supabase
    .from('distributor_wallets')
    .select('last_transaction_at')
    .eq('distributor_id', distributorId)
    .single();

  const lastSettlementDate = wallet?.last_transaction_at || agreement.signed_at;
  const overdue = isOverdue(new Date(lastSettlementDate), agreement.credit_cycle_days);
  const daysOverdue = calculateDaysOverdue(new Date(lastSettlementDate), agreement.credit_cycle_days);

  return {
    distributorId,
    creditCycleDays: agreement.credit_cycle_days,
    lateFeePercent: Number(agreement.late_fee_pct),
    maxCreditLimit: Number(agreement.max_credit_limit),
    isOverdue: overdue,
    daysOverdue,
    withdrawEnabled: !overdue,
    autoRedirectPercent: overdue ? 30 : 0
  };
}

export async function withdrawToBank(
  supabase: any,
  request: WithdrawToBankRequest
): Promise<WithdrawalResult> {
  const errorId = generateErrorId();

  try {
    const wallet = await getWalletSnapshot(supabase, request.distributorId);
    if (!wallet) {
      return { success: false, amountWithdrawn: 0, newBalance: 0, error: 'Wallet not found' };
    }

    const enforcement = await getAgreementEnforcement(supabase, request.distributorId);
    if (enforcement && !enforcement.withdrawEnabled) {
      return { success: false, amountWithdrawn: 0, newBalance: wallet.currentBalance, error: 'Withdrawal disabled - account is overdue' };
    }

    if (request.amount > wallet.availableForWithdrawal) {
      return {
        success: false,
        amountWithdrawn: 0,
        newBalance: wallet.currentBalance,
        error: `Insufficient available balance. Available: ₹${wallet.availableForWithdrawal}`
      };
    }

    const ledgerResult = await writeLedgerEntry(supabase, {
      distributorId: request.distributorId,
      entryType: 'WITHDRAWAL',
      amount: request.amount,
      note: request.notes || 'Withdrawal to bank account',
      metadata: { bankAccountId: request.bankAccountId }
    });

    if (!ledgerResult.success) {
      return { success: false, amountWithdrawn: 0, newBalance: wallet.currentBalance, error: ledgerResult.error };
    }

    return {
      success: true,
      amountWithdrawn: request.amount,
      newBalance: wallet.currentBalance - request.amount
    };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'withdraw_exception', error: String(err) }));
    return { success: false, amountWithdrawn: 0, newBalance: 0, error: String(err) };
  }
}

export async function settleDebt(
  supabase: any,
  request: SettleDebtRequest
): Promise<DebtSettlementResult> {
  const errorId = generateErrorId();

  try {
    const wallet = await getWalletSnapshot(supabase, request.distributorId);
    if (!wallet) {
      return { success: false, amountSettled: 0, newDebtBalance: 0, error: 'Wallet not found' };
    }

    if (request.amount > wallet.availableForWithdrawal) {
      return {
        success: false,
        amountSettled: 0,
        newDebtBalance: wallet.totalDebt,
        error: `Insufficient available balance. Available: ₹${wallet.availableForWithdrawal}`
      };
    }

    if (request.amount > wallet.totalDebt) {
      return {
        success: false,
        amountSettled: 0,
        newDebtBalance: wallet.totalDebt,
        error: `Amount exceeds total debt. Total debt: ₹${wallet.totalDebt}`
      };
    }

    const debtSettled = roundToTwo(request.amount);
    const discountCreditEarned = calculateDiscountCredit(debtSettled);

    const ledgerResult = await writeLedgerEntry(supabase, {
      distributorId: request.distributorId,
      entryType: 'DEBT_SETTLEMENT',
      amount: debtSettled,
      note: request.notes || 'Debt settlement',
      metadata: { originalAmount: request.amount }
    });

    if (!ledgerResult.success) {
      return { success: false, amountSettled: 0, newDebtBalance: wallet.totalDebt, error: ledgerResult.error };
    }

    if (discountCreditEarned > 0) {
      await writeLedgerEntry(supabase, {
        distributorId: request.distributorId,
        entryType: 'DISCOUNT_CREDIT',
        amount: discountCreditEarned,
        note: `+2% discount credit earned on ₹${debtSettled} debt settlement`,
        metadata: {
          originalDebtSettled: debtSettled,
          expiresInDays: 30
        }
      });

      await supabase.from('discount_credits').insert({
        distributor_id: request.distributorId,
        amount: discountCreditEarned,
        earned_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      });
    }

    return {
      success: true,
      amountSettled: debtSettled,
      newDebtBalance: wallet.totalDebt - debtSettled,
      discountCreditEarned
    };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'settle_debt_exception', error: String(err) }));
    return { success: false, amountSettled: 0, newDebtBalance: 0, error: String(err) };
  }
}

export async function pushProprietaryStock(
  supabase: any,
  input: {
    distributorId: string;
    batchId: string;
    basePrice: number;
    gstAmount: number;
    quantity: number;
    pushedBy: string;
  }
): Promise<{ success: boolean; debtEntry?: CreditLedgerEntry; gstAdvancePaid?: boolean; error?: string }> {
  const errorId = generateErrorId();

  try {
    const { distributorId, batchId, basePrice, gstAmount, quantity, pushedBy } = input;
    const totalDebt = roundToTwo(basePrice * quantity);

    const debtResult = await writeLedgerEntry(supabase, {
      distributorId,
      entryType: 'STOCK_DEBT',
      amount: totalDebt,
      relatedBatchId: batchId,
      note: `Proprietary stock push - Batch ${batchId}, Qty ${quantity}`,
      metadata: { basePrice, quantity, gstAmount }
    });

    if (!debtResult.success) {
      return { success: false, error: debtResult.error };
    }

    let gstAdvancePaid = false;
    if (gstAmount > 0) {
      const gstResult = await writeLedgerEntry(supabase, {
        distributorId,
        entryType: 'GST_ADVANCE',
        amount: gstAmount,
        relatedBatchId: batchId,
        note: `GST advance for proprietary stock - Batch ${batchId}`,
        metadata: { basePrice, quantity }
      });
      gstAdvancePaid = gstResult.success;
    }

    await supabase
      .from('inventory_batches')
      .update({ is_active: true })
      .eq('id', batchId);

    return { success: true, debtEntry: debtResult.entry, gstAdvancePaid };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'push_stock_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function processOrderSettlement(
  supabase: any,
  input: {
    orderId: string;
    distributorId: string;
    grossAmount: number;
    platformFeePercent?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const errorId = generateErrorId();

  try {
    const { orderId, distributorId, grossAmount } = input;
    const platformFeePercent = input.platformFeePercent || 5;

    const enforcement = await getAgreementEnforcement(supabase, distributorId);
    const wallet = await getWalletSnapshot(supabase, distributorId);

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    const saleCreditAmount = roundToTwo(grossAmount);
    const platformFee = roundToTwo(saleCreditAmount * (platformFeePercent / 100));

    await writeLedgerEntry(supabase, {
      distributorId,
      entryType: 'SALE_CREDIT',
      amount: saleCreditAmount,
      relatedOrderId: orderId,
      note: `Sale settlement for order ${orderId}`,
      metadata: { grossAmount, platformFeePercent: platformFeePercent }
    });

    if (enforcement && enforcement.isOverdue && enforcement.autoRedirectPercent > 0) {
      const redirectAmount = roundToTwo(saleCreditAmount * (enforcement.autoRedirectPercent / 100));
      await writeLedgerEntry(supabase, {
        distributorId,
        entryType: 'DEBT_SETTLEMENT',
        amount: redirectAmount,
        relatedOrderId: orderId,
        note: `Auto-redirect ${enforcement.autoRedirectPercent}% of settlement to debt (overdue)`,
        metadata: { originalAmount: saleCreditAmount, redirectPercent: enforcement.autoRedirectPercent }
      });
    }

    if (enforcement && enforcement.daysOverdue > 0) {
      const penaltyAmount = roundToTwo(saleCreditAmount * (enforcement.lateFeePercent / 100));
      await writeLedgerEntry(supabase, {
        distributorId,
        entryType: 'PENALTY',
        amount: penaltyAmount,
        relatedOrderId: orderId,
        note: `Late fee penalty (${enforcement.daysOverdue} days overdue)`,
        metadata: { daysOverdue: enforcement.daysOverdue, lateFeePercent: enforcement.lateFeePercent }
      });
    }

    return { success: true };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'settlement_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function getLedgerSummary(
  supabase: any,
  distributorId: string
): Promise<LedgerSummary | null> {
  const { data: entries, error } = await supabase
    .from('distributor_credit_ledger')
    .select('entry_type, amount, created_at')
    .eq('distributor_id', distributorId)
    .order('created_at', { ascending: false });

  if (error) return null;

  const wallet = await getWalletSnapshot(supabase, distributorId);

  let totalCredits = 0;
  let totalDebits = 0;
  let totalWithdrawals = 0;
  let totalDebtSettlements = 0;

  for (const entry of entries || []) {
    switch (entry.entry_type) {
      case 'SALE_CREDIT':
      case 'DISCOUNT_CREDIT':
        totalCredits += Number(entry.amount);
        break;
      case 'WITHDRAWAL':
        totalWithdrawals += Number(entry.amount);
        break;
      case 'DEBT_SETTLEMENT':
        totalDebtSettlements += Number(entry.amount);
        break;
      case 'ADJUSTMENT':
        if (Number(entry.amount) > 0) totalCredits += Number(entry.amount);
        else totalDebits += Math.abs(Number(entry.amount));
        break;
    }
  }

  const { data: discountCredits } = await supabase
    .from('discount_credits')
    .select('amount')
    .eq('distributor_id', distributorId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString());

  return {
    distributorId,
    totalCredits: roundToTwo(totalCredits),
    totalDebits: roundToTwo(totalDebits),
    totalDebt: wallet?.totalDebt || 0,
    totalWithdrawals: roundToTwo(totalWithdrawals),
    totalDebtSettlements: roundToTwo(totalDebtSettlements),
    pendingDiscountCredits: discountCredits?.reduce((s: number, c: any) => s + Number(c.amount), 0) || 0,
    lastEntryAt: entries?.[0]?.created_at ? new Date(entries[0].created_at) : undefined
  };
}

export async function applyDiscountCredit(
  supabase: any,
  distributorId: string,
  orderId: string,
  amount: number
): Promise<{ success: boolean; amountApplied?: number; error?: string }> {
  const { data: credits, error } = await supabase
    .from('discount_credits')
    .select('*')
    .eq('distributor_id', distributorId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('earned_at', { ascending: true });

  if (error || !credits || credits.length === 0) {
    return { success: false, error: 'No active discount credits found' };
  }

  let remaining = amount;
  const toApply: string[] = [];

  for (const credit of credits) {
    if (remaining <= 0) break;
    const available = Number(credit.amount);
    const toUse = Math.min(available, remaining);
    remaining -= toUse;
    toApply.push(credit.id);
  }

  if (toApply.length > 0) {
    const appliedAmount = amount - remaining;

    for (const creditId of toApply) {
      await supabase
        .from('discount_credits')
        .update({
          is_active: false,
          used_at: new Date().toISOString(),
          used_for_order_id: orderId
        })
        .eq('id', creditId);
    }

    await writeLedgerEntry(supabase, {
      distributorId,
      entryType: 'DISCOUNT_CREDIT',
      amount: -appliedAmount,
      relatedOrderId: orderId,
      note: `Discount credit applied to order ${orderId}`,
      metadata: { originalAmount: amount, appliedAmount }
    });

    return { success: true, amountApplied: appliedAmount };
  }

  return { success: false, error: 'Could not apply discount credits' };
}

export class AgorichWalletEngine {
  static writeLedgerEntry = writeLedgerEntry;
  static getWalletSnapshot = getWalletSnapshot;
  static getAgreementEnforcement = getAgreementEnforcement;
  static withdrawToBank = withdrawToBank;
  static settleDebt = settleDebt;
  static pushProprietaryStock = pushProprietaryStock;
  static processOrderSettlement = processOrderSettlement;
  static getLedgerSummary = getLedgerSummary;
  static applyDiscountCredit = applyDiscountCredit;
}
