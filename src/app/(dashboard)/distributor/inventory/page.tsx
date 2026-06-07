'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase-client'
import { Spinner } from '@phosphor-icons/react'
import { Plus, Pencil, Trash2, Package, Search, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import type { DistributorProduct } from '@/components/distributor/ProductForm'

export default function DistributorInventoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [distributorId, setDistributorId] = useState<string | null>(null)
  const [products, setProducts] = useState<DistributorProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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

        const { data: productsData } = await supabase
          .from('distributor_products')
          .select('*')
          .eq('distributor_id', profile.id)
          .order('created_at', { ascending: false })

        setProducts(productsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.molecule_name && product.molecule_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleToggleActive = async (product: DistributorProduct) => {
    if (!distributorId) return

    try {
      const { error } = await supabase
        .from('distributor_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)
        .eq('distributor_id', distributorId)

      if (!error) {
        setProducts(prev =>
          prev.map(p =>
            p.id === product.id ? { ...p, is_active: !p.is_active } : p
          )
        )
      }
    } catch (error) {
      console.error('Error toggling product:', error)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!distributorId) return

    try {
      const { error } = await supabase
        .from('distributor_products')
        .delete()
        .eq('id', productId)
        .eq('distributor_id', distributorId)

      if (!error) {
        setProducts(prev => prev.filter(p => p.id !== productId))
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null
    const expiry = new Date(dateStr)
    const today = new Date()
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getExpiryBadge = (dateStr: string | null) => {
    const days = getDaysUntilExpiry(dateStr)
    if (days === null) return null
    if (days <= 0) return <Badge variant="destructive">Expired</Badge>
    if (days <= 30) return <Badge variant="destructive">{days}d left</Badge>
    if (days <= 90) return <Badge variant="warning">Expires in {days}d</Badge>
    return <Badge variant="secondary">{formatDate(dateStr)}</Badge>
  }

  const isLowStock = (qty: number) => qty > 0 && qty <= 10
  const isOutOfStock = (qty: number) => qty === 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <Spinner className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Digital Shelf</h1>
            <p className="text-muted-foreground">Manage your products for online sale</p>
          </div>
          <Link href="/distributor/inventory/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              Add New Product
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 dark:bg-indigo-500/20 rounded-lg">
                  <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total Products</p>
                  <p className="text-2xl font-bold text-foreground">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <ToggleRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Active</p>
                  <p className="text-2xl font-bold text-foreground">{products.filter(p => p.is_active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <ToggleLeft className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Low Stock</p>
                  <p className="text-2xl font-bold text-foreground">{products.filter(p => isLowStock(p.stock_qty)).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Out of Stock</p>
                  <p className="text-2xl font-bold text-foreground">{products.filter(p => isOutOfStock(p.stock_qty)).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by product name or molecule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Products Table */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground">Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No products found</p>
                <Link href="/distributor/inventory/new">
                  <Button variant="outline" className="mt-4 border-input text-foreground hover:bg-muted">
                    Add Your First Product
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Source</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">MRP</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">PTR</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Stock</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Expiry</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{product.product_name}</p>
                            {product.molecule_name && (
                              <p className="text-sm text-muted-foreground">{product.molecule_name}</p>
                            )}
                            {product.batch_number && (
                              <p className="text-xs text-muted-foreground/50">Batch: {product.batch_number}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={product.product_source === 'PROPRIETARY' ? 'default' : 'secondary'}
                            className={product.product_source === 'PROPRIETARY' ? 'bg-amber-500' : ''}
                          >
                            {product.product_source === 'PROPRIETARY' ? 'Proprietary' : 'Marketplace'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-foreground">{formatCurrency(product.mrp)}</td>
                        <td className="px-4 py-3 text-foreground">{formatCurrency(product.selling_price)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${
                            isOutOfStock(product.stock_qty) ? 'text-red-600 dark:text-red-400' :
                            isLowStock(product.stock_qty) ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'
                          }`}>
                            {product.stock_qty}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getExpiryBadge(product.expiry_date)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(product)}
                            className="flex items-center gap-2"
                          >
                            {product.is_active ? (
                              <>
                                <ToggleRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Inactive</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/distributor/inventory/edit/${product.id}`}>
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </Link>
                            {deleteConfirm === product.id ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                onClick={() => setDeleteConfirm(product.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
