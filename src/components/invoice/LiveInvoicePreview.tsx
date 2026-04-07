'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Envelope, 
  FloppyDisk, 
  CheckCircle,
  Printer,
  Download
} from '@phosphor-icons/react'
import { calculateInvoiceTotals, numberToWords } from '@/lib/invoice-calculations'

export interface InvoiceItem {
  id: string
  productName: string
  hsnCode: string
  quantity: number
  unit: string
  rate: number
  amountBeforeTax: number
  gstAmount: number
  cgst: number
  sgst: number
  igst: number
  totalWithTax: number
}

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  orderNumber?: string
  orderDate?: string
  deliveryDate?: string
  paymentTerms?: string
  companyData: {
    name: string
    address1: string
    address2: string
    city: string
    state: string
    pincode: string
    gstin: string
    phone: string
    email: string
  }
  customerData: {
    name: string
    businessName: string
    address1: string
    address2: string
    city: string
    state: string
    pincode: string
    gstin?: string
    phone: string
  }
  items: InvoiceItem[]
  bankDetails: {
    bankName: string
    accountNumber: string
    ifscCode: string
    accountHolder: string
  }
  authorizedBy: {
    name: string
    designation: string
  }
}

interface LiveInvoicePreviewProps {
  invoiceData: InvoiceData
  onSave?: () => void
  onPrint?: () => void
  onDownload?: () => void
  onEmail?: () => void
  isSaving?: boolean
}

