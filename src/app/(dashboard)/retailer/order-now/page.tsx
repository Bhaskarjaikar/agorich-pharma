'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrderNowPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/retailer/create-invoice')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Order...</p>
      </div>
    </div>
  )
}
