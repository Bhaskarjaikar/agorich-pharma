# 🧾 AGORICH PHARMA - GST INVOICE SYSTEM

## 📋 Overview

A professional GST-compliant invoice system designed specifically for Agorich Pharma. This system generates print-ready invoices that comply with Indian GST regulations for pharmaceutical wholesale distribution.

## ✨ Features

### 🎯 Core Features
- **Professional GST Invoice Generation** - Compliant with Indian tax regulations
- **Print-Ready Design** - A4 format optimized for printing
- **PDF Download** - High-quality PDF generation using html2pdf.js
- **Real-time Calculations** - Automatic GST, SGST, CGST, IGST calculations
- **Number to Words Conversion** - Amount displayed in words
- **HSN Code Integration** - Automatic HSN code (30049) for medicines
- **Multi-state Support** - Automatic SGST/CGST vs IGST based on state

### 📊 Invoice Components
1. **Invoice Header** - Company details, invoice number, dates
2. **Billing Address** - Customer/retailer information
3. **Shipping Address** - Delivery details (optional)
4. **Items Table** - Product details with GST calculations
5. **Tax Summary** - Complete GST breakdown
6. **Payment Details** - Bank information
7. **Footer** - Signature area and legal information

### 🔧 Technical Features
- **Responsive Design** - Works on desktop and mobile
- **Print Optimization** - Special CSS for print media
- **Database Integration** - Full CRUD operations with Supabase
- **Row Level Security** - Secure data access
- **API Endpoints** - RESTful API for invoice management
- **Status Management** - Draft, Sent, Delivered, Paid, Overdue

## 🏗️ Architecture

### Components Structure
```
src/components/invoice/
├── InvoiceHeader.tsx      # Company & customer details
├── ItemsTable.tsx         # Product table with calculations
├── TaxSummary.tsx         # GST breakdown & totals
├── PaymentDetails.tsx     # Bank details
├── InvoiceFooter.tsx      # Signature & legal info
└── InvoiceGenerator.tsx   # Main component
```

### Database Schema
```sql
-- Invoices table
invoices (
  id, invoice_number, customer_id, user_id,
  invoice_date, due_date, delivery_date,
  order_number, order_date, payment_terms,
  status, subtotal, total_gst, grand_total,
  notes, e_invoice_reference, created_at, updated_at
)

-- Invoice items table
invoice_items (
  id, invoice_id, product_id, product_name,
  hsn_code, quantity, unit, rate_per_unit,
  amount_before_tax, gst_percentage, gst_amount,
  total_with_tax, created_at
)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Modern web browser

### Installation
1. **Install Dependencies**
   ```bash
   npm install html2pdf.js
   ```

2. **Update Database**
   - Run the `safe-supabase-setup.sql` script in your Supabase dashboard
   - This creates all necessary tables and policies

3. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Usage

#### 1. Create Invoice
```tsx
import InvoiceGenerator from '@/components/invoice/InvoiceGenerator'

<InvoiceGenerator
  invoiceId="optional-invoice-id"
  onPrint={() => console.log('Print')}
  onDownload={() => console.log('Download')}
  onEmail={() => console.log('Email')}
