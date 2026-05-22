require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@apollo/server/express4')
const { Pool } = require('pg')

const app = express()

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agorich_pharma'
})

// GraphQL Schema
const typeDefs = `#graphql
  type Money {
    amount: Float!
    currency: String!
  }

  type Price {
    gross: Money!
    net: Money
    tax: Money
  }

  type ProductVariant {
    id: ID!
    name: String!
    sku: String
    pricing: ProductVariantPricing
    quantityAvailable: Int
  }

  type ProductVariantPricing {
    price: Price
  }

  type ProductMetadata {
    key: String!
    value: String!
  }

  type Product {
    id: ID!
    name: String!
    slug: String
    description: String
    thumbnail: ProductThumbnail
    attributes: [ProductAttribute]
    pricing: ProductPricing
    variants: [ProductVariant]
    isAvailable: Boolean
    created: String
    updatedAt: String
    metadata: [ProductMetadata]
    # Direct fields for compatibility
    manufacturer: String
    pack_size: String
    batch_number: String
    expiry_date: String
    mfg_date: String
    agorich_price: Float
    retailer_price: Float
    mrp: Float
    margin: Float
    stock: Int
    category: String
    status: String
  }

  type ProductThumbnail {
    url: String
    alt: String
  }

  type ProductAttribute {
    id: ID!
    name: String!
    values: [ProductAttributeValue]
  }

  type ProductAttributeValue {
    id: ID!
    name: String!
  }

  type ProductPricing {
    priceRange: PriceRange
  }

  type PriceRange {
    start: Price
  }

  type ProductsConnection {
    edges: [ProductEdge]
    pageInfo: PageInfo
  }

  type ProductEdge {
    node: Product!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type Query {
    products(first: Int, after: String, filter: ProductFilterInput): ProductsConnection
    product(id: ID!): Product
  }

  input ProductFilterInput {
    search: String
    categories: [ID]
  }

  type Mutation {
    productCreate(input: ProductCreateInput!): ProductCreatePayload
    productUpdate(id: ID!, input: ProductInput!): ProductUpdatePayload
    productDelete(id: ID!): ProductDeletePayload
  }

  input ProductCreateInput {
    name: String!
    description: String
    slug: String
    productType: String!
    attributes: [AttributeInput]
    metadata: [MetadataInput]
    manufacturer: String
    pack_size: String
    batch_number: String
    expiry_date: String
    mfg_date: String
    agorich_price: Float
    retailer_price: Float
    mrp: Float
    margin: Float
    stock: Int
    category: String
    status: String
  }

  input ProductInput {
    name: String
    description: String
    slug: String
  }

  input AttributeInput {
    id: ID!
    values: [String]
  }

  input MetadataInput {
    key: String!
    value: String!
  }

  type ProductCreatePayload {
    product: Product
    errors: [Error]
  }

  type ProductUpdatePayload {
    product: Product
    errors: [Error]
  }

  type ProductDeletePayload {
    product: Product
    errors: [Error]
  }

  type Error {
    field: String
    message: String!
  }
`

