'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  WifiSlash,
  ArrowClockwise,
  FloppyDisk
} from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/invoice/types'

interface InvoiceHeaderProps {
  // Edit mode props
  isEditMode?: boolean
  cartItems?: any[]
  getGrandTotal?: () => number
  isSaving?: boolean
  onSave?: () => void
  syncQueue?: any[]
  offlineCart?: { isOnline: boolean } | null
  darkMode?: boolean
  // Display mode props
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  orderNumber?: string
  orderDate?: string
  deliveryDate?: string
  paymentTerms?: string
  companyData?: {
    name: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    pincode?: string
    gstin?: string
    phone?: string
    email?: string
    website?: string
  }
  customerData?: {
    name?: string
    businessName?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    pincode?: string
    gstin?: string
    phone?: string
  }
  shipToData?: {
    name?: string
    businessName?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    pincode?: string
  }
}

export function InvoiceHeader(props: InvoiceHeaderProps) {
  const {
    isEditMode = false,
    cartItems = [],
    getGrandTotal = () => 0,
    isSaving = false,
    onSave = () => {},
    syncQueue = [],
    offlineCart,
    darkMode = false,
    invoiceNumber,
    invoiceDate,
    dueDate,
    orderNumber,
    orderDate,
    deliveryDate,
    paymentTerms,
    companyData,
    customerData,
    shipToData
  } = props
  return (
    <div className="border-b p-3 md:p-4 bg-card">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex items-center flex-wrap gap-2 md:gap-4">
          {isEditMode ? (
            <Badge className="bg-orange-500/20 text-orange-500 border-orange-400/30 text-xs">
              <Pencil className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              Edit Mode
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4">
          {offlineCart && !offlineCart.isOnline && (
            <Badge className="bg-orange-500/20 text-orange-500 border-orange-400/30 text-xs">
              <WifiSlash className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              Offline Mode
            </Badge>
          )}
          {syncQueue.length > 0 && (
            <Badge className="bg-blue-500/20 text-blue-500 border-blue-400/30 text-xs">
              <ArrowClockwise className="w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin" />
              {syncQueue.length} pending sync
            </Badge>
          )}
          <div className="text-xs md:text-sm text-foreground">
            <span className="text-muted-foreground">Items:</span> {cartItems.length} |
            <span className="ml-1 md:ml-2 text-muted-foreground">Total:</span> {formatCurrency(getGrandTotal())}
          </div>

          <Button
            onClick={onSave}
            disabled={isSaving || cartItems.length === 0}
            className={isEditMode ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
          >
            <FloppyDisk className="w-3 h-3 md:w-4 md:w-4 mr-1 md:mr-2" />
            {isSaving ? 'Loading...' : isEditMode ? 'Save' : 'Save Invoice'}
          </Button>
        </div>
      </div>
    </div>
  )
}