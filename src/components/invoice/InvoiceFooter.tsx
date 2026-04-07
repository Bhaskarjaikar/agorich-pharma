'use client'

import { Card, CardContent } from '@/components/ui/card'

interface InvoiceFooterProps {
  authorizedBy: {
    name: string
    designation: string
    signature?: string
  }
  companyData: {
    name: string
    gstin: string
    cin?: string
    registeredAddress: string
  }
  eInvoiceReference?: string
}

export default function InvoiceFooter({
  authorizedBy,
  companyData,
  eInvoiceReference
}: InvoiceFooterProps) {
  return (
    <div className="mt-8">
      {/* Signature Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mb-6">
                <div className="border-b-2 border-blue-400 w-40 mx-auto mb-3"></div>
                <p className="text-sm font-bold text-blue-900">Authorized Signature</p>
              </div>
              <div className="text-sm text-gray-800 space-y-2 bg-white/70 p-4 rounded-lg">
                <p><strong className="text-gray-900">Name:</strong> <span className="text-blue-700">{authorizedBy.name}</span></p>
                <p><strong className="text-gray-900">Designation:</strong> <span className="text-blue-700">{authorizedBy.designation}</span></p>
                <p><strong className="text-gray-900">Date:</strong> <span className="text-blue-700">{new Date().toLocaleDateString('en-IN')}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <h4 className="text-lg font-bold text-green-900 mb-4 border-b border-green-400 pb-2">
                FOR {companyData.name.toUpperCase()}
              </h4>
              <div className="text-sm text-gray-800 space-y-2 bg-white/70 p-4 rounded-lg">
                <p><strong className="text-gray-900">Authorized By:</strong> <span className="text-green-700">{authorizedBy.name}</span></p>
                <p><strong className="text-gray-900">Designation:</strong> <span className="text-green-700">{authorizedBy.designation}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Information */}
      <Card className="border-2 border-gray-400 bg-gradient-to-r from-gray-50 to-blue-50 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center space-y-3 mb-6">
            <p className="text-sm text-gray-700 italic bg-white/50 p-3 rounded-lg">
              This is a computer-generated invoice.
            </p>
            <p className="text-sm text-gray-700 italic bg-white/50 p-3 rounded-lg">
              No physical signature required.
            </p>
          </div>

          <div className="pt-4 border-t-2 border-gray-400">
            <div className="text-sm text-gray-800 space-y-2 bg-white/70 p-4 rounded-lg">
              <p><strong className="text-gray-900">Registered office address:</strong> <span className="text-gray-700">{companyData.registeredAddress}</span></p>
              <p><strong className="text-gray-900">GST Reg No:</strong> <span className="text-blue-700 font-mono">{companyData.gstin}</span></p>
              {companyData.cin && <p><strong className="text-gray-900">CIN:</strong> <span className="text-blue-700 font-mono">{companyData.cin}</span></p>}
              {eInvoiceReference && (
                <p><strong className="text-gray-900">E-Invoice Reference:</strong> <span className="text-blue-700 font-mono">{eInvoiceReference}</span></p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
