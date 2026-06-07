import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkEmergencyStatus, createEmergencyBlockResponse } from '@/lib/middleware/emergency-check'
import { verifyAdmin } from '@/lib/api-security'

// Lazy initialization to avoid build errors when API key is not set
let openaiInstance: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    openaiInstance = new (require('openai'))({ apiKey })
  }
  return openaiInstance
}

const MAX_MESSAGE_LENGTH = 10000
const MAX_MESSAGES = 20

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  if (trimmed.length === 0) return ''
  return trimmed.slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '')
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function readBodySafely(
  request: NextRequest,
  maxSizeBytes: number = 10000
): Promise<{ success: true; body: string } | { success: false; error: string; status: number }> {
  const contentLength = request.headers.get('content-length')
  let parsedContentLength: number | null = null

  if (contentLength) {
    parsedContentLength = parseInt(contentLength, 10)
    if (isNaN(parsedContentLength) || parsedContentLength === 0) {
      return { success: false, error: 'Invalid Content-Length header', status: 400 }
    }
    if (parsedContentLength > maxSizeBytes) {
      return { success: false, error: `Request body too large (max ${maxSizeBytes} bytes)`, status: 413 }
    }
  }

  const reader = request.body?.getReader()
  if (!reader) {
    return { success: false, error: 'Request body is not available', status: 400 }
  }

  const decoder = new TextDecoder()
  let totalLength = 0
  const chunks: string[] = []
  let cancelled = false

  try {
    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>
      try {
        readResult = await reader.read()
      } catch (readErr) {
        if (cancelled) {
          return { success: false, error: 'Request body too large', status: 413 }
        }
        return { success: false, error: 'Failed to read request body', status: 400 }
      }

      const { done, value } = readResult

      if (done) {
        if (parsedContentLength !== null && totalLength !== parsedContentLength) {
          return { success: false, error: 'Content-Length mismatch with actual body size', status: 400 }
        }
        break
      }

      if (!value) {
        return { success: false, error: 'Failed to read request body', status: 400 }
      }

      totalLength += value.byteLength

      if (totalLength > maxSizeBytes) {
        cancelled = true
        try {
          await reader.cancel()
        } catch {
        }
        return { success: false, error: 'Request body too large', status: 413 }
      }

      chunks.push(decoder.decode(value, { stream: true }))
    }

    chunks.push(decoder.decode())
    const body = chunks.join('')

    if (body.length > maxSizeBytes) {
      return { success: false, error: 'Request body too large', status: 413 }
    }

    return { success: true, body }
  } catch {
    return { success: false, error: 'Failed to read request body', status: 400 }
  }
}

async function getSalesData(region?: string, timeframe?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Server configuration error')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let query = supabase
    .from('invoices')
    .select('id, grand_total, created_at, place_of_supply')
    .eq('is_cancelled', false)

  if (timeframe) {
    const days = parseInt(timeframe)
    if (!isNaN(days) && days > 0 && days <= 365) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte('created_at', startDate.toISOString())
    }
  }

  const { data, error } = await query

  if (error) throw error

  return {
    total_sales: data.reduce((sum, inv) => sum + (inv.grand_total || 0), 0),
    invoice_count: data.length,
    region: region || 'all',
    timeframe: timeframe || 'all'
  }
}

async function getOverduePayments() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const agentApiKey = process.env.AGENT_API_KEY

  if (!agentApiKey) {
    throw new Error('Agent API key not configured')
  }

  const response = await fetch(`${baseUrl}/api/agent-connect/ar-overdue`, {
    headers: { 'x-agent-api-key': agentApiKey }
  })

  const result = await response.json()
  return result.success ? result.data : []
}

async function triggerVapiCollectionCalls() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const agentApiKey = process.env.AGENT_API_KEY

  if (!agentApiKey) {
    throw new Error('Agent API key not configured')
  }

  const response = await fetch(`${baseUrl}/api/cron/trigger-vapi-calls`, {
    method: 'POST',
    headers: { 'x-agent-api-key': agentApiKey }
  })

  return await response.json()
}

async function analyzeLowPerformingMedicines() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Server configuration error')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('status', 'ACTIVE')

  if (productsError) throw productsError

  const { data: invoiceItems, error: itemsError } = await supabase
    .from('invoice_items')
    .select('product_id, quantity, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (itemsError) throw itemsError

  const productSales = new Map()
  products.forEach(p => productSales.set(p.id, { ...p, quantity: 0 }))

  invoiceItems.forEach(item => {
    const product = productSales.get(item.product_id)
    if (product) product.quantity += item.quantity || 0
  })

  const lowPerforming = Array.from(productSales.values())
    .filter(p => p.quantity < 5)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 10)

  return lowPerforming
}

