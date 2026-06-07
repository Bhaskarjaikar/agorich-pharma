import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { approvalManager } from '@/lib/approval/approval-manager'
import { checkEmergencyStatus, createEmergencyBlockResponse } from '@/lib/middleware/emergency-check'
import { timingSafeEqual } from 'crypto'

function secureCompare(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

interface ApplyDiscountRequest {
  product_id: string
  batch_id?: string
  percentage: number
  reason?: string
  force_apply?: boolean
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const emergencyCheck = await checkEmergencyStatus('/api/agent-connect/apply-discount')
    if (!emergencyCheck.allowed) {
      return createEmergencyBlockResponse(emergencyCheck)
    }

    const apiKey = request.headers.get('x-agent-api-key')
    if (!secureCompare(apiKey, process.env.AGENT_API_KEY)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    const body: ApplyDiscountRequest = await request.json()

    if (!body.product_id || !body.percentage) {
      return NextResponse.json(
        { success: false, error: 'product_id and percentage are required' },
        { status: 400 }
      )
    }

    if (body.percentage < 0 || body.percentage > 100) {
      return NextResponse.json(
        { success: false, error: 'percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, mrp, ptr, pts')
      .eq('id', body.product_id)
      .single()

    if (productError || !product) {
      console.error('Error fetching product:', productError)
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const discountMultiplier = 1 - body.percentage / 100
    const newPtr = product.ptr ? product.ptr * discountMultiplier : null
    const newPts = product.pts ? product.pts * discountMultiplier : null

    const thresholdCheck = approvalManager.requiresApproval('apply_discount', {
      // @ts-ignore
      product_id: body.product_id,
      // @ts-ignore
      product_name: product.name,
      // @ts-ignore
      percentage: body.percentage,
      // @ts-ignore
      original_ptr: product.ptr,
      // @ts-ignore
      new_ptr: newPtr,
      // @ts-ignore
      original_pts: product.pts,
      // @ts-ignore
      new_pts: newPts,
      // @ts-ignore
      reason: body.reason
    })

    if (thresholdCheck.requiresApproval && !body.force_apply) {
      const approvalResult = await approvalManager.submitForApproval(
        'apply_discount',
        {
          // @ts-ignore
          product_id: body.product_id,
          // @ts-ignore
          product_name: product.name,
          // @ts-ignore
          percentage: body.percentage,
          // @ts-ignore
          original_ptr: product.ptr,
          // @ts-ignore
          new_ptr: newPtr,
          // @ts-ignore
          original_pts: product.pts,
          // @ts-ignore
          new_pts: newPts,
          // @ts-ignore
          reason: body.reason
        },
        'AI_Agent'
      )

      if (approvalResult.success) {
        return NextResponse.json({
          success: true,
          requiresApproval: true,
          approvalId: approvalResult.approvalId,
          message: thresholdCheck.message || 'Discount requires approval. Queued for review.',
          threshold: {
            type: thresholdCheck.thresholdType,
            exceededAmount: thresholdCheck.exceededAmount,
            allowed: 15,
            requested: body.percentage
          },
          data: {
            product_id: product.id,
            product_name: product.name,
            original_ptr: product.ptr,
            new_ptr: newPtr,
            original_pts: product.pts,
            new_pts: newPts
          }
        })
      } else {
        return NextResponse.json(
          { success: false, error: approvalResult.message },
          { status: 500 }
        )
      }
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        ptr: newPtr,
        pts: newPts
      })
      .eq('id', body.product_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error applying discount:', updateError)
      return NextResponse.json(
        { success: false, error: `Failed to apply discount: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Discount of ${body.percentage}% applied successfully`,
      requiresApproval: false,
      data: {
        product_id: updatedProduct.id,
        product_name: updatedProduct.name,
        original_ptr: product.ptr,
        new_ptr: updatedProduct.ptr,
        original_pts: product.pts,
        new_pts: updatedProduct.pts
      }
    })

  } catch (error) {
    console.error('Error in POST /api/agent-connect/apply-discount:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
