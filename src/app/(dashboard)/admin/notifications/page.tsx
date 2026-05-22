'use client'

import { useEffect, useState } from 'react'
import { 
  Bell, 
  Send, 
  RefreshCw, 
  Smartphone, 
  Image as ImageIcon, 
  Target, 
  History, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Users,
  ArrowRight,
  Trash2,
  Repeat
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  category: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  metadata?: Record<string, any>
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Users' },
  { value: 'RETAILER', label: 'Retailers' },
  { value: 'DISTRIBUTOR', label: 'Distributors' },
  { value: 'SALES', label: 'Sales Team' },
  { value: 'LOGISTIC', label: 'Logistics Team' },
]

const CLICK_ACTION_OPTIONS = [
  { value: '/dashboard', label: '/dashboard' },
  { value: '/inventory', label: '/inventory' },
  { value: '/schemes', label: '/schemes' },
  { value: '/invoices', label: '/invoices' },
  { value: '/offers', label: '/offers' },
]

export default function NotificationCenter() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [clickAction, setClickAction] = useState('/dashboard')
  const [targetRoles, setTargetRoles] = useState<string[]>([])

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please enter title and body')
      return
    }

    if (body.length > 200) {
      toast.error('Body must be less than 200 characters')
      return
    }

    setSending(true)
    try {
      const payload: any = {
        title: title.trim(),
        body: body.trim(),
        click_action: clickAction,
      }

      if (imageUrl.trim()) {
        payload.image = imageUrl.trim()
      }

      if (targetRoles.length > 0) {
        payload.target_roles = targetRoles
      }

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      if (res.ok) {
        const result = await res.json()
        toast.success(`Broadcast sent! Delivered to ${result.sent} devices`)
        resetForm()
        fetchNotifications()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to send broadcast')
      }
    } catch (error) {
      console.error('Failed to send broadcast:', error)
      toast.error('Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setBody('')
    setImageUrl('')
    setClickAction('/dashboard')
    setTargetRoles([])
  }

  const handleResend = async (notification: NotificationItem) => {
    setTitle(notification.title)
    setBody(notification.message)
    setImageUrl(notification.metadata?.image || '')
    setClickAction(notification.link || '/dashboard')
    setTargetRoles(notification.metadata?.target_roles || [])
    toast.success('Loaded notification for editing')
  }

  const toggleRole = (role: string) => {
    if (targetRoles.includes(role)) {
      setTargetRoles(targetRoles.filter(r => r !== role))
    } else {
      setTargetRoles([...targetRoles, role])
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <Bell className={`w-7 h-7 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Notification Center
              </h1>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Broadcast push notifications to your users
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Create Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Title
                </label>
                <Input
                  placeholder="Enter notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={isDark ? 'bg-slate-700 border-slate-600 text-white' : ''}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Message
                  </label>
                  <span className={`text-xs ${body.length > 180 ? 'text-red-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {body.length}/200
                  </span>
                </div>
                <Textarea
                  placeholder="Enter notification message (max 200 characters)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className={isDark ? 'bg-slate-700 border-slate-600 text-white' : ''}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  Banner Image URL (Optional)
                </label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={isDark ? 'bg-slate-700 border-slate-600 text-white' : ''}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <ArrowRight className="w-4 h-4 inline mr-1" />
                  Click Action / Deep-link
                </label>
                <select
                  value={clickAction}
                  onChange={(e) => setClickAction(e.target.value)}
                  className={`w-full h-10 px-3 rounded-md border ${
                    isDark 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {CLICK_ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Target className="w-4 h-4 inline mr-1" />
                  Target Audience
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.filter(o => o.value).map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleRole(role.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        targetRoles.includes(role.value)
                          ? 'bg-blue-600 text-white'
                          : isDark
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
                {targetRoles.length === 0 && (
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sending to all users
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSendBroadcast}
                  disabled={sending || !title.trim() || !body.trim()}
                  className="flex-1"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Broadcast
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={sending}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`mx-auto w-full max-w-sm rounded-3xl border-4 ${
                isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
              } p-4 shadow-2xl`}>
                <div className={`rounded-2xl overflow-hidden ${
                  isDark ? 'bg-slate-800' : 'bg-white'
                } shadow-lg`}>
                  {imageUrl && (
                    <div className="relative h-40 bg-slate-200">
                      <img
                        src={imageUrl}
                        alt="Banner"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isDark ? 'bg-slate-700' : 'bg-slate-100'
                      }`}>
                        <Bell className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Agorich Pharma
                        </p>
                        <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {title || 'Notification Title'}
                        </h3>
                        <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {body || 'Notification message will appear here...'}
                        </p>
                        <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          just now
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Quick Tips
                </h4>
                <ul className={`text-xs space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li>• Keep messages under 150 characters for best display</li>
                  <li>• Images should be 1024x512px for banner format</li>
                  <li>• Click action deep-links users to specific pages</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Broadcast History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  No broadcasts sent yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isDark ? 'border-slate-700' : 'border-slate-200'}>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Date & Time
                      </th>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Title
                      </th>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Audience
                      </th>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Status
                      </th>
                      <th className={`text-right py-3 px-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {notifications.map((notification) => (
                      <tr key={notification.id} className={isDark ? 'border-slate-700' : 'border-slate-100'}>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(notification.created_at)}
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <div className="font-medium">{notification.title}</div>
                          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {notification.message}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {notification.metadata?.target_roles ? (
                            <div className="flex flex-wrap gap-1">
                              {notification.metadata.target_roles.map((role: string) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              All Users
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {notification.metadata?.sentCount ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  Sent ({notification.metadata.sentCount})
                                </span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  Saved
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(notification)}
                          >
                            <Repeat className="w-4 h-4 mr-1" />
                            Re-send
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}