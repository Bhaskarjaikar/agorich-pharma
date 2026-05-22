"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Crown, TrendUp, Users, CurrencyDollar, Funnel, ArrowsClockwise, ArrowLeft } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { formatCurrency } from '@/lib/referral-utils'

interface LeaderboardEntry {
  rank: number
  user_id: string
  user_name: string
  business_name: string
  business_type: string
  total_earnings: number
  referral_count: number
}

interface CurrentUser {
  rank: number | null
  totalEarnings: number
  referralCount: number
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    rank: null,
    totalEarnings: 0,
    referralCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('this_month')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/referral/leaderboard?period=${selectedPeriod}&category=${selectedCategory}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.leaderboard || [])
        setCurrentUser(data.currentUser || { rank: null, totalEarnings: 0, referralCount: 0 })
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, selectedCategory])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <span className="text-white font-bold text-lg">#{rank}</span>
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return ''
    }
  }

  const getTierStars = (earnings: number) => {
    if (earnings >= 100000) return '⭐⭐⭐'
    if (earnings >= 50000) return '⭐⭐'
    if (earnings >= 10000) return '⭐'
    return ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
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
                  🏆 Referral Leaderboard
                </h1>
                <p className="text-white/70">Top Referral Champions</p>
              </div>
            </div>
            
            <Button
              onClick={fetchLeaderboard}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowsClockwise className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {/* Time Period Filter */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Time Period</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'this_month', label: 'This Month' },
                      { value: 'this_year', label: 'This Year' },
                      { value: 'all_time', label: 'All Time' }
                    ].map((period) => (
                      <Button
                        key={period.value}
                        variant={selectedPeriod === period.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPeriod(period.value)}
                        className={
                          selectedPeriod === period.value
                            ? 'bg-white/20 text-white border-white/30'
                            : 'border-white/20 text-white/70 hover:bg-white/10'
                        }
                      >
                        {period.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Category</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'all', label: 'All Users' },
                      { value: 'Pharmacy Owner', label: 'Pharmacy Owners' },
                      { value: 'Sales Executive', label: 'Sales Executives' }
                    ].map((category) => (
                      <Button
                        key={category.value}
                        variant={selectedCategory === category.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.value)}
                        className={
                          selectedCategory === category.value
                            ? 'bg-white/20 text-white border-white/30'
                            : 'border-white/20 text-white/70 hover:bg-white/10'
                        }
                      >
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current User Rank */}
        {currentUser.rank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-lg font-semibold">Your Rank: #{currentUser.rank} 🎯</h3>
                    <p className="text-white/70">You have made {currentUser.referralCount} referrals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-lg font-semibold">
                      Earned: {formatCurrency(currentUser.totalEarnings)} this {selectedPeriod.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl">Top Referrers</CardTitle>
              <CardDescription className="text-white/70">
                Ranking based on total earnings in {selectedPeriod.replace('_', ' ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`p-4 rounded-lg border transition-all duration-300 hover:scale-105 ${
                        entry.rank <= 3
                          ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-12 h-12">
                            {getRankIcon(entry.rank)}
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-white font-semibold text-lg">
                                {entry.user_name}
                                {entry.rank <= 3 && (
                                  <span className="ml-2 text-2xl">{getRankBadge(entry.rank)}</span>
                                )}
                              </h3>
                              <Badge className="bg-slate-700 text-slate-200 border-slate-600">
                                {entry.business_type}
                              </Badge>
                            </div>
                            <p className="text-white/70 text-sm">{entry.business_name}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4 text-white/50" />
                                <span className="text-white/70 text-sm">{entry.referral_count} referrals</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <CurrencyDollar className="w-4 h-4 text-white/50" />
                                <span className="text-white/70 text-sm">
                                  {formatCurrency(entry.total_earnings)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-yellow-400">{getTierStars(entry.total_earnings)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <TrendUp className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-semibold">
                              +{formatCurrency(entry.total_earnings)}
                            </span>
                          </div>
                          <p className="text-white/70 text-sm">
                            This {selectedPeriod.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/70 text-lg">No data available</p>
                    <p className="text-white/50 text-sm">
                      Try changing the filters or check back later
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Motivational Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="border-white/10 bg-slate-900 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <h3 className="text-white text-lg font-semibold mb-2">
                🚀 Ready to climb the leaderboard?
              </h3>
              <p className="text-white/70 mb-4">
                Share your referral code with more people and start earning amazing rewards!
              </p>
              <Link href="/retailer/referrals">
                <Button className="bg-slate-700 hover:bg-slate-600 text-white">
                  Start Referring Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}












