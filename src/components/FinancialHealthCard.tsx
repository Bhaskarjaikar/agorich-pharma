'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencyDollar, Warning, Clock, TrendUp, TrendDown, CheckCircle } from '@phosphor-icons/react'

interface Invoice {
  id: string
  invoice_number: string
  grand_total: number
  due_date: string
  invoice_date: string
  status: string
  payment_status?: string
}

export function FinancialHealthCard({ darkMode = true }: { darkMode?: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // MOCK DATA - Replace with real API call to /api/invoices
    // TODO: Wire to actual invoice data from Supabase
    const mockInvoices: Invoice[] = [
      {
        id: '1',
        invoice_number: 'AGR/2026-27/0001',
        grand_total: 25000,
        due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        invoice_date: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'SENT'
      },
      {
        id: '2',
        invoice_number: 'AGR/2026-27/0002',
        grand_total: 18500,
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        invoice_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'SENT'
      },
      {
        id: '3',
        invoice_number: 'AGR/2026-27/0003',
        grand_total: 42000,
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        invoice_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OVERDUE'
      },
      {
        id: '4',
        invoice_number: 'AGR/2026-27/0004',
        grand_total: 15000,
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        invoice_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'SENT'
      }
    ]

    setInvoices(mockInvoices)
    setLoading(false)
  }, [])

  const getDaysUntilDue = (dueDateStr: string) => {
    const today = new Date()
    const dueDate = new Date(dueDateStr)
    const diffTime = dueDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getUrgencyColor = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    if (daysUntilDue <= 3) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    if (daysUntilDue <= 7) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  }

  const getUrgencyIcon = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return <Warning className="w-4 h-4" weight="fill" />
    if (daysUntilDue <= 3) return <Clock className="w-4 h-4" weight="fill" />
    if (daysUntilDue <= 7) return <Warning className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN')
  }

  const totalBalance = invoices.reduce((sum, inv) => sum + inv.grand_total, 0)
  const overdueBalance = invoices.filter(inv => getDaysUntilDue(inv.due_date) < 0).reduce((sum, inv) => sum + inv.grand_total, 0)
  const redZonePercentage = totalBalance > 0 ? Math.round((overdueBalance / totalBalance) * 100) : 0

  return (
    <Card className={`border shadow-sm ${darkMode ? 'bg-background border-border' : 'bg-white border-slate-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CurrencyDollar className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} weight="fill" />
            <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
              Financial Health Card
            </CardTitle>
          </div>
          {redZonePercentage >= 40 && (
            <Badge variant="destructive" className="animate-pulse">
              RED ZONE ALERT
            </Badge>
          )}
        </div>
        <CardDescription className={darkMode ? 'text-muted-foreground' : 'text-slate-500'}>
          Total Balance Due: {formatCurrency(totalBalance)}
          {redZonePercentage >= 40 && (
            <span className="ml-2 text-red-500 font-semibold">
              ({redZonePercentage}% in Red Zone)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-16 rounded animate-pulse ${darkMode ? 'bg-card' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const daysUntilDue = getDaysUntilDue(invoice.due_date)
              return (
                <div
                  key={invoice.id}
                  className={`p-4 rounded-lg border ${
                    darkMode 
                      ? 'border-border bg-card/50' 
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {invoice.invoice_number}
                        </span>
                        <Badge className={getUrgencyColor(daysUntilDue)}>
                          {daysUntilDue < 0 
                            ? `${Math.abs(daysUntilDue)}d OVERDUE` 
                            : daysUntilDue === 0 
                              ? 'DUE TODAY' 
                              : `${daysUntilDue}d left`
                          }
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className={darkMode ? 'text-muted-foreground' : 'text-slate-600'}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          Due: {formatDate(invoice.due_date)}
                        </span>
                        <span className={darkMode ? 'text-slate-500' : 'text-muted-foreground'}>
                          • Invoice: {formatDate(invoice.invoice_date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(invoice.grand_total)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Total Due</div>
              <div className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(totalBalance)}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Overdue</div>
              <div className="font-bold text-xl text-red-600 dark:text-red-400">
                {formatCurrency(overdueBalance)}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Red Zone %</div>
              <div className={`font-bold text-xl ${redZonePercentage >= 40 ? 'text-red-600 dark:text-red-400' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                {redZonePercentage}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
