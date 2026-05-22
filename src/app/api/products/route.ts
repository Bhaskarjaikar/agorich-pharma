import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    const supabase = supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
      : await createServerClient()
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('q')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('products')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,manufacturer.ilike.%${search}%,category.ilike.%${search}%`)
    }

    // Apply category filter
    if (category) {
      query = query.eq('category', category)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Error fetching products from Supabase:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch products',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      products: products || [],
      pageInfo: {
        hasNextPage: (products?.length || 0) >= limit,
        endCursor: offset + (products?.length || 0),
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching products:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to fetch products'
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only authenticated users can create products
    const authResult = await verifyAuth(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    const supabase = supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
      : await createServerClient()
    const body = await request.json()
    const {
      name,
      category,
      manufacturer,
      mrp,
      agorich_price,
      retailer_price,
      margin,
      stock,
      expiry_date,
      pack_size,
      batch_number,
      mfg_date,
      status = 'ACTIVE',
    } = body

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product name is required',
        },
        { status: 400 }
      )
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
      name,
        category,
        manufacturer,
        mrp: mrp ? parseFloat(mrp) : null,
        agorich_price: agorich_price ? parseFloat(agorich_price) : null,
        retailer_price: retailer_price ? parseFloat(retailer_price) : null,
        margin: margin ? parseFloat(margin) : null,
        stock: stock ? parseInt(stock) : 0,
        expiry_date,
        pack_size,
        batch_number,
        mfg_date,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating product in Supabase:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create product',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error: unknown) {
    console.error('Error creating product:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create product'
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
