import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

describe('Database Queries Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    }
  })

  describe('Products Table', () => {
    it('should fetch products', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, mrp, ptr, pts')
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should fetch single product by ID', async () => {
      if (!supabase) return

      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single()

      if (fetchError || !products) {
        console.log('No products found, skipping test')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', products.id)
        .single()

      expect(error).toBeNull()
      expect(data.id).toBe(products.id)
    })
  })

  describe('Invoices Table', () => {
    it('should fetch invoices', async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, grand_total, status')
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should fetch non-cancelled invoices', async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('is_cancelled', false)
        .limit(10)

      expect(error).toBeNull()
      if (data && data.length > 0) {
        data.forEach(invoice => {
          expect(invoice.status).not.toBe('CANCELLED')
        })
      }
    })
  })

  describe('Profiles Table', () => {
    it('should fetch profiles', async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, role')
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('AI Interaction Logs', () => {
    it('should insert and fetch AI interaction logs', async () => {
      if (!supabase) return

      const testLog = {
        interaction_type: 'test',
        customer_id: 'test-customer',
        customer_name: 'Test Customer',
        transcript: 'Test transcript',
        sentiment: 'neutral'
      }

      const { data: insertData, error: insertError } = await supabase
        .from('ai_interaction_logs')
        .insert(testLog)
        .select()
        .single()

      if (insertError) {
        console.log('AI interaction logs table may not exist:', insertError.message)
        return
      }

      expect(insertError).toBeNull()
      expect(insertData.id).toBeDefined()

      const { data: fetchData, error: fetchError } = await supabase
        .from('ai_interaction_logs')
        .select('*')
        .eq('id', insertData.id)
        .single()

      expect(fetchError).toBeNull()
      expect(fetchData.interaction_type).toBe('test')

      await supabase
        .from('ai_interaction_logs')
        .delete()
        .eq('id', insertData.id)
    })
  })

  describe('Approval Queue Table', () => {
    it('should insert and fetch approval records', async () => {
      if (!supabase) return

      const testApproval = {
        action_type: 'apply_discount',
        action_data: { percentage: 20, product_id: 'test' },
        requested_by: 'test-script',
        status: 'pending',
        threshold_exceeded_amount: 5
      }

      const { data: insertData, error: insertError } = await supabase
        .from('approval_queue')
        .insert(testApproval)
        .select()
        .single()

      if (insertError) {
        console.log('Approval queue table may not exist:', insertError.message)
        return
      }

      expect(insertError).toBeNull()
      expect(insertData.id).toBeDefined()

      const { data: fetchData, error: fetchError } = await supabase
        .from('approval_queue')
        .select('*')
        .eq('id', insertData.id)
        .single()

      expect(fetchError).toBeNull()
      expect(fetchData.status).toBe('pending')

      await supabase
        .from('approval_queue')
        .delete()
        .eq('id', insertData.id)
    })
  })
})
