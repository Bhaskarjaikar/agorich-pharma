"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  CurrencyDollar, 
  Calendar,
  Copy,
  ShareNetwork,
  Gift,
  CheckCircle,
  Clock,
  WarningCircle
} from '@phosphor-icons/react'
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

  // Dark mode state - synced with homepage via localStorage
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('agorich-dark-mode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    }
  }, [])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agorich-dark-mode') {
        setDarkMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

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

  const filteredReferrals = referrals.filter(referral => {
    if (activeFilter === 'all') return true
    return referral.status === activeFilter
  })

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`text-xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between"
          >
            <h1 className="text-2xl font-bold text-white">{t('referrals.title')}</h1>
            <p className="text-white/70 text-sm">Welcome, {profile?.user_name || 'User'}! 🌟</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Stats and Code */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats Cards - Compact 4 in a row with glass styling */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="glass-card p-4 hover-lift">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="icon-squircle">
                      <Users className="w-4 h-4 text-emerald-400" weight="thin" />
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>{t('referrals.totalReferrals')}</span>
                  </div>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stats.totalReferrals}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="glass-card p-4 hover-lift">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="icon-squircle">
                      <CheckCircle className="w-4 h-4 text-emerald-400" weight="thin" />
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>{t('referrals.activeReferrals')}</span>
                  </div>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stats.activeReferrals}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="glass-card p-4 hover-lift">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="icon-squircle">
                      <CurrencyDollar className="w-4 h-4 text-emerald-400" weight="thin" />
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>{t('referrals.totalEarned')}</span>
                  </div>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(stats.totalEarned)}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="glass-card p-4 hover-lift">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="icon-squircle">
                      <Calendar className="w-4 h-4 text-emerald-400" weight="thin" />
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>{t('referrals.thisMonthEarned')}</span>
                  </div>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(stats.thisMonthEarned)}</p>
                </div>
              </motion.div>
            </div>

            {/* Referral Code Section - Vault Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="vault-box p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>{t('referrals.yourReferralCode')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-400">Active</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <code className={`text-2xl sm:text-3xl font-mono tracking-wider px-4 py-2 rounded-lg border ${darkMode ? 'text-slate-100 bg-slate-900/50 border-border' : 'text-slate-900 bg-slate-100 border-slate-300'}`}>
                    {referralCode}
                  </code>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyCode}
                      size="sm"
                      variant="outline"
                      className={`btn-premium ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-background hover:text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      onClick={() => handleShare('whatsapp')}
                      size="sm"
                      className="btn-premium bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      WhatsApp
                    </Button>
                  </div>
                </div>

                {qrCode && (
                  <div className={`flex justify-center mt-4 pt-4 border-t ${darkMode ? 'border-border/50' : 'border-slate-200'}`}>
                    <div className="bg-white p-3 rounded-xl shadow-lg">
                      <Image
                        src={qrCode}
                        alt="QR Code"
                        width={96}
                        height={96}
                        className="w-24 h-24"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* How It Works - Horizontal Stepper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="glass-card p-5">
                <h3 className={`text-sm font-medium mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>How it Works</h3>
                <div className="relative">
                  {/* Connecting line */}
                  <div className={`absolute top-3 left-[12.5%] right-[12.5%] h-px hidden sm:block ${darkMode ? 'bg-card' : 'bg-slate-300'}`} />
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2 relative z-10 ${darkMode ? 'bg-card' : 'bg-slate-200'}`}>
                        <span className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-700'}`}>1</span>
                      </div>
                      <p className={`text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Share Code</p>
                    </div>
                    <div className="relative">
                      <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 relative z-10">
                        <span className="text-white font-bold text-xs">2</span>
                      </div>
                      <p className="text-white text-xs">They Join</p>
                    </div>
                    <div className="relative">
                      <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 relative z-10">
                        <span className="text-white font-bold text-xs">3</span>
                      </div>
                      <p className="text-white text-xs">They Order</p>
                    </div>
                    <div className="relative">
                      <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 relative z-10">
                        <span className="text-white font-bold text-xs">4</span>
                      </div>
                      <p className="text-white text-xs">You Earn</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Referrals List - Compact */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className={`border rounded-xl overflow-hidden h-full ${darkMode ? 'border-border bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <CardHeader className={`px-3 py-2 ${darkMode ? 'bg-background' : 'bg-slate-50'}`}>
                  <CardTitle className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Referrals ({referrals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {/* Filter Tabs */}
                  <div className="flex gap-1 mb-3">
                    {['all', 'pending', 'active', 'completed'].map((filter) => (
                      <Button
                        key={filter}
                        variant={activeFilter === filter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter(filter)}
                        className={`text-xs px-2 py-1 h-7 ${
                          activeFilter === filter
                            ? (darkMode ? 'bg-card text-white border-slate-600' : 'bg-slate-200 text-slate-900 border-slate-300')
                            : (darkMode ? 'border-slate-600 text-muted-foreground hover:bg-background' : 'border-slate-300 text-slate-600 hover:bg-slate-100')
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Button>
                    ))}
                  </div>

                  {/* Referrals List */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredReferrals.length > 0 ? (
                      filteredReferrals.map((referral, index) => (
                        <motion.div
                          key={referral.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * index }}
                          className={`rounded-lg p-2 border ${darkMode ? 'bg-background border-border' : 'bg-slate-100 border-slate-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{referral.referredName}</h4>
                            <Badge className={`text-xs ${getStatusColor(referral.status)}`}>
                              {getStatusIcon(referral.status)}
                            </Badge>
                          </div>
                          <p className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>{referral.referredType}</p>
                          
                          {referral.status === 'active' && (
                            <div className="mt-1">
                              <div className={`flex justify-between text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                                <span>₹{referral.referrer_bonus_amount || 0}</span>
                                <span>{30 - referral.daysRemaining}/30d</span>
                              </div>
                              <div className={`w-full rounded-full h-1.5 mt-1 ${darkMode ? 'bg-card' : 'bg-slate-200'}`}>
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{ width: `${referral.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {referral.status === 'pending' && (
                            <Button
                              onClick={() => activateReferral(referral.id)}
                              size="sm"
                              className="w-full mt-1 bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                            >
                              Activate (+₹500)
                            </Button>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <div className={`text-center py-6 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                        <Gift className={`w-8 h-8 mx-auto mb-2 opacity-50 ${darkMode ? '' : 'text-muted-foreground'}`} />
                        <p className="text-sm">No referrals yet</p>
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