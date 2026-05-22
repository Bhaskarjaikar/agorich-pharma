import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'

export async function GET(request: NextRequest) {
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
        { error: 'Distributor profile not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const daysFilter = searchParams.get('days')
    const maxDays = daysFilter ? parseInt(daysFilter) : 90

    const futureDate = new Date()
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
      .gt('expiry_date', new Date().toISOString().split('T')[0])
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })

    if (error) {
      console.error('Error fetching expiry watchlist:', error)
      return NextResponse.json(
        { error: 'Failed to fetch expiry watchlist' },
        { status: 500 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const products = (batches || []).map((batch: any) => {
      const expiryDate = new Date(batch.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: batch.id,
        product_name: batch.products?.name || 'Unknown Product',
        batch_number: batch.batch_number,
        pack_size: batch.products?.pack_size || 'N/A',
        quantity: batch.available_qty + batch.reserved_qty,
        expiry_date: batch.expiry_date,
        days_until_expiry: daysUntilExpiry,
        mrp: batch.products?.mrp || 0,
        available_qty: batch.available_qty,
        reserved_qty: batch.reserved_qty,
        mfg_date: batch.mfg_date
      }
    })

    return NextResponse.json({
      success: true,
      data: products
    })

  } catch (error) {
    console.error('Error fetching expiry watchlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}