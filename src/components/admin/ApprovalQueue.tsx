'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ApprovalRecord {
  id: string
  action_type: string
  action_data: Record<string, any>
  requested_by: string | null
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  threshold_exceeded_amount: number | null
  metadata: Record<string, any>
}

interface ApprovalQueueResponse {
  success: boolean
  data: ApprovalRecord[]
  count: number
  timestamp: string
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  apply_discount: 'Apply Discount',
  price_change: 'Price Change',
  bulk_inventory_adjustment: 'Bulk Inventory',
  credit_limit_change: 'Credit Limit',
  delete_product: 'Delete Product',
  override_payment_terms: 'Override Payment Terms'
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  apply_discount: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  price_change: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  bulk_inventory_adjustment: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  credit_limit_change: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  delete_product: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  override_payment_terms: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A'
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function ActionDetailsDialog({ record }: { record: ApprovalRecord }) {
  const [open, setOpen] = useState(false)

  const renderActionDetails = () => {
    const { action_type, action_data } = record

    switch (action_type) {
      case 'apply_discount':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-medium">{action_data.product_name || action_data.product_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Discount</p>
                <p className="font-medium text-red-600 dark:text-red-400">{action_data.percentage}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Original PTR</p>
                <p className="font-medium">{formatCurrency(action_data.original_ptr)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New PTR</p>
                <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(action_data.new_ptr)}</p>
              </div>
            </div>
            {action_data.reason && (
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="font-medium">{action_data.reason}</p>
              </div>
            )}
          </div>
        )

      case 'price_change':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-medium">{action_data.product_name || action_data.product_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Change Amount</p>
                <p className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(action_data.new_value - action_data.original_value)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Original Price</p>
                <p className="font-medium line-through">{formatCurrency(action_data.original_value)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Price</p>
                <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(action_data.new_value)}</p>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Action Data</p>
            <pre className="bg-muted dark:bg-muted p-3 rounded-lg text-xs overflow-auto">
              {JSON.stringify(action_data, null, 2)}
            </pre>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Action Details - {ACTION_TYPE_LABELS[record.action_type] || record.action_type}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={record.status === 'pending' ? 'default' : record.status === 'approved' ? 'default' : 'destructive'}>
                {record.status}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Requested By</p>
              <p className="font-medium">{record.requested_by || 'AI Agent'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Requested At</p>
              <p className="font-medium">{formatTime(record.requested_at)}</p>
            </div>
            {record.threshold_exceeded_amount && (
              <div>
                <p className="text-muted-foreground">Exceeded By</p>
                <p className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(record.threshold_exceeded_amount)}</p>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Action Data</h4>
            {renderActionDetails()}
          </div>

          {record.status === 'rejected' && record.rejection_reason && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 text-red-600">Rejection Reason</h4>
              <p className="text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {record.rejection_reason}
              </p>
            </div>
          )}

          {record.status === 'approved' && record.reviewed_by && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 text-green-600">Approved By</h4>
              <p className="text-sm">{record.reviewed_by} on {formatTime(record.reviewed_at || record.requested_at)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({ approvalId, onRejected }: { approvalId: string; onRejected: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReject = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        setOpen(false)
        setReason('')
        onRejected()
      }
    } catch (error) {
      console.error('Error rejecting:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason for rejection (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const fetchApprovals = useCallback(async () => {
    setRefreshing(true)
    try {
      const statusParam = filter !== 'all' ? `status=${filter}` : ''
      const typeParam = actionTypeFilter ? `&actionType=${actionTypeFilter}` : ''
      const url = `/api/approvals/queue?${statusParam}${typeParam}`

      const response = await fetch(url)
      const data: ApprovalQueueResponse = await response.json()

      if (data.success) {
        setApprovals(data.data)
      }
    } catch (error) {
      console.error('Error fetching approvals:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [filter, actionTypeFilter])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  useEffect(() => {
    const interval = setInterval(() => {
      if (filter === 'pending') {
        fetchApprovals()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [filter, fetchApprovals])

  const handleApprove = async (approvalId: string) => {
    if (processingIds.has(approvalId)) return

    setProcessingIds(prev => new Set(prev).add(approvalId))

    try {
      const response = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: 'Admin' })
      })

      if (response.ok) {
        fetchApprovals()
      }
    } catch (error) {
      console.error('Error approving:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(approvalId)
        return next
      })
    }
  }

  const handleReject = async (approvalId: string) => {
    if (processingIds.has(approvalId)) return

    setProcessingIds(prev => new Set(prev).add(approvalId))

    try {
      const response = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by admin' })
      })

      if (response.ok) {
        fetchApprovals()
      }
    } catch (error) {
      console.error('Error rejecting:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(approvalId)
        return next
      })
    }
  }

  const pendingCount = approvals.filter(a => a.status === 'pending').length
  const approvedCount = approvals.filter(a => a.status === 'approved').length
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Approval Queue
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {pendingCount} Pending
              </Badge>
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                {approvedCount} Approved
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                {rejectedCount} Rejected
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                className="text-sm border border-input rounded-md px-2 py-1 bg-background"
              >
                <option value="">All Types</option>
                <option value="apply_discount">Apply Discount</option>
                <option value="price_change">Price Change</option>
                <option value="bulk_inventory_adjustment">Bulk Inventory</option>
                <option value="credit_limit_change">Credit Limit</option>
              </select>
            </div>
            <div className="flex items-center gap-2 border rounded-md px-2 py-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border-0 bg-transparent focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchApprovals}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No approvals found</p>
            <p className="text-sm">
              {filter === 'pending'
                ? 'All actions are within acceptable thresholds'
                : `No ${filter} approvals`}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>
                    <Badge className={ACTION_TYPE_COLORS[approval.action_type] || 'bg-muted text-muted-foreground'}>
                      {ACTION_TYPE_LABELS[approval.action_type] || approval.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {approval.action_type === 'apply_discount' && approval.action_data.percentage && (
                        <span className="font-medium">{approval.action_data.percentage}% discount</span>
                      )}
                      {approval.action_type === 'price_change' && (
                        <span>{formatCurrency(approval.action_data.original_value)} → {formatCurrency(approval.action_data.new_value)}</span>
                      )}
                      {approval.action_type === 'bulk_inventory_adjustment' && approval.action_data.quantity && (
                        <span>{approval.action_data.quantity} units</span>
                      )}
                      {!['apply_discount', 'price_change', 'bulk_inventory_adjustment'].includes(approval.action_type) && (
                        <span className="text-sm text-muted-foreground">
                          {Object.keys(approval.action_data).slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{approval.requested_by || 'AI Agent'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTime(approval.requested_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        approval.status === 'pending' ? 'default' :
                        approval.status === 'approved' ? 'default' : 'destructive'
                      }
                      className={
                        approval.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {approval.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ActionDetailsDialog record={approval} />
                      {approval.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleApprove(approval.id)}
                            disabled={processingIds.has(approval.id)}
                          >
                            {processingIds.has(approval.id) ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            {processingIds.has(approval.id) ? 'Processing...' : 'Approve'}
                          </Button>
                          <RejectDialog approvalId={approval.id} onRejected={() => handleReject(approval.id)} />
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
