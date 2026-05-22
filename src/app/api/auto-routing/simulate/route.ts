// ============================================
// PHASE 2: AUTO-ROUTING SIMULATION ENDPOINT
// Read-only simulation (no live changes)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  findBestDistributorForPincode,
  logRoutingDecision
} from '@/lib/auto-routing';

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
    const { pincode, product_ids, order_id } = body;

    console.log('\n' + '='.repeat(60));
    console.log('🔍 AUTO-ROUTING SIMULATION STARTED');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));
    console.log('📦 Input:', { pincode, product_ids, order_id });

    // Validate required fields
    if (!pincode) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field: pincode'
        },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Find best distributor
    const result = await findBestDistributorForPincode(
      client,
      pincode,
      product_ids || []
    );

    // Log decision if order_id is provided
    if (order_id) {
      await logRoutingDecision(client, order_id, result);
    }

    console.log('🎯 Simulation result:', result);
    console.log('='.repeat(60) + '\n');

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      result
    });
  } catch (error) {
    console.error('❌ Auto-routing simulation error:', error);
    console.log('='.repeat(60) + '\n');
    return NextResponse.json(
      {
        success: false,
        message: 'Auto-routing simulation failed'
      },
      { status: 500 }
    );
  }
}
