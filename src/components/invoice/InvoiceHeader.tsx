'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface InvoiceHeaderProps {
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
}

export default function InvoiceHeader({
  invoiceNumber,
  invoiceDate,
  dueDate,
  orderNumber,
  orderDate,
  deliveryDate,
  paymentTerms = "NET 30 DAYS",
  companyData,
  customerData,
  shipToData
}: InvoiceHeaderProps) {
  return (
    <div className="w-full">
      {/* Main Header Section */}
      <div className="border-2 border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 mb-6 shadow-lg">
        <div className="flex justify-between items-start">
          {/* Company Details - Left Side */}
          <div className="flex-1">
            <div className="flex items-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
                <Image 
                  src="/agorich-logo.png" 
                  alt="Agorich Logo" 
                  width={56} 
                  height={56}
                  className="w-14 h-14 rounded-lg object-cover"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{companyData.name}</h1>
                <p className="text-base text-blue-700 font-medium">Pharmaceutical Wholesale Distribution</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-800 space-y-1 bg-white/70 p-3 rounded-lg">
              <p><strong className="text-gray-900">Reg. No:</strong> <span className="text-gray-700">{companyData.address1}</span></p>
              <p className="text-gray-700">{companyData.address2}</p>
              <p className="text-gray-700">{companyData.city}, {companyData.state} - {companyData.pincode}</p>
              <p><strong className="text-gray-900">GSTIN:</strong> <span className="text-blue-700 font-mono">{companyData.gstin}</span></p>
              <p><strong className="text-gray-900">Phone:</strong> <span className="text-gray-700">{companyData.phone}</span></p>
              <p><strong className="text-gray-900">Email:</strong> <span className="text-blue-600">{companyData.email}</span></p>
              {companyData.website && <p><strong className="text-gray-900">Website:</strong> <span className="text-blue-600">{companyData.website}</span></p>}
            </div>
          </div>

          {/* Invoice Details - Right Side */}
          <div className="text-right">
            <Badge className="mb-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl px-6 py-3 shadow-lg">
              GST INVOICE
            </Badge>
            <div className="text-sm text-gray-800 space-y-2 bg-white/70 p-4 rounded-lg">
              <p><strong className="text-gray-900">Invoice No:</strong> <span className="text-blue-700 font-mono text-base">{invoiceNumber}</span></p>
              <p><strong className="text-gray-900">Date:</strong> <span className="text-gray-700">{invoiceDate}</span></p>
              <p><strong className="text-gray-900">Due Date:</strong> <span className="text-orange-600 font-medium">{dueDate}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing and Shipping Address Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Bill To Section */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md">
          <CardContent className="p-5">
            <h3 className="font-bold text-blue-900 mb-4 border-b-2 border-blue-300 pb-2 text-lg">
              📋 BILL TO:
            </h3>
            <div className="text-sm text-gray-800 space-y-2">
              <p><strong className="text-gray-900 text-base">{customerData.name}</strong></p>
              <p className="text-blue-700 font-medium">{customerData.businessName}</p>
              <p className="text-gray-700">{customerData.address1}</p>
              {customerData.address2 && <p className="text-gray-700">{customerData.address2}</p>}
              <p className="text-gray-700">{customerData.city}, {customerData.state} - {customerData.pincode}</p>
              {customerData.gstin && <p><strong className="text-gray-900">GSTIN:</strong> <span className="text-blue-700 font-mono">{customerData.gstin}</span></p>}
              <p><strong className="text-gray-900">Phone:</strong> <span className="text-gray-700">{customerData.phone}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Ship To Section */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md">
          <CardContent className="p-5">
            <h3 className="font-bold text-green-900 mb-4 border-b-2 border-green-300 pb-2 text-lg">
              🚚 SHIP TO:
            </h3>
            {shipToData ? (
              <div className="text-sm text-gray-800 space-y-2">
                <p><strong className="text-gray-900 text-base">{shipToData.name}</strong></p>
                <p className="text-green-700 font-medium">{shipToData.businessName}</p>
                <p className="text-gray-700">{shipToData.address1}</p>
                {shipToData.address2 && <p className="text-gray-700">{shipToData.address2}</p>}
                <p className="text-gray-700">{shipToData.city}, {shipToData.state} - {shipToData.pincode}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic bg-white/50 p-3 rounded-lg">
                Same as Bill To
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Section */}
      {(orderNumber || orderDate || deliveryDate) && (
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md mb-4">
          <CardContent className="p-5">
            <h3 className="font-bold text-purple-900 mb-4 border-b-2 border-purple-300 pb-2 text-lg">
              📋 ORDER DETAILS:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {orderNumber && (
                <div className="bg-white/70 p-3 rounded-lg">
                  <p className="text-purple-700 font-semibold">Order No:</p>
                  <p className="text-gray-800 font-medium">{orderNumber}</p>
                </div>
              )}
              {orderDate && (
                <div className="bg-white/70 p-3 rounded-lg">
                  <p className="text-purple-700 font-semibold">Order Date:</p>
                  <p className="text-gray-800 font-medium">{orderDate}</p>
                </div>
              )}
              {deliveryDate && (
                <div className="bg-white/70 p-3 rounded-lg">
                  <p className="text-purple-700 font-semibold">Delivery Required By:</p>
                  <p className="text-gray-800 font-medium">{deliveryDate}</p>
                </div>
              )}
              <div className="bg-white/70 p-3 rounded-lg">
                <p className="text-purple-700 font-semibold">Payment Terms:</p>
                <p className="text-gray-800 font-medium">{paymentTerms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
