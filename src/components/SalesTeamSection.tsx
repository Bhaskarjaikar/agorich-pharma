'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users,
  Target,
  TrendUp,
  MapPin,
  Calendar,
  Phone,
  Plus,
  MagnifyingGlass,
  Funnel,
  DotsThree,
  Pencil,
  Trash,
  Eye,
  Download,
  Medal,
  Briefcase,
  CurrencyDollar,
  CheckCircle,
} from '@phosphor-icons/react'
import SalesPerformanceCharts from './SalesPerformanceCharts'

interface SalesTeamMember {
  id: string
  profile_id: string
  territory: string
  monthly_target: number
  commission_rate: number
  joining_date: string
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
  retailer_count: number
  profiles: {
    user_name: string
    business_name: string
    phone: string
    email: string
    city: string
    state: string
  }
}

interface PerformanceData {
  id: string
  profile_id: string
  name: string
  business_name: string
  phone: string
  territory: string
  monthly_target: number
  commission_rate: number
  retailer_count: number
  total_revenue: number
  total_orders: number
  achievement_percentage: number
  total_calls: number
  total_meetings: number
  total_visits: number
  successful_visits: number
  new_retailers_added: number
  commission_earned: number
  daily_performance: Array<{
    date: string
    revenue: number
    visits: number
    calls: number
  }>
}

interface VisitLog {
  id: string
  sales_id: string
  visit_date: string
  retailer_id: string
  contact_person: string
  visit_purpose: string
  discussion_notes: string
  outcome: string
  next_followup_date: string
  location_lat: number
  location_lng: number
  sales_team: {
    profile_id: string
    profiles: {
      user_name: string
      phone: string
    }
  }
  retailer: {
    user_name: string
    business_name: string
    phone: string
    city: string
  }
}

interface SalesTeamSummary {
  total_members: number
  total_revenue: number
  total_target: number
  avg_achievement: number
  total_calls: number
  total_visits: number
  total_new_retailers: number
}

// Hook for responsive design
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return isMobile
}

