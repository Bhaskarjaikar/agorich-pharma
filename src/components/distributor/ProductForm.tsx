'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase-client'
import { Spinner } from '@phosphor-icons/react'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface ProductFormProps {
  distributorId: string
  product?: DistributorProduct
  mode?: 'create' | 'edit'
}

export interface DistributorProduct {
  id: string
  distributor_id: string
  product_name: string
  molecule_name: string | null
  mrp: number
  selling_price: number
  stock_qty: number
  batch_number: string | null
  expiry_date: string | null
  is_active: boolean
  product_source: 'MARKETPLACE' | 'PROPRIETARY'
}

export default function ProductForm({ distributorId, product, mode = 'create' }: ProductFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    product_name: product?.product_name || '',
    molecule_name: product?.molecule_name || '',
    mrp: product?.mrp?.toString() || '',
    selling_price: product?.selling_price?.toString() || '',
    stock_qty: product?.stock_qty?.toString() || '',
    batch_number: product?.batch_number || '',
    expiry_date: product?.expiry_date || '',
    product_source: product?.product_source || 'MARKETPLACE',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = (): boolean => {
    if (!formData.product_name.trim()) {
      setError('Product name is required')
      return false
    }
    if (!formData.mrp || parseFloat(formData.mrp) <= 0) {
      setError('MRP must be greater than 0')
      return false
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      setError('Selling price must be greater than 0')
      return false
    }
    if (parseFloat(formData.selling_price) > parseFloat(formData.mrp)) {
      setError('Selling price cannot exceed MRP')
      return false
    }
    if (!formData.stock_qty || parseInt(formData.stock_qty) < 0) {
      setError('Stock quantity must be 0 or more')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!validateForm()) return

    setLoading(true)

    try {
      const payload = {
        distributor_id: distributorId,
        product_name: formData.product_name.trim(),
        molecule_name: formData.molecule_name.trim() || null,
        mrp: parseFloat(formData.mrp),
        selling_price: parseFloat(formData.selling_price),
        stock_qty: parseInt(formData.stock_qty),
        batch_number: formData.batch_number.trim() || null,
        expiry_date: formData.expiry_date || null,
        product_source: formData.product_source,
        is_active: true,
      }

      let result

      if (isEdit && product?.id) {
        result = await supabase
          .from('distributor_products')
          .update(payload)
          .eq('id', product.id)
          .eq('distributor_id', distributorId)
          .select()
          .single()
      } else {
        result = await supabase
          .from('distributor_products')
          .insert(payload)
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      setSuccess(true)

      if (!isEdit) {
        setTimeout(() => {
          router.push('/distributor/inventory')
        }, 1500)
      }
    } catch (err: any) {
      console.error('Product save error:', err)
      setError(err.message || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Link href="/distributor/inventory">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <CardTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</CardTitle>
            <CardDescription>
              {isEdit ? 'Update product details' : 'Enter your product details manually'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {isEdit ? 'Product updated successfully!' : 'Product added successfully! Redirecting...'}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="product_name">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product_name"
                name="product_name"
                placeholder="e.g. Paracetamol 500mg"
                value={formData.product_name}
                onChange={handleChange}
                required
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="molecule_name">Molecule / Salt Name</Label>
              <Input
                id="molecule_name"
                name="molecule_name"
                placeholder="e.g. Paracetamol"
                value={formData.molecule_name}
                onChange={handleChange}
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_source">Product Source</Label>
              <select
                id="product_source"
                name="product_source"
                value={formData.product_source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md text-sm text-foreground bg-background"
              >
                <option value="MARKETPLACE">Marketplace (Other Brands)</option>
                <option value="PROPRIETARY">Proprietary (Agorich Brands)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mrp">
                MRP (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mrp"
                name="mrp"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.mrp}
                onChange={handleChange}
                required
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selling_price">
                Selling Price / PTR (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="selling_price"
                name="selling_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.selling_price}
                onChange={handleChange}
                required
                className="text-foreground"
              />
              <p className="text-xs text-muted-foreground">Price at which retailer will buy</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_qty">
                Stock Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stock_qty"
                name="stock_qty"
                type="number"
                min="0"
                placeholder="0"
                value={formData.stock_qty}
                onChange={handleChange}
                required
                className="text-foreground"
              />
              <p className="text-xs text-muted-foreground">Available units for online sale</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                name="batch_number"
                placeholder="e.g. BTH2024001"
                value={formData.batch_number}
                onChange={handleChange}
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                name="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="text-foreground"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update Product' : 'Add Product'
              )}
            </Button>
            <Link href="/distributor/inventory">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
