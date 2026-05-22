'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Printer, 
  Download, 
  Envelope, 
  Pencil, 
  FloppyDisk,
  ArrowLeft,
  CheckCircle,
  Trash
} from '@phosphor-icons/react'
import InvoiceHeader from './InvoiceHeader'
import ItemsTable from './ItemsTable'
import TaxSummary from './TaxSummary'
import PaymentDetails from './PaymentDetails'
import InvoiceFooter from './InvoiceFooter'

interface InvoiceItem {
  id: string
  productName: string
  hsnCode: string
  quantity: number
  unit: string
  ratePerUnit: number
  amountBeforeTax: number
  gstPercentage: number
  gstAmount: number
  totalWithTax: number
}

interface InvoiceData {
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
    website?: string
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
  shipToData?: {
    name: string
    businessName: string
    address1: string
    address2: string
    city: string
    state: string
    pincode: string
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
  eInvoiceReference?: string
}

interface Html2PdfOptionsLike {
  margin: number
  filename: string
  image: { type: 'jpeg'; quality: number }
  html2canvas: { scale: number }
  jsPDF: { unit: 'mm'; format: 'a4'; orientation: 'portrait' }
}

interface InvoiceGeneratorProps {
  invoiceId?: string
  invoiceData?: InvoiceData
  onPrint?: () => void
  onDownload?: () => void
  onEmail?: () => void
  onBack?: () => void
}

export default function InvoiceGenerator({
  invoiceId,
  invoiceData: propInvoiceData,
  onPrint,
  onDownload,
  onEmail,
  onBack
}: InvoiceGeneratorProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  // Sample data - replace with actual data from props or API
  useEffect(() => {
    // If invoice data is passed as prop, use it directly
    if (propInvoiceData) {
      setInvoiceData(propInvoiceData)
      setIsLoading(false)
      return
    }
    
    // Simulate loading data
    setTimeout(() => {
      setInvoiceData({
        invoiceNumber: 'AGR-00001-2025',
        invoiceDate: new Date().toLocaleDateString('en-IN'),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
        orderNumber: 'ORD-2025-001',
        orderDate: new Date().toLocaleDateString('en-IN'),
        deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
        paymentTerms: 'NET 30 DAYS',
        companyData: {
          name: 'AGORICH PHARMA',
          address1: 'At + Vill + PO + PS: Baruraj Thana Chowk',
          address2: 'Block: Motipur, Muzaffarpur',
          city: 'MUZAFFARPUR',
          state: 'BIHAR',
          pincode: '843111',
          gstin: '10ABCDE1234F1Z5',
          phone: '+91 8409725206',
          email: 'bhaskarjaikar.1@gmail.com',
          website: 'www.agorich.com'
        },
        customerData: {
          name: 'Dr. Rajesh Kumar',
          businessName: 'City Medical Store',
          address1: '456 Main Street',
          address2: 'Near Railway Station',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          gstin: '07FGHIJ5678K2L6',
          phone: '+91 98765 12345'
        },
        items: [
          {
            id: '1',
            productName: 'Paracetamol 500mg Tablets',
            hsnCode: '30049',
            quantity: 100,
            unit: 'strips',
            ratePerUnit: 10.50,
            amountBeforeTax: 1000.00,
            gstPercentage: 5,
            gstAmount: 50.00,
            totalWithTax: 1050.00
          },
          {
            id: '2',
            productName: 'Amoxicillin 250mg Capsules',
            hsnCode: '30049',
            quantity: 50,
            unit: 'strips',
            ratePerUnit: 25.00,
            amountBeforeTax: 1250.00,
            gstPercentage: 5,
            gstAmount: 62.50,
            totalWithTax: 1312.50
          }
        ],
        bankDetails: {
          bankName: 'State Bank of India',
          accountNumber: '1234567890123456',
          ifscCode: 'SBIN0001234',
          accountHolder: 'AGORICH PHARMA'
        },
        authorizedBy: {
          name: 'Mr. Amit Sharma',
          designation: 'Sales Executive'
        },
        eInvoiceReference: 'EINV-2025-001'
      })
      setIsLoading(false)
    }, 1000)
  }, [invoiceId, propInvoiceData])

  const handlePrint = () => {
    window.print()
    onPrint?.()
  }

  const handleDownload = async () => {
    try {
      if (!invoiceData) {
        console.error('Cannot download invoice PDF: invoice data is not loaded')
        return
      }
      const element = document.getElementById('invoice-content')
      if (element) {
        // Dynamic import to avoid SSR issues
        const html2pdf = (await import('html2pdf.js')).default
        
        const opt: Html2PdfOptionsLike = {
          margin: 10,
          filename: `AGORICH_${invoiceData.invoiceNumber}_${invoiceData.invoiceDate.replace(/\//g, '-')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }
        
        await html2pdf().set(opt).from(element).save()
        onDownload?.()
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const handleEmail = () => {
    // Implement email functionality
    console.log('Sending email...')
    onEmail?.()
  }

  const handleSave = () => {
    // Implement save functionality
    console.log('Saving invoice...')
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto mb-6"></div>
          <p className="text-white text-xl">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Invoice not found</p>
          {onBack && (
            <Button onClick={onBack} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Calculate totals
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amountBeforeTax, 0)
  const totalGst = invoiceData.items.reduce((sum, item) => sum + item.gstAmount, 0)
  const grandTotal = invoiceData.items.reduce((sum, item) => sum + item.totalWithTax, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Action Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-500 p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="outline" onClick={onBack} className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <h1 className="text-xl font-bold text-white">
              📄 Invoice {invoiceData.invoiceNumber}
            </h1>
            <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm text-green-100 font-medium">Generated</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
                <FloppyDisk className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)} className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            
            <Button onClick={handlePrint} className="bg-blue-700 hover:bg-blue-800 text-white shadow-lg">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            
            <Button onClick={handleDownload} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            
            <Button onClick={handleEmail} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg">
              <Envelope className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="p-6">
        <div 
          id="invoice-content"
          className="max-w-4xl mx-auto bg-white p-8 shadow-2xl rounded-xl border-2 border-gray-200 text-gray-900 [&_*]:text-gray-900 [&_*]:text-inherit"
          style={{ 
            minHeight: '297mm', // A4 height
            width: '210mm', // A4 width
            margin: '0 auto'
          }}
        >
          <InvoiceHeader
            invoiceNumber={invoiceData.invoiceNumber}
            invoiceDate={invoiceData.invoiceDate}
            dueDate={invoiceData.dueDate}
            orderNumber={invoiceData.orderNumber}
            orderDate={invoiceData.orderDate}
            deliveryDate={invoiceData.deliveryDate}
            paymentTerms={invoiceData.paymentTerms}
            companyData={invoiceData.companyData}
            customerData={invoiceData.customerData}
            shipToData={invoiceData.shipToData}
          />

          <ItemsTable
            items={invoiceData.items}
            subtotal={subtotal}
            totalGst={totalGst}
            grandTotal={grandTotal}
          />

          <TaxSummary
            subtotal={subtotal}
            gstRate={5} // Default GST rate for medicines
            customerState={invoiceData.customerData.state}
            companyState={invoiceData.companyData.state}
            totalGst={totalGst}
            grandTotal={grandTotal}
          />

          <PaymentDetails bankDetails={invoiceData.bankDetails} />

          <InvoiceFooter
            authorizedBy={invoiceData.authorizedBy}
            companyData={{
              name: invoiceData.companyData.name,
              gstin: invoiceData.companyData.gstin,
              registeredAddress: `${invoiceData.companyData.address1}, ${invoiceData.companyData.address2}, ${invoiceData.companyData.city}, ${invoiceData.companyData.state} - ${invoiceData.companyData.pincode}`
            }}
            eInvoiceReference={invoiceData.eInvoiceReference}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
