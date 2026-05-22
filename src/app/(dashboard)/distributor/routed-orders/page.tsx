"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { 
  ShoppingCart,
  Receipt,
  Gear,
  SignOut,
  List,
  CheckCircle,
  Clock,
  X,
  Bell,
  House,
  FileText,
  Package,
  Star,
  CurrencyInr,
  TrendUp,
  Target,
  Sun,
  Moon,
  MapPin,
  CaretDown,
  CaretUp,
  Pill,
  CreditCard,
  Calendar,
  MapTrifold,
  Truck,
  Lightning
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Protected from '@/components/Protected'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  rate: number
  total: number
  batch_number?: string
  expiry_date?: string
}

interface RoutedOrder {
  id: string
  order_number: string
  retailer_name: string
  retailer_pincode: string
  retailer_address: string
  retailer_city?: string
  retailer_district?: string
  total_amount: number
  margin: number
  margin_percentage: number
  logistics_cost: number
  net_profit: number
  distance_km: number
  status: string
  created_at: string
  items: OrderItem[]
}

export default function RoutedOrders() {
  const router = useRouter()
  const { user, profile } = useSupabaseAuth()
  const userId = user?.id || ''
  
  // Use next-themes for theme management
  const { theme, setTheme } = useTheme()
  const darkMode = theme === 'dark'
  
  const [routedOrders, setRoutedOrders] = useState<RoutedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      if (!userId) return

      setLoading(true)

      try {
        const res = await fetch('/api/distributor/routed-orders')
        if (res.ok) {
          const data = await res.json()
          setRoutedOrders(data.data || [])
        } else {
          console.warn('Failed to fetch routed orders, using empty array')
          setRoutedOrders([])
        }
      } catch (error) {
        console.error('Error loading routed orders:', error)
        setRoutedOrders([])
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [userId])

  const handleSmartDispatch = async (orderId: string) => {
    try {
      setDispatchingOrderId(orderId)
      console.log('[Routed Orders] Smart Dispatch for order:', orderId)
      
      const order = routedOrders.find(o => o.id === orderId)
      if (!order) throw new Error('Order not found')

      const { supabase } = await import('@/lib/supabase-client')
      
      const result = await supabase.rpc('smart_dispatch_order', {
        p_order_id: orderId,
        p_distributor_id: userId,
        p_margin_percentage: order.margin_percentage
      })

      if (result.error) throw result.error

      setRoutedOrders(prev => 
        prev.map(o => 
          o.id === orderId 
            ? { ...o, status: 'DISPATCHED' } 
            : o
        )
      )
      
      alert('✅ Smart Dispatch successful! Inventory deducted and earnings recorded.')
    } catch (error) {
      console.error('[Routed Orders] Error in Smart Dispatch:', error)
      alert('❌ Failed to dispatch order. Please try again.')
    } finally {
      setDispatchingOrderId(null)
    }
  }

  const getGoogleMapsUrl = (address: string, pincode: string) => {
    const query = encodeURIComponent(`${address}, ${pincode}, Bihar, India`)
    return `https://www.google.com/maps/search/?api=1&query=${query}`
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'ACCEPTED':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'PACKED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'DISPATCHED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  return (
    <Protected>
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="text-lg md:text-xl font-semibold text-foreground">
              Routed Orders
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
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor')}
          >
            <House className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Dashboard</span>
          </Button>

          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor/create-invoice')}
          >
            <Package className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Order Now</span>
          </Button>

          <Button 
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-400/60 transition-all duration-300 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white scale-[1.02] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/60 hover:scale-[1.03]"
            onClick={() => router.push('/distributor/routed-orders')}
          >
            <List className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-semibold">Routed Orders</span>
          </Button>

          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor/payables')}
          >
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Payables</span>
          </Button>

          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/distributor/expiry-watchlist')}
          >
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Expiry Watchlist</span>
          </Button>

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
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 dark:border-emerald-400"></div>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {routedOrders.length === 0 ? (
              <Card className="rounded-3xl">
                <CardContent className="p-8 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="fill" />
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    No Routed Orders Yet
                  </h3>
                  <p className="text-muted-foreground">
                    Orders assigned to you will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              routedOrders.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {order.order_number}
                            </span>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <p className={`text-base ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              <span className="font-semibold">{order.retailer_name}</span>
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              <MapPin className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {order.retailer_address}, {order.retailer_pincode}
                              </p>
                              <a
                                href={getGoogleMapsUrl(order.retailer_address, order.retailer_pincode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
                              >
                                <MapTrifold className="w-4 h-4" />
                                Open in Maps
                              </a>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Truck className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                Distance: {order.distance_km} km
                              </span>
                            </div>

                            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              <Clock className="w-4 h-4 inline mr-1" />
                              Order Date: {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                          <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total</div>
                            <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(order.total_amount)}
                            </div>
                          </div>
                          
                          <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                            <div className={`text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Margin ({order.margin_percentage}%)</div>
                            <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(order.margin)}
                            </div>
                          </div>
                          
                          <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                            <div className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>Logistics</div>
                            <div className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                              {formatCurrency(order.logistics_cost)}
                            </div>
                          </div>
                          
                          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <div className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Net Profit</div>
                            <div className="flex items-center justify-center gap-1 font-bold text-lg text-green-600 dark:text-green-400">
                              <TrendUp className="w-4 h-4" />
                              {formatCurrency(order.net_profit)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:w-48">
                          {order.status === 'ASSIGNED' && (
                            <Button
                              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white"
                              onClick={() => handleSmartDispatch(order.id)}
                              disabled={dispatchingOrderId === order.id}
                            >
                              {dispatchingOrderId === order.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  Dispatching...
                                </>
                              ) : (
                                <>
                                  <Lightning className="w-4 h-4 mr-2" weight="fill" />
                                  Smart Dispatch
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => setExpandedOrderId(
                              expandedOrderId === order.id ? null : order.id
                            )}
                          >
                            {expandedOrderId === order.id ? (
                              <>
                                <CaretUp className="w-4 h-4 mr-2" />
                                Hide Items
                              </>
                            ) : (
                              <>
                                <CaretDown className="w-4 h-4 mr-2" />
                                View Items
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {expandedOrderId === order.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-slate-200 dark:border-slate-700 pt-4"
                        >
                          <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Pill className="w-4 h-4 inline mr-2" />
                            Order Items (with Batch Details)
                          </h4>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className={darkMode ? 'border-slate-700' : 'border-slate-200'}>
                                  <TableHead className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Product</TableHead>
                                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-right`}>Batch</TableHead>
                                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-right`}>Expiry</TableHead>
                                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-right`}>Qty</TableHead>
                                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-right`}>Rate</TableHead>
                                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-right`}>Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.items.map(item => (
                                  <TableRow key={item.id} className={darkMode ? 'border-slate-700' : 'border-slate-200'}>
                                    <TableCell className={`${darkMode ? 'text-white' : 'text-slate-900'} font-medium`}>
                                      {item.product_name}
                                    </TableCell>
                                    <TableCell className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-right font-mono text-xs`}>
                                      {item.batch_number || '—'}
                                    </TableCell>
                                    <TableCell className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-right`}>
                                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-IN') : '—'}
                                    </TableCell>
                                    <TableCell className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-right font-semibold`}>
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-right`}>
                                      {formatCurrency(item.rate)}
                                    </TableCell>
                                    <TableCell className={`${darkMode ? 'text-white' : 'text-slate-900'} text-right font-bold`}>
                                      {formatCurrency(item.total)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </motion.div>
                      )}
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
