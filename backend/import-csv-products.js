require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const csv = require('csv-parser')

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:bhaskarjaikar.1@localhost:5432/medusa_agorich'
})

// Parse CSV file
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

// Normalize column names (handle variations)
function normalizeColumnName(col) {
  const normalized = col.trim().toLowerCase().replace(/\s+/g, '_')
  const mappings = {
    'product_name': 'name',
    'product': 'name',
    'title': 'name',
    'mrp': 'mrp',
    'price': 'mrp',
    'agorich_price': 'agorich_price',
    'agorich': 'agorich_price',
    'cost': 'agorich_price',
    'stock': 'stock',
    'quantity': 'stock',
    'qty': 'stock',
    'pack_size': 'pack_size',
    'pack': 'pack_size',
    'batch_number': 'batch_number',
    'batch': 'batch_number',
    'expiry_date': 'expiry_date',
    'expiry': 'expiry_date',
    'exp_date': 'expiry_date',
    'manufacturer': 'manufacturer',
    'mfg': 'manufacturer',
    'mfg_date': 'mfg_date',
    'category': 'category',
    'description': 'description'
  }
  return mappings[normalized] || normalized
}

// Parse date (handles multiple formats)
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null
  
  const str = dateStr.trim()
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }
  
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [day, month, year] = str.split('-')
    return `${year}-${month}-${day}`
  }
  
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) {
    return `${str}-01`
  }
  
  // MM-YYYY
  if (/^\d{2}-\d{4}$/.test(str)) {
    const [month, year] = str.split('-')
    return `${year}-${month}-01`
  }
  
  return null
}

// Calculate margin
function calculateMargin(mrp, agorichPrice) {
  if (!mrp || mrp <= 0) return null
  if (!agorichPrice || agorichPrice <= 0) return null
  return ((mrp - agorichPrice) / mrp * 100).toFixed(2)
}

// Import products from CSV
async function importProducts(csvFilePath) {
  try {
    console.log('📂 Reading CSV file:', csvFilePath)
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`)
    }

    const rows = await parseCSV(csvFilePath)
    console.log(`📊 Found ${rows.length} rows in CSV`)

    if (rows.length === 0) {
      throw new Error('CSV file is empty or has no data rows')
    }

    // Normalize column names
    const normalizedRows = rows.map(row => {
      const normalized = {}
      Object.keys(row).forEach(key => {
        const newKey = normalizeColumnName(key)
        normalized[newKey] = row[key]
      })
      return normalized
    })

    console.log('🔄 Starting import...\n')

    const imported = []
    const failed = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i]
      
      try {
        // Validate required fields
        if (!row.name || row.name.trim() === '') {
          throw new Error('Product name is required')
        }

        const name = row.name.trim()
        const stock = parseInt(row.stock) || 0
        const mrp = parseFloat(row.mrp) || 0
        const agorichPrice = parseFloat(row.agorich_price) || 0
        
        if (mrp <= 0) {
          throw new Error('MRP must be greater than 0')
        }
        if (agorichPrice <= 0) {
          throw new Error('Agorich price must be greater than 0')
        }

        // Generate slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        
        // Parse dates
        const expiryDate = parseDate(row.expiry_date)
        const mfgDate = parseDate(row.mfg_date)
        
        // Calculate margin
        const margin = calculateMargin(mrp, agorichPrice)

        // Insert into database
        const result = await pool.query(
          `INSERT INTO products (
            name, slug, description, category, manufacturer,
            pack_size, batch_number, mfg_date, expiry_date,
            mrp, agorich_price, retailer_price, margin,
            stock, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
          RETURNING id, name`,
          [
            name,
            slug,
            row.description || null,
            row.category || null,
            row.manufacturer || null,
            row.pack_size || null,
            row.batch_number || null,
            mfgDate,
            expiryDate,
            mrp,
            agorichPrice,
            row.retailer_price ? parseFloat(row.retailer_price) : null,
            margin ? parseFloat(margin) : null,
            stock,
            'ACTIVE'
          ]
        )

        imported.push({ row: i + 2, name, id: result.rows[0].id })
        successCount++
        console.log(`✅ [${i + 1}/${normalizedRows.length}] Imported: ${name}`)

      } catch (error) {
        failed.push({ row: i + 2, name: row.name || 'Unknown', error: error.message })
        failCount++
        console.log(`❌ [${i + 1}/${normalizedRows.length}] Failed: ${row.name || 'Unknown'} - ${error.message}`)
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📈 Import Summary:')
    console.log(`   ✅ Successfully imported: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    console.log(`   📊 Total processed: ${normalizedRows.length}`)
    console.log('='.repeat(50))

    if (failed.length > 0) {
      console.log('\n❌ Failed Products:')
      failed.forEach(f => {
        console.log(`   Row ${f.row}: ${f.name} - ${f.error}`)
      })
    }

    return { imported, failed, successCount, failCount, total: normalizedRows.length }

  } catch (error) {
    console.error('❌ Import error:', error.message)
    throw error
  }
}

// Main execution
async function main() {
  const csvFile = process.argv[2]
  
  if (!csvFile) {
    console.log('📋 CSV Product Import Tool')
    console.log('\nUsage:')
    console.log('  node import-csv-products.js <path-to-csv-file>')
    console.log('\nExample:')
    console.log('  node import-csv-products.js products.csv')
    console.log('  node import-csv-products.js ../data/inventory.csv')
    process.exit(1)
  }

  const csvPath = path.isAbsolute(csvFile) ? csvFile : path.join(__dirname, csvFile)
  
  try {
    await importProducts(csvPath)
    console.log('\n✅ Import completed!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Import failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()

