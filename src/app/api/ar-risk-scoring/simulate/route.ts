// ============================================
// PHASE 2: AR RISK SCORING SIMULATION ENDPOINT
// Strictly read-only simulation (NO LIVE WRITES!)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  runARRiskSimulation
} from '@/lib/ar-risk-scoring';

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
    const { retailer_id } = body;

    console.log('\n' + '='.repeat(60));
    console.log('🔍 AR RISK SCORING SIMULATION RECEIVED');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    // Validate required field
    if (!retailer_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field: retailer_id'
        },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Run AR risk simulation
    const results = await runARRiskSimulation(client, retailer_id);

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      retailer_id,
      results
    });
  } catch (error) {
    console.error('❌ AR risk scoring simulation error:', error);
    console.log('='.repeat(60) + '\n');
    return NextResponse.json(
      {
        success: false,
        message: 'AR risk scoring simulation failed'
      },
      { status: 500 }
    );
  }
}
