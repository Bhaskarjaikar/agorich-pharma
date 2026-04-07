'use client'

import { useState } from 'react'
import { SquaresFour, Table, List, Kanban } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X, 
  CheckCircle, 
  Clock, 
  WarningCircle, 
  TrendUp, 
  CurrencyDollar, 
  ShareNetwork, 
  Copy, 
  ChatCircle 
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/referral-utils'
import { copyToClipboard, shareViaWhatsApp, shareViaSMS, shareViaEmail, generateShareMessages } from '@/lib/share-utils'
import { toast } from 'sonner'

type ReferralTabId = 'details' | 'activity' | 'earnings'

interface ReferralDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  referral: {
    id: string
    referral_code: string
    referral_type: string
    status: string
    created_at: string
    expiry_date?: string
    first_order_date?: string
    approval_date?: string
    bonus_activation_date?: string
    bonus_expiry_date?: string
    referrer_bonus_amount?: number
    referrer_bonus_type?: string
    referred_bonus_amount?: number
    referred_bonus_type?: string
    referredName: string
    referredType: string
    daysRemaining: number
    progress: number
  } | null
}

export default function ReferralDetailsModal({ isOpen, onClose, referral }: ReferralDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<ReferralTabId>('details')

  if (!referral) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'expired':
        return <WarningCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
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

  const handleShareAgain = (platform: string) => {
    const messages = generateShareMessages({ 
      code: referral.referral_code, 
      link: `${window.location.origin}/join?ref=${referral.referral_code}` 
    })
    
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

  const handleCopyCode = async () => {
    if (await copyToClipboard(referral.referral_code)) {
      toast.success('Referral code copied!')
    } else {
      toast.error('Failed to copy code')
    }
  }

  // Status timeline data
  const statusTimeline = [
    {
      status: 'referred',
      label: 'Referred',
      date: new Date(referral.created_at).toLocaleDateString('en-IN'),
      completed: true,
      icon: <CheckCircle className="w-4 h-4" />
    },
    {
      status: 'pending',
      label: 'Pending',
      date: referral.approval_date ? new Date(referral.approval_date).toLocaleDateString('en-IN') : 'Pending',
      completed: referral.status !== 'pending',
      icon: <Clock className="w-4 h-4" />
    },
    {
      status: 'approved',
      label: 'Approved',
      date: referral.approval_date ? new Date(referral.approval_date).toLocaleDateString('en-IN') : 'Not yet',
      completed: ['active', 'completed'].includes(referral.status),
      icon: <CheckCircle className="w-4 h-4" />
    },
    {
      status: 'active',
      label: 'Active',
      date: referral.bonus_activation_date ? new Date(referral.bonus_activation_date).toLocaleDateString('en-IN') : 'Not yet',
      completed: ['active', 'completed'].includes(referral.status),
      icon: <TrendUp className="w-4 h-4" />
    },
    {
      status: 'completed',
      label: 'Incentive Paid',
      date: referral.bonus_expiry_date ? new Date(referral.bonus_expiry_date).toLocaleDateString('en-IN') : 'Not yet',
      completed: referral.status === 'completed',
      icon: <CurrencyDollar className="w-4 h-4" />
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 border-white/10">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white text-xl font-bold">
            Referral Details: {referral.referredName}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>
        <DialogDescription className="text-white/80 text-sm mb-4">
          View detailed information about this referral and track its progress.
        </DialogDescription>

        <div className="space-y-6">
          {/* Status Timeline */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {statusTimeline.map((step, index) => (
                  <div key={step.status} className="flex flex-col items-center space-y-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white/20 text-white/50'
                      }`}
                    >
                      {step.icon}
                    </motion.div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${
                        step.completed ? 'text-white' : 'text-white/50'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-white/70">{step.date}</p>
                    </div>
                    {index < statusTimeline.length - 1 && (
                      <div className={`w-16 h-0.5 ${
                        step.completed ? 'bg-green-500' : 'bg-white/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex space-x-2 border-b border-white/10">
            {([
              { id: 'details', label: 'Referral Details' },
              { id: 'activity', label: 'Their Activity' },
              { id: 'earnings', label: 'Your Earnings' }
            ] as { id: ReferralTabId; label: string }[]).map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white border-b-2 border-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Referral Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/70 text-sm">Business Name</label>
                    <p className="text-white font-semibold">{referral.referredName}</p>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Type</label>
                    <p className="text-white font-semibold">{referral.referredType}</p>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Referral Code Used</label>
                    <p className="text-white font-mono">{referral.referral_code}</p>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Referral Date</label>
                    <p className="text-white">{new Date(referral.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Approval Date</label>
                    <p className="text-white">
                      {referral.approval_date 
                        ? new Date(referral.approval_date).toLocaleDateString('en-IN')
                        : 'Not yet approved'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">First Order Date</label>
                    <p className="text-white">
                      {referral.first_order_date 
                        ? new Date(referral.first_order_date).toLocaleDateString('en-IN')
                        : 'No orders yet'
                      }
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-white/70 text-sm">Current Status</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`${getStatusColor(referral.status)}`}>
                          {getStatusIcon(referral.status)}
                          <span className="ml-1">{referral.status.toUpperCase()}</span>
                        </Badge>
                      </div>
                    </div>
                    {referral.status === 'active' && (
                      <div className="text-right">
                        <label className="text-white/70 text-sm">Days Remaining</label>
                        <p className="text-white font-semibold">{referral.daysRemaining} days</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Their Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-white">12</p>
                    <p className="text-white/70 text-sm">Total Orders</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-white">{formatCurrency(45000)}</p>
                    <p className="text-white/70 text-sm">Total Purchase</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-white">{formatCurrency(3750)}</p>
                    <p className="text-white/70 text-sm">Average Order Value</p>
                  </div>
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 font-semibold">🎉 They're doing great!</p>
                  <p className="text-white/70 text-sm mt-1">
                    Last order: {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'earnings' && (
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Your Earnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {referral.status === 'active' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70">Progress</span>
                        <span className="text-white font-semibold">{Math.round(referral.progress)}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${referral.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-white/70 text-sm">Daily Margin Bonus</p>
                        <p className="text-white font-semibold text-lg">
                          {formatCurrency(referral.referrer_bonus_amount || 0)}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-white/70 text-sm">Total Earned So Far</p>
                        <p className="text-white font-semibold text-lg">
                          {formatCurrency((referral.referrer_bonus_amount || 0) * (30 - referral.daysRemaining))}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-400 font-semibold">Estimated Final Bonus</p>
                      <p className="text-white text-lg">
                        {formatCurrency((referral.referrer_bonus_amount || 0) * 30)}
                      </p>
                      <p className="text-white/70 text-sm">
                        Days Remaining: {referral.daysRemaining} days
                      </p>
                    </div>
                  </div>
                )}

                {referral.status === 'completed' && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 font-semibold">✅ Bonus Period Completed</p>
                    <p className="text-white text-lg">
                      Total Earned: {formatCurrency((referral.referrer_bonus_amount || 0) * 30)}
                    </p>
                  </div>
                )}

                {referral.status === 'pending' && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-400 font-semibold">⏳ Waiting for First Order</p>
                    <p className="text-white/70">
                      Your bonus will activate once they place their first order.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
            <Button
              onClick={() => handleShareAgain('whatsapp')}
              variant="outline"
              className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <ShareNetwork className="w-4 h-4 mr-2" />
              Share Again
            </Button>
            <Button
              onClick={() => handleShareAgain('sms')}
              variant="outline"
              className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <ChatCircle className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}





