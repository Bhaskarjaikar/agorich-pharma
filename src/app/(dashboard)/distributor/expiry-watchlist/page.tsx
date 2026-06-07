"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { 
  Calendar,
  X,
  Sun,
  Moon,
  House,
  Package,
  WarningCircle,
  CheckCircle,
  TrendDown,
  PaperPlaneTilt,
  List,
  CreditCard,
  FileText
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Protected from '@/components/Protected'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

interface ExpiryProduct {
  id: string
  product_name: string
  batch_number: string
  pack_size: string
  quantity: number
  expiry_date: string
  days_until_expiry: number
  mrp: number
}

export default function ExpiryWatchlist() {
  const router = useRouter()
  const { user, profile } = useSupabaseAuth()
  const userId = user?.id || ''
  
  // Use next-themes for theme management
  const { theme, setTheme } = useTheme()
  const darkMode = theme === 'dark'
  
  const [products, setProducts] = useState<ExpiryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('30')

  useEffect(() => {
    const loadProducts = async () => {
      if (!userId) return

      setLoading(true)

      try {
        const res = await fetch(`/api/distributor/expiry-watchlist?days=${filter}`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.data || [])
        } else {
          console.warn('Failed to fetch expiry watchlist, using empty array')
          setProducts([])
        }
      } catch (error) {
        console.error('Error loading expiry watchlist:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [userId, filter])

  const filteredProducts = products.filter(product => {
    const days = parseInt(filter)
    return product.days_until_expiry <= days
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const getExpiryBadge = (days: number) => {
    if (days < 30) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
          <WarningCircle className="w-3 h-3 mr-1" />
          Expiring Soon
        </Badge>
      )
    }
    if (days < 60) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <WarningCircle className="w-3 h-3 mr-1" />
          Monitor
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Safe
      </Badge>
    )
  }

  const handleRequestScheme = (product: ExpiryProduct) => {
    alert(`Request sent to Admin for liquidation scheme on ${product.product_name} (Batch: ${product.batch_number})`)
  }

  return (
    <Protected>
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="text-lg md:text-xl font-semibold text-foreground">
              Expiry Watchlist
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            >
              {darkMode ? <Sun className="w-4 h-4" weight="fill" /> : <Moon className="w-4 h-4" weight="fill" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row gap-2 sm:gap-3 p-2 sm:p-3 rounded-b-3xl shadow-xl backdrop-blur-xl border-2 overflow-x-auto bg-card/95">
          {/* Dashboard - Inactive (Enhanced) */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor')}
          >
            <House className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Dashboard</span>
          </Button>

          {/* Order Now - Inactive */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor/create-invoice')}
          >
            <Package className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Order Now</span>
          </Button>

          {/* Routed Orders - Inactive */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor/routed-orders')}
          >
            <List className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Routed Orders</span>
          </Button>

          {/* Payables - Inactive */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor/payables')}
          >
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Payables</span>
          </Button>

          {/* Expiry Watchlist - Active */}
          <Button 
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-400/60 transition-all duration-300 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white scale-[1.02] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/60 hover:scale-[1.03]"
            onClick={() => router.push('/distributor/expiry-watchlist')}
          >
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-semibold">Expiry Watchlist</span>
          </Button>

          {/* Invoices - Inactive */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor/invoices')}
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Invoices</span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Monitor Expiring Stock
            </h2>
            <p className="text-muted-foreground">
              Track products approaching expiry and request liquidation schemes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Expiring in:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="60">60 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {filteredProducts.length === 0 ? (
              <Card className={`${darkMode ? 'bg-background border-border' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <Package className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-500' : 'text-muted-foreground'}`} weight="fill" />
                  <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    No Expiring Products
                  </h3>
                  <p className={darkMode ? 'text-muted-foreground' : 'text-slate-500'}>
                    Great! No products are expiring in the selected timeframe
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`${darkMode ? 'bg-background border-border' : 'bg-white border-slate-200'} ${
                    product.days_until_expiry < 30 ? 'border-red-500/50' : ''
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {product.product_name}
                            </h3>
                            {getExpiryBadge(product.days_until_expiry)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Batch: </span>
                              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{product.batch_number}</span>
                            </div>
                            <div>
                              <span className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Pack Size: </span>
                              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{product.pack_size}</span>
                            </div>
                            <div>
                              <span className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Quantity: </span>
                              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{product.quantity}</span>
                            </div>
                            <div>
                              <span className={darkMode ? 'text-slate-500' : 'text-slate-500'}>MRP: </span>
                              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{formatCurrency(product.mrp)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="text-center">
                            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              Days Until Expiry
                            </div>
                            <div className={`text-2xl font-bold ${
                              product.days_until_expiry < 30 ? 'text-red-500' :
                              product.days_until_expiry < 60 ? 'text-amber-500' :
                              'text-emerald-500'
                            }`}>
                              {product.days_until_expiry}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                              Expires: {formatDate(product.expiry_date)}
                            </div>
                          </div>

                          {product.days_until_expiry < 60 && (
                            <Button
                              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white"
                              onClick={() => handleRequestScheme(product)}
                            >
                              <PaperPlaneTilt className="w-4 h-4 mr-2" />
                              Request Scheme
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    </Protected>
  )
}
