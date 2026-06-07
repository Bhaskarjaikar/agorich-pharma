'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CurrencyDollar,
  Warning,
  Clock,
  WarningCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowsClockwise
} from '@phosphor-icons/react'

interface AgingBucket {
  bucket: string
  label: string
  invoice_count: number
  total_amount: number
  percentage_of_total: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface EarlyWarning {
  customer_id: string
  customer_name: string
  message: string
  severity: 'WARNING' | 'CRITICAL'
}

interface ARSummary {
  totalOutstanding: number
  totalAdvanceCollected: number
  invoiceCount: number
  partiallyPaidCount: number
  pendingCount: number
  overdueCount: number
  avgDaysOverdue: number
  oldestInvoiceAge: number
}

interface CustomerDSO {
  customer_id: string
  customer_name: string
  total_receivable: number
  avg_dso: number
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface ARInvoice {
  id: string
  invoice_number: string
  customer_name: string
  grand_total: number
  balance_due: number
  days_overdue: number
  aging_bucket: 'CURRENT' | '30_DAYS' | '60_DAYS' | '90_DAYS' | 'RED_ZONE'
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface ARPanelProps {
  darkMode?: boolean
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case 'CRITICAL': return 'text-red-500 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20'
    case 'HIGH': return 'text-orange-500 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20'
    case 'MEDIUM': return 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-500/20'
    default: return 'text-green-500 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20'
  }
}

function getBucketColor(bucket: string): string {
  switch (bucket) {
    case 'RED_ZONE': return 'bg-red-600 dark:bg-red-500'
    case '90_DAYS': return 'bg-orange-500 dark:bg-orange-400'
    case '60_DAYS': return 'bg-yellow-500 dark:bg-yellow-400'
    case '30_DAYS': return 'bg-blue-500 dark:bg-blue-400'
    default: return 'bg-green-500 dark:bg-green-400'
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

export function ARAgingPanel({ darkMode = true }: ARPanelProps) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ARSummary | null>(null)
  const [agingBuckets, setAgingBuckets] = useState<AgingBucket[]>([])
  const [earlyWarnings, setEarlyWarnings] = useState<EarlyWarning[]>([])
  const [customerDSO, setCustomerDSO] = useState<CustomerDSO[]>([])
  const [invoices, setInvoices] = useState<ARInvoice[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'invoices'>('overview')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/accounts-receivable?include_dso=true', {
        headers: { 'cache-control': 'no-store' }
      })
      if (res.ok) {
        const json = await res.json()
        setSummary(json.summary)
        setAgingBuckets(json.aging_buckets || [])
        setEarlyWarnings(json.early_warnings || [])
        setCustomerDSO(json.customer_dso || [])
        setInvoices(json.invoices || [])
      }
    } catch (e) {
      console.error('Error fetching AR data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const redZoneAmount = agingBuckets.find(b => b.bucket === 'RED_ZONE')?.total_amount || 0
  const redZonePercent = summary?.totalOutstanding ? (redZoneAmount / summary.totalOutstanding) * 100 : 0

  return (
    <Card className={`border shadow-sm ${darkMode ? 'bg-background border-border' : 'bg-white border-slate-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CurrencyDollar className={`w-5 h-5 ${redZonePercent > 10 ? 'text-red-500' : 'text-emerald-400'}`} weight="fill" />
            <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
              AR Command Center
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {summary && (
          <div className="flex items-center gap-4 mt-2">
            <div className="text-2xl font-bold text-white font-mono">
              {formatCurrency(summary.totalOutstanding)}
            </div>
            <Badge className={redZonePercent > 10 ? 'bg-red-500' : 'bg-emerald-500'}>
              {redZonePercent.toFixed(1)}% in Red Zone
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !summary ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-16 rounded animate-pulse ${darkMode ? 'bg-card' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Total AR</div>
                <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {summary ? formatCurrency(summary.totalOutstanding) : '—'}
                </div>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Avg DSO</div>
                <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {summary?.avgDaysOverdue || 0} days
                </div>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Overdue</div>
                <div className={`text-lg font-bold ${summary?.overdueCount && summary.overdueCount > 0 ? 'text-orange-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {summary?.overdueCount || 0}
                </div>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Oldest</div>
                <div className={`text-lg font-bold ${(summary?.oldestInvoiceAge || 0) > 60 ? 'text-red-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {summary?.oldestInvoiceAge || 0} days
                </div>
              </div>
            </div>

            {earlyWarnings.length > 0 && (
              <div className={`p-3 rounded-lg border ${darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <WarningCircle className="w-4 h-4 text-red-500" weight="fill" />
                  <span className={`text-sm font-semibold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                    Critical Alerts ({earlyWarnings.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {earlyWarnings.slice(0, 3).map((warn, idx) => (
                    <div key={idx} className="text-xs">
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{warn.customer_name}:</span>{' '}
                      <span className={darkMode ? 'text-red-400' : 'text-red-600'}>{warn.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                  AGING BUCKETS
                </span>
              </div>
              <div className="space-y-2">
                {agingBuckets.map((bucket) => (
                  <div key={bucket.bucket} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${getBucketColor(bucket.bucket)}`}>
                      <span className="text-xs font-bold text-white">
                        {bucket.bucket === 'CURRENT' ? '0' : bucket.bucket === '30_DAYS' ? '30' : bucket.bucket === '60_DAYS' ? '60' : bucket.bucket === '90_DAYS' ? '90' : '90+'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {bucket.label}
                        </span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(bucket.total_amount)}
                        </span>
                      </div>
                      <Progress
                        value={bucket.percentage_of_total}
                        className="h-2"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          {bucket.invoice_count} invoices
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          {bucket.percentage_of_total.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                  TOP SLOW PAYERS
                </span>
              </div>
              <div className="space-y-2">
                {customerDSO.slice(0, 5).map((cust, idx) => (
                  <div key={cust.customer_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-muted-foreground'}`}>#{idx + 1}</span>
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {cust.customer_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(cust.total_receivable)}
                      </span>
                      {cust.trend === 'DECLINING' ? (
                        <ArrowDown className="w-4 h-4 text-red-500" />
                      ) : cust.trend === 'IMPROVING' ? (
                        <ArrowUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))}
                {customerDSO.length === 0 && (
                  <div className={`text-sm ${darkMode ? 'text-slate-500' : 'text-muted-foreground'}`}>
                    No slow payers detected
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