/>
```

#### 2. Invoice Data Structure
```typescript
interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
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
}
```

## 📱 Pages & Routes

### Invoice Management
- **`/retailer/invoices`** - Invoice list and management
- **`/retailer/invoices/[id]`** - View specific invoice
- **`/retailer/invoices/create`** - Create new invoice

### API Endpoints
- **`GET /api/invoices`** - List invoices
- **`POST /api/invoices`** - Create invoice
- **`GET /api/invoices/[id]`** - Get specific invoice
- **`PUT /api/invoices/[id]`** - Update invoice
- **`DELETE /api/invoices/[id]`** - Delete invoice

## 🎨 Styling & Design

### Print Optimization
- A4 page size (210mm × 297mm)
- Print-friendly colors (black text on white background)
- Proper margins and spacing
- No shadows or gradients in print mode

### Color Scheme
- **Primary**: Blue (#1e3a8a)
- **Success**: Green (#16a34a)
- **Warning**: Orange (#ea580c)
- **Error**: Red (#ef4444)
- **Text**: Black (#000000)
- **Background**: White (#ffffff)

### Typography
- **Headers**: Arial Bold, 18px
- **Table Headers**: Arial Bold, 12px
- **Table Data**: Arial Regular, 11px
- **Totals**: Arial Bold, 12px

## 🔢 GST Calculations

### Automatic Calculations
1. **Amount Before Tax** = Quantity × Rate per Unit
2. **GST Amount** = Amount Before Tax × GST%
3. **Total with Tax** = Amount Before Tax + GST Amount

### GST Types
- **Intra-state** (Same state): SGST + CGST (2.5% + 2.5% = 5%)
- **Inter-state** (Different state): IGST (5%)

### HSN Codes
- **30049** - Standard HSN code for pharmaceutical medicines
- **GST Rate** - 5% for most medicines, 12% for some

## 📄 Invoice Number Format

### Format: `AGR-XXXXX-YYYY`
- **AGR** - Company prefix
- **XXXXX** - 5-digit sequential number
- **YYYY** - Year

### Examples
- AGR-00001-2025
- AGR-00002-2025
- AGR-00003-2025

## 🛡️ Security Features

### Row Level Security (RLS)
- Users can only view their own invoices
- Sales executives can create invoices
- Customers can view invoices sent to them
- Admin users have full access

### Data Validation
- Required field validation
- GST number format validation
- Phone number format validation
- Positive number validation for amounts

## 📊 Status Management

### Invoice Statuses
1. **DRAFT** - Being created, not sent
2. **SENT** - Sent to customer
3. **DELIVERED** - Goods delivered
4. **PAID** - Payment received
5. **OVERDUE** - Past due date

### Status Transitions
- Draft → Sent (when invoice is sent)
- Sent → Delivered (when goods delivered)
- Delivered → Paid (when payment received)
- Any status → Overdue (when past due date)

## 🔧 Customization

### Company Details
Update company information in the invoice data:
```typescript
companyData: {
  name: 'YOUR COMPANY NAME',
  address1: 'Your Address Line 1',
  address2: 'Your Address Line 2',
  city: 'Your City',
  state: 'Your State',
  pincode: 'Your Pincode',
  gstin: 'Your GSTIN',
  phone: 'Your Phone',
  email: 'Your Email'
}
```

### Bank Details
Update payment information:
```typescript
bankDetails: {
  bankName: 'Your Bank Name',
  accountNumber: 'Your Account Number',
  ifscCode: 'Your IFSC Code',
  accountHolder: 'Your Company Name'
}
```

## 🚀 Deployment

### Production Setup
1. **Environment Variables**
   - Set production Supabase credentials
   - Configure email service for invoice sending

2. **Database**
   - Run migration scripts
   - Set up proper RLS policies
   - Create admin users

3. **Performance**
   - Enable caching for invoice data
   - Optimize PDF generation
   - Set up CDN for static assets

## 📈 Future Enhancements

### Planned Features
- [ ] Bulk invoice generation
- [ ] Email integration for sending invoices
- [ ] Payment gateway integration
- [ ] Invoice analytics dashboard
- [ ] Mobile app for field sales
- [ ] Integration with accounting software
- [ ] E-invoice generation (GSP integration)
- [ ] QR code for payment
- [ ] Multi-language support

### Technical Improvements
- [ ] Caching layer for better performance
- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] Export to Excel/CSV
- [ ] Audit trail for all changes
- [ ] Backup and recovery system

## 🐛 Troubleshooting

### Common Issues

#### PDF Download Not Working
- Check if html2pdf.js is properly installed
- Ensure the invoice content element exists
- Check browser console for errors

#### Print Layout Issues
- Verify print CSS is loaded
- Check page margins and sizing
- Test in different browsers

#### Database Connection Issues
- Verify Supabase credentials
- Check RLS policies
- Ensure proper user authentication

### Support
For technical support or feature requests, please contact the development team.

## 📄 License

This invoice system is proprietary software developed for Agorich Pharma. All rights reserved.

---

**Built with ❤️ for Agorich Pharma**














