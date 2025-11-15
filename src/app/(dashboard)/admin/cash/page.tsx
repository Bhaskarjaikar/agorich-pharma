'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { DollarSign, FileText, Phone, Target, Users, MessageSquare } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 font-bold text-xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/70">Admin privileges required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Cash Management</h1>
          <p className="text-sm text-white/70">Manual lookup and cash breakdown per retailer</p>
        </div>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden mb-6">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-white text-sm">Manual Lookup</CardTitle>
            <CardDescription className="text-white/70 text-xs">Search by Retailer ID, Phone, or Name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value as 'id' | 'phone' | 'name')}
                className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white w-40"
              >
                <option value="id">Retailer ID</option>
                <option value="phone">Phone</option>
                <option value="name">Name</option>
              </select>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchBy === 'id' ? 'UUID...' : searchBy === 'phone' ? '10-digit phone...' : 'Retailer/Business name...'} className="text-white placeholder-white/60 bg-white/10 border-white/20" />
              <Button onClick={onSearch} disabled={loading} className="bg-indigo-600 text-white">{loading ? 'Searching...' : 'Search'}</Button>
              {error && <div className="text-red-300 text-xs self-center">{error}</div>}
            </div>
          </CardContent>
        </Card>

        {data && (
          <div className="space-y-6">
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-white text-sm">Retailer</CardTitle>
                <CardDescription className="text-white/70 text-xs">Profile and quick info</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {data.profile?.profile_photo ? (
                    <Image
                      src={data.profile.profile_photo}
                      alt={data.profile.user_name || 'Photo'}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20" />
                  )}
                  <div className="text-white flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <span>{data.profile?.business_name || data.profile?.user_name || '—'}</span>
                      {totalOutstanding > 0 && (
                        <Badge className="bg-orange-500/80 text-xs text-white">Outstanding ₹{Math.round(totalOutstanding).toLocaleString('en-IN')}</Badge>
                      )}
                    </div>
                    <div className="text-white/70 text-xs">
                      {data.profile?.phone || '—'} • {data.profile?.city || ''}
                      {data.profile?.state ? `, ${data.profile.state}` : ''}
                    </div>
                    <div className="text-white/60 text-xs">{data.profile?.address || '—'}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {whatsappHref && (
                      <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="w-4 h-4" /> WhatsApp
                        </a>
                      </Button>
                    )}
                    {callHref && (
                      <Button asChild size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                        <a href={callHref}>
                          <Phone className="w-4 h-4" /> Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-green-500 to-emerald-500 border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-100">Total Purchases</p>
                      <p className="text-3xl font-bold text-white">{formatCurrency(data.kpis?.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-100">Total Orders</p>
                      <p className="text-3xl font-bold text-white">{data.kpis?.totalOrders ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-100">Avg Order Value</p>
                      <p className="text-3xl font-bold text-white">{formatCurrency(data.kpis?.avgOrderValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-100">Outstanding / Paid</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(data.kpis?.outstanding)}{' '}
                        <span className="text-white/70">/ {formatCurrency(data.kpis?.paid)}</span>
                      </p>
                      <p className="text-xs text-white/80 mt-1">Earnings: {formatCurrency(data.kpis?.earnings)}</p>
                    </div>
                  </div>
                  {totalOutstanding > 0 && (
                    <div className="mt-4 text-xs text-white/90 bg-black/20 backdrop-blur rounded-lg p-3 border border-white/10">
                      Follow up pending: {formatCurrency(totalOutstanding)}. Use quick actions to contact the retailer.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend */}
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-white text-sm">Revenue & Orders (6m)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenueData}>
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

            {/* Recent Invoices */}
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-white text-sm">Recent Invoices</CardTitle>
                <CardDescription className="text-white/60 text-xs">
                  Outstanding invoices are highlighted so you can follow up instantly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 text-white/70">
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
                        <tr key={i.id} className={`border-b border-white/10 ${isDue ? 'bg-red-500/5' : ''}`}>
                          <td className="py-2 pr-4 text-white">{i.invoice_number || i.id}</td>
                          <td className="py-2 pr-4 text-white/80">{i.status}</td>
                          <td className="py-2 pr-4 text-white/80">{new Date(i.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="py-2 pr-4 text-white/80">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className={`py-2 pr-4 ${isDue ? 'text-red-300 font-semibold' : 'text-white/80'}`}>{isDue ? formatCurrency(outstanding) : '₹0'}</td>
                          <td className="py-2 pr-4 text-white">{formatCurrency(i.grand_total)}</td>
                          <td className="py-2 pr-0 text-right">
                            <div className="flex justify-end gap-2">
                              {whatsappHref && (
                                <Button asChild size="sm" className="h-8 bg-emerald-500/80 hover:bg-emerald-500 text-white">
                                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" title="WhatsApp follow-up">
                                    <MessageSquare className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              {callHref && (
                                <Button asChild size="sm" variant="outline" className="h-8 border-white/20 text-white hover:bg-white/10" title="Call retailer">
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






















