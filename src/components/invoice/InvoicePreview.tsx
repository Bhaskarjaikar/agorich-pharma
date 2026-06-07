'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DirectRazorpayButton } from '@/components/payments/DirectRazorpayButton'
import type { CartItem, DistributorInfo, EditingInvoice } from '@/lib/invoice/types'
import { formatCurrency, calculateRate, calculateGST, getCurrentDateTime } from '@/lib/invoice/types'
import { useRouter } from 'next/navigation'

interface InvoicePreviewProps {
  cartItems: CartItem[]
  selectedDistributorInfo: DistributorInfo | null
  effectiveProfile: any
  isEditMode: boolean
  editingInvoice: EditingInvoice | null
  getTotalAmount: () => number
  getTotalGST: () => number
  getGrandTotal: () => number
  paymentReadyInvoice: { id: string; grand_total: number; order_id?: string } | null
  onSaveAndPay: () => void
  isProcessingPayment: boolean
  user: any
  darkMode?: boolean
  onPaymentSuccess?: () => void
}

export function InvoicePreview({
  cartItems,
  selectedDistributorInfo,
  effectiveProfile,
  isEditMode,
  editingInvoice,
  getTotalAmount,
  getTotalGST,
  getGrandTotal,
  paymentReadyInvoice,
  onSaveAndPay,
  isProcessingPayment,
  user,
  darkMode = false,
  onPaymentSuccess
}: InvoicePreviewProps) {
  const router = useRouter()
  const isDraftInvoiceNumber = !editingInvoice?.invoice_number

  const invoiceNumberDisplay = editingInvoice?.invoice_number || (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const randomSegment = Math.floor(1000 + Math.random() * 9000).toString()
    return `AGR-DRAFT-${year}${month}${day}-${randomSegment}`
  })()

  return (
    <div className="border-2 border-border p-4 rounded-lg bg-card shadow-lg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5">
        <div className="w-[85%] h-[85%] bg-[url('/agorich-logo.png')] bg-no-repeat bg-center bg-contain -rotate-12"></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          {selectedDistributorInfo ? (
            <>
              <h3 className="font-bold text-foreground">
                {selectedDistributorInfo.business_name || 'DISTRIBUTOR'}
              </h3>
              {selectedDistributorInfo.address && (
                <p className="text-muted-foreground">{selectedDistributorInfo.address}</p>
              )}
              {(selectedDistributorInfo.city || selectedDistributorInfo.state || selectedDistributorInfo.pincode) && (
                <p className="text-muted-foreground">
                  {[
                    selectedDistributorInfo.city,
                    selectedDistributorInfo.state,
                    selectedDistributorInfo.pincode ? `- ${selectedDistributorInfo.pincode}` : ''
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {selectedDistributorInfo.gst_number && (
                <p className="text-muted-foreground">GSTIN: {selectedDistributorInfo.gst_number}</p>
              )}
              {selectedDistributorInfo.phone && (
                <p className="text-muted-foreground">Phone: +91 {selectedDistributorInfo.phone}</p>
              )}
              {(selectedDistributorInfo.drug_license_20b || selectedDistributorInfo.drug_license_21b) && (
                <p className="text-muted-foreground">
                  DL.No: {selectedDistributorInfo.drug_license_20b}
                  {selectedDistributorInfo.drug_license_20b && selectedDistributorInfo.drug_license_21b && ', '}
                  {selectedDistributorInfo.drug_license_21b}
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="font-bold text-foreground">SELECT DISTRIBUTOR</h3>
              <p className="text-muted-foreground text-xs">Go to Order Now page to select a distributor</p>
            </>
          )}
        </div>

        <div className="text-center">
          <h1 className={`text-2xl font-bold mb-2 ${isDraftInvoiceNumber ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
            {isDraftInvoiceNumber ? 'DRAFT ORDER' : 'GST INVOICE'}
          </h1>
          <p className={`text-sm font-semibold mb-3 ${isDraftInvoiceNumber ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {isDraftInvoiceNumber ? 'PROFORMA' : 'CREDIT'}
          </p>
          <p className="font-semibold text-foreground">
            {isDraftInvoiceNumber ? 'Order No: ' : 'Invoice No: '}{invoiceNumberDisplay}
          </p>
          {isDraftInvoiceNumber && (
            <p className="text-xs text-muted-foreground">GST Invoice number will be assigned after payment.</p>
          )}
          <p className="text-muted-foreground">Invoice Date: {getCurrentDateTime()}</p>
        </div>

        <div className="text-right">
          {effectiveProfile ? (
            <>
              <h3 className="font-bold text-gray-800 text-sm mb-1">
                {effectiveProfile.user_name || 'Customer Name'}
              </h3>
              {effectiveProfile.business_name && (
                <p className="text-gray-700 text-xs mb-1">{effectiveProfile.business_name}</p>
              )}
              {effectiveProfile.business_type && (
                <p className="text-gray-500 text-xs italic mb-1">{effectiveProfile.business_type}</p>
              )}
              {effectiveProfile.address && (
                <p className="text-gray-700 text-xs mb-1">{effectiveProfile.address}</p>
              )}
              {(effectiveProfile.city || effectiveProfile.state || effectiveProfile.pincode) && (
                <p className="text-gray-700 text-xs mb-1">
                  {[
                    effectiveProfile.city,
                    effectiveProfile.state,
                    effectiveProfile.pincode ? `- ${effectiveProfile.pincode}` : ''
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {effectiveProfile.phone && (
                <p className="text-gray-700 text-xs mb-1">Phone: +91 {effectiveProfile.phone}</p>
              )}
              {effectiveProfile.gst_number && (
                <p className="text-gray-700 text-xs mb-1">GSTIN: {effectiveProfile.gst_number}</p>
              )}
              {effectiveProfile.pan_number && (
                <p className="text-gray-700 text-xs mb-1">PAN: {effectiveProfile.pan_number}</p>
              )}
              {effectiveProfile.aadhar_number && (
                <p className="text-gray-700 text-xs mb-1">Aadhar: {effectiveProfile.aadhar_number}</p>
              )}
              {effectiveProfile.fssai_license && (
                <p className="text-gray-700 text-xs mb-1">FSSAI: {effectiveProfile.fssai_license}</p>
              )}
            </>
          ) : (
            <div className="text-right text-xs text-gray-600">
              <p className="text-gray-700">Customer Name</p>
              <p className="text-gray-700">Business Name</p>
              <p className="text-gray-700">Address</p>
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-400 rounded mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">SN</th>
              <th className="border border-gray-400 p-2 text-left text-gray-800 font-semibold">Product Name</th>
              <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Pack</th>
              <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Qty</th>
              <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Batch</th>
              <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Mfg</th>
              <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">EXP</th>
              <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold">MRP</th>
              <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold">Rate</th>
              <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">GST</th>
              <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.length > 0 ? (
              cartItems.map((item, index) => {
                const rate = calculateRate(item.product)
                const amount = rate * item.quantity
                const gstAmount = calculateGST(amount)
                const totalWithGST = amount + gstAmount
                return (
                  <tr key={item.product.id} className="hover:bg-gray-50">
                    <td className="border border-gray-400 p-2 text-center text-gray-800">{index + 1}</td>
                    <td className="border border-gray-400 p-2 text-gray-800">{item.product.name}</td>
                    <td className="border border-gray-400 p-2 text-center text-gray-800">{item.product.pack_size || 'N/A'}</td>
                    <td className="border border-gray-400 p-2 text-center text-gray-800">{item.quantity}</td>
                    <td className="border border-gray-400 p-2 text-center text-gray-800">{item.product.batch_number || '-'}</td>
                    <td className="border border-gray-400 p-2 text-center text-gray-800">
                      {item.product.manufacturer || '-'}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-gray-800">
                      {item.product.expiry_date ? (() => {
                        try {
                          const d = new Date(item.product.expiry_date)
                          return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                        } catch {
                          return '-'
                        }
                      })() : '-'}
                    </td>
                    <td className="border border-gray-400 p-2 text-right text-gray-800">{formatCurrency(item.product.mrp || 0)}</td>
                    <td className="border border-gray-400 p-2 text-right text-gray-800">{formatCurrency(rate)}</td>
                    <td className="border border-gray-400 p-2 text-center text-gray-800">5%</td>
                    <td className="border border-gray-400 p-2 text-right text-gray-800">{formatCurrency(totalWithGST)}</td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={10} className="border border-gray-400 p-4 text-center text-gray-600">
                  No items added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {cartItems.length > 0 && (
        <div className="space-y-2 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal:</span>
              <span className="text-gray-800 font-medium">{formatCurrency(getTotalAmount())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">CGST:</span>
              <span className="text-gray-800 font-medium">{formatCurrency(getTotalGST() / 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">SGST:</span>
              <span className="text-gray-800 font-medium">{formatCurrency(getTotalGST() / 2)}</span>
            </div>
          </div>

          <div className="emerald-glow p-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-700 font-semibold">Grand Total:</span>
              <span className="text-2xl font-bold text-emerald-600">{formatCurrency(getGrandTotal())}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-300 flex justify-center">
            {paymentReadyInvoice ? (
              <div className="w-full max-w-md">
                <DirectRazorpayButton
                  invoiceId={paymentReadyInvoice.id}
                  amount={paymentReadyInvoice.grand_total}
                  onSuccess={() => {
                    console.log('Payment successful!')
                    alert('Payment successful! Invoice saved.')
                    onPaymentSuccess?.()
                    router.push('/retailer/invoices')
                  }}
                  onError={(error) => {
                    console.error('Payment failed:', error)
                    alert('Payment failed: ' + error)
                  }}
                />
              </div>
            ) : (
              <Button
                onClick={onSaveAndPay}
                disabled={cartItems.length === 0 || !user?.id || isProcessingPayment}
                size="lg"
                className="w-full max-w-md bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isProcessingPayment ? 'Saving Invoice...' : `Pay Now - ${formatCurrency(getGrandTotal())}`}
              </Button>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <div className="text-right">
              <div className="h-16 w-56 border-b border-gray-400"></div>
              <div className="mt-1 text-[11px] text-gray-600">Authorised Signature</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}