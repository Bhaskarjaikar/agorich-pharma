require('dotenv').config();
const { Client } = require('pg');

const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DATABASE = process.env.DB_DATABASE || 'medusa_agorich';

async function checkRoleType() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
  });

  try {
    await client.connect();
    
    // Get detailed info about role column
    const colInfo = await client.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user' 
      AND column_name = 'role'
    `);

    console.log('📊 Role column info:');
    colInfo.rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });

    // Try to find the enum type name
    const enumTypes = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
    `);
    
    console.log('\n📋 All enum types in database:');
    enumTypes.rows.forEach(row => console.log('  -', row.typname));

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkRoleType();
















