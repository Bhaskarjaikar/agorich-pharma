'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, FileText, Store } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

  const fetchInvoices = useCallback(
    async (p = 1) => {
      try {
        const res = await fetch(`/api/admin/retailers/${params.id}/invoices?page=${p}&limit=10`)
        if (!res.ok) throw new Error('Failed to load invoices')
        const json = (await res.json()) as {
          invoices?: RetailerInvoiceSummary[]
          pagination?: { totalPages?: number }
        }
        setInvoices(json.invoices || [])
        setTotalPages(json.pagination?.totalPages || 1)
      } catch {
        // ignore here; surfaced in detail error if needed
      }
    },
    [params.id]
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      await fetchDetail()
      await fetchInvoices(1)
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [fetchDetail, fetchInvoices])

  const fmtINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-white/80">Loading retailer...</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Button variant="outline" onClick={() => router.back()} className="bg-white/10 border-white/20 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error || 'Not found'}</div>
      </div>
    )
  }

  const { profile, kpis, revenueData, topProducts } = detail

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="bg-white/10 border-white/20 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Link href="/admin">
          <Button className="bg-indigo-600 text-white">Admin Dashboard</Button>
        </Link>
      </div>

      <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Store className="w-5 h-5" /> {profile.business_name || profile.user_name}</CardTitle>
          <CardDescription className="text-white/70">{profile.user_name} • {profile.phone || '—'} • {profile.city || ''}{profile.state ? `, ${profile.state}` : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white/5 rounded">
              <div className="text-white/70 text-sm">Revenue</div>
              <div className="text-white text-xl font-semibold">{fmtINR(kpis.totalRevenue)}</div>
            </div>
            <div className="p-4 bg-white/5 rounded">
              <div className="text-white/70 text-sm">Outstanding</div>
              <div className="text-white text-xl font-semibold">{fmtINR(kpis.outstanding)}</div>
            </div>
            <div className="p-4 bg-white/5 rounded">
              <div className="text-white/70 text-sm">Orders</div>
              <div className="text-white text-xl font-semibold">{kpis.totalOrders}</div>
            </div>
            <div className="p-4 bg-white/5 rounded">
              <div className="text-white/70 text-sm">Units</div>
              <div className="text-white text-xl font-semibold">{kpis.totalUnits}</div>
            </div>
            <div className="p-4 bg-white/5 rounded">
              <div className="text-white/70 text-sm">Avg Order</div>
              <div className="text-white text-xl font-semibold">{fmtINR(kpis.avgOrderValue)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Revenue & Orders (6m)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: '1px solid rgba(75,85,99,0.3)', borderRadius: 8, color: 'white' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Top Products (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProducts.length === 0 && <div className="text-white/60 text-sm">No data</div>}
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <div className="text-white">{p.name}</div>
                  <div className="text-white/80 text-sm">{p.sales} units • {fmtINR(p.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-white/80">Invoice</TableHead>
                  <TableHead className="text-white/80">Status</TableHead>
                  <TableHead className="text-white/80">Date</TableHead>
                  <TableHead className="text-white/80">Due</TableHead>
                  <TableHead className="text-white/80">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id} className="border-white/20">
                    <TableCell className="text-white">{i.invoice_number || i.id}</TableCell>
                    <TableCell className="text-white/80">{i.status}</TableCell>
                    <TableCell className="text-white/80">{new Date(i.created_at).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="text-white/80">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell className="text-white">{fmtINR(i.grand_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={async () => { const np = page - 1; setPage(np); await fetchInvoices(np) }} className="bg-white/10 border-white/20 text-white">Prev</Button>
            <div className="text-white/70 text-sm">Page {page} of {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={async () => { const np = page + 1; setPage(np); await fetchInvoices(np) }} className="bg-white/10 border-white/20 text-white">Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



