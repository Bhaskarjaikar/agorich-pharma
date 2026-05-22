'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { addToCart as addToCartStore, clearCart } from '@/lib/cart-store'
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  ChevronRight,
  Heart,
  Stethoscope,
  Bone,
  Brain,
  Pill,
  Wind,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Product {
  id: string
  name: string
  category: string
  manufacturer: string
  mrp: number
  agorich_price: number
  stock: number
  thumbnail: string
  images?: string[]
  prescription_required: boolean
  pack_size: string
}

const categories = [
  { id: 'all', name: 'All Medicines', icon: Stethoscope },
  { id: 'Orthopedics', name: 'Orthopedics', icon: Bone },
  { id: 'Neurology', name: 'Neurology', icon: Brain },
  { id: 'Respiratory', name: 'Respiratory', icon: Wind },
  { id: 'Neutraceuticals', name: 'Neutraceuticals', icon: Pill },
]

export default function MedicinesPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [error, setError] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      let url = '/api/products?limit=100'

      if (selectedCategory !== 'all') {
        url += `&category=${encodeURIComponent(selectedCategory)}`
      }

      if (debouncedSearch) {
        url += `&q=${encodeURIComponent(debouncedSearch)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setProducts(data.products || [])
      } else {
        setError('Failed to load products')
      }
    } catch (err) {
      setError('Error fetching products')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, debouncedSearch, fetchProducts])

  const { user, loading: authLoading } = useSupabaseAuth()

  const handleBuyNow = (product: Product) => {
    // Buy Now: replace cart with this single item for immediate checkout
    clearCart()
    addToCartStore({
      productId: product.id,
      name: product.name,
      manufacturer: product.manufacturer,
      category: product.category,
      mrp: product.mrp,
      agorich_price: product.agorich_price,
      retailer_price: product.agorich_price,
      pack_size: product.pack_size,
      stock: product.stock,
      thumbnail: product.thumbnail,
      quantity: 1,
    })

    if (!user) {
      router.push(`/login?redirect=/retailer/create-invoice`)
    } else {
      router.push(`/retailer/create-invoice`)
    }
  }

  const getDiscountPercent = (mrp: number, price: number) => {
    if (!mrp || !price || mrp <= price) return 0
    return Math.round(((mrp - price) / mrp) * 100)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </Link>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Our Medicines</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search medicines by name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg rounded-full border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-slate-600 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{products.length}</span> medicines
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchProducts} className="mt-4">Retry</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 text-lg">No medicines found</p>
            <p className="text-slate-400 dark:text-slate-500 mt-2">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const discount = getDiscountPercent(product.mrp, product.agorich_price)
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all"
                >
                  {/* Product Image - Box image first, full cover */}
                  <Link href={`/medicines/product/${product.id}`} className="block relative h-48 bg-white dark:bg-slate-800 overflow-hidden">
                    {(() => {
                      const boxImage = product.images?.find((img: string) => img.toLowerCase().includes('_box'))
                      const imageUrl = boxImage || product.thumbnail
                      if (!imageUrl) {
                        return (
                          <div className="flex items-center justify-center h-full">
                            <Pill className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                          </div>
                        )
                      }
                      return (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      )
                    })()}
                    {product.prescription_required && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Rx Required
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {discount}% OFF
                      </div>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link href={`/medicines/product/${product.id}`}>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2 hover:text-blue-600">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      {product.manufacturer || 'Agorich Pharmaceuticals'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                      {product.pack_size || '10 Tablets'}
                    </p>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-xl font-bold text-slate-900 dark:text-white">
                        ₹{product.agorich_price || 0}
                      </span>
                      {product.mrp > product.agorich_price && (
                        <span className="text-sm text-slate-400 line-through">
                          ₹{product.mrp}
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Buy Button */}
                    <Button
                      onClick={() => handleBuyNow(product)}
                      disabled={product.stock === 0 || authLoading}
                      className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {authLoading ? 'Loading...' : 'Buy Now'}
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
