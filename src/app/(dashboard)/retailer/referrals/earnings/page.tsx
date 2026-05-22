"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CurrencyDollar, 
  TrendUp, 
  Download, 
  Calendar,
  ArrowLeft,
  ArrowsClockwise,
  ChartPie,
  ChartBar,
  Clock,
  CheckCircle,
  WarningCircle
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/lib/referral-utils'

interface EarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  availableForWithdrawal: number
  pendingPayments: number
  monthlyTrend: Array<{
    month: string
    earnings: number
  }>
  breakdown: Array<{
    type: string
    amount: number
    percentage: number
    color: string
  }>
  paymentHistory: Array<{
    id: string
    date: string
    amount: number
    status: string
    reference: string
    description: string
  }>
}

export default function EarningsPage() {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod] = useState('6_months')

  const fetchEarningsData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/referral/earnings-history?period=${selectedPeriod}`)
      
      if (response.ok) {
        const data = await response.json()
        setEarningsData(data)
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    fetchEarningsData()
  }, [fetchEarningsData])

  const handleWithdraw = async () => {
    try {
      const response = await fetch('/api/referral/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: earningsData?.availableForWithdrawal
        })
      })

      if (response.ok) {
        // Handle successful withdrawal
        fetchEarningsData() // Refresh data
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error)
    }
  }

  const handleDownloadStatement = () => {
    // Generate and download earnings statement
    const data = earningsData?.paymentHistory || []
    const csvContent = [
      ['Date', 'Amount', 'Status', 'Reference', 'Description'],
      ...data.map(payment => [
        payment.date,
        payment.amount.toString(),
        payment.status,
        payment.reference,
        payment.description
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `earnings-statement-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading earnings data...</div>
      </div>
    )
  }

  if (!earningsData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">No earnings data available</div>
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
              <Link href="/retailer/referrals">
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
                  💰 My Earnings
                </h1>
                <p className="text-white/70">Track your referral earnings and payments</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={fetchEarningsData}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowsClockwise className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleDownloadStatement}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Statement
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Earnings</p>
                  <p className="text-white text-2xl font-bold">
                    {formatCurrency(earningsData.totalEarnings)}
                  </p>
                </div>
                <CurrencyDollar className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">This Month</p>
                  <p className="text-white text-2xl font-bold">
                    {formatCurrency(earningsData.thisMonthEarnings)}
                  </p>
                </div>
                <TrendUp className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Available</p>
                  <p className="text-white text-2xl font-bold">
                    {formatCurrency(earningsData.availableForWithdrawal)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Pending</p>
                  <p className="text-white text-2xl font-bold">
                    {formatCurrency(earningsData.pendingPayments)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Withdraw Button */}
        {earningsData.availableForWithdrawal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-lg font-semibold">💰 Ready to Withdraw?</h3>
                    <p className="text-white/70">
                      You have {formatCurrency(earningsData.availableForWithdrawal)} available for withdrawal
                    </p>
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    Withdraw Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <ChartBar className="w-5 h-5 mr-2" />
                  Monthly Earnings Trend
                </CardTitle>
                <CardDescription className="text-white/70">
                  Your earnings over the last {selectedPeriod.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={earningsData.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }}
                        formatter={(value) => [formatCurrency(Number(value)), 'Earnings']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="earnings" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Earnings Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <ChartPie className="w-5 h-5 mr-2" />
                  Earnings Breakdown
                </CardTitle>
                <CardDescription className="text-white/70">
                  Distribution by referral type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }}
                        formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                      />
                      <Pie
                        data={earningsData.breakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${Math.round((percent || 0) * 100)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {earningsData.breakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Payment History
              </CardTitle>
              <CardDescription className="text-white/70">
                All your referral payments and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {earningsData.paymentHistory.length > 0 ? (
                  earningsData.paymentHistory.map((payment, index) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : payment.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {payment.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : payment.status === 'pending' ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <WarningCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{payment.description}</p>
                          <p className="text-white/70 text-sm">
                            {new Date(payment.date).toLocaleDateString('en-IN')} • {payment.reference}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold text-lg">
                          {formatCurrency(payment.amount)}
                        </p>
                        <Badge className={`${
                          payment.status === 'completed' 
                            ? 'bg-green-500/20 text-green-100 border-green-400/30'
                            : payment.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'
                            : 'bg-red-500/20 text-red-100 border-red-400/30'
                        }`}>
                          {payment.status.toUpperCase()}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/70 text-lg">No payment history yet</p>
                    <p className="text-white/50 text-sm">
                      Your referral payments will appear here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}












