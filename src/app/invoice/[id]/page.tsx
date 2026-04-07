'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCard, CheckCircle, WarningCircle } from '@phosphor-icons/react'

interface InvoiceItem {
  id: string
  product_name: string
  quantity: number
  rate_per_unit: number
  total_with_tax: number
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  mrp?: number | null
  manufacturer?: string | null
}

interface Customer {
  id: string
  user_name: string | null
  business_name: string | null
  business_type: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gst_number: string | null
  phone: string | null
  aadhar_number: string | null
  pan_number: string | null
  fssai_license: string | null
  business_registration: string | null
  bank_account_number: string | null
  bank_ifsc_code: string | null
  bank_name: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'PAID' | 'OVERDUE'
  subtotal: number
  total_gst: number
  grand_total: number
  payment_method?: string | null
  payment_date?: string | null
  invoice_items: InvoiceItem[]
  customer?: Customer | null
}

export default function PublicInvoicePage() {
  const params = useParams()
  const invoiceId = params.id as string
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upiPaymentInitiated, setUpiPaymentInitiated] = useState(false)
  const [showPaymentDone, setShowPaymentDone] = useState(false)

  // Load invoice from Supabase only
  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) {
        setError('Invalid invoice ID')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch invoice from Supabase API only
        const response = await fetch(`/api/invoices/${invoiceId}`)
        const data = await response.json()
        
        if (response.ok && data.success && data.invoice) {
          console.log('✅ Invoice loaded from Supabase:', data.invoice.invoice_number)
          
          // Check all possible customer data sources
          const customerFromData = data.invoice.customer_data
          
          // Use stored customer_data if available (most reliable)
          if (customerFromData) {
            data.invoice.customer = customerFromData
            console.log('✅ Using customer_data from invoice (stored at save time)')
          }
          
          if (data.invoice.customer) {
            console.log('✅ Customer data loaded:', {
              user_name: data.invoice.customer.user_name,
              business_name: data.invoice.customer.business_name,
              business_type: data.invoice.customer.business_type,
              phone: data.invoice.customer.phone,
              gst_number: data.invoice.customer.gst_number,
              pan_number: data.invoice.customer.pan_number,
              aadhar_number: data.invoice.customer.aadhar_number,
              fssai_license: data.invoice.customer.fssai_license,
              allFields: Object.keys(data.invoice.customer)
            })
          } else {
            console.warn('⚠️ No customer data in invoice response', {
              invoiceNumber: data.invoice.invoice_number,
              customerId: data.invoice.customer_id,
              hasCustomerData: !!data.invoice.customer_data,
              hasCustomer: !!data.invoice.customer,
              invoiceKeys: Object.keys(data.invoice)
            })
          }
          
          setInvoice(data.invoice)
        } else {
          console.error('❌ Invoice not found:', data.message || response.status)
          setError(data.message || `Invoice not found. ID: ${invoiceId}`)
        }
      } catch (err: unknown) {
        console.error('❌ Error loading invoice:', err)
        setError('Failed to load invoice. Please check the link or contact support.')
      } finally {
        setIsLoading(false)
      }
    }

      loadInvoice()
  }, [invoiceId])

  // Generate UPI deep-link
  const generateUpiLink = () => {
    if (!invoice) return ''
    
    const upiId = process.env.NEXT_PUBLIC_UPI_ID || 'agorichpharma@paytm'
    const recipientName = process.env.NEXT_PUBLIC_UPI_RECIPIENT_NAME || 'Agorich Pharma'
    const amount = invoice.grand_total.toFixed(2)
    const transactionRef = `INV-${invoice.invoice_number}-${Date.now()}`
    const note = `Payment for Invoice ${invoice.invoice_number}`
    
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${transactionRef}`
  }

  // Handle UPI payment
  const handleUpiPayment = () => {
    const upiLink = generateUpiLink()
    setUpiPaymentInitiated(true)
    window.location.href = upiLink
    
    // Show payment done button after 2 seconds
    setTimeout(() => {
      setShowPaymentDone(true)
    }, 2000)
  }

  // Handle payment done
  const handlePaymentDone = () => {
    alert('✅ Payment confirmation received! The merchant will verify and update the status.')
    setUpiPaymentInitiated(false)
    setShowPaymentDone(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-red-500/20 border-red-400">
          <CardContent className="p-6 text-center">
            <WarningCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
            <p className="text-red-200">{error || 'The requested invoice could not be found.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaid = invoice.status === 'PAID'
  const canPay = ['DELIVERED', 'OVERDUE', 'SENT'].includes(invoice.status)

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours() % 12 || 12).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const ampm = date.getHours() >= 12 ? 'pm' : 'am'
    return `${day}/${month}/${year} at ${hours}:${minutes}:${seconds} ${ampm}`
  }

  // Format date only (for expiry/MFG)
  const formatDateShort = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${month}-${year}`
  }

  // Format manufacturer (shorten if needed)
  const formatMfg = (mfg: string | null | undefined) => {
    if (!mfg) return '-'
    // Return first word or first 5 chars
    return mfg.split(' ')[0].substring(0, 8).toUpperCase()
  }

  // Calculate CGST and SGST (each 2.5% for 5% total GST)
  const cgst = invoice.total_gst / 2
  const sgst = invoice.total_gst / 2

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-4 px-2 md:py-8 md:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Invoice Card - GST Invoice Format */}
        <Card className="bg-white shadow-2xl mb-6 relative overflow-hidden">
          {/* Watermark */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl md:text-9xl font-bold text-gray-400 rotate-[-45deg]">
              AGORICH
            </div>
          </div>
          <CardContent className="p-3 md:p-6 lg:p-8 relative z-10">
            {/* Header Section - 3 Column Layout */}
            <div className="border-b-2 border-gray-300 pb-4 mb-4">
              {/* Left: Company Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="col-span-1">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1 md:mb-2">Invoice Preview</h2>
                  <h3 className="text-base md:text-lg font-bold text-gray-700 mb-2 md:mb-3">AGORICH PHARMACEUTICALS</h3>
                  <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
                    <p>At + Vill + PO + PS: Baruraj Thana Chowk, Block: Motipur, Muzaffarpur, Bihar - 843111</p>
                    <p><strong>GSTIN:</strong> 04AAKCD0849F1ZU</p>
                    <p><strong>DL.No:</strong> WLF20B2026BR00059, WLF21B2026BR00058</p>
                    <p><strong>Phone:</strong> +91 8409725206</p>
                    <p><strong>Email:</strong> bhaskarjaikar.1@gmail.com</p>
        </div>
                </div>
                
                {/* Middle: GST INVOICE and Invoice Details */}
                <div className="col-span-1 text-center py-2 md:py-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">GST INVOICE</h1>
                  <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-4">CREDIT</p>
                  <div className="text-[10px] md:text-xs text-gray-700 space-y-0.5 md:space-y-1">
                    <p><strong>Invoice No:</strong> {invoice.invoice_number}</p>
                    <p><strong>Invoice Date:</strong> {formatDate(invoice.invoice_date)}</p>
            </div>
                </div>
                
                {/* Right: Customer Details */}
                <div className="col-span-1 text-left md:text-right">
                  <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
                    {invoice.customer ? (
                      <>
                        {invoice.customer.user_name && (
                          <p><strong>{invoice.customer.user_name}</strong></p>
                        )}
                        {invoice.customer.business_name && (
                          <p><strong>{invoice.customer.business_name}</strong></p>
                        )}
                        {invoice.customer.business_type && (
                          <p className="text-gray-500 italic">{invoice.customer.business_type}</p>
                        )}
                        {invoice.customer.address && (
                          <p>{invoice.customer.address}</p>
                        )}
                        {(invoice.customer.city || invoice.customer.state || invoice.customer.pincode) && (
                          <p>
                            {[invoice.customer.city, invoice.customer.state]
                              .filter(Boolean)
                              .join(', ')}
                            {invoice.customer.pincode ? ` - ${invoice.customer.pincode}` : ''}
                          </p>
                        )}
                        {invoice.customer.phone && (
                          <p><strong>Phone:</strong> +91 {invoice.customer.phone}</p>
                        )}
                        {invoice.customer.gst_number && (
                          <p><strong>GSTIN:</strong> {invoice.customer.gst_number}</p>
                        )}
                        {invoice.customer.pan_number && (
                          <p><strong>PAN:</strong> {invoice.customer.pan_number}</p>
                        )}
                        {invoice.customer.aadhar_number && (
                          <p><strong>Aadhar:</strong> {invoice.customer.aadhar_number}</p>
                        )}
                        {invoice.customer.fssai_license && (
                          <p><strong>FSSAI:</strong> {invoice.customer.fssai_license}</p>
                        )}
                        {invoice.customer.business_registration && (
                          <p><strong>Reg No:</strong> {invoice.customer.business_registration}</p>
                        )}
                      </>
                    ) : (
                      <div className="text-right text-xs text-gray-600">
                        <p>Customer Name</p>
                        <p>Business Name</p>
                        <p>Address</p>
                        <p>City, State - Pincode</p>
                        <p>Phone: +91 XXXXX XXXXX</p>
                      </div>
                    )}
              </div>
                </div>
              </div>
            </div>

            {/* Items Table - Detailed Format */}
            <div className="mb-4 md:mb-6">
              <div className="overflow-x-auto -mx-3 md:-mx-6 lg:-mx-8 px-3 md:px-6 lg:px-8">
                <table className="w-full border border-gray-300 text-[10px] md:text-xs min-w-[600px] md:min-w-0">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center font-semibold">SN</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-left font-semibold">Product</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center font-semibold">Pack</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center font-semibold">Qty</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center font-semibold hidden md:table-cell">Batch</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center font-semibold hidden md:table-cell">Mfg</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center font-semibold">EXP</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right font-semibold">MRP</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right font-semibold">Rate</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center font-semibold hidden sm:table-cell">GST</th>
                      <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.invoice_items.map((item, index) => {
                      // Debug log to verify data exists
                      if (index === 0) {
                        console.log('📦 Product details check:', {
                          pack: item.pack_size,
                          batch: item.batch_number,
                          mrp: item.mrp,
                          expiry: item.expiry_date,
                          manufacturer: item.manufacturer
                        })
                      }
                      return (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center">{index + 1}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-left font-medium">{item.product_name}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center">{item.pack_size || '-'}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center">{item.quantity}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center hidden md:table-cell">{item.batch_number || '-'}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center hidden md:table-cell">{formatMfg(item.manufacturer)}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center">{formatDateShort(item.expiry_date)}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right">{item.mrp ? `₹${item.mrp.toFixed(0)}` : '-'}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right">₹{item.rate_per_unit.toFixed(0)}</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center hidden sm:table-cell">5%</td>
                          <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right font-semibold">₹{item.total_with_tax.toFixed(0)}</td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Section */}
            <div className="mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row justify-end items-end sm:space-x-8 text-sm">
                <div className="text-right space-y-1 mb-2 sm:mb-0">
                  <p className="text-gray-700">Subtotal:</p>
                  <p className="text-gray-700">CGST @ 2.5%:</p>
                  <p className="text-gray-700">SGST @ 2.5%:</p>
                  <p className="text-base md:text-lg font-bold text-blue-600">Grand Total:</p>
              </div>
                <div className="text-right space-y-1 min-w-[80px] md:min-w-[100px]">
                  <p className="text-gray-900 font-semibold">₹{invoice.subtotal.toFixed(0)}</p>
                  <p className="text-gray-900 font-semibold">₹{cgst.toFixed(0)}</p>
                  <p className="text-gray-900 font-semibold">₹{sgst.toFixed(0)}</p>
                  <p className="text-base md:text-lg font-bold text-blue-600">₹{invoice.grand_total.toFixed(0)}</p>
              </div>
              </div>
            </div>

            {/* Payment Status or Action */}
            {isPaid ? (
              <div className="mt-4 md:mt-6 bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Payment Received</span>
                </div>
                <p className="text-xs md:text-sm text-green-600 mt-1">
                  Paid on {invoice.payment_date && new Date(invoice.payment_date).toLocaleDateString('en-IN')}
                  {invoice.payment_method && ` via ${invoice.payment_method}`}
                </p>
              </div>
            ) : canPay && !upiPaymentInitiated ? (
              <div className="mt-4 md:mt-6 space-y-3">
                <Button
                  onClick={handleUpiPayment}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 md:py-6 text-base md:text-lg font-semibold shadow-lg"
                >
                  <CreditCard className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                  Pay ₹{invoice.grand_total.toFixed(2)} with UPI
                </Button>
                <p className="text-center text-xs md:text-sm text-gray-500 mt-3">
                  Safe & Secure Payment • Powered by UPI
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const details = `Bank: ${process.env.NEXT_PUBLIC_BANK_NAME}\nAccount: ${process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER}\nIFSC: ${process.env.NEXT_PUBLIC_BANK_IFSC}\nHolder: ${process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER}`
                      try { navigator.clipboard.writeText(details); alert('Bank details copied. Complete transfer and share UTR.') } catch {}
                    }}
                    className="w-full text-xs md:text-sm"
                  >
                    Pay via Bank Transfer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => alert('COD selected. Please keep cash ready at delivery. High-value orders may need advance.')}
                    className="w-full text-xs md:text-sm"
                  >
                    Choose COD
                  </Button>
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-blue-800">
                    UPI ID: <span className="font-semibold">{process.env.NEXT_PUBLIC_UPI_ID}</span> • Recipient: <span className="font-semibold">{process.env.NEXT_PUBLIC_UPI_RECIPIENT_NAME}</span>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">If the UPI link doesn't open, you can pay manually using the UPI ID above.</p>
                </div>
              </div>
            ) : upiPaymentInitiated && showPaymentDone ? (
              <div className="mt-4 md:mt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-green-500 animate-pulse" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                  Complete Payment in UPI App
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  Return here after completing the payment
                </p>
                <Button
                  onClick={handlePaymentDone}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 md:py-6 text-base md:text-lg font-semibold"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  ✓ Payment Done
                </Button>
              </div>
            ) : null}
            {/* Bank Details Section - Bottom */}
            <div className="mt-4 md:mt-6 pt-4 border-t border-gray-300">
              <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">Our Bank Details</h4>
              <div className="text-[10px] md:text-xs text-gray-700 space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-2">
                  <span><strong>Bank Name:</strong> State Bank of India</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span><strong>Account Number:</strong> 44994663673</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('44994663673')
                      alert('Account number copied!')
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Copy Account Number"
                  >
                    📋
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span><strong>IFSC Code:</strong> SBIN0010335</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('SBIN0010335')
                      alert('IFSC copied!')
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Copy IFSC"
                  >
                    📋
                  </button>
                  </div>
                <div className="flex items-center gap-2">
                  <span><strong>Account Holder:</strong> Hari Narayan Ram</span>
                </div>
              </div>
            </div>
            
            {!isPaid && (
              <div className="mt-4 md:mt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
                  <h4 className="text-yellow-900 font-semibold mb-1 text-xs md:text-sm">Cash on Delivery (COD)</h4>
                  <p className="text-[10px] md:text-xs text-yellow-800">COD ke liye kripya delivery par cash ready rakhein. High-value orders par advance ki maang ho sakti hai.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-white/60 text-xs md:text-sm">
          <p>© 2025 Agorich Pharma. All rights reserved.</p>
          <p className="mt-2">For support, contact: support@agorichpharma.com</p>
        </div>
      </div>
    </div>
  )
}


