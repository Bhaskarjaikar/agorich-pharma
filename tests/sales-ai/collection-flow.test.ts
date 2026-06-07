import { ARTestDataSeeder } from './seed-overdue-data'

describe('AR Collection Flow Tests', () => {
  let testData: any

  beforeAll(async () => {
    const seeder = new ARTestDataSeeder()
    testData = await seeder.seedTestData()
  })

  describe('Complete Collection Cycle Simulation', () => {
    it('should simulate alert generation for overdue invoices', () => {
      const generateAlerts = (invoices: any[]) => {
        const alerts = []
        
        for (const invoice of invoices) {
          let alertType = ''
          let severity = ''
          
          if (invoice.daysOverdue <= 7) {
            alertType = 'REMINDER'
            severity = 'LOW'
          } else if (invoice.daysOverdue <= 30) {
            alertType = 'WARNING'
            severity = 'MEDIUM'
          } else if (invoice.daysOverdue <= 60) {
            alertType = 'URGENT'
            severity = 'HIGH'
          } else {
            alertType = 'CRITICAL'
            severity = 'CRITICAL'
          }
          
          alerts.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.retailerId,
            amount: invoice.totalAmount,
            daysOverdue: invoice.daysOverdue,
            alertType,
            severity,
            generatedAt: new Date().toISOString()
          })
        }
        
        return alerts
      }

      const alerts = generateAlerts(testData.invoices)
      
      expect(alerts.length).toBe(testData.invoices.length)
      
      // Verify alert classification
      alerts.forEach(alert => {
        expect(alert.alertType).toBeDefined()
        expect(alert.severity).toBeDefined()
        
        if (alert.daysOverdue <= 7) {
          expect(alert.alertType).toBe('REMINDER')
          expect(alert.severity).toBe('LOW')
        } else if (alert.daysOverdue <= 30) {
          expect(alert.alertType).toBe('WARNING')
          expect(alert.severity).toBe('MEDIUM')
        } else if (alert.daysOverdue <= 60) {
          expect(alert.alertType).toBe('URGENT')
          expect(alert.severity).toBe('HIGH')
        } else {
          expect(alert.alertType).toBe('CRITICAL')
          expect(alert.severity).toBe('CRITICAL')
        }
      })
    })

    it('should simulate VAPI call trigger for high-priority alerts', () => {
      const triggerVAPICalls = (alerts: any[]) => {
        const calls = []
        
        // Filter high priority alerts (URGENT and CRITICAL)
        const highPriorityAlerts = alerts.filter(alert => 
          alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
        )
        
        for (const alert of highPriorityAlerts) {
          const customer = testData.customers.find((c: any) => c.id === alert.customerId)
          
          if (!customer) continue
          
          calls.push({
            callId: `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            customerId: customer.id,
            customerName: customer.name,
            phone: customer.mobile,
            amount: alert.amount,
            daysOverdue: alert.daysOverdue,
            alertType: alert.alertType,
            triggeredAt: new Date().toISOString(),
            status: 'QUEUED'
          })
        }
        
        return calls
      }

      // Generate alerts first
      const generateAlerts = (invoices: any[]) => {
        return invoices.map(invoice => ({
          invoiceId: invoice.id,
          customerId: invoice.retailerId,
          amount: invoice.totalAmount,
          daysOverdue: invoice.daysOverdue,
          alertType: invoice.daysOverdue > 30 ? 'URGENT' : 'WARNING',
          severity: invoice.daysOverdue > 30 ? 'HIGH' : 'MEDIUM'
        }))
      }

      const alerts = generateAlerts(testData.invoices)
      const vapiCalls = triggerVAPICalls(alerts)
      
      // Verify calls were triggered for high priority alerts
      const highPriorityCount = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length
      expect(vapiCalls.length).toBeGreaterThan(0)
      expect(vapiCalls.length).toBeLessThanOrEqual(highPriorityCount)
      
      // Verify call structure
      vapiCalls.forEach(call => {
        expect(call.callId).toContain('call-')
        expect(call.customerId).toBeDefined()
        expect(call.phone).toBeDefined()
        expect(call.amount).toBeGreaterThan(0)
        expect(['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).toContain(call.status)
      })
    })

    it('should simulate call completion webhook processing', () => {
      const processCallCompletion = (callData: any, transcript: string) => {
        // Simulate sentiment analysis
        let sentiment = 'NEUTRAL'
        const positiveWords = ['today', 'tomorrow', 'promise', 'sure', 'okay', 'will pay', 'can pay']
        const negativeWords = ['cannot', 'won\'t', 'no money', 'later', 'busy', 'problem', 'cannot pay']
        
        const lowerTranscript = transcript.toLowerCase()
        
        // Count positive and negative word matches
        const positiveCount = positiveWords.filter(word => lowerTranscript.includes(word)).length
        const negativeCount = negativeWords.filter(word => lowerTranscript.includes(word)).length
        
        if (positiveCount > negativeCount) {
          sentiment = 'POSITIVE'
        } else if (negativeCount > positiveCount) {
          sentiment = 'NEGATIVE'
        }
        
        // Extract promised payment date
        let promisedDate = null
        const datePatterns = [
          /\b(today|aaj)\b/i,
          /\b(tomorrow|kal)\b/i,
          /\b(this week|is hafte)\b/i,
          /\b(next week|agli hafte)\b/i,
          /\b(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i
        ]
        
        for (const pattern of datePatterns) {
          if (pattern.test(transcript)) {
            const match = transcript.match(pattern)
            if (match) {
              promisedDate = new Date()
              if (match[0].toLowerCase().includes('tomorrow') || match[0].toLowerCase().includes('kal')) {
                promisedDate.setDate(promisedDate.getDate() + 1)
              } else if (match[0].toLowerCase().includes('next week') || match[0].toLowerCase().includes('agli hafte')) {
                promisedDate.setDate(promisedDate.getDate() + 7)
              }
              break
            }
          }
        }
        
        return {
          callId: callData.callId,
          customerId: callData.customerId,
          transcript,
          sentiment,
          promisedPaymentDate: promisedDate ? promisedDate.toISOString().split('T')[0] : null,
          callDuration: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
          processedAt: new Date().toISOString(),
          status: 'PROCESSED'
        }
      }

      // Create a mock call
      const mockCall = {
        callId: 'call-test-123',
        customerId: testData.customers[0].id,
        customerName: testData.customers[0].name,
        phone: testData.customers[0].mobile,
        amount: 5000,
        daysOverdue: 45
      }

      // Test with positive transcript
      const positiveTranscript = "Yes, I will pay today. Thank you for reminding me."
      const positiveResult = processCallCompletion(mockCall, positiveTranscript)
      
      expect(positiveResult.sentiment).toBe('POSITIVE')
      expect(positiveResult.promisedPaymentDate).toBe(new Date().toISOString().split('T')[0])
      expect(positiveResult.callDuration).toBeGreaterThanOrEqual(30)
      
      // Test with negative transcript
      const negativeTranscript = "I cannot pay now, I have no money. Maybe next week."
      const negativeResult = processCallCompletion(mockCall, negativeTranscript)
      
      expect(negativeResult.sentiment).toBe('NEGATIVE')
      expect(negativeResult.promisedPaymentDate).toBeDefined()
      
      // Test with neutral transcript
      const neutralTranscript = "I need to check my records first."
      const neutralResult = processCallCompletion(mockCall, neutralTranscript)
      
      expect(neutralResult.sentiment).toBe('NEUTRAL')
    })

    it('should simulate payment promise recording', () => {
      const recordPaymentPromise = (webhookData: any) => {
        const promises = []
        
        if (webhookData.promisedPaymentDate) {
          const promise = {
            promiseId: `promise-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            customerId: webhookData.customerId,
            callId: webhookData.callId,
            promisedAmount: webhookData.amount || 0,
            promisedDate: webhookData.promisedPaymentDate,
            sentiment: webhookData.sentiment,
            status: 'PENDING',
            recordedAt: new Date().toISOString(),
            followUpDate: calculateFollowUpDate(webhookData.promisedPaymentDate, webhookData.sentiment)
          }
          
          promises.push(promise)
        }
        
        return promises
      }

      const calculateFollowUpDate = (promisedDate: string, sentiment: string): string => {
        const date = new Date(promisedDate)
        
        switch(sentiment) {
          case 'POSITIVE':
            // Follow up on promised date
            return date.toISOString().split('T')[0]
          case 'NEUTRAL':
            // Follow up 2 days before promised date
            date.setDate(date.getDate() - 2)
            return date.toISOString().split('T')[0]
          case 'NEGATIVE':
            // Follow up 3 days before promised date
            date.setDate(date.getDate() - 3)
            return date.toISOString().split('T')[0]
          default:
            return date.toISOString().split('T')[0]
        }
      }

      // Test with positive promise
      const positiveWebhook = {
        callId: 'call-123',
        customerId: 'cust-001',
        amount: 5000,
        promisedPaymentDate: '2024-12-25',
        sentiment: 'POSITIVE'
      }

      const positivePromises = recordPaymentPromise(positiveWebhook)
      expect(positivePromises.length).toBe(1)
      expect(positivePromises[0].followUpDate).toBe('2024-12-25')
      expect(positivePromises[0].status).toBe('PENDING')
      
      // Test with negative promise
      const negativeWebhook = {
        callId: 'call-124',
        customerId: 'cust-002',
        amount: 3000,
        promisedPaymentDate: '2024-12-28',
        sentiment: 'NEGATIVE'
      }

      const negativePromises = recordPaymentPromise(negativeWebhook)
      expect(negativePromises.length).toBe(1)
      expect(negativePromises[0].followUpDate).toBe('2024-12-25') // 3 days before
    })

    it('should simulate follow-up scheduling', () => {
      const scheduleFollowUps = (promises: any[]) => {
        const followUps = []
        
        for (const promise of promises) {
          const followUp = {
            followUpId: `followup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            promiseId: promise.promiseId,
            customerId: promise.customerId,
            scheduledDate: promise.followUpDate,
            type: 'REMINDER_CALL',
            priority: calculateFollowUpPriority(promise.sentiment, promise.promisedAmount),
            status: 'SCHEDULED',
            createdAt: new Date().toISOString()
          }
          
          followUps.push(followUp)
        }
        
        return followUps
      }

      const calculateFollowUpPriority = (sentiment: string, amount: number): string => {
        if (amount > 25000) return 'HIGH'
        if (sentiment === 'NEGATIVE') return 'HIGH'
        if (sentiment === 'NEUTRAL' && amount > 10000) return 'MEDIUM'
        return 'LOW'
      }

      // Create test promises
      const testPromises = [
        {
          promiseId: 'promise-1',
          customerId: 'cust-001',
          promisedAmount: 50000,
          promisedDate: '2024-12-25',
          sentiment: 'POSITIVE',
          followUpDate: '2024-12-25'
        },
        {
          promiseId: 'promise-2',
          customerId: 'cust-002',
          promisedAmount: 8000,
          promisedDate: '2024-12-28',
          sentiment: 'NEGATIVE',
          followUpDate: '2024-12-25'
        },
        {
          promiseId: 'promise-3',
          customerId: 'cust-003',
          promisedAmount: 15000,
          promisedDate: '2024-12-30',
          sentiment: 'NEUTRAL',
          followUpDate: '2024-12-28'
        }
      ]

      const followUps = scheduleFollowUps(testPromises)
      
      expect(followUps.length).toBe(testPromises.length)
      
      // Verify priority calculations
      expect(followUps[0].priority).toBe('HIGH') // High amount
      expect(followUps[1].priority).toBe('HIGH') // Negative sentiment
      expect(followUps[2].priority).toBe('MEDIUM') // Neutral sentiment with amount > 10000
    })
  })

  describe('Edge Cases Testing', () => {
    it('should handle payment made before call scenario', () => {
      const checkPaymentBeforeCall = (invoiceId: string, payments: any[]): boolean => {
        // Simulate checking if payment was made
        const payment = payments.find(p => p.invoiceId === invoiceId && p.status === 'COMPLETED')
        return !!payment
      }

      const testPayments = [
        { invoiceId: 'inv-001', amount: 5000, status: 'COMPLETED', date: '2024-12-20' },
        { invoiceId: 'inv-002', amount: 3000, status: 'PENDING', date: '2024-12-25' }
      ]

      // Invoice with payment completed
      const invoice1Paid = checkPaymentBeforeCall('inv-001', testPayments)
      expect(invoice1Paid).toBe(true)
      
      // Invoice with pending payment
      const invoice2Paid = checkPaymentBeforeCall('inv-002', testPayments)
      expect(invoice2Paid).toBe(false)
      
      // Non-existent invoice
      const invoice3Paid = checkPaymentBeforeCall('inv-003', testPayments)
      expect(invoice3Paid).toBe(false)
    })

    it('should handle invalid phone number scenario', () => {
      const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
        if (!phone) {
          return { isValid: false, error: 'Phone number is required' }
        }
        
        // Basic validation for Indian numbers
        const cleaned = phone.replace(/\D/g, '')
        
        if (cleaned.length < 10) {
          return { isValid: false, error: 'Phone number too short' }
        }
        
        if (cleaned.length > 13) {
          return { isValid: false, error: 'Phone number too long' }
        }
        
        // Check if it starts with valid Indian prefix
        if (!cleaned.match(/^[6-9]/)) {
          return { isValid: false, error: 'Invalid Indian phone number format' }
        }
        
        return { isValid: true }
      }

      // Test cases
      const testCases = [
        { phone: '+919876543210', expectedValid: true },
        { phone: '9876543210', expectedValid: true },
        { phone: '1234567890', expectedValid: false, expectedError: 'Invalid Indian phone number format' },
        { phone: '123', expectedValid: false, expectedError: 'Phone number too short' },
        { phone: '', expectedValid: false, expectedError: 'Phone number is required' },
        { phone: '98765432101234', expectedValid: false, expectedError: 'Phone number too long' }
      ]

      testCases.forEach(testCase => {
        const result = validatePhoneNumber(testCase.phone)
        expect(result.isValid).toBe(testCase.expectedValid)
        
        if (testCase.expectedError) {
          expect(result.error).toContain(testCase.expectedError)
        }
      })
    })

    it('should handle customer already contacted scenario', () => {
      const checkRecentContact = (customerId: string, contactLogs: any[], daysThreshold: number = 7): boolean => {
        const customerContacts = contactLogs.filter(log => 
          log.customerId === customerId && log.type === 'COLLECTION_CALL'
        )
        
        if (customerContacts.length === 0) return false
        
        const latestContact = customerContacts.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
        
        const daysSinceContact = (Date.now() - new Date(latestContact.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        
        return daysSinceContact < daysThreshold
      }

      const mockContactLogs = [
        { customerId: 'cust-001', type: 'COLLECTION_CALL', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }, // 3 days ago
        { customerId: 'cust-002', type: 'COLLECTION_CALL', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
        { customerId: 'cust-001', type: 'SUPPORT_CALL', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() } // 1 day ago (different type)
      ]

      // Customer contacted 3 days ago (within threshold)
      const cust1RecentlyContacted = checkRecentContact('cust-001', mockContactLogs, 7)
      expect(cust1RecentlyContacted).toBe(true)
      
      // Customer contacted 10 days ago (outside threshold)
      const cust2RecentlyContacted = checkRecentContact('cust-002', mockContactLogs, 7)
      expect(cust2RecentlyContacted).toBe(false)
      
      // Customer never contacted
      const cust3RecentlyContacted = checkRecentContact('cust-003', mockContactLogs, 7)
      expect(cust3RecentlyContacted).toBe(false)
    })

    it('should handle multiple overdue invoices for same customer', () => {
      const aggregateCustomerOverdue = (invoices: any[]) => {
        const customerAggregates = new Map()
        
        for (const invoice of invoices) {
          const customerId = invoice.retailerId
          
          if (!customerAggregates.has(customerId)) {
            customerAggregates.set(customerId, {
              customerId,
              totalAmount: 0,
              invoiceCount: 0,
              maxDaysOverdue: 0,
              avgDaysOverdue: 0,
              invoices: []
            })
          }
          
          const aggregate = customerAggregates.get(customerId)
          aggregate.totalAmount += invoice.totalAmount
          aggregate.invoiceCount += 1
          aggregate.maxDaysOverdue = Math.max(aggregate.maxDaysOverdue, invoice.daysOverdue)
          aggregate.invoices.push(invoice)
        }
        
        // Calculate averages
        for (const aggregate of customerAggregates.values()) {
          const totalDays = aggregate.invoices.reduce((sum: number, inv: any) => sum + inv.daysOverdue, 0)
          aggregate.avgDaysOverdue = totalDays / aggregate.invoiceCount
        }
        
        return Array.from(customerAggregates.values())
      }

      const customerAggregates = aggregateCustomerOverdue(testData.invoices)
      
      // Verify all customers with invoices are included
      const customersWithInvoices = new Set(testData.invoices.map((inv: any) => inv.retailerId))
      expect(customerAggregates.length).toBe(customersWithInvoices.size)
      
      // Verify aggregation calculations
      customerAggregates.forEach(aggregate => {
        expect(aggregate.totalAmount).toBeGreaterThan(0)
        expect(aggregate.invoiceCount).toBeGreaterThan(0)
        expect(aggregate.maxDaysOverdue).toBeGreaterThanOrEqual(0)
        expect(aggregate.avgDaysOverdue).toBeGreaterThanOrEqual(0)
        
        // Verify total amount matches sum of invoices
        const calculatedTotal = aggregate.invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0)
        expect(aggregate.totalAmount).toBe(calculatedTotal)
      })
    })

    it('should handle call failure and retry logic', () => {
      const handleCallFailure = (callResult: any, retryCount: number): { shouldRetry: boolean; nextAttempt?: Date; reason?: string } => {
        if (callResult.success) {
          return { shouldRetry: false }
        }
        
        // Check if max retries reached
        if (retryCount >= 3) {
          return { 
            shouldRetry: false, 
            reason: 'Max retry attempts reached' 
          }
        }
        
        // Analyze failure reason
        const error = callResult.error?.toLowerCase() || ''
        
        if (error.includes('busy') || error.includes('no answer')) {
          // Retry after 1 hour
          const nextAttempt = new Date(Date.now() + 60 * 60 * 1000)
          return { 
            shouldRetry: true, 
            nextAttempt,
            reason: 'Temporary failure, will retry'
          }
        } else if (error.includes('invalid phone') || error.includes('disconnected')) {
          // Permanent failure, no retry
          return { 
            shouldRetry: false, 
            reason: 'Permanent failure, no retry'
          }
        } else {
          // Unknown error, retry with exponential backoff
          const backoffMinutes = Math.pow(2, retryCount) * 30 // 30, 60, 120 minutes
          const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000)
          return { 
            shouldRetry: true, 
            nextAttempt,
            reason: 'Unknown error, exponential backoff'
          }
        }
      }

      // Test temporary failure
      const busyCall = { success: false, error: 'Line busy' }
      const busyResult = handleCallFailure(busyCall, 0)
      expect(busyResult.shouldRetry).toBe(true)
      expect(busyResult.nextAttempt).toBeDefined()
      expect(busyResult.reason).toContain('Temporary failure')
      
      // Test permanent failure
      const invalidCall = { success: false, error: 'Invalid phone number' }
      const invalidResult = handleCallFailure(invalidCall, 0)
      expect(invalidResult.shouldRetry).toBe(false)
      expect(invalidResult.reason).toContain('Permanent failure')
      
      // Test max retries
      const maxRetryCall = { success: false, error: 'Busy' }
      const maxRetryResult = handleCallFailure(maxRetryCall, 3)
      expect(maxRetryResult.shouldRetry).toBe(false)
      expect(maxRetryResult.reason).toContain('Max retry')
      
      // Test unknown error with exponential backoff
      const unknownCall = { success: false, error: 'Unknown error' }
      const unknownResult1 = handleCallFailure(unknownCall, 0)
      expect(unknownResult1.shouldRetry).toBe(true)
      
      const unknownResult2 = handleCallFailure(unknownCall, 1)
      expect(unknownResult2.shouldRetry).toBe(true)
      
      const unknownResult3 = handleCallFailure(unknownCall, 2)
      expect(unknownResult3.shouldRetry).toBe(true)
    })
  })

  describe('End-to-End Collection Flow', () => {
    it('should simulate complete collection cycle from alert to follow-up', () => {
      // Step 1: Generate alerts
      const generateAlerts = (invoices: any[]) => {
        return invoices.map(invoice => ({
          invoiceId: invoice.id,
          customerId: invoice.retailerId,
          amount: invoice.totalAmount,
          daysOverdue: invoice.daysOverdue,
          alertType: invoice.daysOverdue > 30 ? 'URGENT' : 'WARNING',
          severity: invoice.daysOverdue > 30 ? 'HIGH' : 'MEDIUM',
          generatedAt: new Date().toISOString()
        }))
      }

      // Step 2: Trigger VAPI calls for high priority alerts
      const triggerVAPICalls = (alerts: any[]) => {
        const highPriority = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL')
        return highPriority.map(alert => {
          const customer = testData.customers.find((c: any) => c.id === alert.customerId)
          return {
            callId: `call-${Date.now()}-${alert.invoiceId}`,
            customerId: customer.id,
            customerName: customer.name,
            phone: customer.mobile,
            amount: alert.amount,
            alertType: alert.alertType,
            triggeredAt: new Date().toISOString(),
            status: 'COMPLETED'
          }
        })
      }

      // Step 3: Process call completion
      const processCallCompletion = (call: any) => {
        return {
          callId: call.callId,
          customerId: call.customerId,
          transcript: 'Customer promised to pay by end of week',
          sentiment: 'POSITIVE',
          promisedPaymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          processedAt: new Date().toISOString()
        }
      }

      // Step 4: Record payment promise
      const recordPaymentPromise = (webhookData: any) => {
        return {
          promiseId: `promise-${webhookData.callId}`,
          customerId: webhookData.customerId,
          callId: webhookData.callId,
          promisedAmount: webhookData.amount,
          promisedDate: webhookData.promisedPaymentDate,
          sentiment: webhookData.sentiment,
          status: 'PENDING',
          recordedAt: new Date().toISOString()
        }
      }

      // Step 5: Schedule follow-up
      const scheduleFollowUp = (promise: any) => {
        return {
          followUpId: `followup-${promise.promiseId}`,
          promiseId: promise.promiseId,
          customerId: promise.customerId,
          scheduledDate: promise.promisedDate,
          type: 'REMINDER_CALL',
          priority: 'MEDIUM',
          status: 'SCHEDULED',
          createdAt: new Date().toISOString()
        }
      }

      // Execute the complete flow
      const alerts = generateAlerts(testData.invoices.slice(0, 5)) // Test with 5 invoices
      const calls = triggerVAPICalls(alerts)
      const webhookData = processCallCompletion(calls[0])
      const promise = recordPaymentPromise(webhookData)
      const followUp = scheduleFollowUp(promise)

      // Verify the flow
      expect(alerts.length).toBe(5)
      expect(calls.length).toBeGreaterThan(0)
      expect(webhookData.promisedPaymentDate).toBeDefined()
      expect(promise.status).toBe('PENDING')
      expect(followUp.type).toBe('REMINDER_CALL')
      
      // Verify data consistency
      expect(webhookData.callId).toBe(calls[0].callId)
      expect(promise.callId).toBe(webhookData.callId)
      expect(followUp.promiseId).toBe(promise.promiseId)
      expect(followUp.scheduledDate).toBe(promise.promisedDate)
    })

    it('should track collection metrics throughout the cycle', () => {
      const trackCollectionMetrics = (events: any[]) => {
        const metrics = {
          totalAlerts: 0,
          callsTriggered: 0,
          callsCompleted: 0,
          callsFailed: 0,
          promisesRecorded: 0,
          followUpsScheduled: 0,
          totalAmount: 0,
          avgDaysOverdue: 0
        }
        
        let totalDays = 0
        let invoiceCount = 0
        
        events.forEach(event => {
          switch(event.type) {
            case 'ALERT_GENERATED':
              metrics.totalAlerts++
              metrics.totalAmount += event.amount || 0
              totalDays += event.daysOverdue || 0
              invoiceCount++
              break
            case 'CALL_TRIGGERED':
              metrics.callsTriggered++
              break
            case 'CALL_COMPLETED':
              metrics.callsCompleted++
              break
            case 'CALL_FAILED':
              metrics.callsFailed++
              break
            case 'PROMISE_RECORDED':
              metrics.promisesRecorded++
              break
            case 'FOLLOWUP_SCHEDULED':
              metrics.followUpsScheduled++
              break
          }
        })
        
        metrics.avgDaysOverdue = invoiceCount > 0 ? totalDays / invoiceCount : 0
        
        return metrics
      }

      // Simulate collection events
      const mockEvents = [
        { type: 'ALERT_GENERATED', amount: 5000, daysOverdue: 30 },
        { type: 'ALERT_GENERATED', amount: 3000, daysOverdue: 45 },
        { type: 'CALL_TRIGGERED' },
        { type: 'CALL_COMPLETED' },
        { type: 'PROMISE_RECORDED' },
        { type: 'FOLLOWUP_SCHEDULED' },
        { type: 'ALERT_GENERATED', amount: 7000, daysOverdue: 60 },
        { type: 'CALL_TRIGGERED' },
        { type: 'CALL_FAILED' }
      ]

      const metrics = trackCollectionMetrics(mockEvents)
      
      expect(metrics.totalAlerts).toBe(3)
      expect(metrics.callsTriggered).toBe(2)
      expect(metrics.callsCompleted).toBe(1)
      expect(metrics.callsFailed).toBe(1)
      expect(metrics.promisesRecorded).toBe(1)
      expect(metrics.followUpsScheduled).toBe(1)
      expect(metrics.totalAmount).toBe(15000)
      expect(metrics.avgDaysOverdue).toBe(45) // (30 + 45 + 60) / 3
    })
  })
})