'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProductForm from '@/components/distributor/ProductForm'
import { supabase } from '@/lib/supabase-client'
import { Spinner } from '@phosphor-icons/react'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [distributorId, setDistributorId] = useState<string | null>(null)
  const [product, setProduct] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'DISTRIBUTOR') {
          router.replace('/login')
          return
        }

        setDistributorId(profile.id)

        const { data: productData, error } = await supabase
          .from('distributor_products')
          .select('*')
          .eq('id', productId)
          .eq('distributor_id', profile.id)
          .single()

        if (error || !productData) {
          router.replace('/distributor/inventory')
          return
        }

        setProduct({
          ...productData,
          expiry_date: productData.expiry_date || ''
        })
      } catch (error) {
        console.error('Error fetching data:', error)
        router.replace('/distributor/inventory')
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchData()
    }
  }, [productId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <Spinner className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!distributorId || !product) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
      <div className="max-w-3xl mx-auto">
        <ProductForm
          distributorId={distributorId}
          product={product}
          mode="edit"
        />
      </div>
    </div>
  )
}
