#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

// Mock faker functions for test data generation
const faker = {
  string: {
    uuid: () => `test-uuid-${Math.random().toString(36).substring(2, 15)}`,
    alphanumeric: (length: number) => Array.from({ length }, () => Math.random().toString(36).charAt(2)).join(''),
    word: () => `word${Math.floor(Math.random() * 1000)}`,
  },
  number: {
    int: (options: { min: number; max: number }) => Math.floor(Math.random() * (options.max - options.min + 1)) + options.min,
    float: (options: { min: number; max: number }) => Math.random() * (options.max - options.min) + options.min,
  },
  date: {
    past: (options: { days: number }) => new Date(Date.now() - Math.random() * options.days * 24 * 60 * 60 * 1000),
    future: (options: { days: number }) => new Date(Date.now() + Math.random() * options.days * 24 * 60 * 60 * 1000),
  },
  person: {
    firstName: () => `Customer${Math.floor(Math.random() * 1000)}`,
    lastName: () => `Last${Math.floor(Math.random() * 1000)}`,
    fullName: () => `Customer${Math.floor(Math.random() * 1000)} Last${Math.floor(Math.random() * 1000)}`,
  },
  company: {
    name: () => `Pharma Store ${Math.floor(Math.random() * 1000)}`,
  },
  phone: {
    number: () => `9${Math.floor(Math.random() * 900000000) + 100000000}`,
  },
  helpers: {
    arrayElement: <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)],
  },
}

interface TestCustomer {
  id: string
  email: string
  name: string
  mobile: string
  role: string
  status: string
  gstNumber?: string
  dlNumber?: string
  address?: string
  territory?: string
  risk_score?: number
}

interface TestInvoice {
  id: string
  invoiceNumber: string
  retailerId: string
  distributorId: string
  status: string
  paymentStatus: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  dueDate: Date
  createdAt: Date
  daysOverdue: number
}

class ARTestDataSeeder {
  private supabase: any
  private testData: {
    customers: TestCustomer[]
    invoices: TestInvoice[]
  } = {
    customers: [],
    invoices: []
  }

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  async seedTestData() {
    console.log('🌱 Starting AR collections test data seeding...')
    
    try {
      // Step 1: Create 30 test customers
      await this.createTestCustomers()
      
      // Step 2: Create 50 overdue invoices with varying conditions
      await this.createOverdueInvoices()
      
      // Step 3: Log all test data
      this.logTestData()
      
      console.log('✅ AR test data seeding completed successfully!')
      console.log(`📊 Created: ${this.testData.customers.length} customers, ${this.testData.invoices.length} invoices`)
      
      return this.testData
      
    } catch (error) {
      console.error('❌ Error seeding test data:', error)
      throw error
    }
  }

  private async createTestCustomers() {
    console.log('👥 Creating 30 test customers...')
    
    const distributorId = faker.string.uuid()
    
    for (let i = 1; i <= 30; i++) {
      const customer: TestCustomer = {
        id: faker.string.uuid(),
        email: `customer${i}@test.com`,
        name: faker.person.fullName(),
        mobile: faker.phone.number(),
        role: 'RETAILER',
        status: 'ACTIVE',
        gstNumber: `GST${Math.floor(Math.random() * 1000000)}`,
        dlNumber: `DL${Math.floor(Math.random() * 1000000)}`,
        address: `Test Address ${i}, City ${i}`,
        territory: faker.helpers.arrayElement(['North', 'South', 'East', 'West']),
        risk_score: faker.number.int({ min: 1, max: 100 })
      }
      
      this.testData.customers.push(customer)
      
      // In a real scenario, we would insert into database
      // await this.supabase.from('users').insert(customer)
    }
    
    console.log(`✅ Created ${this.testData.customers.length} test customers`)
  }

  private async createOverdueInvoices() {
    console.log('🧾 Creating 50 overdue invoices...')
    
    if (this.testData.customers.length === 0) {
      throw new Error('No customers created yet. Run createTestCustomers first.')
    }
    
    const distributorId = faker.string.uuid()
    let invoiceCounter = 1000
    
    for (let i = 1; i <= 50; i++) {
      const customer = faker.helpers.arrayElement(this.testData.customers)
      const amount = faker.number.int({ min: 1000, max: 50000 })
      const daysOverdue = faker.number.int({ min: 1, max: 90 })
      const dueDate = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000)
      const createdAt = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000) // Created 7 days before due date
      
      const invoice: TestInvoice = {
        id: faker.string.uuid(),
        invoiceNumber: `INV-${invoiceCounter++}`,
        retailerId: customer.id,
        distributorId: distributorId,
        status: 'SENT',
        paymentStatus: 'UNPAID',
        subtotal: amount * 0.9, // 90% subtotal, 10% tax
        taxAmount: amount * 0.1,
        totalAmount: amount,
        paidAmount: 0,
        dueDate: dueDate,
        createdAt: createdAt,
        daysOverdue: daysOverdue
      }
      
      this.testData.invoices.push(invoice)
      
      // In a real scenario, we would insert into database
      // await this.supabase.from('invoices').insert(invoice)
    }
    
    console.log(`✅ Created ${this.testData.invoices.length} overdue invoices`)
  }

  private logTestData() {
    console.log('\n📋 Test Data Summary:')
    console.log('='.repeat(50))
    
    console.log('\n👥 Customers (30 total):')
    this.testData.customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.email}) - Risk: ${customer.risk_score}`)
    })
    
    console.log('\n🧾 Overdue Invoices (50 total):')
    let totalOverdueAmount = 0
    this.testData.invoices.forEach((invoice, index) => {
      totalOverdueAmount += invoice.totalAmount
      console.log(`${index + 1}. ${invoice.invoiceNumber} - ₹${invoice.totalAmount} - ${invoice.daysOverdue} days overdue`)
    })
    
    console.log('\n📊 Statistics:')
    console.log(`Total Overdue Amount: ₹${totalOverdueAmount}`)
    
    const avgDaysOverdue = this.testData.invoices.reduce((sum, inv) => sum + inv.daysOverdue, 0) / this.testData.invoices.length
    console.log(`Average Days Overdue: ${avgDaysOverdue.toFixed(1)} days`)
    
    const highRiskCustomers = this.testData.customers.filter(c => (c.risk_score || 0) > 70).length
    console.log(`High Risk Customers (score > 70): ${highRiskCustomers}`)
    
    const highValueInvoices = this.testData.invoices.filter(inv => inv.totalAmount > 25000).length
    console.log(`High Value Invoices (> ₹25,000): ${highValueInvoices}`)
    
    console.log('='.repeat(50))
  }

  getTestData() {
    return this.testData
  }
}

// Main execution
if (require.main === module) {
  const seeder = new ARTestDataSeeder()
  seeder.seedTestData()
    .then(() => {
      console.log('\n🎯 AR test data ready for testing!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to seed test data:', error)
      process.exit(1)
    })
}

export { ARTestDataSeeder, type TestCustomer, type TestInvoice }