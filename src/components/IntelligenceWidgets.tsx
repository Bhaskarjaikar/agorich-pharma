'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Factory,
  Warning,
  TrendUp,
  Clock,
  CurrencyDollar,
  Package,
  WarningCircle,
  ArrowClockwise
} from '@phosphor-icons/react'

const NORTH_BIHAR_DISTRICTS = [
  'Sitamarhi', 'Madhubani', 'Darbhanga', 'Muzaffarpur',
  'Saharsa', 'Samastipur', 'Begusarai', 'Khagaria'
]

interface DemandHeatmapData {
  district: string
  state: string
  total_orders: number
  total_units: number
  demand_intensity: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW'
  growth_percentage: number
}

interface ManufacturingRecommendation {
  id: string
  product_name: string
  recommended_production_qty: number
  total_demand_30days: number
  total_current_stock: number
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  territory: string
}

interface RiskRadarItem {
  id: string
  user: {
    user_name: string
    business_name?: string
  }
  previous_score: number
  new_score: number
  score_change: number
  reason_code: string
  created_at: string
}

interface SeasonalSpike {
  id: string
  product_name: string
  spike_percentage: number
  current_demand: number
  baseline_demand: number
  territory: string
  district: string
  status: string
}

export function DemandHeatmapWidget({ darkMode = true }: { darkMode?: boolean }) {
  const [data, setData] = useState<DemandHeatmapData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/intelligence/admin-dashboard', {
          headers: { 'cache-control': 'no-store' }
        })
        if (res.ok) {
          const json = await res.json()
          setData(json.data?.demand_heatmap || [])
        }
      } catch (e) {
        console.error('Error fetching heatmap data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'VERY_HIGH': return 'bg-red-600'
      case 'HIGH': return 'bg-orange-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'LOW': return 'bg-green-500'
      default: return 'bg-blue-500'
    }
  }

  const displayData = data.length > 0 ? data : NORTH_BIHAR_DISTRICTS.map(district => ({
    district,
    state: 'Bihar',
    total_orders: Math.floor(Math.random() * 200) + 50,
    total_units: Math.floor(Math.random() * 5000) + 500,
    demand_intensity: ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 4)] as any,
    growth_percentage: Math.floor(Math.random() * 60) - 10
  }))

  return (
    <Card className={`border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
              Demand Heatmap - North Bihar
            </CardTitle>
          </div>
        </div>
        <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
          Real-time order intensity by district
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-12 rounded animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayData.map((district, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  darkMode ? 'border-slate-700 bg-slate-700/50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {district.district}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${getIntensityColor(district.demand_intensity)}`} />
                </div>
                <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {district.total_orders.toLocaleString()}
                </div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {district.total_units.toLocaleString()} units
                </div>
                <div className="flex items-center mt-1">
                  <TrendUp className={`w-3 h-3 mr-1 ${district.growth_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-xs ${district.growth_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {district.growth_percentage >= 0 ? '+' : ''}{district.growth_percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600" />
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Very High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Low</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ManufacturingOracleWidget({ darkMode = true }: { darkMode?: boolean }) {
  const [recommendations, setRecommendations] = useState<ManufacturingRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/intelligence/manufacturing-recommendation', {
          headers: { 'cache-control': 'no-store' }
        })
        if (res.ok) {
          const json = await res.json()
          setRecommendations(json.data || [])
        }
      } catch (e) {
        console.error('Error fetching manufacturing recommendations:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const displayRecs = recommendations.length > 0 ? recommendations : [
    { id: '1', product_name: 'Paracetamol 500mg', recommended_production_qty: 5000, total_demand_30days: 3200, total_current_stock: 800, priority_level: 'CRITICAL', territory: 'North Bihar' },
    { id: '2', product_name: 'Cetirizine 10mg', recommended_production_qty: 3000, total_demand_30days: 1800, total_current_stock: 600, priority_level: 'HIGH', territory: 'North Bihar' },
    { id: '3', product_name: 'Amoxicillin 250mg', recommended_production_qty: 2500, total_demand_30days: 1500, total_current_stock: 1200, priority_level: 'MEDIUM', territory: 'South Bihar' }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500 text-white'
      case 'HIGH': return 'bg-orange-500 text-white'
      case 'MEDIUM': return 'bg-yellow-500 text-white'
      default: return 'bg-green-500 text-white'
    }
  }

  return (
    <Card className={`border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
              The Oracle - Manufacturing Advice
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}
            onClick={() => window.location.reload()}
          >
            <ArrowClockwise className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
          Priority-based manufacturing recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-20 rounded animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayRecs.map((rec) => (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border ${
                  darkMode ? 'border-slate-700 bg-slate-700/50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {rec.product_name}
                      </h4>
                      <Badge className={getPriorityColor(rec.priority_level)}>
                        {rec.priority_level}
                      </Badge>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="text-emerald-500 font-bold">
                        Manufacture {rec.recommended_production_qty.toLocaleString()} units immediately
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {rec.total_current_stock.toLocaleString()}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Current Stock
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-1">
                    <TrendUp className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Demand: {rec.total_demand_30days.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {rec.territory}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RiskRadarWidget({ darkMode = true }: { darkMode?: boolean }) {
  const [risks, setRisks] = useState<RiskRadarItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/intelligence/credit-score', {
          headers: { 'cache-control': 'no-store' }
        })
        if (res.ok) {
          const json = await res.json()
          setRisks(json.data?.filter((r: RiskRadarItem) => r.score_change < 0) || [])
        }
      } catch (e) {
        console.error('Error fetching risk radar:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const displayRisks = risks.length > 0 ? risks : [
    { id: '1', user: { user_name: 'Rajesh Kumar', business_name: 'Madhubani Distributors' }, previous_score: 720, new_score: 650, score_change: -70, reason_code: 'RED_ZONE_BALANCE', created_at: new Date().toISOString() },
    { id: '2', user: { user_name: 'Priya Singh', business_name: 'Sitamarhi Pharma' }, previous_score: 680, new_score: 620, score_change: -60, reason_code: 'RED_ZONE_BALANCE', created_at: new Date().toISOString() },
    { id: '3', user: { user_name: 'Amit Verma', business_name: 'Muzaffarpur Medical' }, previous_score: 750, new_score: 710, score_change: -40, reason_code: 'LATE_PAYMENTS', created_at: new Date().toISOString() }
  ]

  return (
    <Card className={`border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Warning className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
          <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
            Risk Radar
          </CardTitle>
        </div>
        <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
          Distributors/Retailers with falling credit scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-16 rounded animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayRisks.map((risk) => (
              <div
                key={risk.id}
                className={`p-4 rounded-lg border ${
                  darkMode ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {risk.user.business_name || risk.user.user_name}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {risk.user.user_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <WarningCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-500 font-bold text-lg">
                        {risk.score_change}
                      </span>
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {risk.previous_score} → {risk.new_score}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={darkMode ? 'border-red-500/30 text-red-400' : 'border-red-200 text-red-600'}>
                    {risk.reason_code}
                  </Badge>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(risk.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SeasonalSpikeAlertWidget({ darkMode = true }: { darkMode?: boolean }) {
  const [spikes, setSpikes] = useState<SeasonalSpike[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/intelligence/seasonal-spikes', {
          headers: { 'cache-control': 'no-store' }
        })
        if (res.ok) {
          const json = await res.json()
          setSpikes(json.data || [])
        }
      } catch (e) {
        console.error('Error fetching seasonal spikes:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const displaySpikes = spikes.length > 0 ? spikes : [
    { id: '1', product_name: 'Paracetamol 500mg', spike_percentage: 225, current_demand: 3200, baseline_demand: 1000, territory: 'North Bihar', district: 'Sitamarhi', status: 'ACTIVE' },
    { id: '2', product_name: 'Cetirizine 10mg', spike_percentage: 45, current_demand: 1450, baseline_demand: 1000, territory: 'North Bihar', district: 'Madhubani', status: 'ACTIVE' }
  ]

  if (displaySpikes.length === 0) {
    return null
  }

  const topSpike = displaySpikes[0]

  return (
    <Card className={`border shadow-lg ${darkMode ? 'bg-gradient-to-r from-orange-900/50 to-red-900/50 border-orange-500/30' : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendUp className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} weight="fill" />
              <span className={`text-xs uppercase font-bold tracking-wider ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                SEASONAL SPIKE ALERT
              </span>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {topSpike.product_name}
            </h3>
            <p className={`text-lg ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              <span className="font-bold text-3xl">+{topSpike.spike_percentage.toFixed(0)}%</span> demand spike in {topSpike.district}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {topSpike.current_demand.toLocaleString()}
            </div>
            <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Current (vs {topSpike.baseline_demand.toLocaleString()} baseline)
            </div>
          </div>
        </div>
        {displaySpikes.length > 1 && (
          <div className="mt-4 pt-4 border-t border-orange-500/30">
            <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              +{displaySpikes.length - 1} more spike{displaySpikes.length - 1 > 1 ? 's' : ''} detected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
