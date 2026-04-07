import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/api-security'

interface ImportErrorInfo {
  product: string
  error: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only admins can import
    const { user, error: authError } = await verifyAuth(request)
    if (authError) {
      return authError
    }

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Admin access required',
        },
        { status: 403 }
      )
    }

    const supabase = await createServerClient()
    const body = await request.json()
    const { products } = body

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Products array is required and must not be empty',
        },
        { status: 400 }
      )
    }

    const imported: unknown[] = []
    const failed: unknown[] = []
    const errors: ImportErrorInfo[] = []

    // Bulk import products to Supabase
    for (const product of products) {
      try {
        const productData = {
          name: product.title || product.name || '',
          category: product.category || null,
          manufacturer: product.manufacturer || null,
          mrp: product.mrp ? parseFloat(product.mrp) : null,
          agorich_price: product.agorich_price ? parseFloat(product.agorich_price) : null,
          retailer_price: product.retailer_price ? parseFloat(product.retailer_price) : null,
          margin: product.margin ? parseFloat(product.margin) : null,
          stock: product.stock ? parseInt(product.stock) : 0,
          expiry_date: product.expiry_date || null,
          pack_size: product.pack_size || null,
          batch_number: product.batch_number || null,
          mfg_date: product.mfg_date || null,
          status: product.status || 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single()

        if (error) {
          throw error
        }

        imported.push(data as unknown)
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Error creating product:', {
          product: product.title || product.name,
          error: message,
        })
        failed.push(product)
        errors.push({
          product: product.title || product.name || 'Unknown',
          error: message,
        })
      }
    }

    return NextResponse.json({
      success: imported.length > 0,
      imported: imported.length,
      failed: failed.length,
      errors,
    })
  } catch (error: unknown) {
    console.error('Error importing products:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to import products'
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
