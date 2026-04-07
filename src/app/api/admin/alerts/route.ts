import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'

interface Alert {
  type: 'warning' | 'info' | 'success' | 'error'
  message: string
  time: string
  link?: string
}

interface InvoiceWithTotal {
  grand_total: number | string | null
}

interface InvoiceWithCustomerAndTotal {
  customer_id: string | null
  grand_total: number | string | null
}

interface InvoiceWithStatus {
  status: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { error: authError } = await verifyAdmin(request)
    if (authError) {
      return authError
    }
    
    const supabase = await createServerClient()
    const alerts: Alert[] = []

    // Get current date for time calculations
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Helper function to safely run alert queries
    const safeQuery = async <T>(queryFn: () => Promise<T>, errorMsg: string): Promise<T | null> => {
      try {
        return await queryFn()
      } catch (err) {
        console.error(`${errorMsg}:`, err)
        return null
      }
    }

    // Alert 1: Low stock products
    const lowStockResult = await safeQuery(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, stock')
        .lt('stock', 100)
        .eq('status', 'ACTIVE')
        .order('stock', { ascending: true })
        .limit(5)
      if (error) throw error
      return data
    }, 'Error fetching low stock items')

    if (lowStockResult && lowStockResult.length > 0) {
      const lowestStock = lowStockResult[0]
      alerts.push({
        type: 'warning',
        message: `Low stock alert: ${lowestStock.name} (${lowestStock.stock} units remaining)`,
        time: 'Just now',
        link: '/admin?tab=inventory'
      })
    }

    // Alert 2: New retailer registrations
    const newRetailersResult = await safeQuery(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_name, business_name, created_at')
        .eq('role', 'RETAILER')
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }, 'Error fetching new retailers')

    if (newRetailersResult && newRetailersResult.length > 0) {
      const latest = newRetailersResult[0]
      const hoursAgo = Math.floor((now.getTime() - new Date(latest.created_at).getTime()) / (60 * 60 * 1000))
      alerts.push({
        type: 'info',
        message: `New retailer registration: ${latest.business_name || latest.user_name}`,
        time: hoursAgo <= 1 ? 'Just now' : `${hoursAgo} hours ago`,
        link: '/admin/invoice-flow'
      })
    }

    // Alert 3: Monthly revenue target
    const invoicesMonthlyResult = await safeQuery(async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('grand_total')
        .gte('created_at', last30Days.toISOString())
        .in('status', ['PAID', 'SENT'])
      if (error) throw error
      return data
    }, 'Error fetching monthly revenue')

    if (invoicesMonthlyResult) {
      const monthlyRows = invoicesMonthlyResult as InvoiceWithTotal[]
      const monthlyRevenue = monthlyRows.reduce((sum, inv) => sum + Number(inv.grand_total ?? 0), 0)
      const target = 10000000
      const achievement = Math.round((monthlyRevenue / target) * 100)
      
      if (achievement >= 100) {
        alerts.push({
          type: 'success',
          message: `Monthly target achieved: ${achievement}% of target revenue`,
          time: '1 day ago',
          link: '/admin?tab=overview'
        })
      } else if (achievement >= 80) {
        alerts.push({
          type: 'info',
          message: `Revenue tracking: ${achievement}% of monthly target (₹${Math.round(monthlyRevenue / 100000)}L)`,
          time: 'Just now',
          link: '/admin?tab=overview'
        })
      }
    }

    // Alert 4: Pending payments
    const pendingInvoicesResult = await safeQuery(async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, grand_total')
        .eq('status', 'SENT')
        .lte('due_date', now.toISOString())
      if (error) throw error
      return data
    }, 'Error fetching pending invoices')

    if (pendingInvoicesResult && pendingInvoicesResult.length > 0) {
      const pendingRows = pendingInvoicesResult as InvoiceWithTotal[]
      const totalOutstanding = pendingRows.reduce((sum, inv) => sum + Number(inv.grand_total ?? 0), 0)
      alerts.push({
        type: 'warning',
        message: `Payment overdue: ${pendingInvoicesResult.length} retailers with outstanding balance (₹${Math.round(totalOutstanding / 1000)}K)`,
        time: '2 days ago',
        link: '/admin/invoice-flow'
      })
    }

    // Alert 5: High-value orders
    const recentInvoicesResult = await safeQuery(async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number, grand_total, created_at')
        .gte('created_at', last7Days.toISOString())
        .in('status', ['SENT', 'PAID'])
        .gte('grand_total', 50000)
        .order('grand_total', { ascending: false })
        .limit(1)
      if (error) throw error
      return data
    }, 'Error fetching high-value orders')

    if (recentInvoicesResult && recentInvoicesResult.length > 0) {
      const highValueOrder = recentInvoicesResult[0]
      const daysAgo = Math.floor((now.getTime() - new Date(highValueOrder.created_at).getTime()) / (24 * 60 * 60 * 1000))
      alerts.push({
        type: 'success',
        message: `High-value order received: ${highValueOrder.invoice_number} (₹${Math.round(highValueOrder.grand_total)})`,
        time: daysAgo === 0 ? 'Today' : `${daysAgo} days ago`,
        link: '/admin/invoice-flow'
      })
    }

    // Alert 6: Top performing retailer
    const topRetailerInvoicesResult = await safeQuery(async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('customer_id, grand_total')
        .gte('created_at', last30Days.toISOString())
      if (error) throw error
      return data
    }, 'Error fetching retailer invoices')

    if (topRetailerInvoicesResult) {
      const retailerRevenue: Record<string, number> = {}
      const retailerRows = topRetailerInvoicesResult as InvoiceWithCustomerAndTotal[]
      retailerRows.forEach(inv => {
        const cid = inv.customer_id || ''
        if (cid) {
          retailerRevenue[cid] = (retailerRevenue[cid] || 0) + Number(inv.grand_total ?? 0)
        }
      })

      const topRetailerId = Object.entries(retailerRevenue)
        .sort(([, a], [, b]) => b - a)[0]?.[0]

      if (topRetailerId) {
        const topRetailerResult = await safeQuery(async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('business_name, user_name')
            .eq('id', topRetailerId)
            .maybeSingle()
          if (error) throw error
          return data
        }, 'Error fetching top retailer')

        if (topRetailerResult) {
          const revenue = retailerRevenue[topRetailerId]
          alerts.push({
            type: 'info',
            message: `Top performer: ${topRetailerResult.business_name || topRetailerResult.user_name} with ₹${Math.round(revenue / 1000)}K revenue`,
            time: '3 days ago',
            link: `/admin/retailers/${topRetailerId}`
          })
        }
      }
    }

    // Alert 7: New invoices in last hour (urgent)
    const newInvoicesResult = await safeQuery(async () => {
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number, status, created_at, customer_id')
        .gte('created_at', lastHour.toISOString())
        .in('status', ['DRAFT', 'SENT'])
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    }, 'Error fetching new invoices')

    if (newInvoicesResult && newInvoicesResult.length > 0) {
      const minutesAgo = Math.floor((now.getTime() - new Date(newInvoicesResult[0].created_at).getTime()) / (60 * 1000))
      if (newInvoicesResult.length === 1) {
        alerts.push({
          type: 'info',
          message: `New invoice: ${newInvoicesResult[0].invoice_number} (${newInvoicesResult[0].status})`,
          time: minutesAgo <= 1 ? 'Just now' : `${minutesAgo} minutes ago`,
          link: '/admin/invoice-flow'
        })
      } else {
        const statusRows = newInvoicesResult as InvoiceWithStatus[]
        alerts.push({
          type: 'info',
          message: `${newInvoicesResult.length} new invoices created (${statusRows.filter(inv => inv.status === 'SENT').length} sent, ${statusRows.filter(inv => inv.status === 'DRAFT').length} draft)`,
          time: minutesAgo <= 1 ? 'Just now' : `${minutesAgo} minutes ago`,
          link: '/admin/invoice-flow'
        })
      }
    }

    // Alert 8: System health check
    const recentActivityResult = await safeQuery(async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id')
        .gte('created_at', last24Hours.toISOString())
      if (error) throw error
      return data
    }, 'Error fetching recent activity')

    const activityCount = recentActivityResult?.length || 0
    if (activityCount > 10) {
      alerts.push({
        type: 'success',
        message: `System active: ${activityCount} invoices created in last 24 hours`,
        time: 'Just now',
        link: '/admin/invoice-flow'
      })
    }

    // Sort alerts by priority and limit to 5 most important
    const priorityOrder = { error: 0, warning: 1, info: 2, success: 3 }
    const sortedAlerts = alerts
      .sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type])
      .slice(0, 5)

    return NextResponse.json({ alerts: sortedAlerts })
  } catch (e) {
    console.error('Error loading alerts:', e)
    // Return empty alerts array instead of error to prevent UI from breaking
    return NextResponse.json({ alerts: [] })
  }
}

