#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
// Mock faker functions
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
    soon: (options: { days: number }) => new Date(Date.now() + Math.random() * options.days * 24 * 60 * 60 * 1000),
    future: (options: { years: number }) => new Date(Date.now() + Math.random() * options.years * 365 * 24 * 60 * 60 * 1000),
  },
  company: {
    name: () => `Test Company ${Math.floor(Math.random() * 1000)}`,
  },
  commerce: {
    productName: () => `Test Product ${Math.floor(Math.random() * 1000)}`,
  },
  helpers: {
    arrayElement: <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)],
  },
}

interface TestProduct {
  id: string
  name: string
  brand: string
  salt_composition: string
  dosage: string
  category: string
  gst_rate: number
  mrp: number
  ptr: number
  pts: number
  pack_size: string
  manufacturer: string
  status: string
}

interface TestInventoryBatch {
  id: string
  product_id: string
  distributor_id: string
  batch_number: string
  expiry_date: string
  available_qty: number
  reserved_qty: number
  damaged_qty: number
}

class InventoryTestDataSeeder {
  private supabase: any
  private testData: {
    products: TestProduct[]
    inventoryBatches: TestInventoryBatch[]
  } = {
    products: [],
    inventoryBatches: []
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
    console.log('🌱 Starting inventory test data seeding...')
    
    try {
      // Step 1: Create 50 test products
      await this.createTestProducts()
      
      // Step 2: Create inventory batches with specific conditions
      await this.createInventoryBatches()
      
      // Step 3: Log all created test data IDs
      this.logTestData()
      
      console.log('✅ Inventory test data seeding completed successfully!')
      console.log(`📊 Created: ${this.testData.products.length} products, ${this.testData.inventoryBatches.length} inventory batches`)
      
      return this.testData
      
    } catch (error) {
      console.error('❌ Error seeding test data:', error)
      throw error
    }
  }

