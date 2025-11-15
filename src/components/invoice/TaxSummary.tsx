'use client'

import { Card, CardContent } from '@/components/ui/card'

interface TaxSummaryProps {
  subtotal: number
  gstRate: number
  customerState: string
  companyState: string
  totalGst: number
  grandTotal: number
}

// Function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const thousands = ['', 'Thousand', 'Lakh', 'Crore']

  if (num === 0) return 'Zero'

  function convertHundreds(n: number): string {
    let result = ''
    
    if (n > 99) {
      result += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    
    if (n > 19) {
      result += tens[Math.floor(n / 10)] + ' '
      n %= 10
    } else if (n > 9) {
      result += teens[n - 10] + ' '
      return result
    }
    
    if (n > 0) {
      result += ones[n] + ' '
    }
    
    return result
  }

  let result = ''
  let thousandIndex = 0

  while (num > 0) {
    const chunk = num % 1000
    if (chunk !== 0) {
      result = convertHundreds(chunk) + thousands[thousandIndex] + ' ' + result
    }
    num = Math.floor(num / 1000)
    thousandIndex++
  }

  return result.trim() + ' Rupees Only'
}

export default function TaxSummary({
  subtotal,
  gstRate,
  customerState,
  companyState,
  totalGst,
  grandTotal
}: TaxSummaryProps) {
  const isInterState = customerState !== companyState
  const sgstRate = isInterState ? 0 : gstRate / 2
  const cgstRate = isInterState ? 0 : gstRate / 2
  const igstRate = isInterState ? gstRate : 0

  const sgstAmount = isInterState ? 0 : totalGst / 2
  const cgstAmount = isInterState ? 0 : totalGst / 2
  const igstAmount = isInterState ? totalGst : 0

  const amountInWords = numberToWords(Math.floor(grandTotal))

  return (
    <Card className="border-2 border-gray-300 mb-6 shadow-lg">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Subtotal */}
          <div className="flex justify-between items-center py-3 border-b-2 border-blue-200 bg-blue-50 px-4 rounded-lg">
            <span className="text-base font-bold text-blue-900">SUBTOTAL (Amount Before Tax):</span>
            <span className="text-lg font-bold text-blue-900">₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg">
            <strong>Subtotal in words:</strong> {numberToWords(Math.floor(subtotal))}
          </div>

          {/* Tax Summary */}
          <div className="space-y-3 bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
            <h4 className="text-lg font-bold text-orange-900 border-b border-orange-300 pb-2">💰 TAX SUMMARY:</h4>
            
            {isInterState ? (
              <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-orange-200">
                <span className="text-sm font-medium text-gray-800">IGST (Integrated GST) {igstRate}%:</span>
                <span className="text-sm font-bold text-orange-700">₹{igstAmount.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-orange-200">
                  <span className="text-sm font-medium text-gray-800">SGST (State GST) {sgstRate}%:</span>
                  <span className="text-sm font-bold text-orange-700">₹{sgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-orange-200">
                  <span className="text-sm font-medium text-gray-800">CGST (Central GST) {cgstRate}%:</span>
                  <span className="text-sm font-bold text-orange-700">₹{cgstAmount.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center py-3 border-t-2 border-orange-300 bg-orange-100 px-3 rounded-lg">
              <span className="text-base font-bold text-orange-900">Total GST:</span>
              <span className="text-lg font-bold text-orange-900">₹{totalGst.toFixed(2)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="border-2 border-green-400 bg-gradient-to-r from-green-100 to-emerald-100 pt-6 pb-4 px-6 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xl font-bold text-green-900">🎯 GRAND TOTAL (Incl All Tax):</span>
              <span className="text-2xl font-bold text-green-900">₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="text-base text-green-800 font-medium bg-white p-3 rounded-lg border border-green-300">
              <strong>Amount in Words:</strong> {amountInWords}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-300 rounded-lg">
            <h5 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-400 pb-2">📝 NOTES:</h5>
            <ul className="text-sm text-gray-800 space-y-2">
              <li className="flex items-center"><span className="text-blue-600 mr-2">•</span> Payment due within 30 days</li>
              <li className="flex items-center"><span className="text-blue-600 mr-2">•</span> GST applicable as per Indian regulations</li>
              <li className="flex items-center"><span className="text-blue-600 mr-2">•</span> Medicines are subject to price control</li>
              <li className="flex items-center"><span className="text-blue-600 mr-2">•</span> E-invoice generated through AGORICH system</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