// GraphQL Resolvers
const resolvers = {
  Query: {
    products: async (_, { first = 20, filter }) => {
      try {
        let query = 'SELECT * FROM products WHERE 1=1'
        const params = []
        
        if (filter?.search) {
          query += ' AND (name ILIKE $1 OR description ILIKE $1)'
          params.push(`%${filter.search}%`)
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1)
        params.push(first)

        const result = await pool.query(query, params)
        
        // Debug: Log first product from database query
        if (result.rows.length > 0 && typeof products._debugCount === 'undefined') {
          products._debugCount = 0
        }
        if (result.rows.length > 0 && products._debugCount < 1) {
          const firstRow = result.rows[0]
          console.log('📥 Fetched from database:', {
            id: firstRow.id,
            name: firstRow.name,
            expiry_date: firstRow.expiry_date,
            mrp: firstRow.mrp,
            agorich_price: firstRow.agorich_price,
            margin: firstRow.margin,
            batch_number: firstRow.batch_number,
            manufacturer: firstRow.manufacturer,
          })
          products._debugCount++
        }
        
        const edges = result.rows.map(row => ({
          node: transformProduct(row)
        }))

        return {
          edges,
          pageInfo: {
            hasNextPage: result.rows.length === first,
            endCursor: result.rows.length > 0 ? result.rows[result.rows.length - 1].id : null
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        throw error
      }
    },
    product: async (_, { id }) => {
      try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id])
        if (result.rows.length === 0) {
          throw new Error('Product not found')
        }
        return transformProduct(result.rows[0])
      } catch (error) {
        console.error('Error fetching product:', error)
        throw error
      }
    }
  },
  Mutation: {
    productCreate: async (_, { input }) => {
      try {
        const { name, description, slug, metadata = [], expiry_date, mfg_date, batch_number, agorich_price, retailer_price, mrp, margin, stock, category, status, pack_size, manufacturer } = input
        
        // Extract metadata values (fallback to direct fields if metadata not provided)
        const manufacturerValue = metadata.find(m => m.key === 'manufacturer')?.value || manufacturer || ''
        const packSizeValue = metadata.find(m => m.key === 'pack_size')?.value || pack_size || ''
        const batchNumberValue = metadata.find(m => m.key === 'batch_number')?.value || batch_number || ''
        const expiryDateValue = metadata.find(m => m.key === 'expiry_date')?.value || expiry_date || null
        const mfgDateValue = metadata.find(m => m.key === 'mfg_date')?.value || mfg_date || null
        const agorichPriceValue = metadata.find(m => m.key === 'agorich_price')?.value ? parseFloat(metadata.find(m => m.key === 'agorich_price')?.value) : (agorich_price ? parseFloat(agorich_price) : null)
        const retailerPriceValue = metadata.find(m => m.key === 'retailer_price')?.value ? parseFloat(metadata.find(m => m.key === 'retailer_price')?.value) : (retailer_price ? parseFloat(retailer_price) : null)
        const mrpValue = metadata.find(m => m.key === 'mrp')?.value ? parseFloat(metadata.find(m => m.key === 'mrp')?.value) : (mrp ? parseFloat(mrp) : null)
        const marginValue = metadata.find(m => m.key === 'margin')?.value ? parseFloat(metadata.find(m => m.key === 'margin')?.value) : (margin ? parseFloat(margin) : null)
        const stockValue = metadata.find(m => m.key === 'stock')?.value ? parseInt(metadata.find(m => m.key === 'stock')?.value) : (stock !== undefined && stock !== null ? parseInt(stock) : 0)
        const categoryValue = metadata.find(m => m.key === 'category')?.value || category || null
        const statusValue = metadata.find(m => m.key === 'status')?.value || status || 'ACTIVE'
        
        // Debug: Log what we're about to insert
        console.log('💾 Creating product in database:', {
          name,
          expiry_date: expiryDateValue,
          mrp: mrpValue,
          agorich_price: agorichPriceValue,
          margin: marginValue,
          batch_number: batchNumberValue,
          metadataCount: metadata.length
        })

        const result = await pool.query(
          `INSERT INTO products (
            name, description, slug, manufacturer, pack_size, batch_number, 
            expiry_date, mfg_date, agorich_price, retailer_price, mrp, margin, stock, category, status,
            created_at, updated_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()) RETURNING *`,
          [
            name, 
            description || '', 
            slug || name.toLowerCase().replace(/\s+/g, '-'), 
            manufacturerValue, 
            packSizeValue,
            batchNumberValue,
            expiryDateValue,
            mfgDateValue,
            agorichPriceValue,
            retailerPriceValue,
            mrpValue,
            marginValue,
            stockValue,
            categoryValue,
            statusValue
          ]
        )

        // Debug: Log what was actually saved
        console.log('✅ Product saved to database:', {
          id: result.rows[0].id,
          name: result.rows[0].name,
          expiry_date: result.rows[0].expiry_date,
          mrp: result.rows[0].mrp,
          agorich_price: result.rows[0].agorich_price,
          margin: result.rows[0].margin,
          batch_number: result.rows[0].batch_number,
        })

        return {
          product: transformProduct(result.rows[0]),
          errors: []
        }
      } catch (error) {
        console.error('Error creating product:', error)
        return {
          product: null,
          errors: [{ field: 'product', message: error.message }]
        }
      }
    },
    productUpdate: async (_, { id, input }) => {
      try {
        const updates = []
        const values = []
        let paramCount = 1

        if (input.name) {
          updates.push(`name = $${paramCount++}`)
          values.push(input.name)
        }
        if (input.description) {
          updates.push(`description = $${paramCount++}`)
          values.push(input.description)
        }

        values.push(id)
        const query = `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`
        
        const result = await pool.query(query, values)
        
        return {
          product: transformProduct(result.rows[0]),
          errors: []
        }
      } catch (error) {
        console.error('Error updating product:', error)
        return {
          product: null,
          errors: [{ field: 'product', message: error.message }]
        }
      }
    },
    productDelete: async (_, { id }) => {
      try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id])
        
        return {
          product: result.rows.length > 0 ? transformProduct(result.rows[0]) : null,
          errors: []
        }
      } catch (error) {
        console.error('Error deleting product:', error)
        return {
          product: null,
          errors: [{ field: 'product', message: error.message }]
        }
      }
    }
  }
}

