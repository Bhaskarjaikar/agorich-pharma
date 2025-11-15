"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Copy, 
  Share2, 
  MessageCircle, 
  Mail, 
  Facebook, 
  Twitter,
  QrCode,
  Download,
  Check,
  Smartphone,
  Link as LinkIcon
} from 'lucide-react'
import { motion } from 'framer-motion'
import { copyToClipboard, shareViaWhatsApp, shareViaSMS, shareViaEmail, shareViaFacebook, shareViaTwitter, generateShareMessages } from '@/lib/share-utils'
import { generateQRCode, downloadQRCode } from '@/lib/qr-generator'
import { toast } from 'sonner'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  referralCode: string
  referralLink: string
  userName?: string
}

export default function ShareModal({ isOpen, onClose, referralCode, referralLink, userName }: ShareModalProps) {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'share' | 'qr'>('share')

  const shareMessages = generateShareMessages({ 
    code: referralCode, 
    link: referralLink,
    userName: userName || 'Friend'
  })

  const handleCopy = async (text: string, type: string) => {
    if (await copyToClipboard(text)) {
      setCopiedItems(prev => new Set([...prev, type]))
      toast.success(`${type} copied to clipboard!`)
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(type)
          return newSet
        })
      }, 2000)
    } else {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleShare = async (platform: string) => {
    try {
      switch (platform) {
        case 'whatsapp':
          shareViaWhatsApp(shareMessages.whatsapp)
          break
        case 'sms':
          shareViaSMS(shareMessages.sms)
          break
        case 'email':
          shareViaEmail(shareMessages.email.subject, shareMessages.email.body)
          break
        case 'facebook':
          shareViaFacebook(shareMessages.facebook)
          break
        case 'twitter':
          shareViaTwitter(shareMessages.twitter)
          break
        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: 'Join Agorich with my referral code!',
              text: shareMessages.whatsapp,
              url: referralLink
            })
          } else {
            await handleCopy(referralLink, 'link')
          }
          break
      }
      toast.success(`Shared via ${platform}!`)
    } catch (error) {
      console.error(`Error sharing via ${platform}:`, error)
      toast.error(`Failed to share via ${platform}`)
    }
  }

  const handleGenerateQR = async () => {
    try {
      const qrUrl = await generateQRCode(referralLink)
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Failed to generate QR code')
    }
  }

  const handleDownloadQR = () => {
    if (qrCodeUrl) {
      downloadQRCode(qrCodeUrl, `referral-qr-${referralCode}`)
    }
  }

  const shareOptions = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Share with friends on WhatsApp'
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: <Smartphone className="w-5 h-5" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Send via text message'
    },
    {
      id: 'email',
      name: 'Email',
      icon: <Mail className="w-5 h-5" />,
      color: 'bg-red-500 hover:bg-red-600',
      description: 'Send via email'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook className="w-5 h-5" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Share on Facebook'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: <Twitter className="w-5 h-5" />,
      color: 'bg-sky-500 hover:bg-sky-600',
      description: 'Share on Twitter'
    },
    {
      id: 'native',
      name: 'More',
      icon: <Share2 className="w-5 h-5" />,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Share via other apps'
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 border-white/10">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white text-xl font-bold">
            Share Your Referral Code
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
          Share your referral code with others to earn rewards when they sign up.
        </DialogDescription>

        <div className="space-y-6">
          {/* Referral Code Display */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Your Referral Code</h3>
              <Badge className="bg-green-500/20 text-green-100 border-green-400/30">
                {referralCode}
              </Badge>
            </div>
            <div className="flex space-x-2">
              <Input
                value={referralCode}
                readOnly
                className="bg-white/10 border-white/20 text-white"
              />
              <Button
                onClick={() => handleCopy(referralCode, 'code')}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                {copiedItems.has('code') ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Referral Link Display */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Referral Link</h3>
              <Badge className="bg-blue-500/20 text-blue-100 border-blue-400/30">
                <LinkIcon className="w-3 h-3 mr-1" />
                Link
              </Badge>
            </div>
            <div className="flex space-x-2">
              <Input
                value={referralLink}
                readOnly
                className="bg-white/10 border-white/20 text-white text-sm"
              />
              <Button
                onClick={() => handleCopy(referralLink, 'link')}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                {copiedItems.has('link') ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 border-b border-white/10">
            <Button
              variant={activeTab === 'share' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('share')}
              className={`${
                activeTab === 'share'
                  ? 'bg-white/20 text-white border-b-2 border-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Options
            </Button>
            <Button
              variant={activeTab === 'qr' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('qr')}
              className={`${
                activeTab === 'qr'
                  ? 'bg-white/20 text-white border-b-2 border-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </Button>
          </div>

          {/* Share Options */}
          {activeTab === 'share' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shareOptions.map((option, index) => (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
                  >
                    <Button
                      onClick={() => handleShare(option.id)}
                      className={`w-full ${option.color} text-white mb-3`}
                    >
                      {option.icon}
                      <span className="ml-2">{option.name}</span>
                    </Button>
                    <p className="text-white/70 text-sm text-center">{option.description}</p>
                  </motion.div>
                ))}
              </div>

              {/* Custom Message */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold mb-3">Custom Message Preview</h4>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-white/70 text-sm whitespace-pre-wrap">
                    {shareMessages.whatsapp}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* QR Code */}
          {activeTab === 'qr' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h4 className="text-white font-semibold mb-4">QR Code for Your Referral Link</h4>
                
                {!qrCodeUrl ? (
                  <div className="p-8 bg-white/5 rounded-lg border border-white/10">
                    <QrCode className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/70 mb-4">Generate a QR code for easy sharing</p>
                    <Button
                      onClick={handleGenerateQR}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Generate QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 bg-white rounded-lg inline-block">
                      <Image
                        src={qrCodeUrl}
                        alt="Referral QR Code"
                        width={192}
                        height={192}
                        className="w-48 h-48"
                      />
                    </div>
                    <div className="flex space-x-2 justify-center">
                      <Button
                        onClick={handleDownloadQR}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        onClick={() => handleCopy(qrCodeUrl, 'qr')}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {copiedItems.has('qr') ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h5 className="text-blue-400 font-semibold mb-2">💡 Pro Tip</h5>
                <p className="text-white/70 text-sm">
                  Print this QR code or save it to your phone. People can scan it to join Agorich with your referral code instantly!
                </p>
              </div>
            </motion.div>
          )}

          {/* Share Stats */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-white font-semibold mb-3">Sharing Tips</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-white/70">✅ Share with pharmacy owners and medical representatives</p>
                <p className="text-white/70">✅ Explain the benefits of joining Agorich</p>
                <p className="text-white/70">✅ Follow up with your referrals</p>
              </div>
              <div className="space-y-2">
                <p className="text-white/70">✅ Use social media to reach more people</p>
                <p className="text-white/70">✅ Print QR codes for offline sharing</p>
                <p className="text-white/70">✅ Track your referral progress regularly</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}





