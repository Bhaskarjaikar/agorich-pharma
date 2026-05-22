import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer-core'
import { verifyRetailerOrAdmin } from '@/lib/api-security'

/**
 * GET /api/invoices/[id]/pdf
 * Generate and return a PDF for the invoice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize Supabase with service role
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

    // Fetch invoice with items and customer details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*),
        profiles:customer_id (
          user_name,
          business_name,
          gst_number,
          address,
          city,
          state,
          pincode,
          phone
        )
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this invoice
    if (invoice.user_id !== user.id && invoice.customer_id !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile?.role || !['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'].includes(profile.role)) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Generate HTML content for the invoice
    const htmlContent = generateInvoiceHTML(invoice)

    // Launch browser and generate PDF
    let browser
    try {
      // Use puppeteer with system Chrome/Chromium
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })

      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      })

      // Close browser
      await browser.close()

      // Return PDF as response
      return new NextResponse(Buffer.from(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="invoice-${invoice.invoice_no}.pdf"`,
          'Cache-Control': 'public, max-age=86400' // Cache for 1 day
        }
      })
    } catch (browserError) {
      if (browser) {
        await browser.close()
      }
      console.error('❌ Browser/PDF generation error:', browserError)
      
      // Fallback: Return HTML for client-side PDF generation
      return NextResponse.json(
        { 
          success: false, 
          error: 'PDF generation temporarily unavailable',
          html: htmlContent,
          fallback: true
        },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('❌ Error in GET /api/invoices/[id]/pdf:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate HTML content for the invoice
 */
