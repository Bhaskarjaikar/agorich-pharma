import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const salesId = searchParams.get('salesId')
    const month = searchParams.get('month') // YYYY-MM format
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [year, monthNum] = currentMonth.split('-').map(Number)

    // Get all active sales team members
    let salesQuery = supabase
      .from('sales_team')
      .select(`
        id,
        profile_id,
        territory,
        monthly_target,
        commission_rate,
        profiles:profile_id (user_name, business_name, phone)
      `)
      .eq('status', 'ACTIVE')

    if (salesId) {
      salesQuery = salesQuery.eq('id', salesId)
    }

    const { data: salesTeam, error: salesError } = await salesQuery

    if (salesError) {
      console.error('Error fetching sales team:', salesError)
      return NextResponse.json({ error: salesError.message }, { status: 400 })
    }

    const salesIds = salesTeam?.map((s) => s.id) || []

    // Get assigned retailers
    const { data: assignments, error: assignError } = await supabase
      .from('sales_retailer_assignments')
      .select('sales_id, retailer_id, assigned_date')
      .in('sales_id', salesIds)

    if (assignError) {
      console.error('Error fetching assignments:', assignError)
    }

    // Group retailers by sales_id
    const retailersBySales: Record<string, string[]> = {}
    assignments?.forEach((a) => {
      if (!retailersBySales[a.sales_id]) {
        retailersBySales[a.sales_id] = []
      }
      retailersBySales[a.sales_id].push(a.retailer_id)
    })

    // Calculate date range for invoice queries
    const monthStart = new Date(year, monthNum - 1, 1)
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59)

    const queryStart = startDate ? new Date(startDate) : monthStart
    const queryEnd = endDate ? new Date(endDate) : monthEnd

    // Get all invoices for assigned retailers in the date range
    const allRetailerIds = Object.values(retailersBySales).flat()

    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('grand_total, created_at, customer_id')
      .in('customer_id', allRetailerIds)
      .gte('created_at', queryStart.toISOString())
      .lte('created_at', queryEnd.toISOString())

    if (invError) {
      console.error('Error fetching invoices:', invError)
    }

    // Get daily reports for visits/calls data
    const { data: dailyReports, error: reportError } = await supabase
      .from('daily_call_reports')
      .select('sales_id, calls_made, meetings_held, orders_taken, orders_amount, new_retailers_added, report_date')
      .in('sales_id', salesIds)
      .gte('report_date', queryStart.toISOString().split('T')[0])
      .lte('report_date', queryEnd.toISOString().split('T')[0])

    if (reportError) {
      console.error('Error fetching daily reports:', reportError)
    }

    // Get visit logs count
    const { data: visitLogs, error: visitError } = await supabase
      .from('daily_visit_logs')
      .select('sales_id, visit_date, outcome')
      .in('sales_id', salesIds)
      .gte('visit_date', queryStart.toISOString().split('T')[0])
      .lte('visit_date', queryEnd.toISOString().split('T')[0])

    if (visitError) {
      console.error('Error fetching visit logs:', visitError)
    }

    // Calculate metrics per sales member
    const performanceData = salesTeam?.map((member) => {
      const memberRetailers = retailersBySales[member.id] || []

      // Calculate revenue from assigned retailers
      const memberInvoices = (invoices || []).filter((inv) =>
        memberRetailers.includes(inv.customer_id)
      )
      const totalRevenue = memberInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0)
      const totalOrders = memberInvoices.length

      // Calculate achievement percentage
      const target = Number(member.monthly_target || 0)
      const achievement = target > 0 ? Math.round((totalRevenue / target) * 1000) / 10 : 0

      // Get daily report summary
      const memberReports = (dailyReports || []).filter((r) => r.sales_id === member.id)
      const totalCalls = memberReports.reduce((sum, r) => sum + (r.calls_made || 0), 0)
      const totalMeetings = memberReports.reduce((sum, r) => sum + (r.meetings_held || 0), 0)
      const totalNewRetailers = memberReports.reduce((sum, r) => sum + (r.new_retailers_added || 0), 0)
      const reportOrdersAmount = memberReports.reduce((sum, r) => sum + Number(r.orders_amount || 0), 0)

      // Get visit metrics
      const memberVisits = (visitLogs || []).filter((v) => v.sales_id === member.id)
      const totalVisits = memberVisits.length
      const successfulVisits = memberVisits.filter((v) => v.outcome === 'ORDER_PLACED' || v.outcome === 'FOLLOW_UP').length

      // Daily performance breakdown
      const dailyPerformance: Record<string, { revenue: number; visits: number; calls: number }> = {}
      memberInvoices.forEach((inv) => {
        const date = new Date(inv.created_at).toISOString().split('T')[0]
        if (!dailyPerformance[date]) {
          dailyPerformance[date] = { revenue: 0, visits: 0, calls: 0 }
        }
        dailyPerformance[date].revenue += Number(inv.grand_total || 0)
      })
      memberVisits.forEach((visit) => {
        if (!dailyPerformance[visit.visit_date]) {
          dailyPerformance[visit.visit_date] = { revenue: 0, visits: 0, calls: 0 }
        }
        dailyPerformance[visit.visit_date].visits += 1
      })
      memberReports.forEach((report) => {
        if (!dailyPerformance[report.report_date]) {
          dailyPerformance[report.report_date] = { revenue: 0, visits: 0, calls: 0 }
        }
        dailyPerformance[report.report_date].calls += report.calls_made || 0
      })

      // Get profile data - profiles is returned as an array from Supabase
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles

      return {
        id: member.id,
        profile_id: member.profile_id,
        name: profile?.user_name || 'Unknown',
        business_name: profile?.business_name || '',
        phone: profile?.phone || '',
        territory: member.territory,
        monthly_target: target,
        commission_rate: member.commission_rate,
        retailer_count: memberRetailers.length,
        // Performance metrics
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        achievement_percentage: achievement,
        // Activity metrics
        total_calls: totalCalls,
        total_meetings: totalMeetings,
        total_visits: totalVisits,
        successful_visits: successfulVisits,
        new_retailers_added: totalNewRetailers,
        // Commission calculation
        commission_earned: Math.round((totalRevenue * (member.commission_rate || 0)) / 100),
        // Daily breakdown
        daily_performance: Object.entries(dailyPerformance).map(([date, data]) => ({
          date,
          ...data,
        })),
      }
    })

    // Calculate team summary
    const teamSummary = {
      total_members: performanceData?.length || 0,
      total_revenue: performanceData?.reduce((sum, m) => sum + m.total_revenue, 0) || 0,
      total_target: performanceData?.reduce((sum, m) => sum + m.monthly_target, 0) || 0,
      avg_achievement:
        performanceData && performanceData.length > 0
          ? Math.round(
              (performanceData.reduce((sum, m) => sum + m.achievement_percentage, 0) / performanceData.length) * 10
            ) / 10
          : 0,
      total_calls: performanceData?.reduce((sum, m) => sum + m.total_calls, 0) || 0,
      total_visits: performanceData?.reduce((sum, m) => sum + m.total_visits, 0) || 0,
      total_new_retailers: performanceData?.reduce((sum, m) => sum + m.new_retailers_added, 0) || 0,
    }

    return NextResponse.json({
      performance: performanceData,
      summary: teamSummary,
      period: {
        month: currentMonth,
        start_date: queryStart.toISOString().split('T')[0],
        end_date: queryEnd.toISOString().split('T')[0],
      },
    })
  } catch (error: unknown) {
    console.error('Error in sales team performance API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
