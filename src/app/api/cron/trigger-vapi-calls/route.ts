import { NextRequest, NextResponse } from 'next/server'
import { triggerVapiCollectionCalls, getOverdueCustomers } from '@/lib/vapi/orchestrator'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = request.headers.get('x-agent-api-key')
    if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    const vapiApiKey = process.env.VAPI_API_KEY
    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const agentApiKey = process.env.AGENT_API_KEY!

    if (!vapiApiKey || !vapiAssistantId) {
      return NextResponse.json(
        { success: false, error: 'VAPI configuration missing' },
        { status: 500 }
      )
    }

    const customers = await getOverdueCustomers(agentApiKey, baseUrl)

    if (customers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No overdue customers found',
        data: []
      })
    }

    console.log(`📋 Found ${customers.length} overdue customers - starting collection calls...`)

    const results = await triggerVapiCollectionCalls(
      customers,
      vapiApiKey,
      vapiAssistantId,
      agentApiKey,
      baseUrl
    )

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`✅ Collection calls complete: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Initiated ${customers.length} collection calls`,
      summary: {
        total: customers.length,
        successful: successCount,
        failed: failureCount
      },
      data: results
    })

  } catch (error) {
    console.error('Error in trigger-vapi-calls:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
