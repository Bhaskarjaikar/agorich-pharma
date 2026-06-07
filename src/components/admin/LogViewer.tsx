'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw,
  Search,
  Download,
  Filter,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Pause
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface LogEntry {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context: Record<string, any>
  trace_id: string | null
  source: string
  action: string | null
  user_id: string | null
  ip_address: string | null
  duration_ms: number | null
  status_code: number | null
  created_at: string
}

interface LogSummary {
  total: number
  by_level: Record<string, number>
  by_source: Record<string, number>
  error_count: number
  warn_count: number
  info_count: number
  debug_count: number
}

const LEVEL_ICONS: Record<string, React.ReactNode> = {
  debug: <Bug className="h-4 w-4 text-blue-500" />,
  info: <Info className="h-4 w-4 text-green-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />
}

const LEVEL_COLORS: Record<string, string> = {
  debug: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-green-100 text-green-800 border-green-200',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function LogEntryRow({ log, expanded, onToggle }: { log: LogEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <div className={`border-b border-border hover:bg-muted transition-colors ${log.level === 'error' ? 'bg-red-50/50 dark:bg-red-900/20' : ''}`}>
      <div
        className="px-4 py-3 cursor-pointer flex items-start gap-3"
        onClick={onToggle}
      >
        <div className="mt-0.5">{LEVEL_ICONS[log.level]}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={LEVEL_COLORS[log.level]} variant="outline">
              {log.level.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {log.source}
            </Badge>
            {log.action && (
              <span className="text-xs text-muted-foreground">{log.action}</span>
            )}
          </div>

          <p className="mt-1 text-sm text-foreground truncate">{log.message}</p>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(log.created_at)}
            </span>
            {log.duration_ms !== null && (
              <span>{log.duration_ms}ms</span>
            )}
            {log.status_code && (
              <span>Status: {log.status_code}</span>
            )}
            {log.trace_id && (
              <span className="font-mono text-xs">{log.trace_id.slice(0, 20)}...</span>
            )}
          </div>
        </div>

        <div className="text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 ml-10">
          <div className="bg-background dark:bg-card rounded-lg border border-border p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Full Message</h4>
              <p className="text-sm font-mono bg-muted p-2 rounded">{log.message}</p>
            </div>

            {Object.keys(log.context || {}).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Context</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(log.context, null, 2)}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Trace ID:</span>
                <span className="ml-2 font-mono text-xs">{log.trace_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">User ID:</span>
                <span className="ml-2 font-mono text-xs">{log.user_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">IP Address:</span>
                <span className="ml-2 font-mono text-xs">{log.ip_address || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2">{log.duration_ms ? `${log.duration_ms}ms` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCards({ summary }: { summary: LogSummary | null }) {
  if (!summary) return null

  const cards = [
    { label: 'Total', value: summary.total, color: 'text-foreground' },
    { label: 'Errors', value: summary.error_count, color: 'text-red-600 dark:text-red-400' },
    { label: 'Warnings', value: summary.warn_count, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Info', value: summary.info_count, color: 'text-green-600 dark:text-green-400' }
  ]

  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {cards.map(card => (
        <Card key={card.label}>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState<LogSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/admin/logs?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [levelFilter, sourceFilter, searchQuery])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchLogs()
      }, 30000)
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
      }
    }
  }, [autoRefresh, fetchLogs])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      params.set('format', 'csv')
      params.set('limit', '1000')
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)

      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' })
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting logs:', error)
    }
  }

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.message.toLowerCase().includes(query) ||
        JSON.stringify(log.context).toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>System Logs</CardTitle>
            <Badge variant="outline" className="bg-blue-50">
              {filteredLogs.length} entries
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRefreshing(true); fetchLogs() }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="ai-agent">AI Agent</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>

            {levelFilter !== 'all' || sourceFilter !== 'all' || searchQuery ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLevelFilter('all')
                  setSourceFilter('all')
                  setSearchQuery('')
                }}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            ) : null}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <SummaryCards summary={summary} />

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No logs found</p>
            <p className="text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {filteredLogs.map(log => (
              <LogEntryRow
                key={log.id}
                log={log}
                expanded={expandedLogs.has(log.id)}
                onToggle={() => toggleExpand(log.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
