import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/api-security'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Verify authentication
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return authError
    }

    const supabase = await createServerClient()
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching product from Supabase:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch product',
        },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error: unknown) {
    console.error('Error fetching product:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to fetch product'
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Verify authentication
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return authError
    }

    const supabase = await createServerClient()
    const body = await request.json()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.category !== undefined) updateData.category = body.category
    if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer
    if (body.mrp !== undefined) updateData.mrp = body.mrp ? parseFloat(body.mrp) : null
    if (body.agorich_price !== undefined) updateData.agorich_price = body.agorich_price ? parseFloat(body.agorich_price) : null
    if (body.retailer_price !== undefined) updateData.retailer_price = body.retailer_price ? parseFloat(body.retailer_price) : null
    if (body.margin !== undefined) updateData.margin = body.margin ? parseFloat(body.margin) : null
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock) || 0
    if (body.expiry_date !== undefined) updateData.expiry_date = body.expiry_date || null
    if (body.pack_size !== undefined) updateData.pack_size = body.pack_size
    if (body.batch_number !== undefined) updateData.batch_number = body.batch_number
    if (body.mfg_date !== undefined) updateData.mfg_date = body.mfg_date
    if (body.status !== undefined) updateData.status = body.status

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating product in Supabase:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update product',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error: unknown) {
    console.error('Error updating product:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to update product'
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Verify authentication
    const { user, error: authError } = await verifyAuth(request)
    if (authError) {
      return authError
    }

    // Only admins can delete products
    if (!user || (user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Admin access required',
        },
        { status: 403 }
      )
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting product from Supabase:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete product',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: true,
    })
  } catch (error: unknown) {
    console.error('Error deleting product:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to delete product'
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
