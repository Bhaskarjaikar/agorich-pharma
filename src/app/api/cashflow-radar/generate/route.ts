// ============================================
// PHASE 3: CASHFLOW RADAR GENERATION ENDPOINT
// Strictly read-only, NO LIVE WRITES!
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateCashflowRadar
} from '@/lib/cashflow-radar';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CASHFLOW RADAR GENERATION (READ-ONLY)');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    const client = getSupabaseClient();

    // Generate cashflow radar (read-only)
    const radarEntries = await generateCashflowRadar(client);

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      data: radarEntries
    });
  } catch (error) {
    console.error('❌ Cashflow radar generation error:', error);
    console.log('='.repeat(60) + '\n');
    return NextResponse.json(
      {
        success: false,
        message: 'Cashflow radar generation failed'
      },
      { status: 500 }
    );
  }
}
