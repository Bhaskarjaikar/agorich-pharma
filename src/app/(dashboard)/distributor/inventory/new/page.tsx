'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProductForm from '@/components/distributor/ProductForm'
import { supabase } from '@/lib/supabase-client'
import { Spinner } from '@phosphor-icons/react'

export default function NewProductPage() {
  const router = useRouter()
  const [distributorId, setDistributorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDistributor = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'DISTRIBUTOR') {
          setDistributorId(profile.id)
        } else {
          router.replace('/login')
        }
      } else {
        router.replace('/login')
      }
      setLoading(false)
    }

    fetchDistributor()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <Spinner className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!distributorId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
      <div className="max-w-3xl mx-auto">
        <ProductForm distributorId={distributorId} mode="create" />
      </div>
    </div>
  )
}
