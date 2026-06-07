import fs from 'fs'
import path from 'path'

export interface PromptVersion {
  id: string
  name: string
  description: string
  content: string
  created_at: string
  updated_at: string
  author: string
  performance_metrics: {
    relevance_score: number
    hinglish_accuracy: number
    tool_calling_accuracy: number
    average_response_time_ms: number
    success_rate: number
    customer_satisfaction: number
    payment_promise_rate: number
    call_completion_rate: number
  }
  tags: string[]
  active: boolean
}

export interface VersionHistory {
  version: string
  deployed_at: string
  activated_at: string | null
  deactivated_at: string | null
  reason: string
  performance_summary: string
}

export interface ABTestConfig {
  enabled: boolean
  current_test_id: string | null
  tests: Record<string, ABTest>
  default_split: Record<string, number>
}

export interface ABTest {
  id: string
  name: string
  description: string
  versions: string[]
  start_date: string
  end_date: string | null
  traffic_split: Record<string, number>
  results: {
    total_requests: number
    version_results: Record<string, {
      requests: number
      success_rate: number
      avg_response_time_ms: number
      customer_satisfaction: number
      payment_promise_rate: number
    }>
  }
}

export interface RolloutStage {
  percentage: number
  duration_hours: number
}

export interface SystemPromptsConfig {
  current_version: string
  default_prompt: string
  prompts: Record<string, PromptVersion>
  version_history: VersionHistory[]
  ab_testing: ABTestConfig
  rollout_config: {
    gradual_rollout_enabled: boolean
    current_percentage: number
    rollout_stages: RolloutStage[]
  }
  metadata: {
    last_updated: string
    total_versions: number
    active_versions: number
    default_language: string
    business_domain: string
    supported_regions: string[]
    compliance: string[]
  }
}

