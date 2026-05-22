// ============================================
// PHASE 2: AUTO-CREDIT-CONTROL CHECK ENDPOINT
// Read-only simulation (no live changes)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  checkRetailerCredit,
  logCreditDecision
} from '@/lib/auto-credit-control';

// Lazy initialization of Supabase client
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set');
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { retailer_id, order_amount, order_id } = body;

    console.log('\n' + '='.repeat(60));
    console.log('🔍 AUTO-CREDIT-CONTROL CHECK STARTED');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));
    console.log('💰 Input:', { retailer_id, order_amount, order_id });

    // Validate required fields
    if (!retailer_id || order_amount === undefined || order_amount === null) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: retailer_id and order_amount'
        },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Check retailer credit
    const result = await checkRetailerCredit(
      client,
      retailer_id,
      Number(order_amount)
    );

    // Log decision if order_id is provided
    if (order_id) {
      await logCreditDecision(client, order_id, retailer_id, result);
    }

    console.log('🎯 Credit check result:', result);
    console.log('='.repeat(60) + '\n');

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      result
    });
  } catch (error) {
    console.error('❌ Auto-credit-control check error:', error);
    console.log('='.repeat(60) + '\n');
    return NextResponse.json(
      {
        success: false,
        message: 'Auto-credit-control check failed'
      },
      { status: 500 }
    );
  }
}
