import axios from 'axios'

export interface OverdueCustomer {
  customer_id: string
  business_name: string
  name: string
  phone: string
  overdue_amount: number
  overdue_invoices_count: number
}

export async function triggerVapiCollectionCalls(
  customers: OverdueCustomer[],
  vapiApiKey: string,
  vapiAssistantId: string,
  agentApiKey: string,
  baseUrl: string
) {
  const results = []

  for (const customer of customers) {
    try {
      const amountFormatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(customer.overdue_amount)

      const payload = {
        phoneNumber: customer.phone,
        assistant: {
          id: vapiAssistantId,
          variableValues: {
            name: customer.business_name || customer.name,
            amount: amountFormatted,
            overdue_count: customer.overdue_invoices_count.toString()
          }
        }
      }

      const response = await axios.post(
        'https://api.vapi.ai/call/phone',
        payload,
        {
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      results.push({
        success: true,
        customer_id: customer.customer_id,
        customer_name: customer.business_name || customer.name,
        phone: customer.phone,
        call_id: response.data.id,
        message: 'Call initiated successfully'
      })

      console.log(`📞 Call initiated to ${customer.phone} (${customer.business_name})`)
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Unknown error'

      results.push({
        success: false,
        customer_id: customer.customer_id,
        customer_name: customer.business_name || customer.name,
        phone: customer.phone,
        error: errorMessage
      })

      console.error(`❌ Failed to initiate call to ${customer.phone}:`, errorMessage)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return results
}

export async function getOverdueCustomers(agentApiKey: string, baseUrl: string) {
  const response = await axios.get(`${baseUrl}/api/agent-connect/ar-overdue`, {
    headers: {
      'x-agent-api-key': agentApiKey
    }
  })

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch overdue customers')
  }

  return response.data.data as OverdueCustomer[]
}
