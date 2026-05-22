// ============================================
// PHASE 3: PROFIT HEATMAP GENERATION ENDPOINT
// Strictly read-only, NO LIVE WRITES!
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateProfitHeatmap
} from '@/lib/profit-heatmap';

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
    console.log('📊 PROFIT HEATMAP GENERATION (READ-ONLY)');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    const client = getSupabaseClient();

    // Generate profit heatmap (read-only)
    const heatmapEntries = await generateProfitHeatmap(client);

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      data: heatmapEntries
    });
  } catch (error) {
    console.error('❌ Profit heatmap generation error:', error);
    console.log('='.repeat(60) + '\n');
    return NextResponse.json(
      {
        success: false,
        message: 'Profit heatmap generation failed'
      },
      { status: 500 }
    );
  }
}
