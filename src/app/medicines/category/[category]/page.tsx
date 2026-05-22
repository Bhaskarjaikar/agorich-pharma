'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { addToCart as addToCartStore, clearCart } from '@/lib/cart-store'
import { 
  Search, 
  ShoppingCart, 
  ChevronRight,
  Bone,
  Brain,
  Pill,
  Wind,
  ArrowLeft,
  Home
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

const categoryData: Record<string, { name: string; icon: React.ElementType; color: string; description: string }> = {
  Orthopedics: { 
    name: 'Orthopedics', 
    icon: Bone, 
    color: 'from-blue-500 to-cyan-500',
    description: 'Pain relief and bone health medicines'
  },
  Neurology: { 
    name: 'Neurology', 
    icon: Brain, 
    color: 'from-purple-500 to-pink-500',
    description: 'Brain and nerve health supplements'
  },
  Respiratory: { 
    name: 'Respiratory', 
    icon: Wind, 
    color: 'from-green-500 to-emerald-500',
    description: 'Breathing and allergy relief medicines'
  },
  Neutraceuticals: { 
    name: 'Neutraceuticals', 
    icon: Pill, 
    color: 'from-orange-500 to-red-500',
    description: 'Nutritional supplements for wellness'
  },
}

export default function CategoryPage() {
  const router = useRouter()
  const params = useParams()
  const category = params.category as string
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [error, setError] = useState('')

  const categoryInfo = categoryData[category] || { 
    name: category, 
    icon: Pill, 
    color: 'from-slate-500 to-slate-600',
    description: 'Medicines for your health'
  }

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      let url = `/api/products?category=${encodeURIComponent(category)}&limit=100`

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
  }, [category, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    fetchProducts()
  }, [category, debouncedSearch, fetchProducts])

  const { user } = useSupabaseAuth()

  const handleBuyNow = (product: Product) => {
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

  const CategoryIcon = categoryInfo.icon

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero Banner */}
      <div className={`bg-gradient-to-r ${categoryInfo.color} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/80 text-sm mb-6">
            <Link href="/" className="hover:text-white flex items-center gap-1">
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/medicines" className="hover:text-white">
              Medicines
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">{categoryInfo.name}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <CategoryIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{categoryInfo.name}</h1>
              <p className="text-white/90 text-lg">{categoryInfo.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link 
            href="/medicines" 
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>View All Medicines</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder={`Search ${categoryInfo.name} medicines...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg rounded-full border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-slate-600 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{products.length}</span> {categoryInfo.name} medicines
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
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
            <p className="text-slate-500 dark:text-slate-400 text-lg">No {categoryInfo.name} medicines found</p>
            <p className="text-slate-400 dark:text-slate-500 mt-2">Try adjusting your search</p>
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
                      disabled={product.stock === 0}
                      className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy Now
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