  private async createTestProducts() {
    console.log('📦 Creating 50 test products...')
    
    const categories = [
      'Pain Relief',
      'Antibiotics',
      'Vitamins',
      'Gastrointestinal',
      'Respiratory',
      'Cardiology',
      'Neurology',
      'Dermatology',
      'Orthopedics',
      'Endocrinology'
    ]
    
    const manufacturers = [
      'Sun Pharma',
      'Cipla',
      'Dr. Reddy\'s',
      'Lupin',
      'Mankind Pharma',
      'Zydus Cadila',
      'Torrent Pharma',
      'Alembic Pharma',
      'Glenmark',
      'Biocon'
    ]
    
    const products: TestProduct[] = []
    
    for (let i = 1; i <= 50; i++) {
      const category = faker.helpers.arrayElement(categories)
      const manufacturer = faker.helpers.arrayElement(manufacturers)
      const mrp = faker.number.float({ min: 10, max: 500 })
      const ptr = mrp * 0.8
      const pts = ptr * 0.9
      
      const product: TestProduct = {
        id: `test-prod-${i}`,
        name: `${faker.commerce.productName()} Test`,
        brand: faker.company.name(),
        salt_composition: faker.helpers.arrayElement([
          'Paracetamol 500mg',
          'Ibuprofen 400mg',
          'Amoxicillin 250mg',
          'Vitamin C 500mg',
          'Omeprazole 20mg',
          'Cetirizine 10mg',
          'Metformin 500mg',
          'Atorvastatin 10mg',
          'Losartan 50mg',
          'Levothyroxine 50mcg'
        ]),
        dosage: faker.helpers.arrayElement(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream']),
        category,
        gst_rate: faker.number.float({ min: 5, max: 18 }),
        mrp,
        ptr,
        pts,
        pack_size: faker.helpers.arrayElement(['10 tablets', '30 capsules', '100ml syrup', '5 injections']),
        manufacturer,
        status: 'ACTIVE'
      }
      
      products.push(product)
    }
    
    // Insert products in batches of 10
    for (let i = 0; i < products.length; i += 10) {
      const batch = products.slice(i, i + 10)
      const { error } = await this.supabase
        .from('products')
        .insert(batch)
      
      if (error) {
        throw new Error(`Failed to insert products batch ${i/10 + 1}: ${error.message}`)
      }
      
      console.log(`  Inserted batch ${i/10 + 1} of ${Math.ceil(products.length/10)}`)
    }
    
    this.testData.products = products
    console.log(`✅ Created ${products.length} test products`)
  }

  private async createInventoryBatches() {
    console.log('📊 Creating inventory batches with specific conditions...')
    
    if (this.testData.products.length === 0) {
      throw new Error('No products available to create inventory batches')
    }
    
    const inventoryBatches: TestInventoryBatch[] = []
    const distributorId = 'test-distributor-001'
    
    // Calculate counts based on requirements
    const totalProducts = this.testData.products.length
    const lowStockCount = Math.floor(totalProducts * 0.20) // 20% with low stock
    const expiryCount = Math.floor(totalProducts * 0.10)   // 10% with expiry within 30 days
    const bothConditionsCount = Math.floor(totalProducts * 0.05) // 5% with both conditions
    
    console.log(`  Distribution: ${lowStockCount} low stock, ${expiryCount} expiry, ${bothConditionsCount} both conditions`)
    
    // Create batches for each product
    for (let i = 0; i < this.testData.products.length; i++) {
      const product = this.testData.products[i]
      const batchNumber = `BATCH-${faker.string.alphanumeric(8).toUpperCase()}`
      
      // Determine conditions for this product
      const isLowStock = i < lowStockCount
      const isExpiry = i >= lowStockCount && i < lowStockCount + expiryCount
      const isBothConditions = i >= lowStockCount + expiryCount && i < lowStockCount + expiryCount + bothConditionsCount
      
      let availableQty: number
      let expiryDate: Date
      
      if (isBothConditions) {
        // Both conditions: low stock AND expiry within 30 days
        availableQty = faker.number.int({ min: 1, max: 5 }) // Very low stock
        expiryDate = faker.date.soon({ days: 30 })
      } else if (isLowStock) {
        // Low stock only
        availableQty = faker.number.int({ min: 1, max: 10 }) // Low stock
        expiryDate = faker.date.future({ years: 1 })
      } else if (isExpiry) {
        // Expiry only
        availableQty = faker.number.int({ min: 50, max: 200 }) // Normal stock
        expiryDate = faker.date.soon({ days: 30 })
      } else {
        // Normal conditions
        availableQty = faker.number.int({ min: 50, max: 500 })
        expiryDate = faker.date.future({ years: 1 })
      }
      
      const inventoryBatch: TestInventoryBatch = {
        id: `test-inv-${i + 1}`,
        product_id: product.id,
        distributor_id: distributorId,
        batch_number: batchNumber,
        expiry_date: expiryDate.toISOString(),
        available_qty: availableQty,
        reserved_qty: faker.number.int({ min: 0, max: Math.floor(availableQty * 0.3) }),
        damaged_qty: faker.number.int({ min: 0, max: Math.floor(availableQty * 0.1) })
      }
      
      inventoryBatches.push(inventoryBatch)
    }
    
    // Insert inventory batches in batches of 10
    for (let i = 0; i < inventoryBatches.length; i += 10) {
      const batch = inventoryBatches.slice(i, i + 10)
      const { error } = await this.supabase
        .from('inventory_batches')
        .insert(batch)
      
      if (error) {
        throw new Error(`Failed to insert inventory batch ${i/10 + 1}: ${error.message}`)
      }
      
      console.log(`  Inserted inventory batch ${i/10 + 1} of ${Math.ceil(inventoryBatches.length/10)}`)
    }
    
    this.testData.inventoryBatches = inventoryBatches
    console.log(`✅ Created ${inventoryBatches.length} inventory batches`)
  }

  private logTestData() {
    console.log('\n📋 Test Data Summary:')
    console.log('='.repeat(50))
    
    console.log('\n📦 Products Created:')
    this.testData.products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`)
      console.log(`     Category: ${product.category}, MRP: ₹${product.mrp}`)
    })
    
    console.log('\n📊 Inventory Batches Created:')
    this.testData.inventoryBatches.forEach((batch, index) => {
      const product = this.testData.products.find(p => p.id === batch.product_id)
      const daysToExpiry = Math.floor((new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      console.log(`  ${index + 1}. Batch: ${batch.batch_number}`)
      console.log(`     Product: ${product?.name}`)
      console.log(`     Available Qty: ${batch.available_qty}, Expiry: ${daysToExpiry} days`)
    })
    
    console.log('\n📈 Condition Distribution:')
    const lowStockProducts = this.testData.inventoryBatches.filter(b => b.available_qty <= 10).length
    const expiryProducts = this.testData.inventoryBatches.filter(b => {
      const daysToExpiry = Math.floor((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysToExpiry <= 30
    }).length
    
    console.log(`  Low Stock (≤10 units): ${lowStockProducts} products`)
    console.log(`  Expiry within 30 days: ${expiryProducts} products`)
    
    // Save test data IDs to a file for reference
    const fs = require('fs')
    const path = require('path')
    
    const testDataFile = path.join(__dirname, 'test-data-ids.json')
    const testDataSummary = {
      timestamp: new Date().toISOString(),
      productIds: this.testData.products.map(p => p.id),
      inventoryBatchIds: this.testData.inventoryBatches.map(b => b.id),
      conditionSummary: {
        lowStockCount: lowStockProducts,
        expiryCount: expiryProducts
      }
    }
    
    fs.writeFileSync(testDataFile, JSON.stringify(testDataSummary, null, 2))
    console.log(`\n💾 Test data IDs saved to: ${testDataFile}`)
  }

  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...')
    
    try {
      // Delete inventory batches
      if (this.testData.inventoryBatches.length > 0) {
        const batchIds = this.testData.inventoryBatches.map(b => b.id)
        const { error: batchError } = await this.supabase
          .from('inventory_batches')
          .delete()
          .in('id', batchIds)
        
        if (batchError) {
          console.warn(`⚠️  Failed to delete inventory batches: ${batchError.message}`)
        } else {
          console.log(`✅ Deleted ${batchIds.length} inventory batches`)
        }
      }
      
      // Delete products
      if (this.testData.products.length > 0) {
        const productIds = this.testData.products.map(p => p.id)
        const { error: productError } = await this.supabase
          .from('products')
          .delete()
          .in('id', productIds)
        
        if (productError) {
          console.warn(`⚠️  Failed to delete products: ${productError.message}`)
        } else {
          console.log(`✅ Deleted ${productIds.length} products`)
        }
      }
      
      console.log('✅ Test data cleanup completed')
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error)
    }
  }
}

// Command line execution
if (require.main === module) {
  const seeder = new InventoryTestDataSeeder()
  
  const args = process.argv.slice(2)
  const shouldCleanup = args.includes('--cleanup')
  
  if (shouldCleanup) {
    seeder.cleanupTestData()
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  } else {
    seeder.seedTestData()
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  }
}

export { InventoryTestDataSeeder }