export default function LiveInvoicePreview({
  invoiceData,
  onSave,
  onPrint,
  onDownload,
  onEmail,
  isSaving = false
}: LiveInvoicePreviewProps) {
  
  // Calculate totals
  const totals = calculateInvoiceTotals(invoiceData.items, false) // Assuming intrastate for now
  const totalInWords = numberToWords(totals.grandTotal)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Action Bar */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="w-4 h-4 mr-1" />
              Live Preview
            </Badge>
            <span className="text-sm text-gray-600">
              {invoiceData.items.length} items • {formatCurrency(totals.grandTotal)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving || invoiceData.items.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FloppyDisk className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onPrint}
              disabled={invoiceData.items.length === 0}
              className="border-gray-400 text-gray-700 hover:bg-gray-100 hover:text-gray-800"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              disabled={invoiceData.items.length === 0}
              className="border-gray-400 text-gray-700 hover:bg-gray-100 hover:text-gray-800"
            >
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
            {onEmail && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEmail}
                disabled={invoiceData.items.length === 0}
                className="border-gray-400 text-gray-700 hover:bg-gray-100 hover:text-gray-800"
              >
                <Envelope className="w-4 h-4 mr-1" />
                Email
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="flex-1 overflow-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-0">
            <div 
              id="invoice-content"
              className="bg-white text-gray-900"
              style={{ 
                minHeight: '297mm', // A4 height
                width: '210mm', // A4 width
                margin: '0 auto'
              }}
            >
              {/* Header */}
              <div className="border-b-2 border-gray-800 p-4">
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold text-blue-600">GST INVOICE</h1>
                  <p className="text-sm text-gray-600">CREDIT</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Invoice No: {invoiceData.invoiceNumber}</p>
                    <p>Invoice Date: {formatDate(invoiceData.invoiceDate)}</p>
                    <p>Due Date: {formatDate(invoiceData.dueDate)}</p>
                  </div>
                  <div className="text-center">
                    <p>Order No: {invoiceData.orderNumber || 'N/A'}</p>
                    <p>Order Date: {invoiceData.orderDate ? formatDate(invoiceData.orderDate) : 'N/A'}</p>
                    <p>Delivery Date: {invoiceData.deliveryDate ? formatDate(invoiceData.deliveryDate) : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p>Payment Terms: {invoiceData.paymentTerms || 'NET 30 DAYS'}</p>
                  </div>
                </div>
              </div>

              {/* Company and Customer Details */}
              <div className="grid grid-cols-2 gap-4 p-4 border-b border-gray-300">
                {/* Company Details */}
                <div>
                  <h3 className="font-bold text-lg mb-2">{invoiceData.companyData.name}</h3>
                  <p>{invoiceData.companyData.address1}</p>
                  <p>{invoiceData.companyData.address2}</p>
                  <p>{invoiceData.companyData.city}, {invoiceData.companyData.state} - {invoiceData.companyData.pincode}</p>
                  <p>Phone: {invoiceData.companyData.phone}</p>
                  <p>GSTIN: {invoiceData.companyData.gstin}</p>
                </div>
                
                {/* Customer Details */}
                <div>
                  <h3 className="font-bold text-lg mb-2">{invoiceData.customerData.businessName}</h3>
                  <p>{invoiceData.customerData.name}</p>
                  <p>{invoiceData.customerData.address1}</p>
                  <p>{invoiceData.customerData.address2}</p>
                  <p>{invoiceData.customerData.city}, {invoiceData.customerData.state} - {invoiceData.customerData.pincode}</p>
                  <p>Phone: {invoiceData.customerData.phone}</p>
                  {invoiceData.customerData.gstin && <p>GSTIN: {invoiceData.customerData.gstin}</p>}
                </div>
              </div>

              {/* Items Table */}
              <div className="p-4">
                <table className="w-full border-collapse border border-gray-400 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 p-2 text-left">Sr. No</th>
                      <th className="border border-gray-400 p-2 text-left">Product Name</th>
                      <th className="border border-gray-400 p-2 text-left">HSN Code</th>
                      <th className="border border-gray-400 p-2 text-center">Qty</th>
                      <th className="border border-gray-400 p-2 text-center">Unit</th>
                      <th className="border border-gray-400 p-2 text-right">Rate</th>
                      <th className="border border-gray-400 p-2 text-right">Disc %</th>
                      <th className="border border-gray-400 p-2 text-right">GST %</th>
                      <th className="border border-gray-400 p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="border border-gray-400 p-2">{index + 1}</td>
                        <td className="border border-gray-400 p-2">{item.productName}</td>
                        <td className="border border-gray-400 p-2">{item.hsnCode}</td>
                        <td className="border border-gray-400 p-2 text-center">{item.quantity}</td>
                        <td className="border border-gray-400 p-2 text-center">{item.unit}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(item.rate)}</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">5.00</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(item.amountBeforeTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 border-t border-gray-300">
                <div>
                  <table className="w-full border-collapse border border-gray-400 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-2 text-left">CLASS</th>
                        <th className="border border-gray-400 p-2 text-right">TOTAL</th>
                        <th className="border border-gray-400 p-2 text-right">SCHEME</th>
                        <th className="border border-gray-400 p-2 text-right">DISCOUNT</th>
                        <th className="border border-gray-400 p-2 text-right">CGST</th>
                        <th className="border border-gray-400 p-2 text-right">SGST</th>
                        <th className="border border-gray-400 p-2 text-right">TOTAL GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 p-2">CGST 2.5%</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.subtotal)}</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.cgst)}</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.cgst)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2">SGST 2.5%</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.sgst)}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.sgst)}</td>
                      </tr>
                      <tr className="font-bold bg-gray-50">
                        <td className="border border-gray-400 p-2">TOTAL</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.subtotal)}</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.cgst)}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.sgst)}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.totalGst)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-2 text-sm font-semibold">Rs. {totalInWords}</p>
                </div>
                
                <div>
                  <table className="w-full border-collapse border border-gray-400 text-sm">
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">TOTAL</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.subtotal)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">DIS AMT</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">CGST PAYABLE</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.cgst)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">SGST PAYABLE</td>
                        <td className="border border-gray-400 p-2 text-right">{formatCurrency(totals.sgst)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">PAYABLE</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">CR/OR NOTE</td>
                        <td className="border border-gray-400 p-2 text-right">0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grand Total */}
              <div className="p-4 border-t border-gray-300">
                <div className="bg-gray-200 p-4 text-center">
                  <h3 className="text-xl font-bold">Grand Total: {formatCurrency(totals.grandTotal)}</h3>
                </div>
              </div>

              {/* Authorized Signature */}
              <div className="p-4 border-t border-gray-300">
                <div className="text-right">
                  <p className="font-bold mb-4">FOR {invoiceData.companyData.name}</p>
                  <p className="text-sm">{invoiceData.authorizedBy.name}</p>
                  <p className="text-sm">{invoiceData.authorizedBy.designation}</p>
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-4 border-t border-gray-300">
                <h4 className="font-bold mb-2">Bank Details</h4>
                <p className="text-sm">
                  Bank: {invoiceData.bankDetails.bankName} | 
                  A/C: {invoiceData.bankDetails.accountNumber} | 
                  IFSC: {invoiceData.bankDetails.ifscCode}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

