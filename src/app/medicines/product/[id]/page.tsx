'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { addToCart as addToCartStore, clearCart } from '@/lib/cart-store'
import {
  ChevronRight,
  Home,
  ShoppingCart,
  FileText,
  AlertCircle,
  CheckCircle,
  Minus,
  Plus,
  Heart,
  Share2,
  Shield,
  Truck,
  RotateCcw,
  Stethoscope
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Product {
  id: string
  name: string
  category: string
  manufacturer: string
  salt_composition: string
  uses: string
  side_effects: string
  storage_instructions: string
  description: string
  prescription_required: boolean
  mrp: number
  agorich_price: number
  retailer_price: number
  stock: number
  images: string[]
  thumbnail: string
  pdf_url: string
  pack_size: string
}

const tabs = [
  { id: 'introduction', label: 'Product Intro' },
  { id: 'uses', label: 'Benefits' },
  { id: 'side_effects', label: 'Side Effects' },
  { id: 'how_to_use', label: 'How to Use' },
]

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const { user } = useSupabaseAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [activeTab, setActiveTab] = useState('introduction')
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()

      if (data.success) {
        console.log('Product loaded:', data.product)
        setProduct(data.product)
      } else {
        setError('Failed to load product: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      setError('Error fetching product: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBuyNow = () => {
    if (!product) return
    // Replace any existing cart with this single-item "Buy Now" selection
    clearCart()
    addToCartStore({
      productId: product.id,
      name: product.name,
      manufacturer: product.manufacturer,
      category: product.category,
      mrp: product.mrp,
      agorich_price: product.agorich_price,
      retailer_price: product.retailer_price,
      pack_size: product.pack_size,
      stock: product.stock,
      thumbnail: product.thumbnail,
      quantity,
    })

    if (!user) {
      router.push(`/login?redirect=/retailer/create-invoice`)
    } else {
      router.push(`/retailer/create-invoice`)
    }
  }

  const handleAddToCart = () => {
    if (!product) return
    addToCartStore({
      productId: product.id,
      name: product.name,
      manufacturer: product.manufacturer,
      category: product.category,
      mrp: product.mrp,
      agorich_price: product.agorich_price,
      retailer_price: product.retailer_price,
      pack_size: product.pack_size,
      stock: product.stock,
      thumbnail: product.thumbnail,
      quantity,
    })

    if (!user) {
      router.push(`/login?redirect=/retailer/create-invoice`)
    } else {
      // Already stored in localStorage; show toast / badge update instead of alert
      // For now a subtle toast-like banner could be added; keeping it minimal
    }
  }

  const getDiscountPercent = () => {
    if (!product?.mrp || !product?.agorich_price || product.mrp <= product.agorich_price) return 0
    return Math.round(((product.mrp - product.agorich_price) / product.mrp) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'Product not found'}</p>
          <Button onClick={() => router.push('/medicines')}>
            Back to Medicines
          </Button>
        </div>
      </div>
    )
  }

  const discount = getDiscountPercent()
  // Reorder images so box image comes first (if exists)
  const rawImages = product.images || [product.thumbnail].filter(Boolean)
  const images = [...rawImages].sort((a, b) => {
    // Box images (_Box.png) should come first
    const aIsBox = a.toLowerCase().includes('_box')
    const bIsBox = b.toLowerCase().includes('_box')
    if (aIsBox && !bIsBox) return -1
    if (!aIsBox && bIsBox) return 1
    return 0
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-background border-b border-slate-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-muted-foreground">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/medicines" className="hover:text-slate-900 dark:hover:text-white">
              Medicines
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/medicines/category/${product.category}`} className="hover:text-slate-900 dark:hover:text-white">
              {product.category}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image with Mouse-Tracking Zoom */}
            <div 
              className="relative aspect-square bg-white dark:bg-background rounded-2xl border border-slate-200 dark:border-border overflow-hidden cursor-zoom-in"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                setMousePos({ x, y })
              }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {images[selectedImage] ? (
                <Image
                  src={images[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-contain p-6 transition-transform duration-200 ease-out"
                  style={{
                    transform: isHovering ? `scale(2.5)` : 'scale(1)',
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                  }}
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Stethoscope className="w-24 h-24 text-slate-300 dark:text-slate-600" />
                </div>
              )}
              
              {/* Wishlist & Share */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="p-2 bg-white dark:bg-card rounded-full shadow-lg hover:shadow-xl transition-shadow">
                  <Heart className="w-5 h-5 text-muted-foreground hover:text-red-500" />
                </button>
                <button className="p-2 bg-white dark:bg-card rounded-full shadow-lg hover:shadow-xl transition-shadow">
                  <Share2 className="w-5 h-5 text-muted-foreground hover:text-blue-500" />
                </button>
              </div>

              {/* Prescription Badge */}
              {product.prescription_required && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Prescription Required
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-20 h-20 rounded-lg border-2 overflow-hidden flex-shrink-0 ${
                      selectedImage === idx 
                        ? 'border-blue-500' 
                        : 'border-slate-200 dark:border-border'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - ${idx + 1}`}
                      fill
                      className="object-contain p-2"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* PDF Download */}
            {product.pdf_url && (
              <a 
                href={product.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-600">View Product Information (PDF)</span>
              </a>
            )}
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {product.name}
              </h1>
              <p className="text-slate-600 dark:text-muted-foreground">
                {product.manufacturer || 'Agorich Pharmaceuticals Pvt Ltd'}
              </p>
            </div>

            {/* Salt Composition */}
            <div className="p-4 bg-slate-100 dark:bg-background rounded-xl">
              <p className="text-sm text-slate-500 dark:text-muted-foreground mb-1">Salt Composition</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {product.salt_composition || 'Not available'}
              </p>
            </div>

            {/* Price Section */}
            <div className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 p-6 rounded-2xl border border-orange-200 dark:border-orange-800">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  ₹{product.agorich_price || 0}
                </span>
                {product.mrp > product.agorich_price && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      ₹{product.mrp}
                    </span>
                    <span className="text-green-600 font-semibold">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-muted-foreground">
                Inclusive of all taxes
              </p>
              <p className="text-sm text-muted-foreground dark:text-slate-500 mt-1">
                Pack Size: {product.pack_size || '10 Tablets'}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-medium text-slate-900 dark:text-white">Quantity:</span>
              <div className="flex items-center border border-slate-200 dark:border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-background"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-background"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? `${product.stock} units available` : 'Out of stock'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                variant="outline"
                className="flex-1 h-14 text-lg font-semibold border-2"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
              >
                Buy Now
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-200 dark:border-border">
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-1 text-green-500" />
                <p className="text-xs text-slate-600 dark:text-muted-foreground">100% Genuine</p>
              </div>
              <div className="text-center">
                <RotateCcw className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                <p className="text-xs text-slate-600 dark:text-muted-foreground">Easy Returns</p>
              </div>
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                <p className="text-xs text-slate-600 dark:text-muted-foreground">Free Delivery</p>
              </div>
            </div>

            {/* Product Info Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="introduction" className="mt-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold mb-3">Product Information</h3>
                  <p className="text-slate-600 dark:text-muted-foreground">
                    {product.description || 'No description available'}
                  </p>
                  
                  {product.uses && (
                    <>
                      <h4 className="font-semibold mt-4 mb-2">Uses & Benefits</h4>
                      <p className="text-slate-600 dark:text-muted-foreground">{product.uses}</p>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="uses" className="mt-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold mb-3">Benefits</h3>
                  <p className="text-slate-600 dark:text-muted-foreground">
                    {product.uses || 'Benefits information not available'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="side_effects" className="mt-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Side Effects
                  </h3>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <p className="text-slate-700 dark:text-slate-300">
                      {product.side_effects || 'No known side effects information available'}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 mt-4">
                    Consult your doctor if you experience any unusual symptoms.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="how_to_use" className="mt-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold mb-3">Storage & Usage Instructions</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                    <p className="text-slate-700 dark:text-slate-300">
                      {product.storage_instructions || 'Store in a cool, dry place away from direct sunlight.'}
                    </p>
                  </div>
                  
                  {product.prescription_required && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        This medicine requires a valid prescription. Please consult your doctor before purchasing.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
