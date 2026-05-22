'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { CurrencyDollar, FileText, Phone, Target, Users, ChatCenteredText } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ThemeToggle } from '@/components/ThemeToggle'

interface CashProfile {
  profile_photo?: string | null
  user_name?: string | null
  business_name?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  address?: string | null
  dial_number?: string | null
  dial_whatsapp?: string | null
}

interface CashKpis {
  totalRevenue?: number | null
  totalOrders?: number | null
  avgOrderValue?: number | null
  outstanding?: number | null
  paid?: number | null
  earnings?: number | null
}

interface CashRevenuePoint {
  month: string
  revenue: number
  orders: number
}

interface CashInvoice {
  id: string
  invoice_number?: string | null
  status?: string | null
  created_at: string
  due_date?: string | null
  outstanding_amount?: number | null
  grand_total?: number | null
}

interface CashLookupResponse {
  profile?: CashProfile
  kpis?: CashKpis
  revenueData?: CashRevenuePoint[]
  invoices?: CashInvoice[]
}

export default function CashManagementPage() {
  // Authentication removed - no auth needed
  const isAdmin = true // Always allow access

  const [searchBy, setSearchBy] = useState<'id' | 'phone' | 'name'>('id')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CashLookupResponse | null>(null)

  const callHref = useMemo(() => {
    const raw = data?.profile?.dial_number
    return raw ? `tel:${raw}` : null
  }, [data?.profile?.dial_number])

  const whatsappHref = useMemo(() => {
    const raw = data?.profile?.dial_whatsapp
    if (!raw) return null
    const digits = String(raw).replace(/[^0-9]/g, '')
    return digits ? `https://wa.me/${digits}` : null
  }, [data?.profile?.dial_whatsapp])

  const totalOutstanding = useMemo(
    () => Number(data?.kpis?.outstanding || 0),
    [data?.kpis?.outstanding]
  )

  const formatCurrency = (amount: number | null | undefined) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)

  const onSearch = async () => {
    try {
      setLoading(true)
      setError(null)
      setData(null)
      const id = encodeURIComponent(query.trim())
      if (!id) {
        setError('Please enter a value to search')
        return
      }
      const res = await fetch(`/api/admin/cash/${id}?by=${searchBy}`, { headers: { 'cache-control': 'no-store' } })
      if (!res.ok) throw new Error((await res.json())?.error || 'Lookup failed')
      const json = await res.json()
      setData(json)
    } catch (e: unknown) {
      const message =
        e instanceof Error && e.message
          ? e.message
          : 'Lookup failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 font-bold text-xl">!</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">Admin privileges required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Cash Management</h1>
            <p className="text-sm text-muted-foreground">Manual lookup and cash breakdown per retailer</p>
          </div>
          <ThemeToggle />
        </div>

        <Card className="border shadow-sm rounded-xl overflow-hidden mb-6 bg-card">
          <CardHeader className="px-4 py-3 border-b bg-muted">
            <CardTitle className="text-sm text-foreground">Manual Lookup</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Search by Retailer ID, Phone, or Name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value as 'id' | 'phone' | 'name')}
                className="px-3 py-2 rounded w-40 border bg-background text-foreground"
              >
                <option value="id">Retailer ID</option>
                <option value="phone">Phone</option>
                <option value="name">Name</option>
              </select>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchBy === 'id' ? 'UUID...' : searchBy === 'phone' ? '10-digit phone...' : 'Retailer/Business name...'} />
              <Button onClick={onSearch} disabled={loading} className="bg-indigo-600 text-white">{loading ? 'Searching...' : 'Search'}</Button>
              {error && <div className="text-xs self-center text-red-500 dark:text-red-400">{error}</div>}
            </div>
          </CardContent>
        </Card>

        {data && (
          <div className="space-y-6">
            <Card className="border shadow-sm rounded-xl overflow-hidden bg-card">
              <CardHeader className="px-4 py-3 border-b bg-muted">
                <CardTitle className="text-sm text-foreground">Retailer</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Profile and quick info</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {data.profile?.profile_photo ? (
                    <Image
                      src={data.profile.profile_photo}
                      alt={data.profile.user_name || 'Photo'}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full border bg-muted" />
                  )}
                  <div className="flex-1 text-foreground">
                    <div className="font-semibold flex items-center gap-2">
                      <span>{data.profile?.business_name || data.profile?.user_name || '—'}</span>
                      {totalOutstanding > 0 && (
                        <Badge className="bg-orange-500/80 text-xs text-white">Outstanding ₹{Math.round(totalOutstanding).toLocaleString('en-IN')}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {data.profile?.phone || '—'} • {data.profile?.city || ''}
                      {data.profile?.state ? `, ${data.profile.state}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">{data.profile?.address || '—'}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {whatsappHref && (
                      <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <ChatCenteredText className="w-4 h-4" /> WhatsApp
                        </a>
                      </Button>
                    )}
                    {callHref && (
                      <Button asChild size="sm" variant="outline">
                        <a href={callHref}>
                          <Phone className="w-4 h-4" /> Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards - Mobile Optimized */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6">
              <Card className="border shadow-sm transition-all duration-300 bg-card">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 bg-emerald-500/20">
                      <CurrencyDollar className="w-4 h-4 md:w-6 md:h-6 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-sm text-muted-foreground">Total Purchases</p>
                      <p className="text-lg md:text-3xl font-bold truncate text-foreground">{formatCurrency(data.kpis?.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm transition-all duration-300 bg-card">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 bg-blue-500/20">
                      <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-lg md:text-3xl font-bold truncate text-foreground">{data.kpis?.totalOrders ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm transition-all duration-300 bg-card">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 bg-purple-500/20">
                      <Target className="w-4 h-4 md:w-6 md:h-6 text-purple-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-lg md:text-3xl font-bold truncate text-foreground">{formatCurrency(data.kpis?.avgOrderValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm transition-all duration-300 bg-card">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 bg-orange-500/20">
                      <FileText className="w-4 h-4 md:w-6 md:h-6 text-orange-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-sm text-muted-foreground">Outstanding / Paid</p>
                      <p className="text-sm md:text-lg font-semibold truncate text-foreground">
                        {formatCurrency(data.kpis?.outstanding)}{' '}
                        <span className="text-muted-foreground">/ {formatCurrency(data.kpis?.paid)}</span>
                      </p>
                      <p className="text-[10px] md:text-xs mt-0.5 text-muted-foreground">Earnings: {formatCurrency(data.kpis?.earnings)}</p>
                    </div>
                  </div>
                  {totalOutstanding > 0 && (
                    <div className="mt-2 md:mt-4 text-[10px] md:text-xs rounded-lg p-2 md:p-3 border bg-muted text-foreground">
                      Follow up pending: {formatCurrency(totalOutstanding)}. Use quick actions to contact the retailer.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend */}
            <Card className="border shadow-sm rounded-xl overflow-hidden bg-card">
              <CardHeader className="px-4 py-3 border-b bg-muted">
                <CardTitle className="text-sm text-foreground">Revenue & Orders (6m)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenueData}>
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

            {/* Recent Invoices */}
            <Card className="border shadow-sm rounded-xl overflow-hidden bg-card">
              <CardHeader className="px-4 py-3 border-b bg-muted">
                <CardTitle className="text-sm text-foreground">Recent Invoices</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Outstanding invoices are highlighted so you can follow up instantly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Invoice</th>
                        <th className="text-left py-2 pr-4">Status</th>
                        <th className="text-left py-2 pr-4">Date</th>
                        <th className="text-left py-2 pr-4">Due</th>
                        <th className="text-left py-2 pr-4">Outstanding</th>
                        <th className="text-left py-2 pr-4">Amount</th>
                        <th className="text-left py-2 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.invoices || []).map((i: CashInvoice) => {
                        const outstanding = Number(i.outstanding_amount || 0)
                        const isDue = outstanding > 0
                        return (
                        <tr key={i.id} className={`border-b ${isDue ? 'bg-red-500/5' : ''}`}>
                          <td className="py-2 pr-4 text-foreground">{i.invoice_number || i.id}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{i.status}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{new Date(i.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className={`py-2 pr-4 ${isDue ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>{isDue ? formatCurrency(outstanding) : '₹0'}</td>
                          <td className="py-2 pr-4 text-foreground">{formatCurrency(i.grand_total)}</td>
                          <td className="py-2 pr-0 text-right">
                            <div className="flex justify-end gap-2">
                              {whatsappHref && (
                                <Button asChild size="sm" className="h-8 bg-emerald-500/80 hover:bg-emerald-500 text-white">
                                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" title="WhatsApp follow-up">
                                    <ChatCenteredText className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              {callHref && (
                                <Button asChild size="sm" variant="outline" className="h-8" title="Call retailer">
                                  <a href={callHref}>
                                    <Phone className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  )
}






















