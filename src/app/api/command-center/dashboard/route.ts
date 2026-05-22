// ============================================
// PHASE 3: COMMAND CENTER DASHBOARD ENDPOINT
// Strictly read-only, NO LIVE WRITES!
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCommandCenterDashboardData
} from '@/lib/command-center';

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
    console.log('📊 COMMAND CENTER DASHBOARD REQUEST (READ-ONLY)');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    const client = getSupabaseClient();

    // Get command center dashboard data (read-only)
    const dashboardData = await getCommandCenterDashboardData(client);

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ Command center dashboard error:', error);
    console.log('='.repeat(60) + '\n');
    return NextResponse.json(
      {
        success: false,
        message: 'Command center dashboard failed'
      },
      { status: 500 }
    );
  }
}
