'use client'

import { Card, CardContent } from '@/components/ui/card'

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

interface ItemsTableProps {
  items: InvoiceItem[]
  subtotal: number
  totalGst: number
  grandTotal: number
}

export default function ItemsTable({ items, subtotal, totalGst, grandTotal }: ItemsTableProps) {
  return (
    <Card className="border-2 border-gray-300 mb-6 shadow-lg">
      <CardContent className="p-0">
        {/* Item Count */}
        <div className="p-4 border-b-2 border-gray-300 bg-gradient-to-r from-blue-100 to-indigo-100">
          <p className="text-sm font-bold text-blue-900">
            📦 Item Count: {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b-2 border-blue-700">
                <th className="border border-blue-500 px-3 py-3 text-left text-xs font-bold">
                  Sr No
                </th>
                <th className="border border-blue-500 px-3 py-3 text-left text-xs font-bold">
                  PRODUCT DESCRIPTION
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center text-xs font-bold">
                  HSN/SAC
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center text-xs font-bold">
                  QTY
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center text-xs font-bold">
                  UNIT
                </th>
                <th className="border border-blue-500 px-3 py-3 text-right text-xs font-bold">
                  RATE (Incl GST)
                </th>
                <th className="border border-blue-500 px-3 py-3 text-right text-xs font-bold">
                  AMOUNT BEFORE TAX
                </th>
                <th className="border border-blue-500 px-3 py-3 text-center text-xs font-bold">
                  GST %
                </th>
                <th className="border border-blue-500 px-3 py-3 text-right text-xs font-bold">
                  GST AMOUNT
                </th>
                <th className="border border-blue-500 px-3 py-3 text-right text-xs font-bold">
                  TOTAL (Incl Tax)
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="border border-gray-200 px-3 py-3 text-center text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-sm text-gray-800">
                    {item.productName}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-center text-sm text-blue-700 font-mono">
                    {item.hsnCode}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-center text-sm font-medium text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-center text-sm text-gray-700">
                    {item.unit}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-right text-sm font-medium text-gray-900">
                    ₹{item.ratePerUnit.toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-right text-sm text-gray-800">
                    ₹{item.amountBeforeTax.toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-center text-sm font-medium text-green-700">
                    {item.gstPercentage}%
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-right text-sm text-orange-700">
                    ₹{item.gstAmount.toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-3 py-3 text-right text-sm font-bold text-blue-900">
                    ₹{item.totalWithTax.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-green-100 to-emerald-100 border-t-2 border-green-300">
                <td 
                  colSpan={6} 
                  className="border border-green-200 px-3 py-3 text-right text-sm font-bold text-green-900"
                >
                  SUBTOTAL:
                </td>
                <td className="border border-green-200 px-3 py-3 text-right text-sm font-bold text-green-900">
                  ₹{subtotal.toFixed(2)}
                </td>
                <td className="border border-green-200 px-3 py-3 text-center text-sm font-bold text-green-900">
                  -
                </td>
                <td className="border border-green-200 px-3 py-3 text-right text-sm font-bold text-green-900">
                  ₹{totalGst.toFixed(2)}
                </td>
                <td className="border border-green-200 px-3 py-3 text-right text-sm font-bold text-green-900">
                  ₹{grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
