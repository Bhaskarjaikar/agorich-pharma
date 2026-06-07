'use client'

import { useState, useEffect } from 'react'
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  ChevronRight,
  Activity,
  Database,
  ShoppingCart,
  Terminal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AgentHealthSummary {
  agentName: string
  currentStatus: 'online' | 'degraded' | 'offline'
  uptimePercentage: number
  avgResponseTimeMs: number
  lastCheckTime: string
  lastErrorMessage?: string
}

interface AgentHealthLog {
  id: string
  agent_name: string
  status: 'online' | 'degraded' | 'offline'
  response_time_ms?: number
  error_message?: string
  checked_at: string
  metadata?: Record<string, any>
}

interface AgentHealthResponse {
  agents: AgentHealthSummary[]
  timestamp: string
  overallStatus: 'healthy' | 'degraded' | 'critical'
  healthyAgents: number
  totalAgents: number
}

function AgentStatusCard({ agent }: { agent: AgentHealthSummary }) {
  const getStatusColor = () => {
    switch (agent.currentStatus) {
      case 'online': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'offline': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (agent.currentStatus) {
      case 'online': return <Wifi className="h-4 w-4 text-white" />
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-white" />
      case 'offline': return <WifiOff className="h-4 w-4 text-white" />
      default: return <Activity className="h-4 w-4 text-white" />
    }
  }

  const getAgentIcon = () => {
    switch (agent.agentName) {
      case 'Voice AI': return <Activity className="h-5 w-5" />
      case 'Inventory AI': return <Database className="h-5 w-5" />
      case 'Sales AI': return <ShoppingCart className="h-5 w-5" />
      case 'Command Center': return <Terminal className="h-5 w-5" />
      default: return <Activity className="h-5 w-5" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              {getAgentIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {agent.agentName}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`h-2 w-2 rounded-full ${getStatusColor()}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {agent.currentStatus}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {agent.uptimePercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Uptime (24h)
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {agent.avgResponseTimeMs > 0 ? `${agent.avgResponseTimeMs.toFixed(0)}ms` : 'N/A'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Avg Response
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="h-3 w-3 mr-1" />
              Last check: {formatTime(agent.lastCheckTime)}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {formatDate(agent.lastCheckTime)}
            </div>
          </div>
          
          {agent.lastErrorMessage && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
              {agent.lastErrorMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AgentLogsDialog({ agentName, logs }: { agentName: string, logs: AgentHealthLog[] }) {
  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Online</Badge>
      case 'degraded': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Degraded</Badge>
      case 'offline': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Offline</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{agentName} - Health Logs</DialogTitle>
      </DialogHeader>
      
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Response Time</TableHead>
              <TableHead>Error Message</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">
                  {formatDateTime(log.checked_at)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(log.status)}
                </TableCell>
                <TableCell>
                  {log.response_time_ms ? `${log.response_time_ms}ms` : 'N/A'}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {log.error_message || '-'}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {log.metadata ? JSON.stringify(log.metadata) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No health logs available for {agentName}
          </div>
        )}
      </div>
    </DialogContent>
  )
}

export default function AgentStatusPanel() {
  const [healthData, setHealthData] = useState<AgentHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [agentLogs, setAgentLogs] = useState<AgentHealthLog[]>([])
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)

  const fetchAgentHealth = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/health/agents', {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent health: ${response.status}`)
      }
      
      const data = await response.json()
      setHealthData(data)
    } catch (err: any) {
      console.error('Error fetching agent health:', err)
      setError(err.message || 'Failed to load agent health status')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgentLogs = async (agentName: string) => {
    try {
      const response = await fetch(`/api/health/agents/${agentName}/logs`, {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        setAgentLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Error fetching agent logs:', err)
      setAgentLogs([])
    }
  }

  const handleViewLogs = async (agentName: string) => {
    setSelectedAgent(agentName)
    await fetchAgentLogs(agentName)
    setLogsDialogOpen(true)
  }

  useEffect(() => {
    fetchAgentHealth()
    
    const interval = setInterval(fetchAgentHealth, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getOverallStatusColor = () => {
    if (!healthData) return 'bg-gray-500'
    
    switch (healthData.overallStatus) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getOverallStatusText = () => {
    if (!healthData) return 'Unknown'
    
    switch (healthData.overallStatus) {
      case 'healthy': return 'All Systems Operational'
      case 'degraded': return 'Some Systems Degraded'
      case 'critical': return 'Critical Issues Detected'
      default: return 'Status Unknown'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Agents Health Monitor</CardTitle>
          <CardDescription>Monitoring system status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Agents Health Monitor</CardTitle>
          <CardDescription>Error loading health data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={fetchAgentHealth}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Agents Health Monitor</CardTitle>
              <CardDescription>
                Real-time monitoring of AI agent systems
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${getOverallStatusColor()}`}></div>
                <span className="text-sm font-medium">
                  {getOverallStatusText()}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAgentHealth}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthData?.agents.map((agent) => (
              <div key={agent.agentName} className="relative">
                <AgentStatusCard agent={agent} />
                <Dialog open={logsDialogOpen && selectedAgent === agent.agentName} onOpenChange={setLogsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => handleViewLogs(agent.agentName)}
                    >
                      View Logs
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </DialogTrigger>
                  <AgentLogsDialog 
                    agentName={agent.agentName} 
                    logs={agentLogs} 
                  />
                </Dialog>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                Last updated: {healthData ? new Date(healthData.timestamp).toLocaleTimeString('en-IN') : 'N/A'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Healthy: {healthData?.healthyAgents}/{healthData?.totalAgents} agents
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}