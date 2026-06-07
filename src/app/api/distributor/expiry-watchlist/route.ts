import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'

const DEFAULT_MAX_DAYS = 90
const MAX_ALLOWED_DAYS = 365

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  return trimmed.slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '');
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributor(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Distributor profile not found' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const daysParam = sanitizeString(searchParams.get('days'), 10)
    let maxDays = DEFAULT_MAX_DAYS

    if (daysParam) {
      const parsed = parseInt(daysParam, 10)
      if (!isNaN(parsed) && parsed > 0) {
        maxDays = Math.min(parsed, MAX_ALLOWED_DAYS)
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + maxDays)

    const { data: batches, error } = await supabase
      .from('inventory_batches')
      .select(`
        id,
        batch_number,
        expiry_date,
        available_qty,
        reserved_qty,
        mfg_date,
        products:product_id(
          id,
          name,
          mrp,
          pack_size
        )
      `)
      .eq('distributor_id', profile.id)
      .gt('expiry_date', today.toISOString().split('T')[0])
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })

    if (error) {
      console.error(JSON.stringify({
        errorId,
        context: 'expiry_watchlist_fetch_failed',
        distributorId: profile.id,
        maxDays,
        error: error.message
      }));
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expiry watchlist' },
        { status: 500 }
      )
    }

    const products = (batches || []).map((batch: any) => {
      const expiryDate = new Date(batch.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: batch.id,
        product_name: batch.products?.name || 'Unknown Product',
        batch_number: batch.batch_number || 'N/A',
        pack_size: batch.products?.pack_size || 'N/A',
        quantity: (Number(batch.available_qty) || 0) + (Number(batch.reserved_qty) || 0),
        expiry_date: batch.expiry_date,
        days_until_expiry: daysUntilExpiry
      }
    })

    return NextResponse.json({
      success: true,
      data: products
    })

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'expiry_watchlist_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