async function applyPromotionalDiscount(productId: string, percentage: number) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const agentApiKey = process.env.AGENT_API_KEY

  if (!agentApiKey) {
    throw new Error('Agent API key not configured')
  }

  if (!productId || typeof productId !== 'string') {
    throw new Error('Invalid product ID')
  }

  if (typeof percentage !== 'number' || percentage <= 0 || percentage > 100) {
    throw new Error('Percentage must be between 0 and 100')
  }

  const response = await fetch(`${baseUrl}/api/agent-connect/apply-discount`, {
    method: 'POST',
    headers: {
      'x-agent-api-key': agentApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ product_id: productId, percentage })
  })

  return await response.json()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const errorId = generateErrorId()

  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const emergencyCheck = await checkEmergencyStatus('/api/command-center/chat')
    if (!emergencyCheck.allowed) {
      return createEmergencyBlockResponse(emergencyCheck)
    }

    const bodyResult = await readBodySafely(request)
    if (!bodyResult.success) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status }
      )
    }

    let body: { messages?: unknown[] }
    try {
      body = JSON.parse(bodyResult.body)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { messages } = body || {}

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_MESSAGES} messages allowed` },
        { status: 400 }
      )
    }

    const sanitizedMessages = messages.slice(0, MAX_MESSAGES).map((msg: unknown) => {
      if (typeof msg === 'object' && msg !== null && !Array.isArray(msg)) {
        const m = msg as Record<string, unknown>
        const role = typeof m.role === 'string' ? m.role : 'user'
        const content = typeof m.content === 'string' ? sanitizeString(m.content, MAX_MESSAGE_LENGTH) : ''

        if (!content) return null

        return {
          role: ['system', 'user', 'assistant'].includes(role) ? role : 'user',
          content
        }
      }
      return null
    }).filter(Boolean)

    if (sanitizedMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid messages found' },
        { status: 400 }
      )
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_sales_data',
          description: 'Get sales data for a region and timeframe',
          parameters: {
            type: 'object',
            properties: {
              region: { type: 'string', description: 'Region name' },
              timeframe: { type: 'string', description: 'Number of days to look back' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_overdue_payments',
          description: 'Get list of overdue payments',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'trigger_vapi_collection_calls',
          description: 'Trigger Vapi collection calls to overdue customers',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'analyze_low_performing_medicines',
          description: 'Analyze which medicines are selling poorly',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'apply_promotional_discount',
          description: 'Apply a promotional discount to a product',
          parameters: {
            type: 'object',
            properties: {
              product_id: { type: 'string', description: 'Product ID' },
              percentage: { type: 'number', description: 'Discount percentage (0-100)' }
            },
            required: ['product_id', 'percentage']
          }
        }
      }
    ]

    const systemMessage = {
      role: 'system' as const,
      content: `You are JARVIS, the AI Command Center for Agorich Pharma. You are an elite business assistant that helps the admin manage Agorich Pharma entirely through natural language commands.

You speak in a mix of Hindi and English (Hinglish). You are professional, confident, and efficient.

You have access to powerful tools to analyze the business and take actions. Use these tools wisely.

Guidelines:
1. Always analyze the data first before making recommendations
2. When you recommend an action (like applying a discount or making calls), ask for explicit confirmation before executing
3. Keep responses concise and to the point
4. Use business terms but explain them if needed
5. Be proactive in identifying problems and suggesting solutions

When the user types "Yes" or confirms an action, proceed to execute the recommended action.`
    }

    const allMessages = [systemMessage, ...sanitizedMessages]

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages as any,
      tools: tools as any,
      tool_choice: 'auto'
    })

    const message = response.choices[0].message

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolResults = []

      for (const toolCall of message.tool_calls as any) {
        const functionName = toolCall.function.name
        let functionArgs: Record<string, unknown> = {}
        try {
          const rawArgs = toolCall.function.arguments || '{}'
          const parsed = JSON.parse(rawArgs)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            functionArgs = parsed
          }
        } catch {
          functionArgs = {}
        }

        let result

        try {
          switch (functionName) {
            case 'get_sales_data':
              result = await getSalesData(
                typeof functionArgs.region === 'string' ? functionArgs.region : undefined,
                typeof functionArgs.timeframe === 'string' ? functionArgs.timeframe : undefined
              )
              break
            case 'get_overdue_payments':
              result = await getOverduePayments()
              break
            case 'trigger_vapi_collection_calls':
              result = await triggerVapiCollectionCalls()
              break
            case 'analyze_low_performing_medicines':
              result = await analyzeLowPerformingMedicines()
              break
            case 'apply_promotional_discount':
              result = await applyPromotionalDiscount(
                typeof functionArgs.product_id === 'string' ? functionArgs.product_id : '',
                typeof functionArgs.percentage === 'number' ? functionArgs.percentage : 0
              )
              break
            default:
              result = { error: 'Unknown function' }
          }

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: functionName,
            content: JSON.stringify(result)
          })
        } catch (error) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: functionName,
            content: JSON.stringify({ error: String(error) })
          })
        }
      }

      const secondResponse = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [...allMessages, message, ...toolResults] as any
      })

      return NextResponse.json({
        success: true,
        message: secondResponse.choices[0].message.content
      })
    }

    return NextResponse.json({
      success: true,
      message: message.content
    })

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'command_center_chat_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
