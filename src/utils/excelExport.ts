// Client-side only Excel export
// Using dynamic import to handle Next.js bundling

interface Invoice {
  id: string
  invoice_number?: string | null
  invoice_date: string
  due_date: string
  status: string
  grand_total: number
  customer_profile?: {
    user_name?: string | null
    business_name?: string | null
    phone?: string | null
  } | null
  payment_amount?: number | null
  payment_method?: string | null
  authorized_person_name?: string | null
  processing_started_at?: string | null
  delivery_confirmed_at?: string | null
  status_updated_at?: string | null
  created_at?: string | null
}

export async function exportInvoicesToExcel(invoices: Invoice[], filename: string = 'invoices') {
  // Only run on client-side
  if (typeof window === 'undefined') {
    throw new Error('Excel export is only available in the browser')
  }

  // Dynamic import for client-side only
  const xlsxModule = await import('xlsx')
  const XLSX = xlsxModule.default || xlsxModule
  
  // Prepare data for Excel
  const excelData = invoices.map((invoice) => {
    const customerName = invoice.customer_profile?.user_name || 
                          invoice.customer_profile?.business_name || 
                          'N/A'
    
    const phone = invoice.customer_profile?.phone || 'N/A'
    
    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return 'N/A'
      try {
        return new Date(dateString).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      } catch {
        return dateString
      }
    }

    return {
      'Invoice Number': invoice.invoice_number || 'N/A',
      'Customer Name': customerName,
      'Customer Phone': phone,
      'Amount (₹)': invoice.grand_total || 0,
      'Status': invoice.status,
      'Invoice Date': formatDate(invoice.invoice_date),
      'Due Date': formatDate(invoice.due_date),
      'Payment Amount (₹)': invoice.payment_amount || 0,
      'Payment Method': invoice.payment_method || 'N/A',
      'Authorized Person': invoice.authorized_person_name || 'N/A',
      'Processing Started': formatDate(invoice.processing_started_at),
      'Delivery Confirmed': formatDate(invoice.delivery_confirmed_at),
      'Status Updated': formatDate(invoice.status_updated_at),
      'Created At': formatDate(invoice.created_at)
    }
  })

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths for better readability
  const colWidths = [
    { wch: 15 }, // Invoice Number
    { wch: 20 }, // Customer Name
    { wch: 15 }, // Customer Phone
    { wch: 12 }, // Amount
    { wch: 12 }, // Status
    { wch: 15 }, // Invoice Date
    { wch: 15 }, // Due Date
    { wch: 15 }, // Payment Amount
    { wch: 15 }, // Payment Method
    { wch: 18 }, // Authorized Person
    { wch: 18 }, // Processing Started
    { wch: 18 }, // Delivery Confirmed
    { wch: 15 }, // Status Updated
    { wch: 15 }  // Created At
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Invoices')

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]
  const finalFilename = `${filename}_${timestamp}.xlsx`

  // Write file
  XLSX.writeFile(wb, finalFilename)
  
  return finalFilename
}

