require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DATABASE = process.env.DB_DATABASE || 'medusa_agorich';

async function createAdminUser() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const email = 'admin@agorich.com';
    const password = 'admin123';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const checkUser = await client.query(
      'SELECT id, email FROM "user" WHERE email = $1',
      [email]
    );

    if (checkUser.rows.length > 0) {
      console.log('ℹ️  Admin user already exists!');
      console.log('Email:', checkUser.rows[0].email);
      console.log('ID:', checkUser.rows[0].id);
      console.log('You can login with these credentials.');
      await client.end();
      return;
    }

    // Generate a MedusaJS-style ID (nanoid-like, typically 20-25 chars)
    const { nanoid } = require('nanoid');
    const userId = nanoid(20);

    // Create user with 'admin' role
    const result = await client.query(
      `INSERT INTO "user" (id, email, "password_hash", role, created_at, updated_at)
       VALUES ($1, $2, $3, 'admin'::user_role_enum, NOW(), NOW())
       RETURNING id, email, role`,
      [userId, email, hashedPassword]
    );

    console.log('✅ Admin user created successfully!');
    console.log('Email:', result.rows[0].email);
    console.log('ID:', result.rows[0].id);
    console.log('\n🎉 You can now login with:');
    console.log('Email: admin@agorich.com');
    console.log('Password: admin123');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If table name is different, try alternative
    if (error.message.includes('relation "user" does not exist')) {
      console.log('\n🔍 Trying alternative table name...');
      try {
        const altResult = await client.query(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name LIKE '%user%'`
        );
        console.log('Found user tables:', altResult.rows);
      } catch (e) {
        console.error('Could not find user table:', e.message);
      }
    }
    
    await client.end();
    process.exit(1);
  }
}

createAdminUser();

