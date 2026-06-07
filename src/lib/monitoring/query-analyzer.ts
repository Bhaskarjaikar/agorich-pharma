import { createClient } from '@supabase/supabase-js'

export interface QueryAnalysis {
  query: string
  executionTime: number
  rowCount: number
  suggestions: QuerySuggestion[]
  detectedIssues: QueryIssue[]
  estimatedCost: 'low' | 'medium' | 'high'
}

export interface QuerySuggestion {
  type: 'index' | 'query_rewrite' | 'schema_change' | 'connection_pool'
  priority: 'high' | 'medium' | 'low'
  description: string
  sql?: string
  impact: string
  estimatedImprovement: string
}

export interface QueryIssue {
  type: 'n_plus_one' | 'full_scan' | 'missing_index' | 'cartesian_product' | 'subquery' | 'lock_wait'
  severity: 'high' | 'medium' | 'low'
  description: string
  location?: string
}

export interface OptimizationRecommendation {
  category: 'index' | 'query' | 'schema' | 'cache' | 'connection'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  sql?: string
  estimatedGain: string
}

class QueryAnalyzer {
  private supabaseUrl: string
  private supabaseServiceKey: string
  private supabase: ReturnType<typeof createClient> | null = null

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

    if (this.supabaseUrl && this.supabaseServiceKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    }
  }

  async analyzeQuery(query: string, executionTime: number, rowCount: number): Promise<QueryAnalysis> {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim()

    const issues = this.detectIssues(normalizedQuery, executionTime, rowCount)
    const suggestions = this.generateSuggestions(normalizedQuery, executionTime, issues)
    const estimatedCost = this.estimateCost(executionTime, rowCount, issues)

    return {
      query: query.substring(0, 200),
      executionTime,
      rowCount,
      suggestions,
      detectedIssues: issues,
      estimatedCost
    }
  }

  private detectIssues(query: string, executionTime: number, rowCount: number): QueryIssue[] {
    const issues: QueryIssue[] = []

    if (executionTime > 1000) {
      issues.push({
        type: 'full_scan',
        severity: 'high',
        description: `Query took ${executionTime}ms - potential full table scan`
      })
    }

    if (query.includes('select *')) {
      issues.push({
        type: 'full_scan',
        severity: 'medium',
        description: 'SELECT * fetches all columns - consider specifying needed columns'
      })
    }

    const joinWithoutIndex = query.includes('join') && !query.includes('index')
    if (joinWithoutIndex && executionTime > 500) {
      issues.push({
        type: 'missing_index',
        severity: 'high',
        description: 'JOIN operation without apparent index usage'
      })
    }

    const hasSubquery = (query.match(/\(select|\(update|\(delete/g) || []).length > 0
    if (hasSubquery && executionTime > 500) {
      issues.push({
        type: 'subquery',
        severity: 'medium',
        description: 'Subquery detected - consider using JOIN instead'
      })
    }

    const hasMultipleJoins = (query.match(/join/g) || []).length > 2
    if (hasMultipleJoins && rowCount > 1000) {
      issues.push({
        type: 'cartesian_product',
        severity: 'high',
        description: 'Multiple JOINs with high row count - potential cartesian product'
      })
    }

    if (!query.includes('order by') && !query.includes('limit') && rowCount > 10000) {
      issues.push({
        type: 'lock_wait',
        severity: 'medium',
        description: 'Large result set without LIMIT - consider adding pagination'
      })
    }

    return issues
  }

  private generateSuggestions(query: string, executionTime: number, issues: QueryIssue[]): QuerySuggestion[] {
    const suggestions: QuerySuggestion[] = []

    const tableName = this.extractTableName(query)
    const whereColumns = this.extractWhereColumns(query)

    if (issues.some(i => i.type === 'missing_index' || i.type === 'full_scan')) {
      if (tableName && whereColumns.length > 0) {
        suggestions.push({
          type: 'index',
          priority: 'high',
          description: `Create composite index on ${tableName}`,
          sql: `CREATE INDEX CONCURRENTLY idx_${tableName}_${whereColumns.join('_')}_ ON ${tableName} (${whereColumns.join(', ')});`,
          impact: 'High - reduces query time by 50-90%',
          estimatedImprovement: `${Math.round(executionTime * 0.7)}ms saved`
        })
      }
    }

    if (query.includes('select *')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Replace SELECT * with specific columns',
        impact: 'Medium - reduces data transfer and memory usage',
        estimatedImprovement: `${Math.round(executionTime * 0.2)}ms saved`
      })
    }

    if (!query.includes('limit') && !query.includes('offset')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Add LIMIT clause for pagination',
        impact: 'High - prevents loading excessive data',
        estimatedImprovement: 'Prevents memory exhaustion'
      })
    }

    if (query.includes('or') && !query.includes('union')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'low',
        description: 'Consider using UNION for complex OR conditions',
        impact: 'Medium - can improve index usage',
        estimatedImprovement: `${Math.round(executionTime * 0.15)}ms saved`
      })
    }

    return suggestions
  }

  private extractTableName(query: string): string | null {
    const fromMatch = query.match(/from\s+(\w+)/)
    if (fromMatch) return fromMatch[1]

    const updateMatch = query.match(/update\s+(\w+)/)
    if (updateMatch) return updateMatch[1]

    return null
  }

  private extractWhereColumns(query: string): string[] {
    const whereMatch = query.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|\s+join|$)/i)
    if (!whereMatch) return []

    const whereClause = whereMatch[1]
    const columnMatches = whereClause.match(/(\w+)\s*(?:=|<|>|between)/gi) || []

    return [...new Set(columnMatches.map(m => m.replace(/\s*(?:=|<|>|between)/gi, '').toLowerCase()))]
  }

  private estimateCost(executionTime: number, rowCount: number, issues: QueryIssue[]): 'low' | 'medium' | 'high' {
    let score = 0

    if (executionTime > 2000) score += 3
    else if (executionTime > 1000) score += 2
    else if (executionTime > 500) score += 1

    if (rowCount > 10000) score += 3
    else if (rowCount > 1000) score += 2
    else if (rowCount > 100) score += 1

    score += issues.filter(i => i.severity === 'high').length * 2
    score += issues.filter(i => i.severity === 'medium').length

    if (score >= 5) return 'high'
    if (score >= 3) return 'medium'
    return 'low'
  }

  async analyzeSlowQueries(hours: number = 24, threshold: number = 1000): Promise<QueryAnalysis[]> {
    if (!this.supabase) return []

    try {
      const { data, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .eq('metric_type', 'db_query')
        .gte('duration_ms', threshold)
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('duration_ms', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching slow queries:', error)
        return []
      }

      const analyses: QueryAnalysis[] = []
      for (const row of data || []) {
        const metadata = row.metadata as Record<string, any> || {}
        const query = metadata.query || row.endpoint || 'Unknown'

        analyses.push(await this.analyzeQuery(query, row.duration_ms, row.row_count || 0))
      }

      return analyses
    } catch (err) {
      console.error('Error in analyzeSlowQueries:', err)
      return []
    }
  }

  async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    if (!this.supabase) return recommendations

    try {
      const { data } = await this.supabase.rpc('get_slowest_endpoints', {
        p_hours: 24,
        p_limit: 5
      })

      for (const endpoint of data || []) {
        if (endpoint.avg_duration_ms > 500) {
          recommendations.push({
            category: 'query',
            title: `Optimize ${endpoint.endpoint}`,
            description: `Endpoint averaging ${endpoint.avg_duration_ms}ms - above target of 500ms`,
            impact: 'high',
            effort: 'medium',
            estimatedGain: `${Math.round(endpoint.avg_duration_ms * 0.4)}ms potential improvement`
          })
        }
      }

      const slowQueries = await this.analyzeSlowQueries(24, 500)
      const highCostQueries = slowQueries.filter(q => q.estimatedCost === 'high')

      if (highCostQueries.length > 0) {
        recommendations.push({
          category: 'index',
          title: 'Add missing indexes',
          description: `${highCostQueries.length} slow queries detected without proper indexes`,
          impact: 'high',
          effort: 'low',
          estimatedGain: '50-80% query time reduction'
        })
      }

      recommendations.push({
        category: 'cache',
        title: 'Implement query caching',
        description: 'Frequently accessed data should be cached to reduce DB load',
        impact: 'medium',
        effort: 'medium',
        estimatedGain: '90% reduction in repeated queries'
      })

    } catch (err) {
      console.error('Error getting optimization recommendations:', err)
    }

    return recommendations
  }
}

export const queryAnalyzer = new QueryAnalyzer()

export function createQueryAnalyzer(): QueryAnalyzer {
  return new QueryAnalyzer()
}
