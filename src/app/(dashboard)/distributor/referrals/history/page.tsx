"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MagnifyingGlass, Funnel, ArrowLeft, ArrowsClockwise, Download, Eye, ChatCircle, ShareNetwork, Calendar, User, CurrencyDollar, Clock, CheckCircle, WarningCircle, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { formatCurrency } from '@/lib/referral-utils'

interface ReferralHistoryItem {
  id: string
  referral_code: string
  referred_name: string
  referred_email: string
  referred_type: string
  referral_type: string
  status: string
  created_at: string
  approval_date?: string
  first_order_date?: string
  bonus_activation_date?: string
  bonus_expiry_date?: string
  referrer_bonus_amount?: number
  referrer_bonus_type?: string
  referred_bonus_amount?: number
  referred_bonus_type?: string
  total_orders: number
  total_purchase: number
  last_order_date?: string
}

interface ReferralHistoryData {
  referrals: ReferralHistoryItem[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function ReferralHistoryPage() {
  const [historyData, setHistoryData] = useState<ReferralHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [, setSelectedReferral] = useState<ReferralHistoryItem | null>(null)

  const fetchReferralHistory = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        status: statusFilter,
        type: typeFilter,
        date: dateFilter,
        sortBy,
        sortOrder,
        search: searchTerm
      })

      const response = await fetch(`/api/referral/all?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setHistoryData(data)
      }
    } catch (error) {
      console.error('Error fetching referral history:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, typeFilter, dateFilter, sortBy, sortOrder, searchTerm])

  useEffect(() => {
    fetchReferralHistory()
  }, [fetchReferralHistory])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'status':
        setStatusFilter(value)
        break
      case 'type':
        setTypeFilter(value)
        break
      case 'date':
        setDateFilter(value)
        break
      case 'sort':
        setSortBy(value)
        break
      case 'order':
        setSortOrder(value)
        break
    }
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
    setDateFilter('all')
    setSortBy('created_at')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'expired':
        return <WarningCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-100 border-green-400/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'
      case 'expired':
        return 'bg-red-500/20 text-red-100 border-red-400/30'
      default:
        return 'bg-gray-500/20 text-gray-100 border-gray-400/30'
    }
  }

  const handleExport = () => {
    if (!historyData?.referrals) return

    const csvContent = [
      ['Name', 'Email', 'Type', 'Status', 'Created Date', 'Total Orders', 'Total Purchase', 'Bonus Amount'],
      ...historyData.referrals.map(referral => [
        referral.referred_name,
        referral.referred_email,
        referral.referred_type,
        referral.status,
        new Date(referral.created_at).toLocaleDateString('en-IN'),
        referral.total_orders.toString(),
        referral.total_purchase.toString(),
        (referral.referrer_bonus_amount || 0).toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `referral-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading referral history...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <Link href="/distributor/referrals">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Referrals
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center">
                  📋 Referral History
                </h1>
                <p className="text-white/70">Complete history of all your referrals</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={fetchReferralHistory}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowsClockwise className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Funnel className="w-5 h-5 mr-2" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or referral code..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                {/* Filter Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full p-2 bg-white/10 border border-white/20 text-white rounded-md"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="w-full p-2 bg-white/10 border border-white/20 text-white rounded-md"
                    >
                      <option value="all">All Types</option>
                      <option value="pharmacy_to_pharmacy">Pharmacy to Pharmacy</option>
                      <option value="mr_to_mr">MR to MR</option>
                      <option value="cross_type">Cross Type</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Date Range</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => handleFilterChange('date', e.target.value)}
                      className="w-full p-2 bg-white/10 border border-white/20 text-white rounded-md"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => handleFilterChange('sort', e.target.value)}
                      className="w-full p-2 bg-white/10 border border-white/20 text-white rounded-md"
                    >
                      <option value="created_at">Created Date</option>
                      <option value="referred_name">Name</option>
                      <option value="status">Status</option>
                      <option value="total_orders">Total Orders</option>
                      <option value="total_purchase">Total Purchase</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Order</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => handleFilterChange('order', e.target.value)}
                      className="w-full p-2 bg-white/10 border border-white/20 text-white rounded-md"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-end">
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/70 hover:bg-white/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-white/70">
              Showing {historyData?.referrals.length || 0} of {historyData?.totalCount || 0} referrals
            </p>
            <div className="flex items-center space-x-4 text-white/70 text-sm">
              <span>Page {historyData?.currentPage || 1} of {historyData?.totalPages || 1}</span>
            </div>
          </div>
        </motion.div>

        {/* Referrals Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="text-left p-4 text-white/70 font-medium">Name</th>
                      <th className="text-left p-4 text-white/70 font-medium">Type</th>
                      <th className="text-left p-4 text-white/70 font-medium">Status</th>
                      <th className="text-left p-4 text-white/70 font-medium">Created</th>
                      <th className="text-left p-4 text-white/70 font-medium">Orders</th>
                      <th className="text-left p-4 text-white/70 font-medium">Purchase</th>
                      <th className="text-left p-4 text-white/70 font-medium">Bonus</th>
                      <th className="text-left p-4 text-white/70 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData?.referrals.map((referral, index) => (
                      <motion.tr
                        key={referral.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-4">
                          <div>
                            <p className="text-white font-semibold">{referral.referred_name}</p>
                            <p className="text-white/70 text-sm">{referral.referred_email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-card text-slate-200 border-slate-600">
                            {referral.referred_type}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={`${getStatusColor(referral.status)}`}>
                            {getStatusIcon(referral.status)}
                            <span className="ml-1">{referral.status.toUpperCase()}</span>
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-white/50" />
                            <span className="text-white/70 text-sm">
                              {new Date(referral.created_at).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-white/50" />
                            <span className="text-white">{referral.total_orders}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <CurrencyDollar className="w-4 h-4 text-white/50" />
                            <span className="text-white">{formatCurrency(referral.total_purchase)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-yellow-400 font-semibold">
                            {formatCurrency(referral.referrer_bonus_amount || 0)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReferral(referral)}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <ChatCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <ShareNetwork className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pagination */}
        {historyData && historyData.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex justify-center"
          >
            <div className="flex space-x-2">
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!historyData.hasPreviousPage}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, historyData.totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className={
                      currentPage === pageNum
                        ? 'bg-white/20 text-white border-white/30'
                        : 'border-white/20 text-white hover:bg-white/10'
                    }
                  >
                    {pageNum}
                  </Button>
                )
              })}
              
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!historyData.hasNextPage}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {historyData?.referrals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center py-12"
          >
            <User className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70 text-lg">No referrals found</p>
            <p className="text-white/50 text-sm">
              Try adjusting your filters or start referring people to see them here
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}












