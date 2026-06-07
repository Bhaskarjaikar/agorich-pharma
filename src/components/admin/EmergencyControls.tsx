'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  Play,
  Pause,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  Loader2,
  Clock,
  User
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EmergencyStatus {
  systemActive: boolean
  currentLevel: 'FULL_STOP' | 'AGENT_PAUSE' | 'APPROVAL_MODE' | null
  emergencyStop: {
    is_active: boolean
    activated_by: string | null
    activated_at: string | null
    reason: string | null
    resumed_at: string | null
  }
  agentPause: {
    is_active: boolean
    activated_by: string | null
    activated_at: string | null
    reason: string | null
    resumed_at: string | null
  }
  approvalMode: {
    is_active: boolean
    activated_by: string | null
    activated_at: string | null
    reason: string | null
    resumed_at: string | null
  }
  lastUpdated: string
}

const LEVEL_CONFIG = {
  FULL_STOP: {
    label: 'Full Stop',
    description: 'All AI actions blocked',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-500',
    icon: ShieldAlert
  },
  AGENT_PAUSE: {
    label: 'Agent Pause',
    description: 'Only autonomous actions blocked',
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-500',
    icon: Pause
  },
  APPROVAL_MODE: {
    label: 'Approval Mode',
    description: 'All actions require approval',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500',
    icon: ShieldAlert
  }
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function EmergencyControls() {
  const [status, setStatus] = useState<EmergencyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activating, setActivating] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<'FULL_STOP' | 'AGENT_PAUSE' | 'APPROVAL_MODE'>('FULL_STOP')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/emergency/status')
      const data = await response.json()

      if (data.success) {
        setStatus(data.data)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus()
    }, 10000)

    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleActivate = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for stopping')
      return
    }

    setActivating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/emergency/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: selectedLevel,
          reason: reason,
          adminId: 'Admin'
        })
      })

      const data = await response.json()

      if (data.success) {
        setStopDialogOpen(false)
        setReason('')
        fetchStatus()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to activate stop')
    } finally {
      setActivating(false)
    }
  }

  const handleResume = async () => {
    setResuming(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/emergency/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 'Admin' })
      })

      const data = await response.json()

      if (data.success) {
        fetchStatus()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to resume operations')
    } finally {
      setResuming(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-2 border-red-200">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isSystemActive = status?.systemActive
  const currentLevel = status?.currentLevel

  const getLevelKey = (level: 'FULL_STOP' | 'AGENT_PAUSE' | 'APPROVAL_MODE' | null | undefined): 'emergencyStop' | 'agentPause' | 'approvalMode' | null | undefined => {
    if (!level) return undefined
    switch (level) {
      case 'FULL_STOP': return 'emergencyStop'
      case 'AGENT_PAUSE': return 'agentPause'
      case 'APPROVAL_MODE': return 'approvalMode'
      default: return undefined
    }
  }

  const levelKey = getLevelKey(currentLevel)

  return (
    <Card className={`border-2 ${isSystemActive ? 'border-red-500' : 'border-green-500'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSystemActive ? (
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </div>
            ) : (
              <div className="p-2 bg-green-100 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
            )}
            <div>
              <CardTitle className="flex items-center gap-2">
                Emergency Controls
                {isSystemActive ? (
                  <Badge variant="destructive" className="animate-pulse">
                    ACTIVE
                  </Badge>
                ) : (
                  <Badge className="bg-green-500">NORMAL</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isSystemActive
                  ? `System is in ${currentLevel?.replace('_', ' ')} mode`
                  : 'All AI systems operational'
                }
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRefreshing(true); fetchStatus() }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {isSystemActive && currentLevel && (
          <div className={`p-4 rounded-lg border-2 ${LEVEL_CONFIG[currentLevel].borderColor} bg-opacity-10`}
               style={{ backgroundColor: `${LEVEL_CONFIG[currentLevel].color}10` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {levelKey && (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Activated by:</span>
                      <span className="font-medium">{status?.[levelKey]?.activated_by || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">At:</span>
                      <span className="font-medium">{formatTime(status?.[levelKey]?.activated_at || null)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                {levelKey && status?.[levelKey]?.reason && (
                  <div className="p-3 bg-muted/50 dark:bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Reason:</p>
                    <p className="font-medium">{status?.[levelKey]?.reason}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = LEVEL_CONFIG[currentLevel].icon
                    return <Icon className={`h-8 w-8 ${LEVEL_CONFIG[currentLevel].textColor}`} />
                  })()}
                  <div>
                    <h3 className="font-bold text-lg">{LEVEL_CONFIG[currentLevel].label}</h3>
                    <p className="text-sm text-muted-foreground">{LEVEL_CONFIG[currentLevel].description}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleResume}
              disabled={resuming}
              className="mt-4 w-full bg-green-600 hover:bg-green-700"
            >
              {resuming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Resume Operations
            </Button>
          </div>
        )}

        {!isSystemActive && (
          <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-16 text-lg font-bold border-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Stop Controls
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Activate Emergency Stop
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="level">Stop Level</Label>
                  <Select
                    value={selectedLevel}
                    onValueChange={(value: 'FULL_STOP' | 'AGENT_PAUSE' | 'APPROVAL_MODE') => setSelectedLevel(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_STOP">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          Full Stop - All AI actions blocked
                        </div>
                      </SelectItem>
                      <SelectItem value="AGENT_PAUSE">
                        <div className="flex items-center gap-2">
                          <Pause className="h-4 w-4 text-amber-500" />
                          Agent Pause - Only autonomous actions blocked
                        </div>
                      </SelectItem>
                      <SelectItem value="APPROVAL_MODE">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-blue-500" />
                          Approval Mode - All actions require approval
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason">Reason for stopping *</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter the reason for activating emergency stop..."
                    rows={4}
                    required
                  />
                </div>

                <div className={`p-3 rounded-lg ${LEVEL_CONFIG[selectedLevel].borderColor} border-2`}
                     style={{ backgroundColor: `${LEVEL_CONFIG[selectedLevel].color}10` }}>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = LEVEL_CONFIG[selectedLevel].icon
                      return <Icon className={`h-5 w-5 ${LEVEL_CONFIG[selectedLevel].textColor}`} />
                    })()}
                    <span className="font-medium">{LEVEL_CONFIG[selectedLevel].label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{LEVEL_CONFIG[selectedLevel].description}</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStopDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleActivate}
                  disabled={activating || !reason.trim()}
                >
                  {activating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Activate {LEVEL_CONFIG[selectedLevel].label}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className={`p-3 rounded-lg border-2 ${status?.emergencyStop?.is_active ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-input dark:border-muted-foreground/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className={`h-4 w-4 ${status?.emergencyStop?.is_active ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className="font-medium text-sm">Full Stop</span>
            </div>
            <Badge variant={status?.emergencyStop?.is_active ? 'destructive' : 'secondary'}>
              {status?.emergencyStop?.is_active ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>

          <div className={`p-3 rounded-lg border-2 ${status?.agentPause?.is_active ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-input dark:border-muted-foreground/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Pause className={`h-4 w-4 ${status?.agentPause?.is_active ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span className="font-medium text-sm">Agent Pause</span>
            </div>
            <Badge variant={status?.agentPause?.is_active ? 'default' : 'secondary'} className={status?.agentPause?.is_active ? 'bg-amber-500' : ''}>
              {status?.agentPause?.is_active ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>

          <div className={`p-3 rounded-lg border-2 ${status?.approvalMode?.is_active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-input dark:border-muted-foreground/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className={`h-4 w-4 ${status?.approvalMode?.is_active ? 'text-blue-500' : 'text-muted-foreground'}`} />
              <span className="font-medium text-sm">Approval Mode</span>
            </div>
            <Badge variant={status?.approvalMode?.is_active ? 'default' : 'secondary'} className={status?.approvalMode?.is_active ? 'bg-blue-500' : ''}>
              {status?.approvalMode?.is_active ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
