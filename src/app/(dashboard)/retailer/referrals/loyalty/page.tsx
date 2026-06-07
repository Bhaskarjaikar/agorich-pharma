'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Star, 
  Gift, 
  Trophy, 
  ArrowLeft,
  ArrowsClockwise,
  Crown,
  Medal,
  Lightning,
  Target,
  Clock,
  CheckCircle,
  Sparkle
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface LoyaltyData {
  currentTier: {
    level: string
    name: string
    points: number
    maxPoints: number
    progress: number
    benefits: string[]
    color: string
    icon: string
  }
  nextTier: {
    level: string
    name: string
    requiredPoints: number
    benefits: string[]
    color: string
    icon: string
  } | null
  totalPointsEarned: number
  pointsRedeemed: number
  pointsBalance: number
  tierHistory: Array<{
    tier: string
    achievedDate: string
    pointsAtAchievement: number
  }>
  earningMethods: Array<{
    method: string
    points: number
    description: string
    icon: string
  }>
  redemptionOptions: Array<{
    id: string
    name: string
    points: number
    description: string
    category: string
    available: boolean
  }>
  nextMilestone: {
    pointsNeeded: number
    estimatedDays: number
    activities: string[]
  }
}

const TIER_CONFIG = {
  bronze: {
    name: 'Bronze',
    color: '#CD7F32',
    icon: '🥉',
    maxPoints: 1000,
    benefits: [
      '5% bonus on all referrals',
      'Priority customer support',
      'Monthly newsletter'
    ]
  },
  silver: {
    name: 'Silver',
    color: '#C0C0C0',
    icon: '🥈',
    maxPoints: 5000,
    benefits: [
      '10% bonus on all referrals',
      'Priority customer support',
      'Monthly newsletter',
      'Exclusive product previews',
      'Free shipping on orders'
    ]
  },
  gold: {
    name: 'Gold',
    color: '#FFD700',
    icon: '🥇',
    maxPoints: 15000,
    benefits: [
      '15% bonus on all referrals',
      'Priority customer support',
      'Monthly newsletter',
      'Exclusive product previews',
      'Free shipping on orders',
      'Personal account manager',
      'Early access to new features'
    ]
  },
  platinum: {
    name: 'Platinum',
    color: '#E5E4E2',
    icon: '💎',
    maxPoints: 50000,
    benefits: [
      '20% bonus on all referrals',
      'Priority customer support',
      'Monthly newsletter',
      'Exclusive product previews',
      'Free shipping on orders',
      'Personal account manager',
      'Early access to new features',
      'VIP events invitation',
      'Custom referral campaigns'
    ]
  }
}

