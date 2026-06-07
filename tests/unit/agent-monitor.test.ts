import { agentMonitor } from '../../src/lib/health/agent-monitor'

describe('Agent Monitor', () => {
  // agentMonitor is already instantiated and exported from the module

  describe('checkAgentHealth', () => {
    it('should be a function', () => {
      expect(typeof agentMonitor.checkAgentHealth).toBe('function')
    })

    it('should throw error for unknown agent', async () => {
      await expect(agentMonitor.checkAgentHealth('Unknown Agent')).rejects.toThrow('Unknown agent')
    })
  })

  describe('Agent Types', () => {
    const agents = ['Voice AI', 'Inventory AI', 'Sales AI', 'Command Center']

    agents.forEach(agent => {
      it(`should check health for ${agent}`, async () => {
        const result = await agentMonitor.checkAgentHealth(agent)
        expect(result).toBeDefined()
        expect(result.agentName).toBe(agent)
        expect(['online', 'degraded', 'offline']).toContain(result.status)
      })
    })
  })

  describe('Health Status Types', () => {
    it('should return valid status types', async () => {
      const result = await agentMonitor.checkAgentHealth('Voice AI')
      expect(['online', 'degraded', 'offline']).toContain(result.status)
    })

    it('should include response time for online agents', async () => {
      const result = await agentMonitor.checkAgentHealth('Voice AI')
      if (result.status === 'online') {
        expect(result.responseTimeMs).toBeDefined()
      }
    })

    it('should include error message for offline agents', async () => {
      const result = await agentMonitor.checkAgentHealth('Voice AI')
      if (result.status === 'offline') {
        expect(result.errorMessage).toBeDefined()
      }
    })
  })

  describe('checkAllAgentsHealth', () => {
    it('should return results for all agents', async () => {
      const results = await agentMonitor.checkAllAgentsHealth()
      expect(results).toHaveLength(4)
    })

    it('should include all agent types', async () => {
      const results = await agentMonitor.checkAllAgentsHealth()
      const agentNames = results.map(r => r.agentName)
      expect(agentNames).toContain('Voice AI')
      expect(agentNames).toContain('Inventory AI')
      expect(agentNames).toContain('Sales AI')
      expect(agentNames).toContain('Command Center')
    })
  })
})
