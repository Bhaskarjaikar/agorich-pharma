require('dotenv').config();
const { Client } = require('pg');

const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DATABASE = process.env.DB_DATABASE || 'medusa_agorich';

async function checkSchema() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find user-related tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%user%' OR table_name LIKE '%admin%')
      ORDER BY table_name
    `);

    console.log('📋 User-related tables:');
    tables.rows.forEach(row => console.log('  -', row.table_name));

    // Check each table structure
    for (const table of tables.rows) {
      console.log(`\n📊 Structure of "${table.table_name}":`);
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkSchema();
















