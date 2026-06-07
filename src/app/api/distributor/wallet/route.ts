import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'
import {
  getWalletSnapshot,
  getAgreementEnforcement,
  getLedgerSummary,
  withdrawToBank,
  settleDebt
} from '@/lib/wallet/engine'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributor(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'wallet';

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Distributor profile not found' }, { status: 404 });
    }

    if (action === 'wallet') {
      const wallet = await getWalletSnapshot(supabase, profile.id);
      const enforcement = await getAgreementEnforcement(supabase, profile.id);
      const summary = await getLedgerSummary(supabase, profile.id);

      return NextResponse.json({
        success: true,
        wallet: wallet ? {
          currentBalance: wallet.currentBalance,
          totalDebt: wallet.totalDebt,
          availableForWithdrawal: wallet.availableForWithdrawal,
          lastTransactionAt: wallet.lastTransactionAt
        } : null,
        enforcement: enforcement ? {
          creditCycleDays: enforcement.creditCycleDays,
          isOverdue: enforcement.isOverdue,
          daysOverdue: enforcement.daysOverdue,
          withdrawEnabled: enforcement.withdrawEnabled,
          autoRedirectPercent: enforcement.autoRedirectPercent
        } : null,
        summary: summary ? {
          totalCredits: summary.totalCredits,
          totalDebt: summary.totalDebt,
          totalWithdrawals: summary.totalWithdrawals,
          totalDebtSettlements: summary.totalDebtSettlements,
          pendingDiscountCredits: summary.pendingDiscountCredits
        } : null
      });
    }

    if (action === 'ledger') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const { data: entries, error } = await supabase
        .from('distributor_credit_ledger')
        .select('*')
        .eq('distributor_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error(JSON.stringify({ errorId, context: 'ledger_fetch_failed', error: error.message }));
        return NextResponse.json({ success: false, error: 'Failed to fetch ledger entries' }, { status: 500 });
      }

      return NextResponse.json({ success: true, entries: entries || [] });
    }

    if (action === 'summary') {
      const summary = await getLedgerSummary(supabase, profile.id);
      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'wallet_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributor(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const body = await request.json();
    const { action, amount, notes } = body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Distributor profile not found' }, { status: 404 });
    }

    if (action === 'withdraw') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Valid amount required' }, { status: 400 });
      }

      const result = await withdrawToBank(supabase, {
        distributorId: profile.id,
        amount,
        notes
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        amountWithdrawn: result.amountWithdrawn,
        newBalance: result.newBalance
      });
    }

    if (action === 'settle_debt') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Valid amount required' }, { status: 400 });
      }

      const result = await settleDebt(supabase, {
        distributorId: profile.id,
        amount,
        notes
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        amountSettled: result.amountSettled,
        newDebtBalance: result.newDebtBalance,
        discountCreditEarned: result.discountCreditEarned
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'wallet_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
