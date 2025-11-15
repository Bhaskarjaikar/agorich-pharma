require('dotenv').config();
const { Client } = require('pg');

const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DATABASE = process.env.DB_DATABASE || 'medusa_agorich';

async function checkRoleEnum() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
  });

  try {
    await client.connect();
    
    // Check role enum type
    const enumCheck = await client.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'user_role_enum'
      ORDER BY e.enumsortorder
    `);

    console.log('📋 Available role values:');
    enumCheck.rows.forEach(row => console.log('  -', row.enumlabel));

    // Check existing users
    const users = await client.query('SELECT id, email, role FROM "user" LIMIT 5');
    console.log('\n👥 Existing users:');
    users.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If enum doesn't exist, try to find what it is
    try {
      const colInfo = await client.query(`
        SELECT data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'role'
      `);
      console.log('\n📊 Role column type:', colInfo.rows[0]);
    } catch {}
    
    await client.end();
    process.exit(1);
  }
}

checkRoleEnum();

