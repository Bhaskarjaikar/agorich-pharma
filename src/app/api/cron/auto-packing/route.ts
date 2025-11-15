import { NextResponse } from 'next/server'

/**
 * GET /api/cron/auto-packing
 * 
 * DISABLED: Auto-packing functionality is disabled per admin requirement.
 * Invoices only move when admin manually moves them through the invoice-flow dashboard.
 * Full manual control is maintained for invoice status transitions.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Auto-packing is disabled. Invoices only move when admin manually moves them.',
    enabled: false,
    updated: 0
  })
}
