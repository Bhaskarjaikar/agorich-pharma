"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar,
  Clock,
  CheckCircle,
  WarningCircle,
  Heart,
  CurrencyDollar,
  Star,
  Pulse,
  ChatCircle,
  MagnifyingGlass,
  Phone,
  MapPin,
  SquaresFour,
  Target,
  Users,
  TrendUp,
  Medal,
  Plus,
  Eye
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
// Authentication removed
import { useTranslation } from 'react-i18next'

export default function SalesDashboard() {
  const { t } = useTranslation()
  // Authentication removed - no auth needed
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Authentication removed - page is publicly accessible
  // No auth checks needed

  // MOCK DATA - Replace with real API calls
  // TODO: Wire to actual sales and customer data
  const salesData = {
    monthlyTarget: 500000,
    monthlyActual: 420000,
    targetProgress: 84,
    newRetailers: 8,
    activeRetailers: 45,
    totalRetailers: 52,
    retentionRate: 87.5,
    avgOrderValue: 12500,
    commissionEarned: 25000,
    pendingFollowUps: 12
  }

  const customers = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      business: 'Kumar Pharmacy',
      status: 'Active',
      healthScore: 95,
      lastContact: '2024-01-15',
      nextFollowUp: '2024-01-22',
      totalOrders: 25,
      totalValue: 125000,
      outstandingBalance: 0,
      location: 'Patna, Bihar',
      phone: '+91 8409725206',
      email: 'rajesh@kumarpharmacy.com'
    },
    {
      id: 2,
      name: 'Priya Sharma',
      business: 'Sharma Medical',
      status: 'Active',
      healthScore: 88,
      lastContact: '2024-01-14',
      nextFollowUp: '2024-01-21',
      totalOrders: 18,
      totalValue: 95000,
      outstandingBalance: 5000,
      location: 'Patna, Bihar',
      phone: '+91 98765 43211',
      email: 'priya@sharmamedical.com'
    },
    {
      id: 3,
      name: 'Amit Singh',
      business: 'Singh Clinic',
      status: 'Prospect',
      healthScore: 65,
      lastContact: '2024-01-10',
      nextFollowUp: '2024-01-17',
      totalOrders: 0,
      totalValue: 0,
      outstandingBalance: 0,
      location: 'Gaya, Bihar',
      phone: '+91 98765 43212',
      email: 'amit@singhclinic.com'
    },
    {
      id: 4,
      name: 'Sunita Devi',
      business: 'Devi Pharmacy',
      status: 'Inactive',
      healthScore: 45,
      lastContact: '2023-12-20',
      nextFollowUp: '2024-01-20',
      totalOrders: 5,
      totalValue: 25000,
      outstandingBalance: 8000,
      location: 'Muzaffarpur, Bihar',
      phone: '+91 98765 43213',
      email: 'sunita@devipharmacy.com'
    }
  ]

  const recentActivities = [
    { type: 'call', customer: 'Rajesh Kumar', action: 'Follow-up call completed', time: '2 hours ago', status: 'completed' },
    { type: 'meeting', customer: 'Priya Sharma', action: 'Product demo scheduled', time: '4 hours ago', status: 'scheduled' },
    { type: 'order', customer: 'Amit Singh', action: 'First order placed', time: '1 day ago', status: 'completed' },
    { type: 'followup', customer: 'Sunita Devi', action: 'Follow-up reminder', time: '2 days ago', status: 'pending' }
  ]

  const topPerformers = [
    { name: 'Rajesh Kumar', orders: 25, value: 125000, growth: 15.2 },
    { name: 'Priya Sharma', orders: 18, value: 95000, growth: 12.8 },
    { name: 'Vikram Patel', orders: 15, value: 85000, growth: 8.5 },
    { name: 'Meera Joshi', orders: 12, value: 75000, growth: 22.1 }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200'
      case 'Prospect': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'Inactive': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.business.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || customer.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{t('dashboard.sales.title')}</h1>
                  <p className="text-sm text-gray-500">{t('dashboard.sales.welcome', 'Welcome back!')}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                {t('dashboard.sales.scheduleMeeting', 'Schedule Meeting')}
              </Button>
              <Button className="trust-gradient text-white">
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.sales.addCustomer', 'Add Customer')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('dashboard.sales.monthlyTarget', 'Monthly Target')}
                </CardTitle>
                <Target className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesData.monthlyActual)} / {formatCurrency(salesData.monthlyTarget)}
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendUp className="h-3 w-3 mr-1" weight="bold" />
                  {formatPercentage(salesData.targetProgress)} {t('dashboard.sales.achieved', 'achieved')}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-slate-600 h-2 rounded-full" 
                    style={{ width: `${salesData.targetProgress}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('dashboard.admin.activeRetailers')}
                </CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {salesData.activeRetailers} / {salesData.totalRetailers}
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {formatPercentage(salesData.retentionRate)} {t('dashboard.sales.retentionRate', 'retention rate')}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('dashboard.sales.commissionEarned', 'Commission Earned')}
                </CardTitle>
                <CurrencyDollar className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesData.commissionEarned)}
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendUp className="h-3 w-3 mr-1" weight="bold" />
                  +12.5% {t('dashboard.admin.fromLastPeriod', 'from last period')}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('dashboard.sales.pendingFollowUps', 'Pending Follow-ups')}
                </CardTitle>
                <Clock className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {salesData.pendingFollowUps}
                </div>
                <div className="flex items-center text-xs text-orange-600">
                  <WarningCircle className="h-3 w-3 mr-1" />
                  {t('dashboard.sales.requiresAttention', 'Requires attention')}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className="flex items-center"
          >
            <Pulse className="w-4 h-4 mr-2" />
            {t('dashboard.sales.overview')}
          </Button>
          <Button
            variant={activeTab === 'customers' ? 'default' : 'outline'}
            onClick={() => setActiveTab('customers')}
            className="flex items-center"
          >
            <Users className="w-4 h-4 mr-2" />
            {t('dashboard.sales.customers', 'Customers')}
          </Button>
          <Button
            variant={activeTab === 'territory' ? 'default' : 'outline'}
            onClick={() => setActiveTab('territory')}
            className="flex items-center"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Territory
          </Button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activities */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Pulse className="w-5 h-5 mr-2 text-slate-600" />
                    {t('dashboard.sales.recentActivities', 'Recent Activities')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.sales.latestInteractions', 'Your latest customer interactions')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                      >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === 'call' ? 'bg-gray-100' :
                          activity.type === 'meeting' ? 'bg-gray-100' :
                          activity.type === 'order' ? 'bg-gray-100' :
                          'bg-gray-100'
                        }`}>
                          {activity.type === 'call' ? (
                            <Phone className="w-5 h-5 text-slate-600" />
                          ) : activity.type === 'meeting' ? (
                            <SquaresFour className="w-5 h-5 text-slate-600" />
                          ) : activity.type === 'order' ? (
                            <CheckCircle className="w-5 h-5 text-slate-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{activity.customer}</h4>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                        <Badge 
                          variant={activity.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Performers */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-600" />
                    {t('dashboard.sales.topPerformers', 'Top Performers')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.sales.bestCustomers', 'Your best performing customers')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {performer.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{performer.name}</h4>
                            <p className="text-xs text-gray-500">{performer.orders} {t('dashboard.admin.totalOrders')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(performer.value)}
                          </p>
                          <p className="text-xs text-green-600">
                            +{formatPercentage(performer.growth)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Search and Filters */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Input
                        placeholder={t('dashboard.sales.searchCustomers', 'Search customers...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder={t('dashboard.sales.filterByStatus', 'Filter by status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('dashboard.sales.allStatus', 'All Status')}</SelectItem>
                      <SelectItem value="active">{t('dashboard.sales.active', 'Active')}</SelectItem>
                      <SelectItem value="prospect">{t('dashboard.sales.prospect', 'Prospect')}</SelectItem>
                      <SelectItem value="inactive">{t('dashboard.sales.inactive', 'Inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {customer.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                            <p className="text-sm text-gray-600">{customer.business}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(customer.status)}>
                          {customer.status}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('dashboard.sales.healthScore', 'Health Score')}</span>
                          <Badge className={getHealthScoreColor(customer.healthScore)}>
                            {customer.healthScore}/100
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('dashboard.admin.totalOrders')}</span>
                          <span className="font-semibold">{customer.totalOrders}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('dashboard.sales.totalValue', 'Total Value')}</span>
                          <span className="font-semibold">{formatCurrency(customer.totalValue)}</span>
                        </div>

                        {customer.outstandingBalance > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{t('dashboard.retailer.outstandingBalance')}</span>
                            <span className="font-semibold text-red-600">
                              {formatCurrency(customer.outstandingBalance)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('dashboard.sales.lastContact', 'Last Contact')}</span>
                          <span className="text-sm">{customer.lastContact}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('dashboard.sales.nextFollowUp', 'Next Follow-up')}</span>
                          <span className="text-sm">{customer.nextFollowUp}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Phone className="w-4 h-4 mr-1" />
                          {t('dashboard.sales.call', 'Call')}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <ChatCircle className="w-4 h-4 mr-1" />
                          {t('dashboard.sales.chat', 'Chat')}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Territory Tab */}
        {activeTab === 'territory' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  {t('dashboard.sales.territoryMap', 'Territory Map')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.sales.assignedTerritory', 'Your assigned territory: Patna, Gaya, Muzaffarpur, and surrounding areas')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.sales.interactiveMap', 'Interactive Territory Map')}</h3>
                    <p className="text-gray-600 mb-4">
                      {t('dashboard.sales.mapDescription', 'View your customers on the map, plan routes, and track visits')}
                    </p>
                    <Button className="trust-gradient text-white">
                      {t('dashboard.sales.openFullMap', 'Open Full Map')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

