export type ServiceName = 'openai' | 'vapi' | 'all'

export type ActionType =
  | 'openai_chat'
  | 'openai_embedding'
  | 'openai_image'
  | 'vapi_call'
  | 'vapi_recording'
  | 'vapi_transcription'
  | 'other'

export interface CostMetadata {
  tokens_input?: number
  tokens_output?: number
  model?: string
  duration_seconds?: number
  call_type?: string
  [key: string]: any
}

export interface CostEntry {
  serviceName: ServiceName
  actionType: ActionType
  cost: number
  metadata?: CostMetadata
  timestamp?: string
}

export interface OpenAIpricing {
  gpt4o: {
    input: number
    output: number
  }
  gpt4oMini: {
    input: number
    output: number
  }
  gpt35Turbo: {
    input: number
    output: number
  }
  embedding: number
}

const OPENAI_PRICING: OpenAIpricing = {
  gpt4o: {
    input: 0.00003,
    output: 0.00006
  },
  gpt4oMini: {
    input: 0.000015,
    output: 0.00003
  },
  gpt35Turbo: {
    input: 0.000001,
    output: 0.000002
  },
  embedding: 0.00001
}

const VAPI_PRICING = {
  per_minute: 1.5,
  recording_per_minute: 0.5,
  transcription_per_character: 0.00001
}

class CostCalculator {
  calculateOpenAICost(
    tokensInput: number,
    tokensOutput: number,
    model: string = 'gpt-4o'
  ): number {
    const pricing = this.getOpenAIPricing(model)

    const inputCost = (tokensInput / 1000) * pricing.input
    const outputCost = (tokensOutput / 1000) * pricing.output

    return inputCost + outputCost
  }

  private getOpenAIPricing(model: string): { input: number; output: number } {
    const modelLower = model.toLowerCase()

    if (modelLower.includes('gpt-4o-mini') || modelLower.includes('4o-mini')) {
      return OPENAI_PRICING.gpt4oMini
    } else if (modelLower.includes('gpt-4o') || modelLower.includes('4o')) {
      return OPENAI_PRICING.gpt4o
    } else if (modelLower.includes('gpt-3.5-turbo') || modelLower.includes('35')) {
      return OPENAI_PRICING.gpt35Turbo
    }

    return OPENAI_PRICING.gpt4o
  }

  calculateVapiCost(
    durationSeconds: number,
    callType: 'voice' | 'recording' | 'transcription' = 'voice'
  ): number {
    const minutes = durationSeconds / 60

    switch (callType) {
      case 'recording':
        return minutes * VAPI_PRICING.recording_per_minute
      case 'transcription':
        return durationSeconds * VAPI_PRICING.transcription_per_character
      case 'voice':
      default:
        return minutes * VAPI_PRICING.per_minute
    }
  }

  calculateEmbeddingCost(tokens: number, model: string = 'text-embedding-3-small'): number {
    const pricePerThousand = OPENAI_PRICING.embedding
    return (tokens / 1000) * pricePerThousand
  }

  calculateImageCost(size: '256x256' | '512x512' | '1024x1024' = '1024x1024'): number {
    switch (size) {
      case '256x256':
        return 0.016
      case '512x512':
        return 0.018
      case '1024x1024':
        return 0.02
      default:
        return 0.02
    }
  }

  estimateCost(serviceName: ServiceName, actionType: ActionType, metadata?: CostMetadata): number {
    switch (serviceName) {
      case 'openai':
        return this.calculateOpenAIEstimatedCost(actionType, metadata)
      case 'vapi':
        return this.calculateVapiEstimatedCost(actionType, metadata)
      case 'all':
        return this.calculateAllEstimatedCost(actionType, metadata)
      default:
        return 0
    }
  }

  private calculateOpenAIEstimatedCost(actionType: ActionType, metadata?: CostMetadata): number {
    if (actionType === 'openai_chat') {
      const input = metadata?.tokens_input || 1000
      const output = metadata?.tokens_output || 500
      const model = metadata?.model || 'gpt-4o'
      return this.calculateOpenAICost(input, output, model)
    }

    if (actionType === 'openai_embedding') {
      const tokens = metadata?.tokens_input || 1000
      const model = metadata?.model || 'text-embedding-3-small'
      return this.calculateEmbeddingCost(tokens, model)
    }

    if (actionType === 'openai_image') {
      return this.calculateImageCost('1024x1024')
    }

    return 0.01
  }

  private calculateVapiEstimatedCost(actionType: ActionType, metadata?: CostMetadata): number {
    if (actionType === 'vapi_call') {
      const duration = metadata?.duration_seconds || 60
      return this.calculateVapiCost(duration, 'voice')
    }

    if (actionType === 'vapi_recording') {
      const duration = metadata?.duration_seconds || 60
      return this.calculateVapiCost(duration, 'recording')
    }

    return 1.5
  }

  private calculateAllEstimatedCost(actionType: ActionType, metadata?: CostMetadata): number {
    if (actionType.startsWith('openai_')) {
      return this.calculateOpenAIEstimatedCost(actionType, metadata)
    }
    if (actionType.startsWith('vapi_')) {
      return this.calculateVapiEstimatedCost(actionType, metadata)
    }
    return 0.01
  }

  getServiceName(actionType: ActionType): ServiceName {
    if (actionType.startsWith('openai_')) return 'openai'
    if (actionType.startsWith('vapi_')) return 'vapi'
    return 'all'
  }
}

export const costCalculator = new CostCalculator()

export function formatCost(cost: number): string {
  return `₹${cost.toFixed(4)}`
}

export function formatINR(cost: number): string {
  if (cost < 1) {
    return `₹${cost.toFixed(2)}`
  }
  return `₹${cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
