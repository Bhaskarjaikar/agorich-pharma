'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowsClockwise, ArrowLeft, Bell, CheckCircle, Info, Warning, WarningCircle } from '@phosphor-icons/react'

type AlertType = 'warning' | 'info' | 'success' | 'error'

interface AlertItem {
  id?: string
  type: AlertType
  message: string
  time: string
  link?: string
  is_read?: boolean
}

function getAlertIcon(type: AlertType) {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
    case 'warning':
      return <WarningCircle className="w-5 h-5 text-amber-500" weight="fill" />
    case 'error':
      return <Warning className="w-5 h-5 text-red-500" weight="fill" />
    case 'info':
    default:
      return <Info className="w-5 h-5 text-blue-500" weight="fill" />
  }
}

export default function AdminAlertsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const unreadCount = useMemo(() => alerts.filter(a => !a.is_read).length, [alerts])

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/alerts', {
        headers: { 'cache-control': 'no-store' },
        credentials: 'include'
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to load alerts')
      }
      const json = (await res.json()) as { alerts?: AlertItem[] }
      setAlerts(json.alerts || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mark_all_read: true })
      })
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    } catch {
      setError('Failed to mark alerts as read')
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-muted border border-border">
                <Bell className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-foreground">Alerts</h1>
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">
                      {unreadCount} unread
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Admin alerts and system warnings</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/admin/notifications">
              <Button variant="outline">Notification Center</Button>
            </Link>
            <Button variant="outline" onClick={loadAlerts} disabled={loading}>
              <ArrowsClockwise className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={markAllRead} disabled={alerts.length === 0}>
              Mark all read
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <Card className="border shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="text-foreground">Latest</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-muted-foreground">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-muted-foreground">No alerts</div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.map((a, idx) => (
                  <button
                    key={a.id || `alert-${idx}`}
                    onClick={() => {
                      if (a.link) router.push(a.link)
                    }}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                      a.link ? 'hover:bg-muted/60' : ''
                    }`}
                  >
                    <div className="mt-0.5">{getAlertIcon(a.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className={`text-sm ${a.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                          {a.message}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</div>
                      </div>
                      {a.link && <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{a.link}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

