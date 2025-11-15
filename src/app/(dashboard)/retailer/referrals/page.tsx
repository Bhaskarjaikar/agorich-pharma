"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  DollarSign, 
  Calendar,
  Copy,
  Share2,
  Gift,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
// Authentication removed
import { formatCurrency } from '@/lib/referral-utils'
import { generateQRCode } from '@/lib/qr-generator'
import { copyToClipboard, shareViaWhatsApp, shareViaSMS, shareViaEmail, generateShareMessages } from '@/lib/share-utils'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  totalEarned: number
  thisMonthEarned: number
  pendingAmount: number
}

interface Referral {
  id: string
  referral_code: string
  referral_type: string
  status: string
  created_at: string
  referredName: string
  referredType: string
  daysRemaining: number
  progress: number
  referrer_bonus_amount?: number
  referrer_bonus_type?: string
}

export default function ReferralDashboard() {
  const { t } = useTranslation()
  const { user, profile } = useSupabaseAuth()
  // Authentication removed - using localStorage for user data
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarned: 0,
    thisMonthEarned: 0,
    pendingAmount: 0
  })
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referralCode, setReferralCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')

  const fetchReferralData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Generate user-specific referral code
      const userName = localStorage.getItem('userName') || 'USER'
      const userCode = userName.substring(0, 3).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase()
      const fallbackLink = `${window.location.origin}/join?ref=${userCode}`
      
      setReferralCode(userCode)
      setReferralLink(fallbackLink)
      
      // Load stats from localStorage
      const savedStats = JSON.parse(localStorage.getItem('referralStats') || '{}')
      const referralEarnings = JSON.parse(localStorage.getItem('referralEarnings') || '0')
      const totalReferrals = JSON.parse(localStorage.getItem('totalReferrals') || '0')
      
      setStats({
        totalReferrals: savedStats.totalReferrals || totalReferrals,
        activeReferrals: savedStats.activeReferrals || 0,
        totalEarned: savedStats.totalEarned || referralEarnings,
        thisMonthEarned: savedStats.thisMonthEarned || 0,
        pendingAmount: savedStats.pendingAmount || 0
      })

      // Fetch referral code
      try {
        const codeResponse = await fetch('/api/referral/my-code')
        const contentType = codeResponse.headers.get('content-type')
        
        if (codeResponse.ok && contentType?.includes('application/json')) {
          const codeData = await codeResponse.json()
          setReferralCode(codeData.referralCode)
          setReferralLink(codeData.referralLink)

          // Generate QR code for the server-provided link
          try {
            const qrCodeDataURL = await generateQRCode(codeData.referralLink)
            setQrCode(qrCodeDataURL)
          } catch (error) {
            console.error('Error generating QR code from server link:', error)
          }
        } else {
          // Fallback to locally generated link
          try {
            const qrCodeDataURL = await generateQRCode(fallbackLink)
            setQrCode(qrCodeDataURL)
          } catch (error) {
            console.error('Error generating QR code from fallback link:', error)
          }
        }
      } catch (error) {
        console.error('Error fetching referral code:', error)
        // Keep the fallback code that was set above
      }

      // Load referrals from localStorage
      const savedReferrals = JSON.parse(localStorage.getItem('referrals') || '[]')
      setReferrals(savedReferrals)
    } catch (error) {
      console.error('Error fetching referral data:', error)
      toast.error('Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch referral data
  useEffect(() => {
    // Always try to fetch data, even if user is not authenticated
    fetchReferralData()
    
    // Set a timeout to stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)
    
    return () => clearTimeout(timeout)
  }, [user, fetchReferralData])

  const handleCopyCode = async () => {
    if (await copyToClipboard(referralCode)) {
      toast.success(t('referrals.codeCopied'))
    } else {
      toast.error('Failed to copy code')
    }
  }

  const handleCopyLink = async () => {
    if (await copyToClipboard(referralLink)) {
      toast.success('Referral link copied!')
    } else {
      toast.error('Failed to copy link')
    }
  }

  const handleShare = (platform: string) => {
    const messages = generateShareMessages({ code: referralCode, link: referralLink })
    
    switch (platform) {
      case 'whatsapp':
        shareViaWhatsApp(messages.whatsapp)
        break
      case 'sms':
        shareViaSMS(messages.sms)
        break
      case 'email':
        shareViaEmail(messages.email.subject, messages.email.body)
        break
    }
  }

  // Function to add referral earnings
  const addReferralEarnings = (amount: number) => {
    const currentEarnings = JSON.parse(localStorage.getItem('referralEarnings') || '0')
    const newEarnings = currentEarnings + amount
    localStorage.setItem('referralEarnings', newEarnings.toString())
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalEarned: newEarnings
    }))
  }

  // Function to add referral
  const addReferral = (referralData: { name: string; type: string }) => {
    const currentReferrals: Referral[] = JSON.parse(localStorage.getItem('referrals') || '[]')
    const newReferral = {
      id: `ref-${Date.now()}`,
      referral_code: referralCode,
      referral_type: 'pharmacy',
      status: 'pending',
      created_at: new Date().toISOString(),
      referredName: referralData.name,
      referredType: referralData.type,
      daysRemaining: 30,
      progress: 0,
      referrer_bonus_amount: 500,
      referrer_bonus_type: 'cash'
    }
    
    const updatedReferrals = [...currentReferrals, newReferral]
    localStorage.setItem('referrals', JSON.stringify(updatedReferrals))
    setReferrals(updatedReferrals)
    
    // Update total referrals count
    const totalReferrals = updatedReferrals.length
    localStorage.setItem('totalReferrals', totalReferrals.toString())
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalReferrals: totalReferrals
    }))
  }

  // Function to activate referral (when they place first order)
  const activateReferral = (referralId: string) => {
    const currentReferrals: Referral[] = JSON.parse(localStorage.getItem('referrals') || '[]')
    const updatedReferrals = currentReferrals.map((ref) => {
      if (ref.id === referralId) {
        return {
          ...ref,
          status: 'active',
          progress: 100,
          daysRemaining: 0
        }
      }
      return ref
    })
    
    localStorage.setItem('referrals', JSON.stringify(updatedReferrals))
    setReferrals(updatedReferrals)
    
    // Add earnings
    addReferralEarnings(500)
    
    // Update active referrals count
    const activeReferrals = updatedReferrals.filter(ref => ref.status === 'active').length
    setStats(prev => ({
      ...prev,
      activeReferrals: activeReferrals
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-500" />
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
        return 'bg-blue-500/20 text-blue-100 border-blue-400/30'
      case 'expired':
        return 'bg-red-500/20 text-red-100 border-red-400/30'
      default:
        return 'bg-gray-500/20 text-gray-100 border-gray-400/30'
    }
  }

  const filteredReferrals = referrals.filter(referral => {
    if (activeFilter === 'all') return true
    return referral.status === activeFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">🎁 {t('referrals.title')}</h1>
            <p className="text-white/70">
              Welcome back, {profile?.user_name || 'User'}! You are a Referral Champion 🌟
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats and Code */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-3">
                    <CardTitle className="text-xs font-medium text-white flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {t('referrals.totalReferrals')}
                    </CardTitle>
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Users className="h-3 w-3 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white mb-1">{stats.totalReferrals}</div>
                    <div className="text-xs text-white/70">{t('referrals.totalReferrals')}</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-3">
                    <CardTitle className="text-xs font-medium text-white flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('referrals.activeReferrals')}
                    </CardTitle>
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white mb-1">{stats.activeReferrals}</div>
                    <div className="text-xs text-white/70">{t('referrals.activeReferrals')}</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-3">
                    <CardTitle className="text-xs font-medium text-white flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      {t('referrals.totalEarned')}
                    </CardTitle>
                    <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <DollarSign className="h-3 w-3 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white mb-1">{formatCurrency(stats.totalEarned)}</div>
                    <div className="text-xs text-white/70">{t('referrals.totalEarned')}</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-3">
                    <CardTitle className="text-xs font-medium text-white flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('referrals.thisMonthEarned')}
                    </CardTitle>
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Calendar className="h-3 w-3 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-white mb-1">{formatCurrency(stats.thisMonthEarned)}</div>
                    <div className="text-xs text-white/70">{t('referrals.thisMonthEarned')}</div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Referral Code Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-3">
                  <CardTitle className="text-white text-lg font-semibold">{t('referrals.yourReferralCode')}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="text-2xl font-bold text-white bg-white/10 rounded-lg p-4 font-mono">
                      {referralCode}
                    </div>
                    
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={handleCopyCode}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {t('referrals.copyCode')}
                      </Button>
                      <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                    </div>

                    {qrCode && (
                      <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-lg">
                          <Image
                            src={qrCode}
                            alt="QR Code"
                            width={128}
                            height={128}
                            className="w-32 h-32"
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-white/70">
                      Link: {referralLink}
                    </div>

                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => handleShare('whatsapp')}
                        variant="outline"
                        size="sm"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        {t('referrals.shareViaWhatsApp')}
                      </Button>
                      <Button
                        onClick={() => handleShare('sms')}
                        variant="outline"
                        size="sm"
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        {t('referrals.shareViaSMS')}
                      </Button>
                      <Button
                        onClick={() => handleShare('email')}
                        variant="outline"
                        size="sm"
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        {t('referrals.shareViaEmail')}
                      </Button>
                    </div>

                    {/* Demo Add Referral Button */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <Button
                        onClick={() => addReferral({ 
                          name: 'Demo Pharmacy', 
                          type: 'Pharmacy Owner' 
                        })}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Add Demo Referral (+₹500)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* How It Works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-3">
                  <CardTitle className="text-white text-lg font-semibold">How the Referral Program Works</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">1</span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{t('referrals.shareCode')}</h3>
                          <p className="text-white/70 text-sm">Copy your unique referral code and share it with pharmacy owners or sales executives you know. No limit!</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">2</span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">They Join Using Your Code</h3>
                          <p className="text-white/70 text-sm">They sign up on Agorich using your code and complete onboarding.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">3</span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">You Get Rewarded!</h3>
                          <p className="text-white/70 text-sm">Once they place their first order, your bonus is activated immediately.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">4</span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">Track Earnings</h3>
                          <p className="text-white/70 text-sm">Monitor all your referrals and earnings in real-time.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Referrals List */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden h-full">
                <CardHeader className="bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-3">
                  <CardTitle className="text-white text-lg font-semibold">
                    Your Referrals ({referrals.length} Total)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Filter Tabs */}
                  <div className="flex gap-2 mb-4">
                    {['all', 'pending', 'active', 'completed'].map((filter) => (
                      <Button
                        key={filter}
                        variant={activeFilter === filter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter(filter)}
                        className={`text-xs ${
                          activeFilter === filter
                            ? 'bg-white/20 text-white border-white/30'
                            : 'border-white/20 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Button>
                    ))}
                  </div>

                  {/* Referrals List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredReferrals.length > 0 ? (
                      filteredReferrals.map((referral, index) => (
                        <motion.div
                          key={referral.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white font-semibold text-sm">{referral.referredName}</h4>
                              <Badge className={`text-xs ${getStatusColor(referral.status)}`}>
                                {getStatusIcon(referral.status)}
                                <span className="ml-1">{referral.status.toUpperCase()}</span>
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-white/70">
                              Type: {referral.referredType}
                            </div>
                            
                            <div className="text-xs text-white/70">
                              Referral Date: {new Date(referral.created_at).toLocaleDateString()}
                            </div>
                            
                            {referral.status === 'active' && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-white/70">
                                  <span>Your Bonus: {formatCurrency(referral.referrer_bonus_amount || 0)}</span>
                                  <span>Days Active: {30 - referral.daysRemaining}/30</span>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${referral.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {referral.status === 'pending' && (
                              <Button
                                onClick={() => activateReferral(referral.id)}
                                size="sm"
                                className="w-full bg-green-500 hover:bg-green-600 text-white text-xs"
                              >
                                Activate Referral (+₹500)
                              </Button>
                            )}
                            
                            {referral.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs"
                              >
                                ✓ Active - ₹500 Earned
                              </Button>
                            )}
                            
                            {referral.status !== 'pending' && referral.status !== 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-white/20 text-white hover:bg-white/10 text-xs"
                              >
                                View Details →
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center text-white/70 py-8">
                        <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('referrals.noReferrals')}</p>
                        <p className="text-sm">Start sharing your code to earn rewards!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}