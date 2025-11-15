'use client'

import Link from 'next/link'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 animate-pulse" />
        <h1 className="text-3xl font-bold text-white mb-3">Payments Coming Soon</h1>
        <p className="text-white/80 mb-6">
          We’re putting the final touches on our seamless payment experience. Stay tuned!
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/retailer/invoices"
            className="px-5 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition"
          >
            Go to Invoices
          </Link>
          <Link
            href="/retailer/create-invoice?restore=true"
            className="px-5 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition"
          >
            Back to Invoice
          </Link>
        </div>
      </div>
    </div>
  )
}







