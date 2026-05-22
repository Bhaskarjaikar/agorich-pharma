'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Download, ChartBar, FileText, Building } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ThemeToggle } from '@/components/ThemeToggle'

interface RetailerProfile {
  id: string
  business_name?: string | null
  user_name?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
}

interface RetailerKpis {
  totalRevenue: number
  outstanding: number
  totalOrders: number
  totalUnits: number
  avgOrderValue: number
}

interface RetailerRevenueDatum {
  month: string
  revenue: number
  orders: number
}

interface TopProduct {
  name: string
  sales: number
  revenue: number
}

interface RetailerDetailResponse {
  profile: RetailerProfile
  kpis: RetailerKpis
  revenueData: RetailerRevenueDatum[]
  topProducts: TopProduct[]
}

interface RetailerInvoiceSummary {
  id: string
  invoice_number?: string | null
  status: string
  created_at: string
  due_date?: string | null
  grand_total: number
}

export default function RetailerDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<RetailerDetailResponse | null>(null)
  const [invoices, setInvoices] = useState<RetailerInvoiceSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchDetail = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`/api/admin/retailers/${params.id}`)
      if (!res.ok) throw new Error('Failed to load retailer')
      const json = (await res.json()) as RetailerDetailResponse
      setDetail(json)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load'
      setError(message)
    }
  }, [params.id])

  const fetchInvoices = useCallback(async (targetPage = 1) => {
    try {
      const res = await fetch(`/api/admin/retailers/${params.id}/invoices?page=${targetPage}`)
      if (!res.ok) throw new Error('Failed to load invoices')
      const json = (await res.json()) as { invoices: RetailerInvoiceSummary[], totalPages: number }
      setInvoices(json.invoices)
      setTotalPages(json.totalPages)
    } catch (e) {
      console.error('Failed to load invoices', e)
    }
  }, [params.id])

  useEffect(() => {
    fetchDetail()
    fetchInvoices()
    setLoading(false)
  }, [fetchDetail, fetchInvoices])

  const fmtINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-foreground">Loading retailer...</p>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
          <div className="p-3 rounded text-sm bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400">{error || 'Not found'}</div>
        </div>
      </div>
    )
  }

  const { profile, kpis, revenueData, topProducts } = detail

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/admin">
              <Button className="bg-indigo-600 text-white">Admin Dashboard</Button>
            </Link>
          </div>
        </div>

      <Card className="border shadow-sm rounded-3xl overflow-hidden mb-6">
        <CardHeader className="px-4 py-3 border-b bg-muted">
          <CardTitle className="flex items-center gap-2 text-foreground"><Building className="w-5 h-5" /> {profile.business_name || profile.user_name}</CardTitle>
          <CardDescription className="text-muted-foreground">{profile.user_name} • {profile.phone || '—'} • {profile.city || ''}{profile.state ? `, ${profile.state}` : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-muted">
              <div className="text-sm text-muted-foreground">Revenue</div>
              <div className="text-xl font-semibold text-foreground">{fmtINR(kpis.totalRevenue)}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted">
              <div className="text-sm text-muted-foreground">Outstanding</div>
              <div className="text-xl font-semibold text-foreground">{fmtINR(kpis.outstanding)}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted">
              <div className="text-sm text-muted-foreground">Orders</div>
              <div className="text-xl font-semibold text-foreground">{kpis.totalOrders}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted">
              <div className="text-sm text-muted-foreground">Units</div>
              <div className="text-xl font-semibold text-foreground">{kpis.totalUnits}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted">
              <div className="text-sm text-muted-foreground">Avg Order</div>
              <div className="text-xl font-semibold text-foreground">{fmtINR(kpis.avgOrderValue)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="px-4 py-3 border-b bg-muted">
            <CardTitle className="flex items-center gap-2 text-foreground"><ChartBar className="w-5 h-5" /> Revenue & Orders (6m)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="px-4 py-3 border-b bg-muted">
            <CardTitle className="flex items-center gap-2 text-foreground"><FileText className="w-5 h-5" /> Top Products (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProducts.length === 0 && <div className="text-sm text-muted-foreground">No data</div>}
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-muted">
                  <div className="text-foreground">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.sales} units • {fmtINR(p.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="px-4 py-3 border-b bg-muted">
          <CardTitle className="text-foreground">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Invoice</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Due</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-foreground">{i.invoice_number || i.id}</TableCell>
                    <TableCell className="text-muted-foreground">{i.status}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(i.created_at).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell className="text-foreground">{fmtINR(i.grand_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={async () => { const np = page - 1; setPage(np); await fetchInvoices(np) }}>Prev</Button>
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={async () => { const np = page + 1; setPage(np); await fetchInvoices(np) }}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}