import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { 
  getCached, 
  setCache, 
  buildInventoryCacheKey,
  getCacheTTL 
} from '@/lib/redis'

interface DistributorInventoryProduct {
  id: string
  name: string
  category: string
  manufacturer: string
  pack_size: string
  batch_number: string
  expiry_date: string
  mfg_date: string
  mrp: number
  distributor_price: number
  retailer_price: number
  agorich_price: number
  margin: number
  stock: number
  distributor_stock: number
  last_updated: string
  status: string
}

interface CachedInventoryResponse {
  success: boolean
  products: DistributorInventoryProduct[]
  distributor: {
    id: string
    business_name: string
  }
  meta: {
    total_products: number
    distributor_id: string
    is_mock_data: boolean
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const distributorId = searchParams.get('distributor_id')

    if (!distributorId) {
      return NextResponse.json(
        { success: false, error: 'distributor_id is required' },
        { status: 400 }
      )
    }

    const cacheKey = buildInventoryCacheKey(distributorId)
    const cachedResponse = await getCached<CachedInventoryResponse>(cacheKey)
    
    if (cachedResponse?.data) {
      return NextResponse.json({
        ...cachedResponse.data,
        meta: {
          ...cachedResponse.data.meta,
          cached: true,
          cacheKey
        }
      }, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300'
        }
      })
    }

    const { data: distributor } = await supabase
      .from('profiles')
      .select('id, business_name, is_delisted')
      .eq('id', distributorId)
      .eq('role', 'DISTRIBUTOR')
      .single()

    if (!distributor) {
      return NextResponse.json(
        { success: false, error: 'Distributor not found' },
        { status: 404 }
      )
    }

    if (distributor.is_delisted) {
      return NextResponse.json(
        { success: false, error: 'This distributor is currently not accepting orders' },
        { status: 403 }
      )
    }

    const { data: inventory, error: inventoryError } = await supabase
      .from('distributor_inventory')
      .select(`
        id,
        quantity,
        last_updated,
        product:product_id(
          id,
          name,
          category,
          manufacturer,
          pack_size,
          batch_number,
          expiry_date,
          mfg_date,
          mrp,
          distributor_price,
          retailer_price,
          agorich_price,
          margin,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('distributor_id', distributorId)
      .gt('quantity', 0)

    if (inventoryError) {
      console.error('Error fetching distributor inventory:', inventoryError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch distributor inventory' },
        { status: 500 }
      )
    }

    type ProductRow = {
      id: any
      name: any
      category: any
      manufacturer: any
      pack_size: any
      batch_number: any
      expiry_date: any
      mfg_date: any
      mrp: any
      distributor_price: any
      retailer_price: any
      agorich_price: any
      margin: any
      status: any
      created_at: any
      updated_at: any
    }

    type InventoryItem = {
      id: string
      quantity: number
      last_updated: string
      product: ProductRow | ProductRow[] | null
    }

    const products = (inventory as InventoryItem[] || [])
      .filter((item: InventoryItem) => item.product && (Array.isArray(item.product) ? item.product[0]?.status : (item.product as ProductRow).status) === 'ACTIVE')
      .map((item: InventoryItem) => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product as ProductRow
        if (!product) return null
        return {
          id: product.id,
          name: product.name,
          category: product.category || '',
          manufacturer: product.manufacturer || '',
          pack_size: product.pack_size || '',
          batch_number: product.batch_number || '',
          expiry_date: product.expiry_date || '',
          mfg_date: product.mfg_date || '',
          mrp: parseFloat(product.mrp) || 0,
          distributor_price: parseFloat(product.distributor_price) || 0,
          retailer_price: parseFloat(product.retailer_price) || 0,
          agorich_price: parseFloat(product.agorich_price) || 0,
          margin: parseFloat(product.margin) || 0,
          stock: item.quantity,
          distributor_stock: item.quantity,
          last_updated: item.last_updated,
          status: product.status
        }
      }).filter(Boolean)

    const finalProducts = products.length > 0 ? products : [
      {
        id: 'mock-product-1',
        name: 'Paracetamol 500mg',
        category: 'Pain Relief',
        manufacturer: 'Cipla',
        pack_size: '10 Tablets',
        batch_number: 'BATCH001',
        expiry_date: '2026-12-31',
        mfg_date: '2024-01-01',
        mrp: 50,
        distributor_price: 35,
        retailer_price: 40,
        agorich_price: 38,
        margin: 5,
        stock: 100,
        distributor_stock: 100,
        last_updated: new Date().toISOString(),
        status: 'ACTIVE'
      },
      {
        id: 'mock-product-2',
        name: 'Azithromycin 500mg',
        category: 'Antibiotic',
        manufacturer: 'Sun Pharma',
        pack_size: '3 Tablets',
        batch_number: 'BATCH002',
        expiry_date: '2026-06-30',
        mfg_date: '2024-01-01',
        mrp: 120,
        distributor_price: 85,
        retailer_price: 95,
        agorich_price: 90,
        margin: 10,
        stock: 50,
        distributor_stock: 50,
        last_updated: new Date().toISOString(),
        status: 'ACTIVE'
      },
      {
        id: 'mock-product-3',
        name: 'Crocin Advance 500mg',
        category: 'Fever',
        manufacturer: 'GSK',
        pack_size: '20 Tablets',
        batch_number: 'BATCH003',
        expiry_date: '2027-03-31',
        mfg_date: '2024-06-01',
        mrp: 80,
        distributor_price: 55,
        retailer_price: 65,
        agorich_price: 60,
        margin: 10,
        stock: 75,
        distributor_stock: 75,
        last_updated: new Date().toISOString(),
        status: 'ACTIVE'
      },
      {
        id: 'mock-product-4',
        name: 'Dolo 650mg',
        category: 'Fever & Pain',
        manufacturer: 'Micro Labs',
        pack_size: '15 Tablets',
        batch_number: 'BATCH004',
        expiry_date: '2026-09-30',
        mfg_date: '2024-03-01',
        mrp: 30,
        distributor_price: 20,
        retailer_price: 25,
        agorich_price: 23,
        margin: 5,
        stock: 200,
        distributor_stock: 200,
        last_updated: new Date().toISOString(),
        status: 'ACTIVE'
      },
      {
        id: 'mock-product-5',
        name: 'Shelcal 500mg',
        category: 'Vitamins',
        manufacturer: 'Mankind',
        pack_size: '30 Tablets',
        batch_number: 'BATCH005',
        expiry_date: '2026-12-31',
        mfg_date: '2024-02-01',
        mrp: 180,
        distributor_price: 125,
        retailer_price: 145,
        agorich_price: 135,
        margin: 20,
        stock: 40,
        distributor_stock: 40,
        last_updated: new Date().toISOString(),
        status: 'ACTIVE'
      }
    ]

    const response: CachedInventoryResponse = {
      success: true,
      products: finalProducts,
      distributor: {
        id: distributor.id,
        business_name: distributor.business_name
      },
      meta: {
        total_products: finalProducts.length,
        distributor_id: distributorId,
        is_mock_data: products.length === 0
      }
    }

    await setCache(cacheKey, response, { ttl: getCacheTTL() })

    return NextResponse.json({
      ...response,
      meta: {
        ...response.meta,
        cached: false,
        cacheKey
      }
    }, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      }
    })

  } catch (error) {
    console.error('Error in distributor inventory API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}