'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Wallet,
  Clock,
  TrendUp,
  Warning,
  CheckCircle,
  CircleNotch,
  ArrowClockwise,
  ArrowDown
} from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/invoice/types'

interface PendingSettlement {
  id: string
  invoice_id: string
  payment_id: string | null
  gross_amount: number
  platform_fee: number
  gateway_fee: number
  credit_deducted: number
  net_payout: number
  release_time: string
  status: string
  settled_at: string | null
  created_at: string
}

interface CreditInfo {
  total_owed: number
  last_adjustment_at: string
}

interface SettlementData {
  credits: CreditInfo
  pendingSettlements: PendingSettlement[]
  totalPending: number
  nextSettlementTime: string | null
  pendingCount: number
}

export function DistributorSettlements() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SettlementData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<PendingSettlement | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustAction, setAdjustAction] = useState<'APPLY_CREDIT' | 'ADD_CREDIT'>('APPLY_CREDIT')
  const [processing, setProcessing] = useState(false)

  const fetchSettlementData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/distributor/settlements/credit')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch settlement data')
      }
    } catch (err) {
      setError('Failed to fetch settlement data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettlementData()
  }, [])

  const handleAdjustCredit = async () => {
    if (!selectedSettlement || !adjustAmount) return

    setProcessing(true)
    try {
      const response = await fetch('/api/distributor/settlements/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id: selectedSettlement.id,
          amount: parseFloat(adjustAmount),
          action: adjustAction
        })
      })

      const result = await response.json()

      if (result.success) {
        setAdjustModalOpen(false)
        setAdjustAmount('')
        setSelectedSettlement(null)
        await fetchSettlementData()
      } else {
        alert(result.error || 'Failed to adjust credit')
      }
    } catch (err) {
      alert('Failed to adjust credit')
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const openAdjustModal = (settlement: PendingSettlement, action: 'APPLY_CREDIT' | 'ADD_CREDIT') => {
    setSelectedSettlement(settlement)
    setAdjustAction(action)
    setAdjustAmount('')
    setAdjustModalOpen(true)
  }

  const getTimeUntilRelease = (releaseTime: string) => {
    const now = new Date()
    const release = new Date(releaseTime)
    const diff = release.getTime() - now.getTime()

    if (diff <= 0) return 'Ready now'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <CardContent className="flex items-center gap-3 p-4">
          <Warning className="w-5 h-5 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSettlementData}>
            <ArrowClockwise className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const hasOutstandingCredit = (data?.credits?.total_owed || 0) > 0
  const hasPendingSettlements = (data?.pendingSettlements?.length || 0) > 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={hasOutstandingCredit ? 'border-amber-500' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Outstanding Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.credits?.total_owed || 0)}
            </div>
            {hasOutstandingCredit && (
              <Badge variant="outline" className="mt-2 border-amber-500 text-amber-600">
                Payment pending
              </Badge>
            )}
            {hasOutstandingCredit && hasPendingSettlements && (
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Credit will be auto-deducted from your next settlement
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.pendingCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatCurrency(data?.totalPending || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendUp className="w-4 h-4" />
              Next Release
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.nextSettlementTime ? getTimeUntilRelease(data.nextSettlementTime) : 'N/A'}
            </div>
            {data?.nextSettlementTime && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(data.nextSettlementTime).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {hasOutstandingCredit && hasPendingSettlements && (
        <Card className="border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Credit Recovery Available
                </h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  You have <strong>{formatCurrency(data?.credits?.total_owed || 0)}</strong> in outstanding credit
                  and <strong>{formatCurrency(data?.totalPending || 0)}</strong> in pending settlements.
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  Want to clear your dues now? Select a settlement below and apply your credit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Settlements</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchSettlementData}>
              <ArrowClockwise className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasPendingSettlements ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending settlements</p>
              <p className="text-sm">All settlements have been processed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Gross Amount</TableHead>
                  <TableHead className="text-right">Platform Fee (5%)</TableHead>
                  <TableHead className="text-right">Credit Deducted</TableHead>
                  <TableHead className="text-right">Net Payout</TableHead>
                  <TableHead>Release In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.pendingSettlements?.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="font-mono text-xs">
                      {settlement.invoice_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(settlement.gross_amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      -{formatCurrency(settlement.platform_fee)}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {settlement.credit_deducted > 0
                        ? `-${formatCurrency(settlement.credit_deducted)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(settlement.net_payout)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" />
                        {getTimeUntilRelease(settlement.release_time)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={settlement.status === 'PENDING' ? 'default' : 'secondary'}
                        className={settlement.status === 'PENDING' ? 'bg-blue-500' : ''}
                      >
                        {settlement.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasOutstandingCredit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAdjustModal(settlement, 'APPLY_CREDIT')}
                            className="text-xs"
                          >
                            <ArrowDown className="w-3 h-3 mr-1" />
                            Apply Credit
                          </Button>
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

      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credit</DialogTitle>
            <DialogDescription>
              {adjustAction === 'APPLY_CREDIT'
                ? `Apply credit to settlement ${selectedSettlement?.invoice_id?.slice(0, 8)}...`
                : 'Add credit to your outstanding balance'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {adjustAction === 'APPLY_CREDIT' && selectedSettlement && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Net Payout</p>
                  <p className="font-semibold">{formatCurrency(selectedSettlement.net_payout)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Credit Available</p>
                  <p className="font-semibold text-amber-600">
                    {formatCurrency(data?.credits?.total_owed || 0)}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
                min="0"
                max={
                  adjustAction === 'APPLY_CREDIT'
                    ? Math.min(
                        selectedSettlement?.net_payout || 0,
                        data?.credits?.total_owed || 0
                      )
                    : undefined
                }
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={adjustAction === 'APPLY_CREDIT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAdjustAction('APPLY_CREDIT')}
              >
                Apply to Settlement
              </Button>
              <Button
                variant={adjustAction === 'ADD_CREDIT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAdjustAction('ADD_CREDIT')}
              >
                Add to Balance
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustCredit}
              disabled={!adjustAmount || processing}
            >
              {processing && <CircleNotch className="w-4 h-4 mr-2 animate-spin" />}
              {adjustAction === 'APPLY_CREDIT' ? 'Apply Credit' : 'Add Credit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
