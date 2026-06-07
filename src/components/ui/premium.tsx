'use client'

import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  SpinnerGap,
  Warning,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  CurrencyInr,
  TruckTrailer,
  Buildings,
  MapPin
} from '@phosphor-icons/react'

type StatusType =
  | 'success'
  | 'paid'
  | 'accepted'
  | 'delivered'
  | 'completed'
  | 'error'
  | 'rejected'
  | 'failed'
  | 'cancelled'
  | 'returned'
  | 'warning'
  | 'pending'
  | 'processing'
  | 'assigned'
  | 'packing'
  | 'dispatched'
  | 'in_transit'
  | 'out_of_stock'
  | 'neutral'

interface StatusConfig {
  color: string
  bgColor: string
  icon: React.ElementType
  label: string
}

const STATUS_CONFIGS: Record<StatusType, StatusConfig> = {
  success: { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: CheckCircle, label: 'Success' },
  paid: { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: CurrencyInr, label: 'Paid' },
  accepted: { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: CheckCircle, label: 'Accepted' },
  delivered: { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: CheckCircle, label: 'Delivered' },
  completed: { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: CheckCircle, label: 'Completed' },
  error: { color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', icon: XCircle, label: 'Error' },
  rejected: { color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', icon: XCircle, label: 'Rejected' },
  failed: { color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', icon: XCircle, label: 'Failed' },
  cancelled: { color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', icon: XCircle, label: 'Cancelled' },
  returned: { color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', icon: ArrowUp, label: 'Returned' },
  warning: { color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', icon: Warning, label: 'Warning' },
  pending: { color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', icon: Clock, label: 'Pending' },
  processing: { color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', icon: SpinnerGap, label: 'Processing' },
  assigned: { color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', icon: Buildings, label: 'Assigned' },
  packing: { color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800', icon: Package, label: 'Packing' },
  dispatched: { color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', icon: Truck, label: 'Dispatched' },
  in_transit: { color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', icon: TruckTrailer, label: 'In Transit' },
  out_of_stock: { color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', icon: XCircle, label: 'Out of Stock' },
  neutral: { color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', icon: Minus, label: 'Neutral' },
}

function mapStatusToType(status: string): StatusType {
  const statusMap: Record<string, StatusType> = {
    PAID: 'paid',
    SUCCESS: 'success',
    ACCEPTED: 'accepted',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    ERROR: 'error',
    REJECTED: 'rejected',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    RETURNED: 'returned',
    PENDING: 'pending',
    PROCESSING: 'processing',
    ASSIGNED: 'assigned',
    PACKING: 'packing',
    PACKED: 'packing',
    DISPATCHED: 'dispatched',
    IN_TRANSIT: 'in_transit',
    OUT_OF_STOCK: 'out_of_stock',
    WARNING: 'warning',
  }
  return statusMap[status.toUpperCase()] || 'neutral'
}

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function StatusBadge({ status, size = 'md', showIcon = true, className = '' }: StatusBadgeProps) {
  const type = mapStatusToType(status)
  const config = STATUS_CONFIGS[type]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  return (
    <motion.span
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${config.bgColor} ${config.color}
        ${sizeClasses[size]} ${className}
      `}
    >
      {showIcon && <Icon weight="fill" className={iconSizes[size]} />}
      {config.label}
    </motion.span>
  )
}

interface AmountDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSign?: boolean
  currency?: string
  className?: string
}

export function AmountDisplay({
  amount,
  size = 'md',
  showSign = false,
  currency = '₹',
  className = ''
}: AmountDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))

  const sign = amount < 0 ? '-' : showSign && amount > 0 ? '+' : ''

  return (
    <span className={`font-bold ${sizeClasses[size]} ${className}`}>
      {sign}{currency}{formatted}
    </span>
  )
}

interface InfoCardProps {
  title: string
  value: string | number
  icon?: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

export function InfoCard({ title, value, icon: Icon, trend, trendValue, className = '' }: InfoCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {trendValue && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'
            }`}>
              {trend === 'up' && <ArrowUp className="w-3 h-3" />}
              {trend === 'down' && <ArrowDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-500" />
          </div>
        )}
      </div>
    </div>
  )
}

interface ActionCardProps {
  title: string
  subtitle?: string
  amount?: number
  status?: string
  icon?: React.ElementType
  badge?: string
  onClick?: () => void
  children?: React.ReactNode
  className?: string
}

export function ActionCard({
  title,
  subtitle,
  amount,
  status,
  icon: Icon,
  badge,
  onClick,
  children,
  className = ''
}: ActionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800
        cursor-pointer transition-shadow hover:shadow-lg
        ${onClick ? 'cursor-pointer' : ''} ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-emerald-600" weight="fill" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{title}</h3>
            {badge && <StatusBadge status={badge} size="sm" />}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
          {amount !== undefined && (
            <AmountDisplay amount={amount} size="lg" className="mt-2 text-emerald-600" />
          )}
          {children}
        </div>
        {onClick && <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />}
      </div>
    </motion.div>
  )
}

interface LocationCardProps {
  name: string
  address: string
  distance?: string
  landmark?: string
  onClick?: () => void
  className?: string
}

export function LocationCard({ name, address, distance, landmark, onClick, className = '' }: LocationCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800
        ${onClick ? 'cursor-pointer' : ''} ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-slate-500" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white">{name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{address}</p>
          {landmark && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Landmark: {landmark}</p>
          )}
          {distance && (
            <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              <Truck className="w-3 h-3 text-emerald-600" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{distance}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface GiantButtonProps {
  label: string
  icon?: React.ElementType
  onClick?: () => void
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function GiantButton({
  label,
  icon: Icon,
  onClick,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  className = ''
}: GiantButtonProps) {
  const variantClasses = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/40',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30',
    neutral: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white',
  }

  const sizeClasses = {
    sm: 'h-14 text-base',
    md: 'h-18 text-lg',
    lg: 'h-24 text-xl',
    xl: 'h-32 text-2xl',
  }

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full rounded-2xl font-bold flex items-center justify-center gap-3
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? (
        <SpinnerGap className="w-8 h-8 animate-spin" />
      ) : (
        <>
          {Icon && <Icon weight="fill" className={iconSizes[size]} />}
          <span>{label}</span>
        </>
      )}
    </motion.button>
  )
}