export default function LoyaltyPage() {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchLoyaltyData()
  }, [])

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/referral/loyalty-status')
      
      if (response.ok) {
        const data = await response.json()
        setLoyaltyData(data)
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return <Medal className="w-6 h-6 text-orange-500" />
      case 'silver':
        return <Medal className="w-6 h-6 text-gray-400" weight="fill" />
      case 'gold':
        return <Trophy className="w-6 h-6 text-yellow-500" />
      case 'platinum':
        return <Crown className="w-6 h-6 text-purple-500" />
      default:
        return <Star className="w-6 h-6 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading loyalty data...</div>
      </div>
    )
  }

  if (!loyaltyData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">No loyalty data available</div>
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
                  ⭐ Loyalty & Tiers
                </h1>
                <p className="text-white/70">Earn points and unlock exclusive benefits</p>
              </div>
            </div>
            
            <Button
              onClick={fetchLoyaltyData}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowsClockwise className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </motion.div>
        </div>

        {/* Current Tier Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center">
                {getTierIcon(loyaltyData.currentTier.level)}
                <span className="ml-2">Your Current Tier: {loyaltyData.currentTier.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tier Progress */}
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/70">Progress to Next Tier</span>
                      <span className="text-white font-semibold">
                        {loyaltyData.currentTier.points} / {loyaltyData.currentTier.maxPoints} points
                      </span>
                    </div>
                    <Progress 
                      value={loyaltyData.currentTier.progress} 
                      className="h-3 bg-white/20"
                    />
                    <p className="text-white/70 text-sm mt-2">
                      {Math.round(loyaltyData.currentTier.progress)}% complete
                    </p>
                  </div>

                  {/* Tier Benefits */}
                  <div>
                    <h4 className="text-white font-semibold mb-3">Current Benefits</h4>
                    <div className="space-y-2">
                      {loyaltyData.currentTier.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-white/70 text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Points Summary */}
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-sm">Total Points Earned</span>
                      <Star className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-white text-2xl font-bold">{loyaltyData.totalPointsEarned.toLocaleString()}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-sm">Points Balance</span>
                      <Gift className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-white text-2xl font-bold">{loyaltyData.pointsBalance.toLocaleString()}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-sm">Points Redeemed</span>
                      <Lightning className="w-5 h-5 text-purple-400" weight="fill" />
                    </div>
                    <p className="text-white text-2xl font-bold">{loyaltyData.pointsRedeemed.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Tier Preview */}
        {loyaltyData.nextTier && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="border-white/10 bg-slate-900 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Next Tier: {loyaltyData.nextTier.name}
                </CardTitle>
                <CardDescription className="text-white/70">
                  {loyaltyData.nextTier.requiredPoints - loyaltyData.currentTier.points} more points needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-white font-semibold mb-3">Upcoming Benefits</h4>
                    <div className="space-y-2">
                      {loyaltyData.nextTier.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Sparkle className="w-4 h-4 text-yellow-400" weight="fill" />
                          <span className="text-white/70 text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-3">Next Milestone</h4>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <p className="text-white/70 text-sm mb-2">
                        Estimated time to reach {loyaltyData.nextTier.name}:
                      </p>
                      <p className="text-white text-lg font-semibold">
                        {loyaltyData.nextMilestone.estimatedDays} days
                      </p>
                      <div className="mt-3">
                        <p className="text-white/70 text-sm mb-2">Keep doing:</p>
                        <ul className="space-y-1">
                          {loyaltyData.nextMilestone.activities.map((activity, index) => (
                            <li key={index} className="text-white/70 text-sm flex items-center">
                              <Clock className="w-3 h-3 mr-2" />
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* How to Earn Points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl">How to Earn Points</CardTitle>
              <CardDescription className="text-white/70">
                Complete these activities to earn loyalty points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loyaltyData.earningMethods.map((method, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="text-2xl">{method.icon}</div>
                      <div>
                        <p className="text-white font-semibold">{method.method}</p>
                        <p className="text-yellow-400 font-bold">+{method.points} points</p>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm">{method.description}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Redemption Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl">Redeem Points</CardTitle>
              <CardDescription className="text-white/70">
                Use your points for amazing rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex gap-2">
                  {['all', 'discounts', 'products', 'services'].map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={
                        selectedCategory === category
                          ? 'bg-white/20 text-white border-white/30'
                          : 'border-white/20 text-white/70 hover:bg-white/10'
                      }
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Redemption Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loyaltyData.redemptionOptions
                  .filter(option => selectedCategory === 'all' || option.category === selectedCategory)
                  .map((option, index) => (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        option.available
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-white/5 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-semibold">{option.name}</h4>
                        <Badge className={`${
                          option.available
                            ? 'bg-green-500/20 text-green-100 border-green-400/30'
                            : 'bg-gray-500/20 text-gray-100 border-gray-400/30'
                        }`}>
                          {option.available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>
                      <p className="text-white/70 text-sm mb-3">{option.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400 font-bold">{option.points} points</span>
                        <Button
                          size="sm"
                          disabled={!option.available || loyaltyData.pointsBalance < option.points}
                          className="bg-card hover:bg-slate-600 text-white"
                        >
                          Redeem
                        </Button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tier Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl">Tier Comparison</CardTitle>
              <CardDescription className="text-white/70">
                Compare all available tiers and their benefits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(TIER_CONFIG).map(([tier, config], index) => (
                  <motion.div
                    key={tier}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={`p-4 rounded-lg border ${
                      loyaltyData.currentTier.level === tier
                        ? 'bg-background border-slate-600'
                        : 'bg-slate-900 border-border'
                    }`}
                  >
                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">{config.icon}</div>
                      <h3 className="text-white font-semibold text-lg">{config.name}</h3>
                      <p className="text-white/70 text-sm">
                        {tier === 'platinum' ? '50,000+ points' : `Up to ${config.maxPoints.toLocaleString()} points`}
                      </p>
                      {loyaltyData.currentTier.level === tier && (
                        <Badge className="bg-card text-slate-200 border-slate-600 mt-2">
                          Current Tier
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {config.benefits.map((benefit, benefitIndex) => (
                        <div key={benefitIndex} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-white/70 text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}












