'use client'

import { Card, CardContent } from '@/components/ui/card'

interface PaymentDetailsProps {
  bankDetails: {
    bankName: string
    accountNumber: string
    ifscCode: string
    accountHolder: string
  }
}

export default function PaymentDetails({ bankDetails }: PaymentDetailsProps) {
  return (
    <Card className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50 mb-6 shadow-xl">
      <CardContent className="p-6">
        <h4 className="text-xl font-bold text-purple-900 mb-5 border-b-2 border-purple-400 pb-3 flex items-center">
          <span className="text-2xl mr-2">💳</span>
          Bank Details for Payment:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-white/80 p-5 rounded-lg border-2 border-purple-200 shadow-md">
            <p className="mb-3 text-base"><strong className="text-gray-900 text-lg">Bank Name:</strong></p>
            <p className="text-purple-800 font-bold text-lg mb-4">{bankDetails.bankName}</p>
            <p className="mb-2"><strong className="text-gray-900">Account No:</strong></p>
            <p className="text-purple-700 font-mono text-base bg-purple-100 p-2 rounded">{bankDetails.accountNumber}</p>
          </div>
          <div className="bg-white/80 p-5 rounded-lg border-2 border-purple-200 shadow-md">
            <p className="mb-3 text-base"><strong className="text-gray-900 text-lg">IFSC Code:</strong></p>
            <p className="text-purple-700 font-mono text-lg mb-4 bg-purple-100 p-2 rounded">{bankDetails.ifscCode}</p>
            <p className="mb-2"><strong className="text-gray-900">Account Holder:</strong></p>
            <p className="text-purple-800 font-bold text-base">{bankDetails.accountHolder}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
