import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/api-security'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

type ProfileRow = {
  id: string
  user_name: string | null
  business_name: string | null
  phone: string | null
  phone_number: string | null
  whatsapp_phone?: string | null
  city: string | null
  state: string | null
  address: string | null
  email?: string | null
  created_at: string | null
}

type InvoiceRow = {
  id: string
  invoice_number: string | null
  grand_total: number | null
  payment_amount: number | null
  payment_method: string | null
  status: string | null
  due_date: string | null
  created_at: string | null
  whatsapp_sent_at?: string | null
}

type PaymentRow = {
  invoice_id: string
  amount: number | null
  payment_method: string | null
  received_at: string | null
}

function buildPhoneVariants(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const variants = new Set<string>()
  if (raw) variants.add(raw)
  if (digits) {
    variants.add(digits)
    if (digits.startsWith('91') && digits.length === 12) {
      variants.add(`+${digits}`)
      variants.add(digits.slice(2))
    } else if (digits.length === 10) {
      variants.add(`91${digits}`)
      variants.add(`+91${digits}`)
    }
  }
  return Array.from(variants).filter(Boolean)
}

async function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (supabaseUrl && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return createServerClient()
}

function buildRevenueSeries(invoices: InvoiceRow[], now = new Date()) {
  const start = new Date(now)
  start.setMonth(start.getMonth() - 5)

  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
  const months: string[] = []
  const revenueMap: Record<string, { revenue: number; orders: number }> = {}

  const iter = new Date(start)
  while (iter <= now) {
    const key = formatter.format(iter)
    months.push(key)
    revenueMap[key] = { revenue: 0, orders: 0 }
    iter.setMonth(iter.getMonth() + 1)
  }

  invoices.forEach((invoice) => {
    if (!invoice.created_at) return
    const created = new Date(invoice.created_at)
    if (created > now) return
    const key = formatter.format(created)
    if (!revenueMap[key]) return
    revenueMap[key].revenue += Number(invoice.grand_total || 0)
    revenueMap[key].orders += 1
  })

  return months.map((month) => ({
    month,
    revenue: Math.round(revenueMap[month].revenue),
    orders: revenueMap[month].orders,
  }))
}

function formatNumber(amount: number) {
  return Math.round(amount)
}

function sanitizeForDial(raw: string | null | undefined) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`
  }
  if (digits.length === 10) {
    return `+91${digits}`
  }
  if (raw.startsWith('+')) return raw
  return `+${digits}`
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ identifier: string }> }
) {
  try {
    const params = await context.params
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const identifier = decodeURIComponent(params?.identifier ?? '').trim()
    if (!identifier) {
      return NextResponse.json({ error: 'Identifier is required' }, { status: 400 })
    }

    const searchParams = new URL(request.url).searchParams
    const searchBy = (searchParams.get('by') || 'id').toLowerCase()

    const supabase = await getSupabaseAdminClient()

    let profileQuery = supabase
      .from('profiles')
      .select('id, user_name, business_name, phone, phone_number, whatsapp_phone, city, state, address, email, created_at')
      .limit(1)

    if (searchBy === 'phone') {
      const variants = buildPhoneVariants(identifier)
      if (variants.length === 0) {
        return NextResponse.json({ error: 'Phone number not provided' }, { status: 400 })
      }
      const orFilters = variants
        .map((value) => [
          `phone.eq.${value}`,
          `phone_number.eq.${value}`,
          `whatsapp_phone.eq.${value}`,
        ])
        .flat()
        .join(',')
      profileQuery = profileQuery.or(orFilters)
    } else if (searchBy === 'name') {
      const sanitizedIdentifier = identifier
        .trim()
        .slice(0, 100)
        .replace(/[%_\\]/g, (match) => `\\${match}`)
      profileQuery = profileQuery.or(
        `business_name.ilike.%${sanitizedIdentifier}%,user_name.ilike.%${sanitizedIdentifier}%`
      )
    } else {
      profileQuery = profileQuery.eq('id', identifier)
    }

    const { data: profileRows, error: profileError } = await profileQuery
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    const profile = (profileRows || [])[0] as ProfileRow | undefined
    if (!profile) {
      return NextResponse.json({ error: 'Retailer not found' }, { status: 404 })
    }

    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, grand_total, payment_amount, payment_method, status, due_date, created_at, whatsapp_sent_at')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false })

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 400 })
    }

    const invoiceRows = (invoices || []) as InvoiceRow[]
    const invoiceIds = invoiceRows.map((inv) => inv.id).filter(Boolean)

    const paymentsMap: Record<string, PaymentRow[]> = {}
    if (invoiceIds.length > 0) {
      const { data: paymentRows, error: paymentError } = await supabase
        .from('invoice_payments')
        .select('invoice_id, amount, payment_method, received_at')
        .in('invoice_id', invoiceIds)

      if (paymentError) {
        return NextResponse.json({ error: paymentError.message }, { status: 400 })
      }

      ;(paymentRows || []).forEach((row) => {
        if (!row.invoice_id) return
        paymentsMap[row.invoice_id] = paymentsMap[row.invoice_id] || []
        paymentsMap[row.invoice_id].push(row as PaymentRow)
      })
    }

    let totalRevenue = 0
    let totalPaid = 0
    let totalOutstanding = 0

    const invoiceSummaries = invoiceRows.map((invoice) => {
      const grandTotal = Number(invoice.grand_total || 0)
      const payments = paymentsMap[invoice.id] || []
      const paidFromPayments = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      const paidFromInvoice = Number(invoice.payment_amount || 0)
      const paidAmount = Math.max(paidFromPayments, paidFromInvoice)
      const outstanding = Math.max(0, grandTotal - paidAmount)

      totalRevenue += grandTotal
      totalPaid += paidAmount
      totalOutstanding += outstanding

      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number || invoice.id,
        status: invoice.status,
        grand_total: formatNumber(grandTotal),
        paid_amount: formatNumber(paidAmount),
        outstanding_amount: formatNumber(outstanding),
        due_date: invoice.due_date,
        created_at: invoice.created_at,
        payment_method: invoice.payment_method,
        last_payment_method: payments[0]?.payment_method || invoice.payment_method,
        last_payment_received_at: payments[0]?.received_at || null,
      }
    })

    const revenueData = buildRevenueSeries(invoiceRows)

    const kpis = {
      totalOrders: invoiceRows.length,
      totalRevenue: formatNumber(totalRevenue),
      outstanding: formatNumber(totalOutstanding),
      paid: formatNumber(totalPaid),
      avgOrderValue: invoiceRows.length > 0 ? formatNumber(totalRevenue / invoiceRows.length) : 0,
      earnings: formatNumber(totalPaid),
    }

    const primaryPhone = profile.phone || profile.phone_number || null
    const whatsappPhone = profile.whatsapp_phone || primaryPhone

    return NextResponse.json({
      profile: {
        id: profile.id,
        user_name: profile.user_name,
        business_name: profile.business_name,
        phone: primaryPhone,
        whatsapp_phone: whatsappPhone,
        city: profile.city,
        state: profile.state,
        address: profile.address,
        email: profile.email,
        created_at: profile.created_at,
        dial_number: sanitizeForDial(primaryPhone),
        dial_whatsapp: sanitizeForDial(whatsappPhone),
      },
      kpis,
      revenueData,
      invoices: invoiceSummaries,
    })
  } catch (err: unknown) {
    console.error('Error in admin cash lookup:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


