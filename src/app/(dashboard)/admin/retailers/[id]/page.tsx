'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Download, ChartBar, FileText, Building, Sun, Moon } from '@phosphor-icons/react'
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
  
  // Dark mode state - synced with other pages via localStorage
  const [darkMode, setDarkMode] = useState(true)
  
  // Load dark mode from localStorage (sync with homepage and admin dashboard)
  useEffect(() => {
    const saved = localStorage.getItem('agorich-dark-mode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    }
  }, [])
  
  // Listen for storage changes (sync across tabs)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agorich-dark-mode') {
        setDarkMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

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
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className={`${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Loading retailer...</p>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Button variant="outline" onClick={() => router.back()} className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
          <div className={`p-3 rounded text-sm ${darkMode ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{error || 'Not found'}</div>
        </div>
      </div>
    )
  }

  const { profile, kpis, revenueData, topProducts } = detail

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()} className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <Button
              variant="outline"
              size="sm"
              className={`${darkMode ? 'border-slate-700 text-amber-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              onClick={() => {
                const newMode = !darkMode
                setDarkMode(newMode)
                localStorage.setItem('agorich-dark-mode', String(newMode))
              }}
            >
              {darkMode ? <Sun className="w-4 h-4" weight="fill" /> : <Moon className="w-4 h-4" weight="fill" />}
            </Button>
            <Link href="/admin">
              <Button className="bg-indigo-600 text-white">Admin Dashboard</Button>
            </Link>
          </div>
        </div>

      <Card className={`border shadow-sm rounded-xl overflow-hidden mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}><Building className="w-5 h-5" /> {profile.business_name || profile.user_name}</CardTitle>
          <CardDescription className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{profile.user_name} • {profile.phone || '—'} • {profile.city || ''}{profile.state ? `, ${profile.state}` : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Revenue</div>
              <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fmtINR(kpis.totalRevenue)}</div>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Outstanding</div>
              <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fmtINR(kpis.outstanding)}</div>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Orders</div>
              <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{kpis.totalOrders}</div>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Units</div>
              <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{kpis.totalUnits}</div>
            </div>
            <div className={`p-4 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg Order</div>
              <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fmtINR(kpis.avgOrderValue)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className={`border shadow-sm rounded-xl overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}><ChartBar className="w-5 h-5" /> Revenue & Orders (6m)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e2e8f0'} />
                  <XAxis dataKey="month" stroke={darkMode ? '#9CA3AF' : '#64748b'} />
                  <YAxis stroke={darkMode ? '#9CA3AF' : '#64748b'} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)', border: `1px solid ${darkMode ? 'rgba(51,65,85,0.5)' : 'rgba(203,213,225,0.5)'}`, borderRadius: 8, color: darkMode ? 'white' : '#1e293b' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={`border shadow-sm rounded-xl overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}><FileText className="w-5 h-5" /> Top Products (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProducts.length === 0 && <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No data</div>}
              {topProducts.map((p, idx) => (
                <div key={idx} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                  <div className={`${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.sales} units • {fmtINR(p.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={`border shadow-sm rounded-xl overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <CardTitle className={`${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={`${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Invoice</TableHead>
                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</TableHead>
                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Date</TableHead>
                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Due</TableHead>
                  <TableHead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id} className={`${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <TableCell className={`${darkMode ? 'text-white' : 'text-slate-900'}`}>{i.invoice_number || i.id}</TableCell>
                    <TableCell className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{i.status}</TableCell>
                    <TableCell className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(i.created_at).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell className={`${darkMode ? 'text-white' : 'text-slate-900'}`}>{fmtINR(i.grand_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={async () => { const np = page - 1; setPage(np); await fetchInvoices(np) }} className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Prev</Button>
            <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Page {page} of {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={async () => { const np = page + 1; setPage(np); await fetchInvoices(np) }} className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}



