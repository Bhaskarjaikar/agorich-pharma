import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import {
  getWalletSnapshot,
  getAgreementEnforcement,
  writeLedgerEntry
} from '@/lib/wallet/engine'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyAdmin(request);
    if ('headers' in authResult) {
      return authResult;
    }

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const distributorId = searchParams.get('distributor_id');

    if (action === 'overdue') {
      const { data: distributors, error } = await supabase
        .from('distributor_wallets')
        .select(`
          distributor_id,
          total_debt,
          current_balance,
          last_transaction_at,
          profiles:distributor_id(id, business_name, phone, email)
        `)
        .gt('total_debt', 0)
        .order('total_debt', { ascending: false });

      if (error) {
        console.error(JSON.stringify({ errorId, context: 'overdue_fetch_failed', error: error.message }));
        return NextResponse.json({ success: false, error: 'Failed to fetch overdue distributors' }, { status: 500 });
      }

      const overdueList = await Promise.all((distributors || []).map(async (d: any) => {
        const enforcement = await getAgreementEnforcement(supabase, d.distributor_id);
        return {
          distributorId: d.distributor_id,
          businessName: d.profiles?.business_name,
          phone: d.profiles?.phone,
          totalDebt: Number(d.total_debt),
          currentBalance: Number(d.current_balance),
          isOverdue: enforcement?.isOverdue || false,
          daysOverdue: enforcement?.daysOverdue || 0,
          withdrawEnabled: enforcement?.withdrawEnabled || false,
          autoRedirectPercent: enforcement?.autoRedirectPercent || 0
        };
      }));

      return NextResponse.json({
        success: true,
        overdue: overdueList.filter((d: any) => d.isOverdue)
      });
    }

    if (action === 'wallet' && distributorId) {
      const wallet = await getWalletSnapshot(supabase, distributorId);
      const enforcement = await getAgreementEnforcement(supabase, distributorId);

      return NextResponse.json({
        success: true,
        wallet,
        enforcement
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'admin_wallet_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyAdmin(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const body = await request.json();
    const { action, distributor_id, amount, reason } = body;

    if (action === 'stock_recall') {
      if (!distributor_id || !reason) {
        return NextResponse.json({ success: false, error: 'distributor_id and reason required' }, { status: 400 });
      }

      const { data: batches, error } = await supabase
        .from('inventory_batches')
        .select('id, product_id, quantity_available')
        .eq('distributor_id', distributor_id)
        .eq('is_proprietary', true)
        .eq('is_active', true);

      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch batches' }, { status: 500 });
      }

      let totalRecalled = 0;
      for (const batch of batches || []) {
        await supabase
          .from('inventory_batches')
          .update({ is_active: false, stock_status: 'RECALLED' })
          .eq('id', batch.id);
        totalRecalled += Number(batch.quantity_available);
      }

      await supabase.from('admin_actions_log').insert({
        admin_id: user.id,
        action_type: 'STOCK_RECALL',
        related_distributor_id: distributor_id,
        reason,
        metadata: { batchesRecalled: batches?.length || 0, totalUnits: totalRecalled }
      });

      return NextResponse.json({
        success: true,
        message: `Stock recall initiated for ${batches?.length || 0} batches`,
        totalUnits: totalRecalled
      });
    }

    if (action === 'adjust_debt') {
      if (!distributor_id || amount === undefined) {
        return NextResponse.json({ success: false, error: 'distributor_id and amount required' }, { status: 400 });
      }

      const result = await writeLedgerEntry(supabase, {
        distributorId: distributor_id,
        entryType: 'ADJUSTMENT',
        amount,
        note: `Admin adjustment: ${reason || 'No reason provided'}`,
        metadata: { adjustedBy: user.id }
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, newBalance: result.entry?.balanceAfter });
    }

    if (action === 'enable_withdrawal') {
      if (!distributor_id) {
        return NextResponse.json({ success: false, error: 'distributor_id required' }, { status: 400 });
      }

      await supabase
        .from('distributor_agreements')
        .update({ is_active: false })
        .eq('distributor_id', distributor_id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', distributor_id)
        .single();

      if (profile) {
        await supabase
          .from('distributor_wallets')
          .update({ last_transaction_at: new Date().toISOString() })
          .eq('distributor_id', distributor_id);
      }

      return NextResponse.json({ success: true, message: 'Withdrawal re-enabled for distributor' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'admin_wallet_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