function generateInvoiceHTML(invoice: {
  invoice_no: string
  invoice_date: string
  due_date: string
  grand_total: number
  advance_paid: number
  balance_due: number
  payment_status: string
  gst_type: string
  customer_gstin: string | null
  place_of_supply: string
  sgst_amount: number
  cgst_amount: number
  igst_amount: number
  total_gst: number
  subtotal: number
  status: string
  notes: string | null
  payment_transaction_id: string | null
  paid_at: string | null
  invoice_items: Array<{
    product_name: string
    hsn_code: string
    quantity: number
    unit: string
    rate_per_unit: number
    gst_percentage: number
    amount_before_tax: number
    gst_amount: number
    total_with_tax: number
    pack_size?: string
    batch_number?: string
  }>
  profiles?: {
    user_name: string | null
    business_name: string | null
    gst_number: string | null
    address: string | null
    city: string | null
    state: string | null
    pincode: string | null
    phone: string | null
  } | null
}): string {
  const customer = invoice.profiles
  const customerName = invoice.gst_type === 'B2B' 
    ? (customer?.business_name || customer?.user_name || 'N/A')
    : `${customer?.user_name || 'Unregistered Person'} (URP - Unregistered Person)`
  
  const companyGSTIN = process.env.COMPANY_GSTIN || '10XXXXXXXXXXXXX'
  const companyName = process.env.COMPANY_NAME || 'Agorich Pharma'
  const companyState = process.env.COMPANY_STATE || 'Bihar'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-IN')
  }

  const isIntraState = invoice.place_of_supply?.toLowerCase() === companyState.toLowerCase()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoice.invoice_no}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
    }
    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #1e3a8a;
    }
    .company-details {
      font-size: 10px;
      color: #666;
      margin-top: 5px;
    }
    .invoice-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin: 15px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    .invoice-details-left,
    .invoice-details-right {
      flex: 1;
    }
    .detail-row {
      display: flex;
      margin-bottom: 3px;
    }
    .detail-label {
      font-weight: bold;
      width: 120px;
    }
    .detail-value {
      flex: 1;
    }
    .section {
      margin-bottom: 15px;
    }
    .section-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .billing-address {
      border: 1px solid #ddd;
      padding: 10px;
      background: #f9f9f9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background: #1e3a8a;
      color: white;
      padding: 8px;
      text-align: left;
      font-size: 10px;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
      font-size: 10px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-section {
      margin-top: 15px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table td {
      padding: 5px 10px;
    }
    .totals-table .grand-total {
      font-weight: bold;
      font-size: 12px;
      background: #1e3a8a;
      color: white;
    }
    .payment-summary {
      margin-top: 15px;
      padding: 10px;
      background: #f0f8ff;
      border: 1px solid #1e3a8a;
    }
    .payment-summary-title {
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #666;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    .signature-box {
      width: 200px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 5px;
    }
    .gst-notice {
      font-size: 9px;
      color: #666;
      margin-top: 10px;
      padding: 5px;
      background: #f5f5f5;
      border-left: 3px solid #1e3a8a;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-name">${companyName}</div>
      <div class="company-details">
        GSTIN: ${companyGSTIN} | State: ${companyState}<br>
        Phone: +91-XXXXXXXXXX | Email: info@agorichpharma.com
      </div>
    </div>

    <!-- Invoice Title -->
    <div class="invoice-title">Tax Invoice</div>

    <!-- Invoice Details -->
    <div class="invoice-details">
      <div class="invoice-details-left">
        <div class="detail-row">
          <span class="detail-label">Invoice No:</span>
          <span class="detail-value">${invoice.invoice_no}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Invoice Date:</span>
          <span class="detail-value">${formatDate(invoice.invoice_date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Due Date:</span>
          <span class="detail-value">${formatDate(invoice.due_date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Place of Supply:</span>
          <span class="detail-value">${invoice.place_of_supply}</span>
        </div>
      </div>
      <div class="invoice-details-right">
        <div class="detail-row">
          <span class="detail-label">GST Type:</span>
          <span class="detail-value">${invoice.gst_type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Status:</span>
          <span class="detail-value">${invoice.payment_status}</span>
        </div>
      </div>
    </div>

    <!-- Billing Address -->
    <div class="section">
      <div class="section-title">Bill To</div>
      <div class="billing-address">
        <strong>${customerName}</strong><br>
        ${customer?.address || 'N/A'}<br>
        ${customer?.city || ''}, ${customer?.state || ''} - ${customer?.pincode || ''}<br>
        Phone: ${customer?.phone || 'N/A'}<br>
        ${invoice.gst_type === 'B2B' && customer?.gst_number ? `GSTIN: ${customer.gst_number}<br>` : ''}
        ${invoice.gst_type === 'B2C' ? '<em>(Unregistered Person - URP)</em>' : ''}
      </div>
    </div>

    <!-- Items Table -->
    <div class="section">
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product</th>
            <th>HSN</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
            <th class="text-center">GST%</th>
            <th class="text-right">GST</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.invoice_items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                ${item.product_name}
                ${item.pack_size ? `<br><small>Pack: ${item.pack_size}</small>` : ''}
                ${item.batch_number ? `<br><small>Batch: ${item.batch_number}</small>` : ''}
              </td>
              <td>${item.hsn_code}</td>
              <td class="text-center">${item.quantity} ${item.unit}</td>
              <td class="text-right">${formatCurrency(item.rate_per_unit)}</td>
              <td class="text-right">${formatCurrency(item.amount_before_tax)}</td>
              <td class="text-center">${item.gst_percentage}%</td>
              <td class="text-right">${formatCurrency(item.gst_amount)}</td>
              <td class="text-right">${formatCurrency(item.total_with_tax)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Tax Summary -->
    <div class="section">
      <div class="section-title">Tax Summary</div>
      <table>
        <thead>
          <tr>
            <th>Tax Type</th>
            <th>Taxable Amount</th>
            <th>Tax Rate</th>
            <th class="text-right">Tax Amount</th>
          </tr>
        </thead>
        <tbody>
          ${isIntraState ? `
            <tr>
              <td>SGST</td>
              <td>${formatCurrency(invoice.subtotal)}</td>
              <td>2.5%</td>
              <td class="text-right">${formatCurrency(invoice.sgst_amount)}</td>
            </tr>
            <tr>
              <td>CGST</td>
              <td>${formatCurrency(invoice.subtotal)}</td>
              <td>2.5%</td>
              <td class="text-right">${formatCurrency(invoice.cgst_amount)}</td>
            </tr>
          ` : `
            <tr>
              <td>IGST</td>
              <td>${formatCurrency(invoice.subtotal)}</td>
              <td>5%</td>
              <td class="text-right">${formatCurrency(invoice.igst_amount)}</td>
            </tr>
          `}
          <tr style="font-weight: bold;">
            <td>Total GST</td>
            <td></td>
            <td></td>
            <td class="text-right">${formatCurrency(invoice.total_gst)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals-section">
      <table class="totals-table">
        <tbody>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          <tr>
            <td>Total GST:</td>
            <td class="text-right">${formatCurrency(invoice.total_gst)}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total:</td>
            <td class="text-right">${formatCurrency(invoice.grand_total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Payment Summary -->
    <div class="payment-summary">
      <div class="payment-summary-title">Payment Summary</div>
      <div class="detail-row">
        <span class="detail-label">Grand Total:</span>
        <span class="detail-value">${formatCurrency(invoice.grand_total)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Advance Paid (50%):</span>
        <span class="detail-value">${formatCurrency(invoice.advance_paid)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Balance Due (COD):</span>
        <span class="detail-value" style="color: #d97706; font-weight: bold;">${formatCurrency(invoice.balance_due)}</span>
      </div>
      ${invoice.payment_transaction_id ? `
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">${invoice.payment_transaction_id}</span>
        </div>
      ` : ''}
    </div>

    <!-- GST Notice -->
    <div class="gst-notice">
      <strong>GST Notice:</strong> This is a computer-generated invoice. 
      ${isIntraState 
        ? `SGST and CGST are applicable as this is an intra-state supply within ${companyState}.` 
        : `IGST is applicable as this is an inter-state supply to ${invoice.place_of_supply}.`}
      All amounts are in Indian Rupees (INR).
    </div>

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">
          Customer Signature
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          For ${companyName}<br>
          Authorized Signatory
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong>Terms & Conditions:</strong><br>
      1. Goods once sold will not be taken back.<br>
      2. All disputes are subject to ${companyState} jurisdiction.<br>
      3. Payment is due within 30 days from the invoice date.<br>
      4. Interest at 18% p.a. will be charged on overdue payments.<br>
      <br>
      <strong>${companyName}</strong> - GSTIN: ${companyGSTIN}<br>
      This invoice is valid only with the authorized signature and company stamp.
    </div>
  </div>
</body>
</html>`
}
