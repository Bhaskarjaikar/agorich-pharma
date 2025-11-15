'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Star,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
// Authentication removed

interface Product {
  id: string
  name: string
  category: string
  manufacturer: string
  mrp: number
  stock: number
  description: string
  composition: string
  dosage: string
  indications: string
  contraindications: string
  sideEffects: string
  packSize: string
  expiryDate: string
  batchNumber: string
  rating: number
  isPrescriptionRequired: boolean
  therapeuticClass: string
  image?: string
  createdAt: string
  updatedAt: string
}

export default function InventoryPage() {
  // Authentication removed - no auth needed
  // No access control needed

  const [products, setProducts] = useState<Product[]>([])
  const [isInventoryLoading, setIsInventoryLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // New product form state
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    category: '',
    manufacturer: '',
    mrp: 0,
    stock: 0,
    description: '',
    composition: '',
    dosage: '',
    indications: '',
    contraindications: '',
    sideEffects: '',
    packSize: '',
    expiryDate: '',
    batchNumber: '',
    rating: 0,
    isPrescriptionRequired: false,
    therapeuticClass: '',
    image: ''
  })

  // Load products from localStorage
  useEffect(() => {
    const loadProducts = () => {
      try {
        const savedProducts = JSON.parse(localStorage.getItem('inventoryProducts') || '[]')
        setProducts(savedProducts)
      } catch (error) {
        console.error('Error loading products:', error)
        setProducts([])
      } finally {
        setIsInventoryLoading(false)
      }
    }

    loadProducts()
  }, [])

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean)

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.category || !newProduct.manufacturer) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (Name, Category, Manufacturer).' })
      return
    }

    const product: Product = {
      ...newProduct,
      id: `product-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedProducts = [...products, product]
    setProducts(updatedProducts)
    localStorage.setItem('inventoryProducts', JSON.stringify(updatedProducts))
    
    setNewProduct({
      name: '',
      category: '',
      manufacturer: '',
      mrp: 0,
      stock: 0,
      description: '',
      composition: '',
      dosage: '',
      indications: '',
      contraindications: '',
      sideEffects: '',
      packSize: '',
      expiryDate: '',
      batchNumber: '',
      rating: 0,
      isPrescriptionRequired: false,
      therapeuticClass: '',
      image: ''
    })
    
    setShowAddProduct(false)
    setMessage({ type: 'success', text: 'Product added successfully!' })
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      name: product.name,
      category: product.category,
      manufacturer: product.manufacturer,
      mrp: product.mrp,
      stock: product.stock,
      description: product.description,
      composition: product.composition,
      dosage: product.dosage,
      indications: product.indications,
      contraindications: product.contraindications,
      sideEffects: product.sideEffects,
      packSize: product.packSize,
      expiryDate: product.expiryDate,
      batchNumber: product.batchNumber,
      rating: product.rating,
      isPrescriptionRequired: product.isPrescriptionRequired,
      therapeuticClass: product.therapeuticClass,
      image: product.image || ''
    })
    setShowAddProduct(true)
  }

  const handleUpdateProduct = () => {
    if (!editingProduct) return

    const updatedProducts = products.map(p => 
      p.id === editingProduct.id 
        ? { ...newProduct, id: editingProduct.id, createdAt: editingProduct.createdAt, updatedAt: new Date().toISOString() }
        : p
    )
    
    setProducts(updatedProducts)
    localStorage.setItem('inventoryProducts', JSON.stringify(updatedProducts))
    
    setEditingProduct(null)
    setShowAddProduct(false)
    setNewProduct({
      name: '',
      category: '',
      manufacturer: '',
      mrp: 0,
      stock: 0,
      description: '',
      composition: '',
      dosage: '',
      indications: '',
      contraindications: '',
      sideEffects: '',
      packSize: '',
      expiryDate: '',
      batchNumber: '',
      rating: 0,
      isPrescriptionRequired: false,
      therapeuticClass: '',
      image: ''
    })
    
    setMessage({ type: 'success', text: 'Product updated successfully!' })
  }

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const updatedProducts = products.filter(p => p.id !== productId)
      setProducts(updatedProducts)
      localStorage.setItem('inventoryProducts', JSON.stringify(updatedProducts))
      setMessage({ type: 'success', text: 'Product deleted successfully!' })
    }
  }

  const handleCancel = () => {
    setShowAddProduct(false)
    setEditingProduct(null)
    setNewProduct({
      name: '',
      category: '',
      manufacturer: '',
      mrp: 0,
      stock: 0,
      description: '',
      composition: '',
      dosage: '',
      indications: '',
      contraindications: '',
      sideEffects: '',
      packSize: '',
      expiryDate: '',
      batchNumber: '',
      rating: 0,
      isPrescriptionRequired: false,
      therapeuticClass: '',
      image: ''
    })
  }

  if (isInventoryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto mb-6"></div>
          <p className="text-white text-xl">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/retailer" className="flex items-center text-white/70 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                    <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                      <Image 
                        src="/agorich-logo.png" 
                        alt="Agorich Logo" 
                        width={32} 
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">Inventory Management</h1>
                  <p className="text-sm text-white/70">Manage your pharmaceutical products</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowAddProduct(true)}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Message Display */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center backdrop-blur-sm border ${
              message.type === 'success' 
                ? 'bg-green-500/20 border-green-400/30 text-green-100' 
                : 'bg-red-500/20 border-red-400/30 text-red-100'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Total Products</p>
                    <p className="text-3xl font-bold text-white">{products.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-500 to-emerald-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-100">In Stock</p>
                    <p className="text-3xl font-bold text-white">
                      {products.filter(p => p.stock > 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-100">Low Stock</p>
                    <p className="text-3xl font-bold text-white">
                      {products.filter(p => p.stock > 0 && p.stock < 20).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-100">Categories</p>
                    <p className="text-3xl font-bold text-white">{categories.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-blue-400" />
                  <Input
                    placeholder="Search products by name, manufacturer, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48 h-12 bg-white/10 border-white/20 text-white focus:bg-white/20 focus:border-blue-400">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Product Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg leading-tight">{product.name}</h3>
                        <p className="text-sm text-white/70 mt-1">{product.manufacturer}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs border-white/20 text-white/80">
                            {product.category}
                          </Badge>
                          {product.isPrescriptionRequired && (
                            <Badge className="bg-red-500/20 text-red-200 border-red-400/30 text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Rx
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                          className="bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="bg-red-500/20 border-red-400/30 text-red-100 hover:bg-red-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-sm text-white/80 line-clamp-2">{product.description}</p>
                    </div>

                    {/* Stock and Pricing */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <span className="text-white/60">Stock:</span>
                          <Badge className={product.stock > 50 ? "bg-green-500" : product.stock > 20 ? "bg-yellow-500" : "bg-red-500"}>
                            {product.stock}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-white/60">MRP:</span>
                          <span className="text-white/80 font-medium">₹{product.mrp}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-white/60" />
                        <span className="text-white/60 text-xs">
                          Exp: {new Date(product.expiryDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < product.rating ? 'text-yellow-400 fill-current' : 'text-white/30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-white/60">({product.rating}/5)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No products found</h3>
              <p className="text-blue-200 mb-6 text-lg">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Add your first product to get started.'
                }
              </p>
              <Button 
                onClick={() => setShowAddProduct(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Product Name *
                  </label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Enter product name"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Category *
                  </label>
                  <Input
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    placeholder="e.g., Pain Relief, Antibiotics"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Manufacturer *
                  </label>
                  <Input
                    value={newProduct.manufacturer}
                    onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
                    placeholder="Enter manufacturer name"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      MRP (₹)
                    </label>
                    <Input
                      type="number"
                      value={newProduct.mrp}
                      onChange={(e) => setNewProduct({...newProduct, mrp: Number(e.target.value)})}
                      placeholder="0"
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Stock
                    </label>
                    <Input
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                      placeholder="0"
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Enter product description"
                    className="min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Medical Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Composition
                  </label>
                  <Input
                    value={newProduct.composition}
                    onChange={(e) => setNewProduct({...newProduct, composition: e.target.value})}
                    placeholder="e.g., Paracetamol 500mg"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Dosage
                  </label>
                  <Input
                    value={newProduct.dosage}
                    onChange={(e) => setNewProduct({...newProduct, dosage: e.target.value})}
                    placeholder="e.g., 1-2 tablets every 4-6 hours"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Indications
                  </label>
                  <Input
                    value={newProduct.indications}
                    onChange={(e) => setNewProduct({...newProduct, indications: e.target.value})}
                    placeholder="e.g., Fever, headache, pain"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Contraindications
                  </label>
                  <Input
                    value={newProduct.contraindications}
                    onChange={(e) => setNewProduct({...newProduct, contraindications: e.target.value})}
                    placeholder="e.g., Liver disease, hypersensitivity"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Side Effects
                  </label>
                  <Input
                    value={newProduct.sideEffects}
                    onChange={(e) => setNewProduct({...newProduct, sideEffects: e.target.value})}
                    placeholder="e.g., Nausea, dizziness"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Therapeutic Class
                  </label>
                  <Input
                    value={newProduct.therapeuticClass}
                    onChange={(e) => setNewProduct({...newProduct, therapeuticClass: e.target.value})}
                    placeholder="e.g., Analgesic, Antibiotic"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Additional Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Pack Size
                  </label>
                  <Input
                    value={newProduct.packSize}
                    onChange={(e) => setNewProduct({...newProduct, packSize: e.target.value})}
                    placeholder="e.g., 10 tablets"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Expiry Date
                  </label>
                  <Input
                    type="date"
                    value={newProduct.expiryDate}
                    onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Batch Number
                  </label>
                  <Input
                    value={newProduct.batchNumber}
                    onChange={(e) => setNewProduct({...newProduct, batchNumber: e.target.value})}
                    placeholder="e.g., PC2025001"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="prescription"
                    checked={newProduct.isPrescriptionRequired}
                    onChange={(e) => setNewProduct({...newProduct, isPrescriptionRequired: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="prescription" className="text-sm text-white/80">
                    Prescription Required
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-white/80">Rating:</label>
                  <Select value={newProduct.rating.toString()} onValueChange={(value) => setNewProduct({...newProduct, rating: Number(value)})}>
                    <SelectTrigger className="w-20 h-8 bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>{rating}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

