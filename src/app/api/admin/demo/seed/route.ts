import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface SeedInvoiceItem {
  product_id: string
  product_name: string
  hsn_code: string
  quantity: number
  unit: string
  rate_per_unit: number
  amount_before_tax: number
  gst_percentage: number
  gst_amount: number
  total_with_tax: number
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const N_RETAILERS_DEFAULT = 8
const N_PRODUCTS_DEFAULT = 15

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profErr || !profile || profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const nRetailers = parseInt(searchParams.get('retailers') || String(N_RETAILERS_DEFAULT))
    const nProducts = parseInt(searchParams.get('products') || String(N_PRODUCTS_DEFAULT))

    // Seed products if none
    const { data: existingProducts } = await supabase.from('products').select('id').limit(1)
    if (!existingProducts || existingProducts.length === 0) {
      const productNames = [
        'Paracetamol 500mg', 'Azithromycin 250mg', 'Amoxicillin 500mg', 'Cetrizine 10mg', 'Diclofenac 50mg',
        'Pantoprazole 40mg', 'Omeprazole 20mg', 'Metformin 500mg', 'Atorvastatin 10mg', 'Ibuprofen 200mg',
        'Vitamin C 500mg', 'Calcium D3', 'ORS Powder', 'Liver Tonic', 'Cough Syrup'
      ]
      const toInsert = productNames.slice(0, nProducts).map((name, i) => {
        const mrp = randomInt(50, 500)
        const ag = Math.max(10, Math.floor(mrp * 0.65))
        return {
          name,
          category: null,
          manufacturer: 'Agorich Labs',
          mrp,
          agorich_price: ag,
          retailer_price: ag,
          margin: Math.round(((mrp - ag) / mrp) * 1000) / 10,
          stock: randomInt(50, 500),
          expiry_date: '2026-12-01',
          pack_size: '10 tablets',
          batch_number: `BATCH-${1000 + i}`,
          mfg_date: '2024-01-01',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })
      await supabase.from('products').insert(toInsert)
    }

    // Create demo retailers (profiles with RETAILER role)
    const { data: existingRetailers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'RETAILER')
      .limit(1)

    let createdRetailerIds: string[] = []
    if (!existingRetailers || existingRetailers.length === 0) {
      const cities = ['Patna', 'Gaya', 'Muzaffarpur', 'Darbhanga', 'Bhagalpur', 'Purnia']
      const states = ['Bihar']
      const toInsert = Array.from({ length: nRetailers }).map((_, i) => ({
        // Use random UUID-like strings to avoid conflicts if not using auth users
        id: crypto.randomUUID(),
        user_name: `retailer${i + 1}`,
        business_name: `Demo Medical Store ${i + 1}`,
        phone: `9${randomInt(100000000, 999999999)}`,
        address: `Street ${randomInt(1, 50)}, Area ${randomInt(1, 20)}`,
        city: cities[i % cities.length],
        state: states[0],
        pincode: `${randomInt(800001, 800099)}`,
        profile_photo: null,
        role: 'RETAILER',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      const { data: inserted, error: insErr } = await supabase.from('profiles').insert(toInsert).select('id')
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
      createdRetailerIds = (inserted || []).map(r => r.id as string)
    } else {
      // If retailers already exist, use top N for seeding invoices
      const { data: retailerList } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'RETAILER')
        .limit(nRetailers)
      createdRetailerIds = (retailerList || []).map(r => r.id as string)
    }

    // Fetch products for invoice items
    const { data: products } = await supabase.from('products').select('id, name, agorich_price, mrp').limit(nProducts)

    // Seed invoices + items per retailer
    let invoicesCreated = 0
    for (const rid of createdRetailerIds) {
      const nInvoices = randomInt(3, 8)
      for (let k = 0; k < nInvoices; k++) {
        const createdAt = new Date()
        createdAt.setDate(createdAt.getDate() - randomInt(0, 90))
        const dueDate = new Date(createdAt)
        dueDate.setDate(dueDate.getDate() + randomInt(7, 30))

        // generate items
        const nItems = randomInt(2, 6)
        let subtotal = 0
        let totalGst = 0
        const items: SeedInvoiceItem[] = []
        for (let x = 0; x < nItems; x++) {
          const p = products![randomInt(0, Math.max(0, (products?.length || 1) - 1))]
          const qty = randomInt(1, 10)
          const rate = Math.max(10, Number(p.agorich_price || 50))
          const gstPct = 5
          const amountBeforeTax = qty * rate
          const gstAmount = amountBeforeTax * (gstPct / 100)
          const totalWithTax = amountBeforeTax + gstAmount
          subtotal += amountBeforeTax
          totalGst += gstAmount
          items.push({
            product_id: p.id,
            product_name: p.name,
            hsn_code: '30049',
            quantity: qty,
            unit: 'pcs',
            rate_per_unit: rate,
            amount_before_tax: amountBeforeTax,
            gst_percentage: gstPct,
            gst_amount: gstAmount,
            total_with_tax: totalWithTax,
          })
        }
        const grandTotal = subtotal + totalGst
        const statusPool = ['PAID', 'PENDING', 'PARTIALLY_PAID']
        const status = statusPool[randomInt(0, statusPool.length - 1)]

        const { data: inv, error: invErr } = await supabase
          .from('invoices')
          .insert({
            invoice_number: `AGR-${String(randomInt(1, 99999)).padStart(5, '0')}-${new Date().getFullYear()}`,
            customer_id: rid,
            user_id: user.id,
            invoice_date: createdAt.toISOString(),
            due_date: dueDate.toISOString(),
            delivery_date: null,
            order_number: null,
            order_date: null,
            payment_terms: 'NET 30 DAYS',
            subtotal,
            total_gst: totalGst,
            grand_total: grandTotal,
            notes: null,
            status,
            created_at: createdAt.toISOString(),
          })
          .select('id')
          .single()
        if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

        const itemsInsert = items.map(it => ({ ...it, invoice_id: inv!.id }))
        const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsInsert)
        if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 })

        invoicesCreated += 1
      }
    }

    return NextResponse.json({ retailers: createdRetailerIds.length, invoices: invoicesCreated }, { status: 200 })
  } catch (error: unknown) {
    console.error('Error in admin demo seed API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