export default function SalesTeamSection() {
  const [activeTab, setActiveTab] = useState('team')
  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([])
  const isMobile = useIsMobile()
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([])
  const [summary, setSummary] = useState<SalesTeamSummary | null>(null)
  const [territories, setTerritories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedTerritory, setSelectedTerritory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<SalesTeamMember | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  const loadSalesTeam = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const res = await fetch(`/api/admin/sales-team?status=ALL&territory=${selectedTerritory}`, {
        headers: { 'cache-control': 'no-store' },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to load sales team`)
      }
      const json = await res.json()
      setSalesTeam(json.salesTeam || [])
      setTerritories(json.territories || [])
    } catch (e: any) {
      console.error('Error loading sales team:', e)
      setErrorMessage(e.message || 'Failed to load sales team. Please ensure database tables are created.')
    } finally {
      setLoading(false)
    }
  }, [selectedTerritory])

  const loadPerformance = useCallback(async () => {
    try {
      setErrorMessage(null)
      const res = await fetch(`/api/admin/sales-team/performance?month=${selectedMonth}`, {
        headers: { 'cache-control': 'no-store' },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to load performance`)
      }
      const json = await res.json()
      setPerformanceData(json.performance || [])
      setSummary(json.summary || null)
    } catch (e: any) {
      console.error('Error loading performance:', e)
      setErrorMessage(e.message || 'Failed to load performance data.')
    }
  }, [selectedMonth])

  const loadVisitLogs = useCallback(async () => {
    try {
      setErrorMessage(null)
      const res = await fetch('/api/admin/sales-team/visit-logs?limit=50', {
        headers: { 'cache-control': 'no-store' },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to load visit logs`)
      }
      const json = await res.json()
      setVisitLogs(json.logs || [])
    } catch (e: any) {
      console.error('Error loading visit logs:', e)
      setErrorMessage(e.message || 'Failed to load visit logs.')
    }
  }, [])

  useEffect(() => {
    loadSalesTeam()
  }, [loadSalesTeam])

  useEffect(() => {
    if (activeTab === 'performance') {
      loadPerformance()
    }
  }, [activeTab, loadPerformance])

  useEffect(() => {
    if (activeTab === 'visits') {
      loadVisitLogs()
    }
  }, [activeTab, loadVisitLogs])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-500/20 text-emerald-500">Active</Badge>
      case 'INACTIVE':
        return <Badge className="bg-red-500/20 text-red-500">Inactive</Badge>
      case 'ON_LEAVE':
        return <Badge className="bg-yellow-500/20 text-yellow-500">On Leave</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'ORDER_PLACED':
        return <Badge className="bg-emerald-500/20 text-emerald-500">Order Placed</Badge>
      case 'FOLLOW_UP':
        return <Badge className="bg-blue-500/20 text-blue-500">Follow-up</Badge>
      case 'ISSUE_RESOLVED':
        return <Badge className="bg-purple-500/20 text-purple-500">Issue Resolved</Badge>
      case 'NO_SALE':
        return <Badge className="bg-gray-500/20 text-gray-500">No Sale</Badge>
      default:
        return <Badge variant="secondary">{outcome}</Badge>
    }
  }

  const filteredTeam = salesTeam.filter((member) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      member.profiles?.user_name?.toLowerCase().includes(searchLower) ||
      member.profiles?.business_name?.toLowerCase().includes(searchLower) ||
      member.territory?.toLowerCase().includes(searchLower) ||
      member.profiles?.phone?.includes(searchQuery)
    )
  })

  const exportToExcel = () => {
    const data = performanceData.map((p) => ({
      Name: p.name,
      Territory: p.territory,
      Target: p.monthly_target,
      Revenue: p.total_revenue,
      Achievement: `${p.achievement_percentage}%`,
      Orders: p.total_orders,
      Calls: p.total_calls,
      Visits: p.total_visits,
      Commission: p.commission_earned,
    }))
    // Use xlsx library to export
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Team Performance')
      XLSX.writeFile(wb, `sales-team-performance-${selectedMonth}.xlsx`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-600 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <h3 className="text-red-800 font-medium">Database Setup Required</h3>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
              <p className="text-red-600 text-sm mt-2">
                Please run the SQL migration file: <code className="bg-red-100 px-1 rounded">add_sales_team_tables.sql</code> in your Supabase SQL Editor.
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="team" className="text-xs">Team</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="visits" className="text-xs">Visits</TabsTrigger>
        </TabsList>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          {/* Compact Stats - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-2 md:p-4 flex items-center gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Members</p>
                    <p className="text-lg md:text-2xl font-bold">{salesTeam.length}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-emerald-50/50 border-emerald-100">
                <CardContent className="p-2 md:p-4 flex items-center gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 md:w-6 md:h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Active</p>
                    <p className="text-lg md:text-2xl font-bold">
                      {salesTeam.filter((m) => m.status === 'ACTIVE').length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-purple-50/50 border-purple-100">
                <CardContent className="p-2 md:p-4 flex items-center gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Areas</p>
                    <p className="text-lg md:text-2xl font-bold">{territories.length}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-amber-50/50 border-amber-100">
                <CardContent className="p-2 md:p-4 flex items-center gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 md:w-6 md:h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Retailers</p>
                    <p className="text-lg md:text-2xl font-bold">
                      {salesTeam.reduce((sum, m) => sum + m.retailer_count, 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Compact Filter & Add */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                <SelectTrigger className="w-28 h-9 text-sm">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {territories.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Mobile: Compact Card List | Desktop: Table */}
          {isMobile ? (
            <div className="space-y-2">
              {filteredTeam.map((member) => (
                <Card key={member.id} className="overflow-hidden">
                  <CardContent className="p-2">
                    {/* Row 1: Avatar + Name + Status */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {(member.profiles?.user_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.profiles?.user_name || 'Unknown'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {member.status === 'ACTIVE' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ) : member.status === 'INACTIVE' ? (
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedMember(member); setIsViewModalOpen(true); }}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Row 2: Location + Stats */}
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <span className="truncate">{member.territory || 'No area'}</span>
                      <span>•</span>
                      <span>{member.retailer_count} retailers</span>
                    </div>
                    
                    {/* Row 3: Target & Commission */}
                    <div className="mt-1.5 flex items-center justify-between text-xs border-t border-gray-100 pt-1.5">
                      <span className="text-gray-600">Target: <span className="font-medium text-gray-900">{formatCurrency(member.monthly_target).replace('₹', '₹')}</span></span>
                      <span className="text-gray-600">Comm: <span className="font-medium text-gray-900">{member.commission_rate}%</span></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Team</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Member</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Retailers</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeam.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.profiles?.user_name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{member.profiles?.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{member.territory || '-'}</TableCell>
                          <TableCell className="text-right">{member.retailer_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(member.monthly_target)}</TableCell>
                          <TableCell className="text-right">{member.commission_rate}%</TableCell>
                          <TableCell className="text-center">{getStatusBadge(member.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedMember(member); setIsViewModalOpen(true); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {/* Compact Summary - Mobile Optimized */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-2 md:p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <CurrencyDollar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm md:text-base font-bold truncate">{formatCurrency(summary.total_revenue).replace('₹', '₹')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-emerald-50/50 border-emerald-100">
                <CardContent className="p-2 md:p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Achievement</p>
                    <p className="text-sm md:text-base font-bold">{summary.avg_achievement}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50/50 border-purple-100">
                <CardContent className="p-2 md:p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Calls</p>
                    <p className="text-sm md:text-base font-bold">{summary.total_calls}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-amber-50/50 border-amber-100">
                <CardContent className="p-2 md:p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">New</p>
                    <p className="text-sm md:text-base font-bold">{summary.total_new_retailers}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Compact Filter */}
          <div className="flex gap-2 items-center justify-between">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-36 h-9 text-sm"
            />
            <Button size="sm" variant="outline" onClick={exportToExcel}>
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile: Compact Performance Cards | Desktop: Table */}
          {isMobile ? (
            <div className="space-y-2">
              {performanceData.map((member) => (
                <Card key={member.id} className="overflow-hidden">
                  <CardContent className="p-2">
                    {/* Row 1: Avatar + Name + Achievement */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {(member.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.territory}</p>
                      </div>
                      <div className={`text-right ${
                        member.achievement_percentage >= 100 ? 'text-emerald-600' :
                        member.achievement_percentage >= 75 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        <p className="font-bold text-base">{member.achievement_percentage}%</p>
                      </div>
                    </div>
                    
                    {/* Stats - Stacked */}
                    <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Revenue</span>
                        <span className="font-medium">{formatCurrency(member.total_revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Target</span>
                        <span className="font-medium">{formatCurrency(member.monthly_target)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Commission</span>
                        <span className="font-medium">{formatCurrency(member.commission_earned)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Visits</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceData.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{member.territory || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(member.monthly_target)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(member.total_revenue)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Progress
                                value={Math.min(member.achievement_percentage, 100)}
                                className="w-16"
                              />
                              <span
                                className={`text-sm font-medium ${
                                  member.achievement_percentage >= 100
                                    ? 'text-emerald-500'
                                    : member.achievement_percentage >= 75
                                      ? 'text-yellow-500'
                                      : 'text-red-500'
                                }`}
                              >
                                {member.achievement_percentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{member.total_visits}</TableCell>
                          <TableCell className="text-right">{formatCurrency(member.commission_earned)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <SalesPerformanceCharts data={performanceData} />
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-4">
          {/* Mobile: Compact Visit Cards | Desktop: Table */}
          {isMobile ? (
            <div className="space-y-2">
              {visitLogs.slice(0, 20).map((log) => (
                <Card key={log.id} className="overflow-hidden">
                  <CardContent className="p-2">
                    {/* Row 1: Date + Outcome */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{formatDate(log.visit_date)}</span>
                      </div>
                      {getOutcomeBadge(log.outcome)}
                    </div>
                    
                    {/* Row 2: Executive */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-600">
                          {(log.sales_team?.profiles?.user_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.sales_team?.profiles?.user_name || 'Unknown'}</p>
                    </div>
                    
                    {/* Row 3: Retailer */}
                    <div className="mt-1 ml-8 text-xs">
                      <p className="font-medium text-gray-700">{log.retailer?.business_name || 'Unknown'}</p>
                      <p className="text-gray-500">{log.retailer?.city}</p>
                    </div>
                    
                    {/* Row 4: Contact & Follow-up */}
                    <div className="mt-1.5 flex items-center justify-between text-xs border-t border-gray-100 pt-1.5">
                      <span className="text-gray-500">{log.contact_person || 'No contact'}</span>
                      {log.next_followup_date && (
                        <span className="text-blue-600 text-xs">
                          F/U: {formatDate(log.next_followup_date)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Visit Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Executive</TableHead>
                        <TableHead>Retailer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Follow-up</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{formatDate(log.visit_date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-600">
                                  {(log.sales_team?.profiles?.user_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm">{log.sales_team?.profiles?.user_name || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{log.retailer?.business_name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{log.retailer?.city}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{log.contact_person || '-'}</TableCell>
                          <TableCell>{getOutcomeBadge(log.outcome)}</TableCell>
                          <TableCell className="text-xs">
                            {log.next_followup_date ? formatDate(log.next_followup_date) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
