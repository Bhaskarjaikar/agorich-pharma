"use client"

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, WarningCircle, Trophy, Star, Medal, Target, ArrowLeft, ArrowsClockwise, ShareNetwork, Lock, Sparkle, Crown, TrendUp, Users } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface Achievement {
  id: string
  badge_id: string
  badge_name: string
  description: string
  icon_url: string
  category: string
  points: number
  requirement: string
  progress: number
  maxProgress: number
  unlocked: boolean
  unlocked_date?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface AchievementsData {
  unlockedBadges: Achievement[]
  lockedBadges: Achievement[]
  recentAchievements: Achievement[]
  totalBadges: number
  unlockedCount: number
  completionRate: number
  nextBadge: Achievement | null
  categories: Array<{
    name: string
    unlocked: number
    total: number
    icon: string
  }>
}

const RARITY_GRADIENTS = {
  common: 'from-gray-500/20 to-gray-600/20',
  rare: 'from-slate-500/20 to-slate-600/20',
  epic: 'from-purple-500/20 to-purple-600/20',
  legendary: 'from-yellow-500/20 to-orange-500/20'
}

export default function AchievementsPage() {
  const [achievementsData, setAchievementsData] = useState<AchievementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showUnlocked, setShowUnlocked] = useState(true)

  useEffect(() => {
    fetchAchievementsData()
  }, [])

  const fetchAchievementsData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/referral/achievements')
      
      if (response.ok) {
        const data = await response.json()
        setAchievementsData(data)
      }
    } catch (error) {
      console.error('Error fetching achievements data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShareAchievement = (achievement: Achievement) => {
    const shareText = `🎉 I just unlocked the "${achievement.badge_name}" badge on Agorich! ${achievement.description}`
    
    if (navigator.share) {
      navigator.share({
        title: 'Achievement Unlocked!',
        text: shareText,
        url: window.location.origin
      })
    } else {
      navigator.clipboard.writeText(shareText)
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return <Crown className="w-4 h-4 text-yellow-400" />
      case 'epic':
        return <Trophy className="w-4 h-4 text-purple-400" />
      case 'rare':
        return <Medal className="w-4 h-4 text-slate-400" />
      default:
        return <Star className="w-4 h-4 text-gray-400" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'referral':
        return <Users className="w-5 h-5" />
      case 'earnings':
        return <TrendUp className="w-5 h-5" />
      case 'milestone':
        return <Target className="w-5 h-5" />
      case 'special':
        return <Sparkle className="w-5 h-5" />
      default:
        return <Medal className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading achievements...</div>
      </div>
    )
  }

  if (!achievementsData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">No achievements data available</div>
      </div>
    )
  }

  const allBadges = [...achievementsData.unlockedBadges, ...achievementsData.lockedBadges]
  const filteredBadges = allBadges.filter(badge => {
    if (selectedCategory !== 'all' && badge.category !== selectedCategory) return false
    if (showUnlocked && !badge.unlocked) return false
    if (!showUnlocked && badge.unlocked) return false
    return true
  })

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
                  🏆 Achievements & Badges
                </h1>
                <p className="text-white/70">Unlock badges and showcase your success</p>
              </div>
            </div>
            
            <Button
              onClick={fetchAchievementsData}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowsClockwise className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </motion.div>
        </div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Badges</p>
                  <p className="text-white text-2xl font-bold">{achievementsData.totalBadges}</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Unlocked</p>
                  <p className="text-white text-2xl font-bold">{achievementsData.unlockedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Completion</p>
                  <p className="text-white text-2xl font-bold">{Math.round(achievementsData.completionRate)}%</p>
                </div>
                <Target className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Recent</p>
                  <p className="text-white text-2xl font-bold">{achievementsData.recentAchievements.length}</p>
                </div>
                <Sparkle className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Achievements */}
        {achievementsData.recentAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="border-white/10 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <Sparkle className="w-5 h-5 mr-2" />
                  Recent Achievements
                </CardTitle>
                <CardDescription className="text-white/70">
                  Your latest unlocked badges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievementsData.recentAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-3xl">{achievement.icon_url}</div>
                          <div>
                            <h4 className="text-white font-semibold">{achievement.badge_name}</h4>
                            <div className="flex items-center space-x-2">
                              {getRarityIcon(achievement.rarity)}
                              <span className="text-white/70 text-sm capitalize">{achievement.rarity}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareAchievement(achievement)}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <ShareNetwork className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-white/70 text-sm mb-3">{achievement.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400 font-bold">+{achievement.points} points</span>
                        <span className="text-white/70 text-sm">
                          {achievement.unlocked_date && new Date(achievement.unlocked_date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Next Badge */}
        {achievementsData.nextBadge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Card className="border-white/10 bg-slate-900 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Next Badge to Unlock
                </CardTitle>
                <CardDescription className="text-white/70">
                  You're close to unlocking your next achievement!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-6">
                  <div className="text-6xl opacity-50">{achievementsData.nextBadge.icon_url}</div>
                  <div className="flex-1">
                    <h3 className="text-white text-xl font-semibold mb-2">
                      {achievementsData.nextBadge.badge_name}
                    </h3>
                    <p className="text-white/70 mb-4">{achievementsData.nextBadge.description}</p>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70 text-sm">Progress</span>
                        <span className="text-white font-semibold">
                          {achievementsData.nextBadge.progress} / {achievementsData.nextBadge.maxProgress}
                        </span>
                      </div>
                      <Progress 
                        value={(achievementsData.nextBadge.progress / achievementsData.nextBadge.maxProgress) * 100} 
                        className="h-3 bg-white/20"
                      />
                    </div>
                    <p className="text-white/70 text-sm">
                      <strong>Requirement:</strong> {achievementsData.nextBadge.requirement}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Category Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg">Badge Categories</CardTitle>
              <CardDescription className="text-white/70">
                Your progress across different achievement categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {achievementsData.categories.map((category, index) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="text-2xl">{category.icon}</div>
                      <div>
                        <h4 className="text-white font-semibold capitalize">{category.name}</h4>
                        <p className="text-white/70 text-sm">
                          {category.unlocked} / {category.total} badges
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={(category.unlocked / category.total) * 100} 
                      className="h-2 bg-white/20"
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                {/* Category Filter */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Category</label>
                  <div className="flex gap-2">
                    {['all', 'referral', 'earnings', 'milestone', 'special'].map((category) => (
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
                        {getCategoryIcon(category)}
                        <span className="ml-2 capitalize">{category}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Status</label>
                  <div className="flex gap-2">
                    <Button
                      variant={showUnlocked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowUnlocked(true)}
                      className={
                        showUnlocked
                          ? 'bg-white/20 text-white border-white/30'
                          : 'border-white/20 text-white/70 hover:bg-white/10'
                      }
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Unlocked
                    </Button>
                    <Button
                      variant={!showUnlocked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowUnlocked(false)}
                      className={
                        !showUnlocked
                          ? 'bg-white/20 text-white border-white/30'
                          : 'border-white/20 text-white/70 hover:bg-white/10'
                      }
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Locked
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl">All Badges</CardTitle>
              <CardDescription className="text-white/70">
                {filteredBadges.length} badges found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBadges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className={`p-4 rounded-lg border transition-all duration-300 hover:scale-105 ${
                      badge.unlocked
                        ? `bg-gradient-to-br ${RARITY_GRADIENTS[badge.rarity]} border-white/20`
                        : 'bg-white/5 border-white/10 opacity-60'
                    }`}
                  >
                    <div className="text-center mb-4">
                      <div className={`text-6xl mb-3 ${badge.unlocked ? '' : 'grayscale opacity-50'}`}>
                        {badge.icon_url}
                      </div>
                      <h4 className="text-white font-semibold text-lg">{badge.badge_name}</h4>
                      <div className="flex items-center justify-center space-x-2 mt-2">
                        {getRarityIcon(badge.rarity)}
                        <span className="text-white/70 text-sm capitalize">{badge.rarity}</span>
                      </div>
                    </div>

                    <p className="text-white/70 text-sm mb-4 text-center">{badge.description}</p>

                    {badge.unlocked ? (
                      <div className="space-y-3">
                        <div className="text-center">
                          <span className="text-yellow-400 font-bold">+{badge.points} points</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShareAchievement(badge)}
                            className="flex-1 border-white/20 text-white hover:bg-white/10"
                          >
                            <ShareNetwork className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                        </div>
                        {badge.unlocked_date && (
                          <p className="text-white/70 text-xs text-center">
                            Unlocked: {new Date(badge.unlocked_date).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-center">
                          <span className="text-white/70 text-sm">Requirement:</span>
                          <p className="text-white/70 text-sm mt-1">{badge.requirement}</p>
                        </div>
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white/70 text-sm">Progress</span>
                            <span className="text-white/70 text-sm">
                              {badge.progress} / {badge.maxProgress}
                            </span>
                          </div>
                          <Progress 
                            value={(badge.progress / badge.maxProgress) * 100} 
                            className="h-2 bg-white/20"
                          />
                        </div>
                        <div className="text-center">
                          <span className="text-yellow-400 font-bold">+{badge.points} points</span>
                        </div>
                      </div>
                    )}
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