// Transform database product to GraphQL format
function transformProduct(dbProduct) {
  // Debug: Log raw database product data
  if (!dbProduct) {
    console.error('❌ transformProduct called with null/undefined dbProduct')
    return null
  }

  // Parse metadata from database
  const metadata = []
  if (dbProduct.manufacturer) metadata.push({ key: 'manufacturer', value: dbProduct.manufacturer })
  if (dbProduct.pack_size) metadata.push({ key: 'pack_size', value: dbProduct.pack_size })
  if (dbProduct.batch_number) metadata.push({ key: 'batch_number', value: dbProduct.batch_number })
  if (dbProduct.agorich_price) metadata.push({ key: 'agorich_price', value: String(dbProduct.agorich_price) })
  if (dbProduct.retailer_price) metadata.push({ key: 'retailer_price', value: String(dbProduct.retailer_price) })
  
  // Debug: Log what we're transforming (only for first product to avoid spam)
  if (typeof transformProduct._debugCount === 'undefined') {
    transformProduct._debugCount = 0
  }
  if (transformProduct._debugCount < 3) {
    console.log('🔄 Transforming product from database:', {
      id: dbProduct.id,
      name: dbProduct.name,
      expiry_date: dbProduct.expiry_date,
      mrp: dbProduct.mrp,
      agorich_price: dbProduct.agorich_price,
      margin: dbProduct.margin,
      batch_number: dbProduct.batch_number,
      manufacturer: dbProduct.manufacturer,
    })
    transformProduct._debugCount++
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name || dbProduct.title,
    slug: dbProduct.slug || (dbProduct.name?.toLowerCase().replace(/\s+/g, '-')),
    description: dbProduct.description || null,
    thumbnail: dbProduct.thumbnail ? {
      url: dbProduct.thumbnail,
      alt: dbProduct.name
    } : null,
    variants: [{
      id: dbProduct.id + '-variant',
      name: 'Default',
      sku: dbProduct.sku || null,
      pricing: {
        price: dbProduct.mrp ? {
          gross: {
            amount: Number(dbProduct.mrp) * 100, // Convert to cents
            currency: 'INR'
          }
        } : null
      },
      quantityAvailable: Number(dbProduct.stock) || 0
    }],
    pricing: {
      priceRange: dbProduct.mrp ? {
        start: {
          gross: {
            amount: Number(dbProduct.mrp) * 100,
            currency: 'INR'
          }
        }
      } : null
    },
    isAvailable: (Number(dbProduct.stock) || 0) > 0,
    created: dbProduct.created_at ? new Date(dbProduct.created_at).toISOString() : new Date().toISOString(),
    updatedAt: dbProduct.updated_at ? new Date(dbProduct.updated_at).toISOString() : new Date().toISOString(),
    metadata,
    // Direct fields for compatibility - ensure they are properly typed
    manufacturer: dbProduct.manufacturer || null,
    pack_size: dbProduct.pack_size || null,
    batch_number: dbProduct.batch_number || null,
    expiry_date: dbProduct.expiry_date ? (typeof dbProduct.expiry_date === 'string' ? dbProduct.expiry_date : dbProduct.expiry_date.toISOString().split('T')[0]) : null,
    mfg_date: dbProduct.mfg_date ? (typeof dbProduct.mfg_date === 'string' ? dbProduct.mfg_date : dbProduct.mfg_date.toISOString().split('T')[0]) : null,
    agorich_price: dbProduct.agorich_price ? Number(dbProduct.agorich_price) : null,
    retailer_price: dbProduct.retailer_price ? Number(dbProduct.retailer_price) : null,
    mrp: dbProduct.mrp ? Number(dbProduct.mrp) : null,
    margin: dbProduct.margin ? Number(dbProduct.margin) : null,
    stock: Number(dbProduct.stock) || 0,
    category: dbProduct.category || null,
    status: dbProduct.status || 'ACTIVE'
  }
}

// Create and start Apollo Server
async function startServer() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true
  })

  await apolloServer.start()

  app.use('/graphql/', 
    cors(),
    express.json(),
    expressMiddleware(apolloServer)
  )

  const PORT = process.env.PORT || 8000
  
  app.listen(PORT, () => {
    console.log('🚀 Saleor-compatible GraphQL server started!')
    console.log(`📡 GraphQL endpoint: http://localhost:${PORT}/graphql/`)
    console.log(`🎛️  Playground: http://localhost:${PORT}/graphql/`)
    console.log('\n✅ Server is ready to accept requests!')
  })
}

startServer().catch(error => {
  console.error('❌ Error starting server:', error)
  process.exit(1)
})
