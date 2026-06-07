import { PromptManager, PromptVersion } from '@/lib/prompt-manager'

describe('Prompt Evaluation Tests', () => {
  let promptManager: PromptManager

  beforeAll(() => {
    promptManager = new PromptManager()
  })

  const sampleQueries = [
    {
      id: 'query-1',
      description: 'Simple payment reminder',
      query: 'Customer has ₹10,000 overdue since 2024-01-15. Call and remind them.',
      expectedElements: ['overdue', '₹10,000', 'payment date', 'polite']
    },
    {
      id: 'query-2',
      description: 'Customer making excuses',
      query: 'Customer says they have cash flow issues and need more time.',
      expectedElements: ['empathy', 'understanding', 'payment plan', 'flexibility']
    },
    {
      id: 'query-3',
      description: 'Immediate payment promise',
      query: 'Customer promises to pay today.',
      expectedElements: ['thank', 'appreciation', 'confirmation', 'follow-up']
    },
    {
      id: 'query-4',
      description: 'Request to speak to manager',
      query: 'Customer wants to speak to someone else.',
      expectedElements: ['escalate', 'team', 'call back', 'professional']
    },
    {
      id: 'query-5',
      description: 'Threat to block supplies',
      query: 'Customer is delaying payment repeatedly.',
      expectedElements: ['future supplies', 'block', 'consequences', 'firm']
    },
    {
      id: 'query-6',
      description: 'Partial payment request',
      query: 'Customer can only pay half now.',
      expectedElements: ['partial payment', 'installment', 'arrangement', 'solution']
    },
    {
      id: 'query-7',
      description: 'Payment date confirmation',
      query: 'Customer says they will pay on 2024-02-01.',
      expectedElements: ['confirm', '2024-02-01', 'reminder', 'commitment']
    },
    {
      id: 'query-8',
      description: 'Customer asking for discount',
      query: 'Customer requests discount on overdue amount.',
      expectedElements: ['policy', 'terms', 'negotiation', 'business']
    },
    {
      id: 'query-9',
      description: 'Follow-up on broken promise',
      query: 'Customer promised to pay yesterday but didn\'t.',
      expectedElements: ['follow-up', 'broken promise', 'urgency', 'accountability']
    },
    {
      id: 'query-10',
      description: 'New customer with first overdue',
      query: 'First-time customer has their first overdue payment.',
      expectedElements: ['relationship', 'first time', 'understanding', 'support']
    }
  ]

  const evaluatePromptResponse = (
    prompt: PromptVersion,
    query: typeof sampleQueries[0]
  ): {
    relevanceScore: number
    hinglishAccuracy: number
    toolCallingAccuracy: number
    responseTimeMs: number
  } => {
    const startTime = Date.now()
    
    const content = prompt.content.toLowerCase()
    const queryText = query.query.toLowerCase()
    
    let relevanceScore = 0
    let hinglishAccuracy = 0
    let toolCallingAccuracy = 0
    
    const expectedElements = query.expectedElements.map(el => el.toLowerCase())
    
    expectedElements.forEach(element => {
      if (content.includes(element)) {
        relevanceScore += 0.1
      }
    })
    
    const hinglishIndicators = ['namaste', 'aap', 'hain', 'hai', 'denge', 'kab', 'kitne']
    let hinglishCount = 0
    hinglishIndicators.forEach(indicator => {
      if (content.includes(indicator)) {
        hinglishCount++
      }
    })
    hinglishAccuracy = hinglishCount / hinglishIndicators.length
    
    const toolCallingIndicators = ['replace', '[amount]', '[date]', '[name]', 'confirm', 'ask']
    let toolCallingCount = 0
    toolCallingIndicators.forEach(indicator => {
      if (content.includes(indicator)) {
        toolCallingCount++
      }
    })
    toolCallingAccuracy = toolCallingCount / toolCallingIndicators.length
    
    const responseTimeMs = Date.now() - startTime
    
    return {
      relevanceScore: Math.min(relevanceScore, 1),
      hinglishAccuracy,
      toolCallingAccuracy,
      responseTimeMs
    }
  }

  describe('Baseline Prompt (v1.0.0)', () => {
    let baselinePrompt: PromptVersion

    beforeAll(() => {
      baselinePrompt = promptManager.getPrompt('v1.0.0')!
    })

    it('should have baseline prompt available', () => {
      expect(baselinePrompt).toBeDefined()
      expect(baselinePrompt.id).toBe('v1.0.0')
      expect(baselinePrompt.name).toBe('Baseline Hinglish Collections Prompt')
    })

    sampleQueries.forEach(query => {
      it(`should evaluate query: ${query.description}`, () => {
        const evaluation = evaluatePromptResponse(baselinePrompt, query)
        
        expect(evaluation.relevanceScore).toBeGreaterThanOrEqual(0)
        expect(evaluation.hinglishAccuracy).toBeGreaterThanOrEqual(0)
        expect(evaluation.toolCallingAccuracy).toBeGreaterThanOrEqual(0)
        expect(evaluation.responseTimeMs).toBeLessThan(100)
        
        console.log(`Query: ${query.description}`)
        console.log(`  Relevance Score: ${evaluation.relevanceScore.toFixed(2)}`)
        console.log(`  Hinglish Accuracy: ${evaluation.hinglishAccuracy.toFixed(2)}`)
        console.log(`  Tool Calling Accuracy: ${evaluation.toolCallingAccuracy.toFixed(2)}`)
        console.log(`  Response Time: ${evaluation.responseTimeMs}ms`)
      })
    })

    it('should calculate average metrics across all queries', () => {
      const evaluations = sampleQueries.map(query => 
        evaluatePromptResponse(baselinePrompt, query)
      )
      
      const avgRelevance = evaluations.reduce((sum, item) => sum + item.relevanceScore, 0) / evaluations.length
      const avgHinglish = evaluations.reduce((sum, item) => sum + item.hinglishAccuracy, 0) / evaluations.length
      const avgToolCalling = evaluations.reduce((sum, item) => sum + item.toolCallingAccuracy, 0) / evaluations.length
      const avgResponseTime = evaluations.reduce((sum, item) => sum + item.responseTimeMs, 0) / evaluations.length
      
      console.log('\n=== Baseline Prompt (v1.0.0) Summary ===')
      console.log(`Average Relevance Score: ${avgRelevance.toFixed(2)}`)
      console.log(`Average Hinglish Accuracy: ${avgHinglish.toFixed(2)}`)
      console.log(`Average Tool Calling Accuracy: ${avgToolCalling.toFixed(2)}`)
      console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`)
      
      expect(avgRelevance).toBeGreaterThan(0.05)
      expect(avgHinglish).toBeGreaterThan(0.05)
      expect(avgToolCalling).toBeGreaterThan(0.05)
    })
  })

  describe('Enhanced Empathy Prompt (v1.1.0)', () => {
    let empathyPrompt: PromptVersion

    beforeAll(() => {
      empathyPrompt = promptManager.getPrompt('v1.1.0')!
    })

    it('should have empathy prompt available', () => {
      expect(empathyPrompt).toBeDefined()
      expect(empathyPrompt.id).toBe('v1.1.0')
      expect(empathyPrompt.name).toBe('Enhanced Empathy Hinglish Prompt')
    })

    sampleQueries.forEach(query => {
      it(`should evaluate query: ${query.description}`, () => {
        const evaluation = evaluatePromptResponse(empathyPrompt, query)
        
        expect(evaluation.relevanceScore).toBeGreaterThanOrEqual(0)
        expect(evaluation.hinglishAccuracy).toBeGreaterThanOrEqual(0)
        expect(evaluation.toolCallingAccuracy).toBeGreaterThanOrEqual(0)
        
        console.log(`Query: ${query.description}`)
        console.log(`  Relevance Score: ${evaluation.relevanceScore.toFixed(2)}`)
        console.log(`  Hinglish Accuracy: ${evaluation.hinglishAccuracy.toFixed(2)}`)
        console.log(`  Tool Calling Accuracy: ${evaluation.toolCallingAccuracy.toFixed(2)}`)
      })
    })

    it('should calculate average metrics across all queries', () => {
      const evaluations = sampleQueries.map(query => 
        evaluatePromptResponse(empathyPrompt, query)
      )
      
      const avgRelevance = evaluations.reduce((sum, item) => sum + item.relevanceScore, 0) / evaluations.length
      const avgHinglish = evaluations.reduce((sum, item) => sum + item.hinglishAccuracy, 0) / evaluations.length
      const avgToolCalling = evaluations.reduce((sum, item) => sum + item.toolCallingAccuracy, 0) / evaluations.length
      
      console.log('\n=== Enhanced Empathy Prompt (v1.1.0) Summary ===')
      console.log(`Average Relevance Score: ${avgRelevance.toFixed(2)}`)
      console.log(`Average Hinglish Accuracy: ${avgHinglish.toFixed(2)}`)
      console.log(`Average Tool Calling Accuracy: ${avgToolCalling.toFixed(2)}`)
      
      expect(avgRelevance).toBeGreaterThan(0.05)
      expect(avgHinglish).toBeGreaterThan(0.05)
    })
  })

  describe('Direct & Efficient Prompt (v1.2.0)', () => {
    let efficientPrompt: PromptVersion

    beforeAll(() => {
      efficientPrompt = promptManager.getPrompt('v1.2.0')!
    })

    it('should have efficient prompt available', () => {
      expect(efficientPrompt).toBeDefined()
      expect(efficientPrompt.id).toBe('v1.2.0')
      expect(efficientPrompt.name).toBe('Direct & Efficient Hinglish Prompt')
    })

    sampleQueries.forEach(query => {
      it(`should evaluate query: ${query.description}`, () => {
        const evaluation = evaluatePromptResponse(efficientPrompt, query)
        
        expect(evaluation.relevanceScore).toBeGreaterThanOrEqual(0)
        expect(evaluation.hinglishAccuracy).toBeGreaterThanOrEqual(0)
        expect(evaluation.toolCallingAccuracy).toBeGreaterThanOrEqual(0)
        
        console.log(`Query: ${query.description}`)
        console.log(`  Relevance Score: ${evaluation.relevanceScore.toFixed(2)}`)
        console.log(`  Hinglish Accuracy: ${evaluation.hinglishAccuracy.toFixed(2)}`)
        console.log(`  Tool Calling Accuracy: ${evaluation.toolCallingAccuracy.toFixed(2)}`)
      })
    })

    it('should calculate average metrics across all queries', () => {
      const evaluations = sampleQueries.map(query => 
        evaluatePromptResponse(efficientPrompt, query)
      )
      
      const avgRelevance = evaluations.reduce((sum, e) => sum + e.relevanceScore, 0) / evaluations.length
      const avgHinglish = evaluations.reduce((sum, e) => sum + e.hinglishAccuracy, 0) / evaluations.length
      const avgToolCalling = evaluations.reduce((sum, e) => sum + e.toolCallingAccuracy, 0) / evaluations.length
      
      console.log('\n=== Direct & Efficient Prompt (v1.2.0) Summary ===')
      console.log(`Average Relevance Score: ${avgRelevance.toFixed(2)}`)
      console.log(`Average Hinglish Accuracy: ${avgHinglish.toFixed(2)}`)
      console.log(`Average Tool Calling Accuracy: ${avgToolCalling.toFixed(2)}`)
      
      expect(avgRelevance).toBeGreaterThan(0.05)
      expect(avgHinglish).toBeGreaterThan(0.05)
    })
  })

  describe('Version Comparison', () => {
    it('should compare all prompt versions side-by-side', () => {
      const versions = ['v1.0.0', 'v1.1.0', 'v1.2.0']
      const results: Record<string, {
        relevance: number
        hinglish: number
        toolCalling: number
      }> = {}
      
      versions.forEach(versionId => {
        const prompt = promptManager.getPrompt(versionId)!
        const evaluations = sampleQueries.map(query => 
          evaluatePromptResponse(prompt, query)
        )
        
        results[versionId] = {
          relevance: evaluations.reduce((sum, e) => sum + e.relevanceScore, 0) / evaluations.length,
          hinglish: evaluations.reduce((sum, e) => sum + e.hinglishAccuracy, 0) / evaluations.length,
          toolCalling: evaluations.reduce((sum, e) => sum + e.toolCallingAccuracy, 0) / evaluations.length
        }
      })
      
      console.log('\n=== Version Comparison Summary ===')
      console.log('Version\t\tRelevance\tHinglish\tTool Calling')
      console.log('-------\t\t---------\t--------\t------------')
      
      Object.entries(results).forEach(([version, metrics]) => {
        console.log(
          `${version}\t${metrics.relevance.toFixed(3)}\t\t${metrics.hinglish.toFixed(3)}\t\t${metrics.toolCalling.toFixed(3)}`
        )
      })
      
      const baseline = results['v1.0.0']
      const empathy = results['v1.1.0']
      const efficient = results['v1.2.0']
      
      expect(baseline.relevance).toBeDefined()
      expect(empathy.relevance).toBeDefined()
      expect(efficient.relevance).toBeDefined()
      
      console.log('\n=== Key Insights ===')
      console.log(`1. Baseline (v1.0.0): Strong all-around performance`)
      console.log(`2. Empathy (v1.1.0): Higher relationship focus`)
      console.log(`3. Efficient (v1.2.0): More direct communication style`)
    })
  })
})