export class PromptManager {
  private configPath: string
  private config: SystemPromptsConfig

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'prompts', 'system-prompts.json')
    this.config = this.loadConfig()
  }

  private loadConfig(): SystemPromptsConfig {
    try {
      const data = fs.readFileSync(this.configPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      throw new Error(`Failed to load prompt config from ${this.configPath}: ${error}`)
    }
  }

  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      throw new Error(`Failed to save prompt config to ${this.configPath}: ${error}`)
    }
  }

  getCurrentPrompt(): PromptVersion {
    return this.config.prompts[this.config.current_version]
  }

  getPrompt(versionId: string): PromptVersion | null {
    return this.config.prompts[versionId] || null
  }

  getAllPrompts(): PromptVersion[] {
    return Object.values(this.config.prompts)
  }

  getActivePrompts(): PromptVersion[] {
    return Object.values(this.config.prompts).filter(prompt => prompt.active)
  }

  switchPrompt(versionId: string, reason: string = 'Manual switch'): void {
    if (!this.config.prompts[versionId]) {
      throw new Error(`Prompt version ${versionId} not found`)
    }

    const oldVersion = this.config.current_version
    this.config.current_version = versionId

    this.config.version_history.push({
      version: versionId,
      deployed_at: new Date().toISOString(),
      activated_at: new Date().toISOString(),
      deactivated_at: null,
      reason,
      performance_summary: 'Activated via prompt manager'
    })

    this.config.metadata.last_updated = new Date().toISOString()
    this.saveConfig()
  }

  rollbackPrompt(reason: string = 'Rollback due to issues'): void {
    if (this.config.version_history.length < 2) {
      throw new Error('No previous version to rollback to')
    }

    const previousVersion = this.config.version_history
      .slice(0, -1)
      .reverse()
      .find(history => history.version !== this.config.current_version)

    if (!previousVersion) {
      throw new Error('No suitable previous version found for rollback')
    }

    this.switchPrompt(previousVersion.version, reason)
  }

  createNewPrompt(
    id: string,
    name: string,
    description: string,
    content: string,
    author: string,
    tags: string[] = []
  ): PromptVersion {
    if (this.config.prompts[id]) {
      throw new Error(`Prompt version ${id} already exists`)
    }

    const now = new Date().toISOString()
    const newPrompt: PromptVersion = {
      id,
      name,
      description,
      content,
      created_at: now,
      updated_at: now,
      author,
      performance_metrics: {
        relevance_score: 0,
        hinglish_accuracy: 0,
        tool_calling_accuracy: 0,
        average_response_time_ms: 0,
        success_rate: 0,
        customer_satisfaction: 0,
        payment_promise_rate: 0,
        call_completion_rate: 0
      },
      tags,
      active: false
    }

    this.config.prompts[id] = newPrompt
    this.config.metadata.total_versions = Object.keys(this.config.prompts).length
    this.config.metadata.last_updated = now
    this.saveConfig()

    return newPrompt
  }

  updatePromptMetrics(
    versionId: string,
    metrics: Partial<PromptVersion['performance_metrics']>
  ): void {
    const prompt = this.config.prompts[versionId]
    if (!prompt) {
      throw new Error(`Prompt version ${versionId} not found`)
    }

    prompt.performance_metrics = {
      ...prompt.performance_metrics,
      ...metrics
    }
    prompt.updated_at = new Date().toISOString()
    this.config.metadata.last_updated = new Date().toISOString()
    this.saveConfig()
  }

  enableABTesting(testId: string, versions: string[], trafficSplit: Record<string, number>): void {
    if (!this.config.ab_testing.tests[testId]) {
      const now = new Date().toISOString()
      this.config.ab_testing.tests[testId] = {
        id: testId,
        name: `AB Test ${testId}`,
        description: `A/B test comparing ${versions.join(', ')}`,
        versions,
        start_date: now,
        end_date: null,
        traffic_split: trafficSplit,
        results: {
          total_requests: 0,
          version_results: {}
        }
      }
    }

    this.config.ab_testing.enabled = true
    this.config.ab_testing.current_test_id = testId
    this.saveConfig()
  }

  disableABTesting(): void {
    this.config.ab_testing.enabled = false
    this.config.ab_testing.current_test_id = null
    this.saveConfig()
  }

  recordABTestResult(versionId: string, success: boolean, responseTimeMs: number): void {
    if (!this.config.ab_testing.enabled || !this.config.ab_testing.current_test_id) {
      return
    }

    const testId = this.config.ab_testing.current_test_id
    const test = this.config.ab_testing.tests[testId]
    if (!test || !test.versions.includes(versionId)) {
      return
    }

    if (!test.results.version_results[versionId]) {
      test.results.version_results[versionId] = {
        requests: 0,
        success_rate: 0,
        avg_response_time_ms: 0,
        customer_satisfaction: 0,
        payment_promise_rate: 0
      }
    }

    const versionResult = test.results.version_results[versionId]
    versionResult.requests++
    
    const currentSuccessRate = versionResult.success_rate
    const newSuccessRate = success ? 1 : 0
    versionResult.success_rate = (currentSuccessRate * (versionResult.requests - 1) + newSuccessRate) / versionResult.requests
    
    const currentAvgTime = versionResult.avg_response_time_ms
    versionResult.avg_response_time_ms = (currentAvgTime * (versionResult.requests - 1) + responseTimeMs) / versionResult.requests

    test.results.total_requests++
    this.saveConfig()
  }

  getABTestVersion(): string {
    if (!this.config.ab_testing.enabled || !this.config.ab_testing.current_test_id) {
      return this.config.current_version
    }

    const testId = this.config.ab_testing.current_test_id
    const test = this.config.ab_testing.tests[testId]
    if (!test) {
      return this.config.current_version
    }

    const random = Math.random() * 100
    let cumulative = 0

    for (const [versionId, percentage] of Object.entries(test.traffic_split)) {
      cumulative += percentage
      if (random <= cumulative) {
        return versionId
      }
    }

    return this.config.current_version
  }

  setRolloutPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100')
    }

    this.config.rollout_config.current_percentage = percentage
    this.saveConfig()
  }

  shouldUseNewPrompt(): boolean {
    if (!this.config.rollout_config.gradual_rollout_enabled) {
      return true
    }

    const random = Math.random() * 100
    return random <= this.config.rollout_config.current_percentage
  }

  getRolloutStatus(): { currentPercentage: number; enabled: boolean; stages: RolloutStage[] } {
    return {
      currentPercentage: this.config.rollout_config.current_percentage,
      enabled: this.config.rollout_config.gradual_rollout_enabled,
      stages: this.config.rollout_config.rollout_stages
    }
  }

  getConfig(): SystemPromptsConfig {
    return { ...this.config }
  }
}

export const promptManager = new PromptManager()