"use client"

import { useState, useEffect, useRef } from 'react'
import { Product } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Warning, Plus, Pencil, Trash, Package, Upload, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface InventorySectionProps {
  user: {
    id: string
    role: string
    // other user fields
  }
  darkMode?: boolean
}

interface ProductFormData {
  name: string;
  stock: number;
  agorich_price: number;
  mrp: number;
  pack_size: string;
  batch_number: string;
  expiry_date: string;
  manufacturer: string;
  margin?: number; // Calculated field
}

interface ImportedProductPayload {
  title: string
  manufacturer: string | null
  pack_size: string | null
  batch_number: string | null
  expiry_date: string | null
  agorich_price: number
  retailer_price: number | null
  mrp: number
  margin: number
  stock: number
  category: string | null
  status: string
}

interface ImportApiError {
  product: string
  error: string
}

interface BackendProduct {
  id: string
  name?: string
  manufacturer?: string | null
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  agorich_price?: number | string | null
  retailer_price?: number | string | null
  mrp?: number | string | null
  margin?: number | null
  stock?: number | string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  category?: string | null
  metadata?: unknown
}

export default function InventorySection({ user, darkMode = false }: InventorySectionProps) {
  // Check access first - before any hooks
  const isAuthorized = user.role === 'SUPER_ADMIN'
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    stock: 0,
    agorich_price: 0,
    mrp: 0,
    pack_size: '',
    batch_number: '',
    expiry_date: '',
    manufacturer: '',
    margin: 0
  })
  const [submitting, setSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // Bulk delete state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  
  // Calculate pagination
  const totalPages = Math.ceil(products.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = products.slice(startIndex, endIndex)
  
  // Reset to page 1 when products change (after delete/edit)
  useEffect(() => {
    const maxPage = Math.ceil(products.length / itemsPerPage)
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(1)
    }
  }, [products.length, itemsPerPage, currentPage])

  // Handle keyboard events for delete modals - Enter to delete, Escape to cancel
  useEffect(() => {
    const isAnyModalOpen = isDeleteModalOpen || isBulkDeleteModalOpen
    if (!isAnyModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key - Delete product(s)
      if (e.key === 'Enter' && !submitting && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        // Trigger delete by clicking the button programmatically
        const deleteButton = document.querySelector('[data-delete-button]') as HTMLButtonElement
        const bulkDeleteButton = document.querySelector('[data-bulk-delete-button]') as HTMLButtonElement
        if (bulkDeleteButton && !bulkDeleteButton.disabled && isBulkDeleteModalOpen) {
          bulkDeleteButton.click()
        } else if (deleteButton && !deleteButton.disabled && isDeleteModalOpen) {
          deleteButton.click()
        }
      }
      // Escape key - Cancel
      if (e.key === 'Escape') {
        if (isDeleteModalOpen) {
          setIsDeleteModalOpen(false)
          setDeletingProduct(null)
        }
        if (isBulkDeleteModalOpen) {
          setIsBulkDeleteModalOpen(false)
        }
      }
    }

    // Add listener
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isDeleteModalOpen, isBulkDeleteModalOpen, submitting, deletingProduct])

  // Robust CSV parser that handles quoted fields, commas inside quotes, different delimiters
  const parseCsv = (text: string) => {
    if (!text || !text.trim()) {
      return { headers: [], rows: [] }
    }

    // Normalize line endings
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.split('\n').filter(l => l.trim() !== '')
    
    if (lines.length === 0) return { headers: [], rows: [] }

    // Function to parse CSV line with proper quote handling
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let insideQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"'
            i++
          } else {
            // Toggle quote state
            insideQuotes = !insideQuotes
          }
        } else if (char === ',' && !insideQuotes) {
          // Field separator
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      // Add last field
      result.push(current.trim())
      return result
    }

    // Parse header row
    const headerLine = parseCsvLine(lines[0])
    const headers = headerLine.map(h => {
      // Remove quotes and normalize to lowercase
      return h.replace(/^"|"$/g, '').trim().toLowerCase()
    })

    // Normalize header names - handle variations
    const normalizedHeaders = headers.map(h => {
      // Common variations
      if (h.includes('name') || h === 'product' || h === 'product name') return 'name'
      if (h.includes('stock') || h.includes('quantity') || h === 'qty') return 'stock'
      if (h === 'mrp' || h.includes('mrp') || h === 'price') return 'mrp'
      if (h.includes('agorich') || h.includes('agrich') || h === 'our price' || h === 'cost') return 'agorich_price'
      if (h.includes('pack') || h.includes('packing')) return 'pack_size'
      if (h.includes('batch')) return 'batch_number'
      if (h.includes('expir') || h === 'exp' || h === 'exp date') return 'expiry_date'
      if (h === 'mfg' || h.includes('manufactur') || h.includes('mfg')) return 'manufacturer'
      if (h.includes('retailer') || h === 'retail price') return 'retailer_price'
      if (h === 'margin' || h.includes('margin')) return 'margin'
      if (h === 'category' || h.includes('cat')) return 'category'
      if (h === 'status' || h.includes('stat')) return 'status'
      return h
    })

    // Parse data rows
    const rows = lines.slice(1).map((line) => {
      const cols = parseCsvLine(line)
      const obj: Record<string, string> = {}
      
      normalizedHeaders.forEach((h, i) => {
        let value = (cols[i] ?? '').trim()
        // Remove surrounding quotes
        value = value.replace(/^"|"$/g, '')
        obj[h] = value
      })
      
      return obj
    }).filter(row => {
      // Filter out completely empty rows
      return Object.values(row).some(v => v && v.trim() !== '')
    })

    return { headers: normalizedHeaders, rows }
  }

  const handleImportClick = () => {
    setError(null)
    const inputEl = fileInputRef.current
    if (inputEl) {
      console.debug('[Inventory] Import CSV click → opening file picker')
      inputEl.click()
      toast.info('Choose a CSV file to import.', { duration: 2500 })
    } else {
      console.warn('[Inventory] File input ref missing when trying to import')
      toast.error('File picker not ready yet. Please wait a moment and try again.')
    }
  }

  const openAddProductModal = () => {
    resetForm()
    setError(null)
    console.debug('[Inventory] Opening Add Product modal')
    setIsAddModalOpen(true)
    toast.info('Fill in the product details and save.', { duration: 2500 })
  }

  const handleImportSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setIsImporting(true)
      setError(null)
      const text = await file.text()
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0 || rows.length === 0) {
        setError('Import failed: CSV appears empty or invalid.')
        return
      }
      // Map CSV rows to product objects with flexible column matching
      const imported: ImportedProductPayload[] = []
      const errors: string[] = []
      
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const rowNum = i + 2 // +2 because header is row 1 and we start counting from row 2
        
        try {
          // Flexible name extraction - try multiple variations
          const name = r['name'] || r['product'] || r['product name'] || r['title'] || ''
          if (!name || name.trim() === '') {
            errors.push(`Row ${rowNum}: Product name is required but missing`)
            continue
          }

          // Extract numeric values with fallbacks
          const mrp = parseFloat(r['mrp'] || r['price'] || '0') || 0
          const ag = parseFloat(r['agorich_price'] || r['agorich price'] || r['our price'] || r['cost'] || '0') || 0
          const stock = parseInt(r['stock'] || r['quantity'] || r['qty'] || '0') || 0
          const retailerPrice = parseFloat(r['retailer_price'] || r['retailer price'] || r['retail price'] || '0') || null
          
          // Calculate margin if not provided
          const providedMargin = r['margin'] ? parseFloat(r['margin']) : null
          const margin = providedMargin !== null ? providedMargin : (mrp > 0 && ag > 0 ? ((mrp - ag) / mrp) * 100 : 0)

          // Extract string fields with fallbacks
          const manufacturer = r['manufacturer'] || r['mfg'] || r['mfg_date'] || null
          const packSize = r['pack_size'] || r['pack size'] || r['packing'] || null
          const batchNumber = r['batch_number'] || r['batch number'] || r['batch'] || null
          const category = r['category'] || r['cat'] || null
          const status = r['status'] || 'ACTIVE'

          // Parse expiry date - handle MM-YYYY format specifically
          const expiryDateRaw = r['expiry_date'] || r['expiry date'] || r['exp'] || r['exp date'] || ''
          const expiryDate = toISODate(expiryDateRaw)

          // Validate required fields
          if (mrp <= 0) {
            errors.push(`Row ${rowNum} (${name}): MRP must be greater than 0`)
            continue
          }
          
          if (ag <= 0) {
            errors.push(`Row ${rowNum} (${name}): Agorich price must be greater than 0`)
            continue
          }

          imported.push({
            title: name.trim(),
            manufacturer: manufacturer ? manufacturer.trim() : null,
            pack_size: packSize ? packSize.trim() : null,
            batch_number: batchNumber ? batchNumber.trim() : null,
            expiry_date: expiryDate,
            agorich_price: ag,
            retailer_price: retailerPrice,
            mrp,
            margin,
            stock,
            category: category ? category.trim() : null,
            status: status.trim().toUpperCase(),
          })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`Row ${rowNum}: Error parsing row - ${message}`)
          console.error(`Error parsing CSV row ${rowNum}:`, err, r)
        }
      }
      
      // Show warnings for parsing errors
      if (errors.length > 0) {
        console.warn('CSV parsing warnings:', errors)
      }
      if (imported.length === 0) {
        const errorMsg = errors.length > 0 
          ? `No valid products to import. Errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...and ${errors.length - 10} more errors` : ''}`
          : 'Nothing to import: no valid rows found.'
        setError(errorMsg)
        return
      }

      // Show warnings for partial errors
      if (errors.length > 0) {
        const warningMsg = `${errors.length} row${errors.length > 1 ? 's' : ''} had errors, but ${imported.length} product${imported.length > 1 ? 's' : ''} will be imported.`
        toast.warning(warningMsg)
      }

      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ products: imported })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(errorData.error || `Import failed with status ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        const errorList: ImportApiError[] = Array.isArray(result.errors) ? result.errors : []
        const errorDetails = errorList.length > 0 
          ? errorList.map(e => `${e.product}: ${e.error}`).join(', ')
          : (result.error || 'Import failed')
        throw new Error(errorDetails)
      }

      if (result.failed > 0 && Array.isArray(result.errors) && result.errors.length > 0) {
        const errorDetails = (result.errors as ImportApiError[]).map(e => `${e.product}: ${e.error}`).join('; ')
        setError(`Imported ${result.imported} products, ${result.failed} failed. Errors: ${errorDetails}`)
      }

      // Refresh products list after import
      await fetchProducts()
      
      // Show success toast
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} product${result.imported > 1 ? 's' : ''}`)
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} product${result.failed > 1 ? 's' : ''} failed to import`)
      }
    } catch (err: unknown) {
      console.error('Import failed:', err)
      const message =
        err instanceof Error ? err.message : 'Import failed. Please ensure the file is a valid CSV.'
      console.error('Error details:', {
        message,
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined
      })
      const errorMsg = message
      setError(errorMsg)
      toast.error(`Import failed: ${errorMsg}`)
    } finally {
      setIsImporting(false)
    }
  }

  // Fetch products from Supabase
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Authentication removed - no token needed
      
      // Fetch all products (100 at a time, with pagination if needed)
      const response = await fetch('/api/products?limit=100', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch products')
      }

      // Debug: Log first product to see what data we're receiving from backend
      if ((result.products || []).length > 0) {
        const firstProduct = result.products[0] as BackendProduct
        console.log('📦 Sample product data from backend:', {
          id: firstProduct.id,
          name: firstProduct.name,
          directFields: {
            expiry_date: firstProduct.expiry_date,
            mrp: firstProduct.mrp,
            agorich_price: firstProduct.agorich_price,
            margin: firstProduct.margin,
            batch_number: firstProduct.batch_number,
            manufacturer: firstProduct.manufacturer,
            pack_size: firstProduct.pack_size,
          },
          metadata: firstProduct.metadata,
        })
      }

      // Map Supabase products to match our Product interface
      const transformedProducts = (result.products || []).map((p: BackendProduct) => {
        const mrpNum = p.mrp !== undefined && p.mrp !== null ? Number(p.mrp) : null
        const agPriceNum = p.agorich_price !== undefined && p.agorich_price !== null ? Number(p.agorich_price) : null
        const stockNum = p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0

        // Calculate margin if not present
        const margin =
          p.margin !== undefined && p.margin !== null
            ? p.margin
            : mrpNum !== null && agPriceNum !== null && mrpNum > 0 && agPriceNum > 0
            ? ((mrpNum - agPriceNum) / mrpNum) * 100
            : null

        return {
          id: p.id,
          name: p.name || 'Unknown Product',
          manufacturer: p.manufacturer || null,
          pack_size: p.pack_size || null,
          batch_number: p.batch_number || null,
          expiry_date: p.expiry_date || null,
          mfg_date: p.mfg_date || null,
          agorich_price: agPriceNum,
          retailer_price: p.retailer_price !== undefined && p.retailer_price !== null ? Number(p.retailer_price) : null,
          mrp: mrpNum,
          margin,
          stock: stockNum,
          status: p.status || 'ACTIVE',
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
          category: p.category || null,
        }
      })

      setProducts(transformedProducts)
    } catch (err: unknown) {
      console.error('Error fetching products:', err)
      setError('Failed to fetch products. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newFormData = {
      ...formData,
      [name]: name === 'stock' || name === 'agorich_price' || name === 'mrp' 
        ? parseFloat(value) || 0 
        : value
    }
    
    // Calculate margin when MRP or Agorich Price changes
    if (name === 'mrp' || name === 'agorich_price') {
      const mrp = name === 'mrp' ? parseFloat(value) || 0 : newFormData.mrp
      const agorichPrice = name === 'agorich_price' ? parseFloat(value) || 0 : newFormData.agorich_price
      
      if (mrp > 0 && agorichPrice > 0) {
        newFormData.margin = ((mrp - agorichPrice) / mrp * 100)
      } else {
        newFormData.margin = 0
      }
    }
    
    setFormData(newFormData)
  }

  // Normalize various date formats to YYYY-MM-DD for Postgres
  // Specifically handles MM-YYYY format (e.g., "04-2025" means April 2025)
  const toISODate = (value: string): string | null => {
    if (!value || !value.trim()) return null
    
    const trimmed = value.trim().replace(/\s+/g, '') // Remove all whitespace
    
    // Already YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    
    // PRIORITY: Handle MM-YYYY or MM/YYYY (month-year format)
    // This is the most common format: "04-2025" means April 2025, "12-2024" means December 2024
    const monthYearMatch = trimmed.match(/^(\d{1,2})[\/-](\d{4})$/)
    if (monthYearMatch) {
      const [, month, year] = monthYearMatch
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      // Validate month (1-12) and year (reasonable range)
      if (monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        const mm = String(monthNum).padStart(2, '0')
        // Set day to 01 (first day of month) for month-year format
        return `${year}-${mm}-01`
      }
    }
    
    // Handle YYYY-MM or YYYY/MM
    const yearMonthMatch = trimmed.match(/^(\d{4})[\/-](\d{1,2})$/)
    if (yearMonthMatch) {
      const [, year, month] = yearMonthMatch
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      if (monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        const mm = String(monthNum).padStart(2, '0')
        return `${year}-${mm}-01`
      }
    }
    
    // Handle DD-MM-YYYY or DD/MM/YYYY (common Indian format)
    const dayMonthYearMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
    if (dayMonthYearMatch) {
      const [, dd, mm, yyyy] = dayMonthYearMatch
      const day = parseInt(dd)
      const month = parseInt(mm)
      const year = parseInt(yyyy)
      
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
    
    // Handle YYYY-MM-DD with different separators
    const fullDateMatch = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/)
    if (fullDateMatch) {
      const [, yyyy, mm, dd] = fullDateMatch
      const year = parseInt(yyyy)
      const month = parseInt(mm)
      const day = parseInt(dd)
      
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
    
    // Try parsing as Date object (handles ISO strings and other formats)
    try {
      // Try different date formats
      const dateFormats = [
        trimmed, // Original
        trimmed.replace(/-/g, '/'), // Replace dashes with slashes
        trimmed.replace(/\//g, '-'), // Replace slashes with dashes
      ]
      
      for (const format of dateFormats) {
        const date = new Date(format)
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
      }
    } catch {
      // Ignore parse errors
    }
    
    // If all parsing fails, return null
    console.warn(`Could not parse date format: "${value}"`)
    return null
  }

  // Format expiry date as MM-YYYY
  const formatExpiryDate = (dateString: string | null): string => {
    if (!dateString) return '-'
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return '-'
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
    } catch {
      return '-'
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      stock: 0,
      agorich_price: 0,
      mrp: 0,
      pack_size: '',
      batch_number: '',
      expiry_date: '',
      manufacturer: '',
      margin: 0
    })
  }

  const closeModals = () => {
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setIsBulkDeleteModalOpen(false)
    setDeletingProduct(null)
    setEditingProduct(null)
    setSelectedProducts(new Set())
    setError(null)
  }

  // Add new product
  const handleAddProduct = async () => {
    if (!formData.name || formData.stock < 0 || formData.agorich_price <= 0 || formData.mrp <= 0 || !formData.pack_size || !formData.batch_number || !formData.expiry_date || !formData.manufacturer) {
      setError('Please fill in all required fields with valid values.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const productData = {
        name: formData.name,
        manufacturer: formData.manufacturer,
        pack_size: formData.pack_size,
        batch_number: formData.batch_number,
        expiry_date: toISODate(formData.expiry_date),
        mfg_date: null,
        agorich_price: formData.agorich_price,
        mrp: formData.mrp,
        margin: formData.margin,
        stock: formData.stock,
        status: 'ACTIVE',
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(productData)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to add product')
      }

      setIsAddModalOpen(false)
      resetForm()
      
      // Refresh products to get all fields from server
      await fetchProducts()
      
      toast.success(`Product "${formData.name}" added successfully`)
    } catch (err: unknown) {
      console.error('Error adding product:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to add product.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Edit product
  const handleEditProduct = async () => {
    if (!editingProduct || !formData.name || formData.stock < 0 || formData.agorich_price <= 0 || formData.mrp <= 0 || !formData.pack_size || !formData.batch_number || !formData.expiry_date || !formData.manufacturer) {
      setError('Please fill in all required fields with valid values.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const updateData = {
        name: formData.name,
        stock: formData.stock,
        manufacturer: formData.manufacturer,
        pack_size: formData.pack_size,
        batch_number: formData.batch_number,
        expiry_date: toISODate(formData.expiry_date),
        mfg_date: null,
        agorich_price: formData.agorich_price,
        mrp: formData.mrp,
        margin: formData.margin,
      }

      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update product')
      }

      // Update local state immediately
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === editingProduct.id 
            ? {
                ...p,
                name: formData.name,
                stock: formData.stock,
                agorich_price: formData.agorich_price,
                mrp: formData.mrp,
                pack_size: formData.pack_size,
                batch_number: formData.batch_number,
                expiry_date: formData.expiry_date,
                manufacturer: formData.manufacturer,
                margin: formData.margin ?? null,
                updated_at: new Date().toISOString(),
              }
            : p
        )
      )
      
      setIsEditModalOpen(false)
      setEditingProduct(null)
      resetForm()
      toast.success(`Product "${formData.name}" updated successfully`)
    } catch (err: unknown) {
      console.error('Error updating product:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to update product.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete product')
      }

      // Update local state immediately - no page reload needed
      setProducts(prevProducts => prevProducts.filter(p => p.id !== deletingProduct.id))
      
      // Remove from selected if was selected
      setSelectedProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(deletingProduct.id)
        return newSet
      })
      
      setIsDeleteModalOpen(false)
      setDeletingProduct(null)
      
      // Show success toast
      toast.success(`Product "${deletingProduct.name}" deleted successfully`)
    } catch (err: unknown) {
      console.error('Error deleting product:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete product.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Bulk delete products
  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return

    try {
      setSubmitting(true)
      setError(null)

      const productIds = Array.from(selectedProducts)
      
      // Delete all products in parallel
      const deletePromises = productIds.map(id =>
        fetch(`/api/products/${id}`, { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
          .then(res => res.json())
          .then(result => ({ id, success: result.success, error: result.error }))
      )

      const results = await Promise.all(deletePromises)
      
      // Check for failures
      const failed = results.filter(r => !r.success)
      const succeeded = results.filter(r => r.success)

      // Update local state - remove all deleted products
      setProducts(prevProducts => prevProducts.filter(p => !selectedProducts.has(p.id)))
      
      // Clear selections
      setSelectedProducts(new Set())
      setIsBulkDeleteModalOpen(false)

      // Show results
      if (succeeded.length > 0) {
        toast.success(`${succeeded.length} product${succeeded.length > 1 ? 's' : ''} deleted successfully`)
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} product${failed.length > 1 ? 's' : ''} failed to delete`)
      }
    } catch (err: unknown) {
      console.error('Error deleting products:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete products.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit modal
  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    const mrp = product.mrp || 0
    const agorichPrice = product.agorich_price || 0
    const margin = mrp > 0 && agorichPrice > 0 ? ((mrp - agorichPrice) / mrp * 100) : 0
    
    setFormData({
      name: product.name,
      stock: product.stock,
      agorich_price: agorichPrice,
      mrp: mrp,
      pack_size: product.pack_size || '',
      batch_number: product.batch_number || '',
      expiry_date: product.expiry_date || '',
      manufacturer: product.manufacturer || '',
      margin: margin
    })
    setIsEditModalOpen(true)
  }

  // Open delete modal
  const openDeleteModal = (product: Product) => {
    setDeletingProduct(product)
    setIsDeleteModalOpen(true)
  }
  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-base">Access Restricted</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4" />
            Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-transparent">
      <CardHeader className={`px-3 py-2 ${darkMode ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20' : 'bg-gradient-to-r from-indigo-100 to-purple-100'}`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Package className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            Inventory
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedProducts.size > 0 && (
              <Button 
                onClick={() => setIsBulkDeleteModalOpen(true)} 
                size="sm"
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white h-8"
                disabled={submitting}
              >
                <Trash className="w-3.5 h-3.5" />
                Delete ({selectedProducts.size})
              </Button>
            )}
            <Button 
              onClick={handleImportClick}
              type="button"
              size="sm"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer h-8"
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Import
                </>
              )}
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportSelected} className="hidden" />
            <Button 
              onClick={openAddProductModal}
              type="button"
              size="sm"
              className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-4">
        {error && (
          <div className={`mb-4 p-3 border rounded-md ${darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-8">
            <Package className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No products found</h3>
            <p className={`mb-4 ${darkMode ? 'text-indigo-100' : 'text-slate-600'}`}>Get started by adding your first product to the inventory.</p>
            <Button 
              onClick={openAddProductModal} 
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className={`${darkMode ? 'border-white/20' : 'border-slate-200'}`}>
                  <TableHead className={`w-12 ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.has(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(new Set(paginatedProducts.map(p => p.id)))
                        } else {
                          setSelectedProducts(new Set())
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className={`min-w-[200px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Product Name</TableHead>
                  <TableHead className={`min-w-[80px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Stock</TableHead>
                  <TableHead className={`min-w-[100px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>MRP</TableHead>
                  <TableHead className={`min-w-[120px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Agorich Price</TableHead>
                  <TableHead className={`min-w-[80px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Margin</TableHead>
                  <TableHead className={`min-w-[120px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Pack Size</TableHead>
                  <TableHead className={`min-w-[120px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Batch</TableHead>
                  <TableHead className={`min-w-[120px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Mfg</TableHead>
                  <TableHead className={`min-w-[100px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Expiry</TableHead>
                  <TableHead className={`text-right min-w-[150px] ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id} className={`${darkMode ? 'border-white/20 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedProducts)
                          if (e.target.checked) {
                            newSelected.add(product.id)
                          } else {
                            newSelected.delete(product.id)
                          }
                          setSelectedProducts(newSelected)
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className={`font-medium whitespace-nowrap ${darkMode ? 'text-white' : 'text-slate-900'}`}>{product.name || 'N/A'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={darkMode ? 'text-white' : 'text-slate-900'}>{product.stock ?? 0}</span>
                        {product.stock < 10 && (
                          <Badge className={`flex items-center gap-1 ${darkMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-600 border-red-200'}`}>
                            <Warning className="w-3 h-3" />
                            Low
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`whitespace-nowrap ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹{(product.mrp ?? 0).toFixed(2)}</TableCell>
                    <TableCell className={`whitespace-nowrap ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹{(product.agorich_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell className={`whitespace-nowrap ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>
                      {product.margin ? `${Number(product.margin).toFixed(1)}%` : '-'}
                    </TableCell>
                    <TableCell className={`whitespace-nowrap ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>{product.pack_size || '-'}</TableCell>
                    <TableCell className={`whitespace-nowrap ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>{product.batch_number || '-'}</TableCell>
                    <TableCell className={`whitespace-nowrap ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>
                      {product.manufacturer || '-'}
                    </TableCell>
                    <TableCell className={`whitespace-nowrap ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>
                      {formatExpiryDate(product.expiry_date) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(product)}
                          className={`flex items-center gap-1 ${darkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteModal(product)}
                          className={`flex items-center gap-1 ${darkMode ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                        >
                          <Trash className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination Controls - Always show when products exist */}
            {products.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
                  <span>Showing</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className={`w-20 h-8 ${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>of {products.length} products</span>
                  <span className={darkMode ? 'text-white/50' : 'text-slate-400'}>({startIndex + 1}-{Math.min(endIndex, products.length)})</span>
                </div>
                
                {/* Page Navigation - Only show if more than 1 page */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`${darkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <CaretLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            type="button"
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white border-indigo-600 min-w-[40px]'
                                : darkMode 
                                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 min-w-[40px]'
                                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 min-w-[40px]'
                            }
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`${darkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Next
                      <CaretRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className={`text-sm ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
                  {totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : 'All products shown'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Product Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your inventory. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            {error && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Product Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="stock" className="text-sm font-medium">
                    Stock Quantity *
                  </label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="Enter stock"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="pack_size" className="text-sm font-medium">
                    Pack Size *
                  </label>
                  <Input
                    id="pack_size"
                    name="pack_size"
                    value={formData.pack_size}
                    onChange={handleInputChange}
                    placeholder="e.g., 10 tablets"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="mrp" className="text-sm font-medium">
                    MRP (₹) *
                  </label>
                  <Input
                    id="mrp"
                    name="mrp"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.mrp}
                    onChange={handleInputChange}
                    placeholder="Enter MRP"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="agorich_price" className="text-sm font-medium">
                    Agorich Price (₹) *
                  </label>
                  <Input
                    id="agorich_price"
                    name="agorich_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.agorich_price}
                    onChange={handleInputChange}
                    placeholder="Enter Agorich price"
                  />
                </div>
              </div>

              {/* Margin Display */}
              {(formData.margin || 0) > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Profit Margin:</span>
                    <span className="text-lg font-bold text-green-600">{(formData.margin || 0).toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Profit: ₹{((formData.mrp - formData.agorich_price) || 0).toFixed(2)} per unit
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="batch_number" className="text-sm font-medium">
                    Batch Number *
                  </label>
                  <Input
                    id="batch_number"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    placeholder="Enter batch number"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="manufacturer" className="text-sm font-medium">
                    Manufacturer *
                  </label>
                  <Input
                    id="manufacturer"
                    name="manufacturer"
                    type="text"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    placeholder="Enter manufacturer name"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="expiry_date" className="text-sm font-medium">
                  Expiry Date (Month-Year) *
                </label>
                <Input
                  id="expiry_date"
                  name="expiry_date"
                  type="month"
                  value={formData.expiry_date ? (formData.expiry_date.includes('-') && formData.expiry_date.length >= 7 ? formData.expiry_date.slice(0, 7) : formData.expiry_date) : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormData({ ...formData, expiry_date: val ? `${val}-01` : '' })
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update the product information. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            {error && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
              <div className="grid gap-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Product Name *
                </label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-stock" className="text-sm font-medium">
                    Stock Quantity *
                  </label>
                  <Input
                    id="edit-stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="Enter stock"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-pack_size" className="text-sm font-medium">
                    Pack Size *
                  </label>
                  <Input
                    id="edit-pack_size"
                    name="pack_size"
                    value={formData.pack_size}
                    onChange={handleInputChange}
                    placeholder="e.g., 10 tablets"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-mrp" className="text-sm font-medium">
                    MRP (₹) *
                  </label>
                  <Input
                    id="edit-mrp"
                    name="mrp"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.mrp}
                    onChange={handleInputChange}
                    placeholder="Enter MRP"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-agorich_price" className="text-sm font-medium">
                    Agorich Price (₹) *
                  </label>
                  <Input
                    id="edit-agorich_price"
                    name="agorich_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.agorich_price}
                    onChange={handleInputChange}
                    placeholder="Enter Agorich price"
                  />
                </div>
              </div>

              {/* Margin Display */}
              {(formData.margin || 0) > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Profit Margin:</span>
                    <span className="text-lg font-bold text-green-600">{(formData.margin || 0).toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Profit: ₹{((formData.mrp - formData.agorich_price) || 0).toFixed(2)} per unit
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-batch_number" className="text-sm font-medium">
                    Batch Number *
                  </label>
                  <Input
                    id="edit-batch_number"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    placeholder="Enter batch number"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-manufacturer" className="text-sm font-medium">
                    Manufacturer *
                  </label>
                  <Input
                    id="edit-manufacturer"
                    name="manufacturer"
                    type="text"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    placeholder="Enter manufacturer name"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="edit-expiry_date" className="text-sm font-medium">
                  Expiry Date (Month-Year) *
                </label>
                <Input
                  id="edit-expiry_date"
                  name="expiry_date"
                  type="month"
                  value={formData.expiry_date ? (formData.expiry_date.includes('-') && formData.expiry_date.length >= 7 ? formData.expiry_date.slice(0, 7) : formData.expiry_date) : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormData({ ...formData, expiry_date: val ? `${val}-01` : '' })
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button onClick={handleEditProduct} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Product Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProduct} 
                disabled={submitting}
                data-delete-button
                autoFocus
              >
                {submitting ? 'Deleting...' : 'Delete Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Modal */}
        <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Delete Multiple Products</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-60 overflow-y-auto my-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {products
                  .filter(p => selectedProducts.has(p.id))
                  .slice(0, 10)
                  .map(product => (
                    <li key={product.id} className="text-gray-900 dark:text-gray-200">{product.name || 'N/A'}</li>
                  ))}
                {selectedProducts.size > 10 && (
                  <li className="text-gray-500 dark:text-gray-400">...and {selectedProducts.size - 10} more</li>
                )}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkDeleteModalOpen(false)} className="text-gray-900 dark:text-gray-100">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete} 
                disabled={submitting}
                data-bulk-delete-button
                autoFocus
              >
                {submitting ? 'Deleting...' : `Delete ${selectedProducts.size} Product${selectedProducts.size > 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
