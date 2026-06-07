import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'

const sanitizeString = (str: string | null | undefined, maxLength: number = 500): string => {
  if (!str) return ''
  return String(str).trim().slice(0, maxLength)
}

const sanitizeNumeric = (value: unknown, fallback: number = 0, decimals: number = 2): number => {
  if (value === null || value === undefined) return fallback
  const num = Number(value)
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

const sanitizeProductData = (product: Record<string, unknown>) => {
  return {
    id: sanitizeString(product.id as string),
    name: sanitizeString(product.name as string, 500),
    category: sanitizeString(product.category as string, 100),
    manufacturer: sanitizeString(product.manufacturer as string, 300),
    mrp: sanitizeNumeric(product.mrp, 0),
    stock: Math.floor(sanitizeNumeric(product.stock, 0, 0)),
    pack_size: sanitizeString(product.pack_size as string, 50),
    expiry_date: sanitizeString(product.expiry_date as string, 20),
    batch_number: sanitizeString(product.batch_number as string, 50),
    mfg_date: sanitizeString(product.mfg_date as string, 20),
    agorich_price: sanitizeNumeric(product.agorich_price, 0),
    distributor_price: sanitizeNumeric(product.distributor_price, 0),
    retailer_price: sanitizeNumeric(product.retailer_price, 0),
    margin: sanitizeNumeric(product.margin, 0),
    status: product.status === 'ACTIVE' || product.status === 'INACTIVE' ? product.status : 'ACTIVE',
    created_at: sanitizeString(product.created_at as string, 30),
    updated_at: sanitizeString(product.updated_at as string, 30),
  }
}

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
    const limitStr = searchParams.get('limit')
    const offsetStr = searchParams.get('offset')

    const limit = Math.min(Math.max(parseInt(limitStr || '100', 10) || 100, 1), 500)
    const offset = Math.max(parseInt(offsetStr || '0', 10) || 0, 0)

    const MAX_SEARCH_LENGTH = 100
    const MIN_SEARCH_LENGTH = 2

    let query = supabase
      .from('products')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      const sanitizedSearch = search
        .trim()
        .slice(0, MAX_SEARCH_LENGTH)
        .replace(/[%_\\]/g, (match) => `\\${match}`)

      if (sanitizedSearch.length >= MIN_SEARCH_LENGTH) {
        query = query.or(`name.ilike.%${sanitizedSearch}%,manufacturer.ilike.%${sanitizedSearch}%,category.ilike.%${sanitizedSearch}%`)
      }
    }

    if (category) {
      query = query.eq('category', sanitizeString(category, 100))
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

    const sanitizedProducts = Array.isArray(products)
      ? products.map(p => sanitizeProductData(p as Record<string, unknown>))
      : []

    return NextResponse.json({
      success: true,
      products: sanitizedProducts,
      pageInfo: {
        hasNextPage: sanitizedProducts.length >= limit,
        endCursor: offset + sanitizedProducts.length,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching products:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch products'
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
