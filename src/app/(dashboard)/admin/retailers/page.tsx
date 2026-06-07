'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, ArrowsClockwise, Download, MagnifyingGlass, Users } from '@phosphor-icons/react'

interface RetailerSummaryProfile {
  id: string
  business_name?: string | null
  user_name?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  created_at?: string
  is_verified?: boolean
}

interface RetailerMetricsTopItem {
  name: string
  units?: number
  revenue?: number
}

interface RetailerMetrics {
  totalOrders: number
  totalUnits: number
  totalRevenue: number
  outstanding: number
  avgOrderValue: number
  lastOrderAt?: string | null
  earnings?: number | null
  topItems?: RetailerMetricsTopItem[]
}

interface RetailerSummaryRow {
  profile: RetailerSummaryProfile
  metrics: RetailerMetrics
}

interface RetailerSummaryResponse {
  retailers?: RetailerSummaryRow[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta?: {
    counts?: {
      total: number
      verified: number
      unverified: number
    }
  }
  error?: string
}

type StatusFilter = 'all' | 'verified' | 'unverified'
type SortKey = 'revenue_desc' | 'revenue_asc' | 'orders_desc' | 'orders_asc' | 'units_desc' | 'units_asc'

export default function AdminRetailersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RetailerSummaryRow[]>([])

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('revenue_desc')
  const [counts, setCounts] = useState<{ total: number; verified: number; unverified: number } | null>(null)
  const [totalPages, setTotalPages] = useState(1)

  const fmtINR = useCallback((n: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
  }, [])

  const fetchRetailers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (q.trim()) params.set('q', q.trim())
      params.set('status', status)
      params.set('sort', sort)

      const res = await fetch(`/api/admin/retailers/summary?${params.toString()}`, {
        headers: { 'cache-control': 'no-store' },
        credentials: 'include'
      })

      const json = (await res.json()) as RetailerSummaryResponse
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load retailers')
      }

      setRows(json.retailers || [])
      setTotalPages(json.pagination?.totalPages || 1)
      setCounts(json.meta?.counts || null)
    } catch (e: unknown) {
      setRows([])
      setCounts(null)
      setTotalPages(1)
      setError(e instanceof Error ? e.message : 'Failed to load retailers')
    } finally {
      setLoading(false)
    }
  }, [page, limit, q, status, sort])

  useEffect(() => {
    fetchRetailers()
  }, [fetchRetailers])

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    return `/api/admin/retailers/summary.csv?${params.toString()}`
  }, [q])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-muted border border-border">
                <Users className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Retailers</h1>
                <div className="text-xs text-muted-foreground">
                  {counts ? (
                    <>
                      Total {counts.total} • Verified {counts.verified} • Pending {counts.unverified}
                    </>
                  ) : (
                    'Retailer performance summary'
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href={exportUrl}>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </Link>
            <Button variant="outline" onClick={fetchRetailers} disabled={loading}>
              <ArrowsClockwise className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="border shadow-sm rounded-3xl overflow-hidden mb-6">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="text-foreground">Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setPage(1)
                    setQ(e.target.value)
                  }}
                  placeholder="Search name, business, phone"
                  className="pl-9"
                />
              </div>

              <Select
                value={status}
                onValueChange={(v) => {
                  setPage(1)
                  setStatus(v as StatusFilter)
                }}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sort}
                onValueChange={(v) => {
                  setPage(1)
                  setSort(v as SortKey)
                }}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue_desc">Revenue (High)</SelectItem>
                  <SelectItem value="revenue_asc">Revenue (Low)</SelectItem>
                  <SelectItem value="orders_desc">Orders (High)</SelectItem>
                  <SelectItem value="orders_asc">Orders (Low)</SelectItem>
                  <SelectItem value="units_desc">Units (High)</SelectItem>
                  <SelectItem value="units_asc">Units (Low)</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setPage(1)
                  setLimit(parseInt(v))
                }}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <Card className="border shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="text-foreground">Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-muted-foreground">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-muted-foreground">No retailers found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-muted-foreground">Retailer</TableHead>
                      <TableHead className="text-muted-foreground">Phone</TableHead>
                      <TableHead className="text-muted-foreground">Orders</TableHead>
                      <TableHead className="text-muted-foreground">Revenue</TableHead>
                      <TableHead className="text-muted-foreground">Outstanding</TableHead>
                      <TableHead className="text-muted-foreground">Last order</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const name = r.profile.business_name || r.profile.user_name || 'Retailer'
                      const loc = [r.profile.city, r.profile.state].filter(Boolean).join(', ')
                      return (
                        <TableRow key={r.profile.id}>
                          <TableCell className="text-foreground">
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">{loc || '—'}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.profile.phone || '—'}</TableCell>
                          <TableCell className="text-foreground">{r.metrics.totalOrders}</TableCell>
                          <TableCell className="text-foreground">{fmtINR(r.metrics.totalRevenue)}</TableCell>
                          <TableCell className={r.metrics.outstanding > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-foreground'}>
                            {fmtINR(r.metrics.outstanding)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.metrics.lastOrderAt ? new Date(r.metrics.lastOrderAt).toLocaleDateString('en-IN') : '—'}
                          </TableCell>
                          <TableCell>
                            {r.profile.is_verified ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/retailers/${r.profile.id}`}>
                              <Button size="sm" variant="outline">View</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Prev
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

