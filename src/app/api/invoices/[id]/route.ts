import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRetailerOrAdmin } from '@/lib/api-security'

// Service role client for bypassing RLS (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cfthxtnwuhvhhnifshsr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface PatchInvoiceItemInput {
  product_id?: string | null
  product_name: string
  hsn_code?: string | null
  quantity: number
  unit: string
  rate_per_unit: number
  gst_percentage?: number | null
  gst_amount?: number | null
  total_with_tax?: number | null
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  mrp?: number | string | null
  manufacturer?: string | null
}

interface PatchBody {
  invoice_date?: string
  due_date?: string
  delivery_date?: string | null
  order_number?: string | null
  order_date?: string | null
  payment_terms?: string | null
  notes?: string | null
  items: PatchInvoiceItemInput[]
}

interface InvoiceItemRow {
  id: string
  product_name: string
  quantity: number
  rate_per_unit: number | null
  total_with_tax: number | null
  pack_size?: string | null
  batch_number?: string | null
  mfg_date?: string | null
  expiry_date?: string | null
  mrp?: number | string | null
  manufacturer?: string | null
}

// Create service role client (bypasses RLS) - only for server-side use
function createServiceClient() {
  if (!supabaseServiceKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set, falling back to regular client')
    return null
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// PATCH /api/invoices/[id] - Update an existing invoice and its items
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user, error: authError } = await verifyRetailerOrAdmin(request)
    if (authError || !user) {
      return authError ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerClient()
    const { id } = params

    const body = (await request.json()) as PatchBody
    const {
      invoice_date,
      due_date,
      delivery_date,
      order_number,
      order_date,
      payment_terms,
      notes,
      items
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    const { data: existingInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (user.role !== 'SUPER_ADMIN' && existingInvoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Calculate totals
    let subtotal = 0
    let totalGst = 0
    let grandTotal = 0

    items.forEach(item => {
      const amountBeforeTax = Number(item.quantity || 0) * Number(item.rate_per_unit || 0)
      const gstPercentage = Number(item.gst_percentage ?? 5)
      const gstAmount = amountBeforeTax * (gstPercentage / 100)
      const totalWithTax = amountBeforeTax + gstAmount

      subtotal += amountBeforeTax
      totalGst += gstAmount
      grandTotal += totalWithTax
    })

    // Replace existing invoice items
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    const invoiceItems = items.map(item => ({
      invoice_id: id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      hsn_code: item.hsn_code || '30049',
      quantity: item.quantity,
      unit: item.unit,
      rate_per_unit: item.rate_per_unit,
      amount_before_tax: Number(item.quantity || 0) * Number(item.rate_per_unit || 0),
      gst_percentage: item.gst_percentage ?? 5,
      gst_amount: Number(item.gst_amount ?? 0) || (Number(item.quantity || 0) * Number(item.rate_per_unit || 0)) * ((Number(item.gst_percentage ?? 5)) / 100),
      total_with_tax: Number(item.total_with_tax ?? 0) || (Number(item.quantity || 0) * Number(item.rate_per_unit || 0)) * (1 + (Number(item.gst_percentage ?? 5) / 100)),
      pack_size: item.pack_size || null,
      batch_number: item.batch_number || null,
      expiry_date: item.expiry_date || null,
      mfg_date: item.mfg_date || null,
      mrp: item.mrp || null,
      manufacturer: item.manufacturer || null
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) {
      // Attempt to restore original items from history is complex; surface error for manual retry
      return NextResponse.json({ error: itemsError.message }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        invoice_date,
        due_date,
        delivery_date,
        order_number,
        order_date,
        payment_terms: payment_terms || 'NET 30 DAYS',
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotal,
        notes,
        status_updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    const { data: completeInvoice, error: fetchUpdatedError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (* )
      `)
      .eq('id', id)
      .single()

    if (fetchUpdatedError) {
      return NextResponse.json({ error: fetchUpdatedError.message }, { status: 400 })
    }

    return NextResponse.json({ invoice: completeInvoice })
  } catch (error: unknown) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/invoices/[id] - Get single invoice (PUBLIC ACCESS for sharing)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params

    const serviceClient = createServiceClient()
    const publicClient = await createServerClient()
    const supabase = serviceClient ?? publicClient

    console.log('🔍 Fetching invoice from Supabase, ID:', id, serviceClient ? '(service client)' : '(public client)')
    
    // For public access, we need to ensure RLS policies allow viewing
    // The policy should allow public SELECT by ID (see add_public_invoice_sharing_policy.sql)

    // Get invoice with all items and customer profile (PUBLIC - no auth required for sharing)
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          id,
          product_name,
          quantity,
          rate_per_unit,
          total_with_tax,
          pack_size,
          batch_number,
          expiry_date,
          mfg_date,
          mrp,
          manufacturer
        ),
        customer_profile:profiles!customer_id (
          id,
          user_name,
          business_name,
          business_type,
          address,
          city,
          state,
          pincode,
          gst_number,
          phone,
          aadhar_number,
          pan_number,
          fssai_license,
          business_registration,
          bank_account_number,
          bank_ifsc_code,
          bank_name
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if ((error || !invoice) && serviceClient) {
      console.warn('⚠️ Service client query failed, retrying with public client...', {
        error: error?.message,
        code: error?.code
      })
      const { data: fallbackInvoice, error: fallbackError } = await publicClient
        .from('invoices')
        .select(`
          *,
          invoice_items (
            id,
            product_name,
            quantity,
            rate_per_unit,
            total_with_tax,
            pack_size,
            batch_number,
            expiry_date,
            mfg_date,
            mrp,
            manufacturer
          ),
          customer_profile:profiles!customer_id (
            id,
            user_name,
            business_name,
            business_type,
            address,
            city,
            state,
            pincode,
            gst_number,
            phone,
            aadhar_number,
            pan_number,
            fssai_license,
            business_registration,
            bank_account_number,
            bank_ifsc_code,
            bank_name
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (!fallbackError && fallbackInvoice) {
        return NextResponse.json({ invoice: fallbackInvoice })
      }

      // overwrite error/invoice for downstream handling
      if (fallbackError) {
        console.error('❌ Fallback (public client) also failed:', {
          error: fallbackError?.message,
          code: fallbackError?.code
        })
      }
    }

    if (error || !invoice) {
      // Log detailed error for debugging
      console.error('❌ Invoice fetch error:', {
        error: error?.message || 'No data',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        invoiceId: id,
        possibleCause: error?.code === 'PGRST301' || error?.code === '42501' 
          ? 'RLS policy blocking access - run add_public_invoice_sharing_policy.sql in Supabase'
          : error?.code === 'PGRST116' 
          ? 'Invoice does not exist in database'
          : 'Unknown error'
      })
      
      // Return helpful error message with actionable guidance
      const errorMessage = error?.code === 'PGRST301' || error?.code === '42501'
        ? `Invoice exists but access is restricted. Please run 'add_public_invoice_sharing_policy.sql' in Supabase SQL Editor to enable public sharing.`
        : error?.code === 'PGRST116'
        ? `Invoice with ID "${id}" does not exist in the database.`
        : `Invoice with ID "${id}" could not be found. Error: ${error?.message || 'Unknown error'}`
      
      return NextResponse.json(
        { 
          error: 'Invoice not found',
          message: errorMessage,
          invoiceId: id,
          errorCode: error?.code,
          help: error?.code === 'PGRST301' || error?.code === '42501' 
            ? 'See add_public_invoice_sharing_policy.sql file in project root'
            : undefined
        },
        { status: 404 }
      )
    }

    console.log('✅ Invoice found:', invoice.invoice_number)
    console.log('📋 Customer profile data:', {
      hasCustomerProfile: !!invoice.customer_profile,
      customerProfile: invoice.customer_profile,
      customerId: invoice.customer_id
    })

    // Transform invoice items to match expected format
    let invoiceItems = (invoice.invoice_items || []) as InvoiceItemRow[]
    
    if (invoiceItems.length > 0) {
      invoiceItems = invoiceItems.map(item => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        rate_per_unit: item.rate_per_unit ?? 0,
        total_with_tax: item.total_with_tax ?? (item.quantity * (item.rate_per_unit ?? 0) * 1.05),
        // Optional fields that may not exist in DB
        pack_size: item.pack_size ?? null,
        batch_number: item.batch_number ?? null,
        mfg_date: item.mfg_date ?? null,
        expiry_date: item.expiry_date ?? null,
        mrp: item.mrp ?? null,
        manufacturer: item.manufacturer ?? null,
      }))
    }

    // Transform invoice to match expected format
    // PERMANENT FIX: Priority order for customer data:
    // 1. customer_data JSON field (stored with invoice - most reliable)
    // 2. customer_profile from join
    // 3. Direct fetch with service client
    
    let customerData = invoice.customer_data || invoice.customer_profile || null
    
    // If still no customer data but customer_id exists, fetch it directly
    if (!customerData && invoice.customer_id) {
      console.log('⚠️ Customer profile not in join, fetching directly with service client...', invoice.customer_id)
      
      // Try with service role client first (bypasses RLS)
      if (serviceClient) {
        try {
          const { data: profileData, error: profileError } = await serviceClient
            .from('profiles')
            .select(`
              id,
              user_name,
              business_name,
              business_type,
              address,
              city,
              state,
              pincode,
              gst_number,
              phone,
              aadhar_number,
              pan_number,
              fssai_license,
              business_registration,
              bank_account_number,
              bank_ifsc_code,
              bank_name
            `)
            .eq('id', invoice.customer_id)
            .single()
          
          if (profileError) {
            console.error('❌ Error fetching customer profile with service client:', profileError)
            // Fallback to regular client
            const { data: fallbackData, error: fallbackError } = await publicClient
              .from('profiles')
              .select(`
                id,
                user_name,
                business_name,
                business_type,
                address,
                city,
                state,
                pincode,
                gst_number,
                phone,
                aadhar_number,
                pan_number,
                fssai_license,
                business_registration,
                bank_account_number,
                bank_ifsc_code,
                bank_name
              `)
              .eq('id', invoice.customer_id)
              .single()
            
            if (!fallbackError && fallbackData) {
              customerData = fallbackData
              console.log('✅ Customer data fetched with regular client (fallback):', fallbackData.user_name || fallbackData.business_name)
            }
          } else if (profileData) {
            customerData = profileData
            console.log('✅ Customer data fetched with service client:', profileData.user_name || profileData.business_name)
          }
        } catch (err) {
          console.error('❌ Exception fetching customer profile with service client:', err)
          // Try regular client as last resort
          try {
            const { data: fallbackData } = await publicClient
              .from('profiles')
              .select('*')
              .eq('id', invoice.customer_id)
              .single()
            if (fallbackData) {
              customerData = fallbackData
              console.log('✅ Customer data fetched with regular client (last resort):', fallbackData.user_name || fallbackData.business_name)
            }
          } catch (finalErr) {
            console.error('❌ Final fallback also failed:', finalErr)
          }
        }
      } else {
        // Service client not available, try with regular client
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`
              id,
              user_name,
              business_name,
              business_type,
              address,
              city,
              state,
              pincode,
              gst_number,
              phone,
              aadhar_number,
              pan_number,
              fssai_license,
              business_registration,
              bank_account_number,
              bank_ifsc_code,
              bank_name
            `)
            .eq('id', invoice.customer_id)
            .single()
          
          if (profileError) {
            console.error('❌ Error fetching customer profile:', profileError)
          } else if (profileData) {
            customerData = profileData
            console.log('✅ Customer data fetched with regular client:', profileData.user_name || profileData.business_name)
          }
        } catch (err) {
          console.error('❌ Exception fetching customer profile:', err)
        }
      }
    }
    
    if (customerData) {
      console.log('✅ Customer data available:', {
        user_name: customerData.user_name,
        business_name: customerData.business_name,
        business_type: customerData.business_type,
        phone: customerData.phone,
        gst_number: customerData.gst_number,
        pan_number: customerData.pan_number,
        aadhar_number: customerData.aadhar_number,
        allFields: Object.keys(customerData)
      })
    } else {
      console.warn('⚠️ No customer profile data found for invoice:', {
        invoiceNumber: invoice.invoice_number,
        customerId: invoice.customer_id
      })
    }
    
    const formattedInvoice = {
      ...invoice,
      invoice_items: invoiceItems,
      customer: customerData
    }
    
    // Remove customer_profile key (we use customer instead)
    delete formattedInvoice.customer_profile
    
    console.log('📤 Sending invoice response with customer:', {
      hasCustomer: !!formattedInvoice.customer,
      customerFields: formattedInvoice.customer ? Object.keys(formattedInvoice.customer) : []
    })

    return NextResponse.json({
      success: true,
      invoice: formattedInvoice
    })
  } catch (error: unknown) {
    console.error('❌ Error fetching invoice:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to fetch invoice'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message
      },
      { status: 500 }
    )
  }
}

