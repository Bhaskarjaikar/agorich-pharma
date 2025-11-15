// Quick script to check if MedusaJS can load
require('dotenv').config();

console.log('🔍 Checking MedusaJS configuration...\n');

// Check env vars
console.log('Environment Variables:');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_PORT:', process.env.DB_PORT || 5432);
console.log('DB_DATABASE:', process.env.DB_DATABASE || 'medusa_agorich');
console.log('DB_USERNAME:', process.env.DB_USERNAME || 'postgres');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***set***' : '❌ NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL || 'not set');
console.log('');

// Try to load medusa-config
try {
  const config = require('./medusa-config.js');
  console.log('✅ medusa-config.js loaded successfully');
  console.log('Database URL:', config.projectConfig.database_url ? 'set' : 'not set');
  console.log('Store CORS:', config.projectConfig.store_cors);
  console.log('Admin CORS:', config.projectConfig.admin_cors);
  console.log('Plugins:', config.plugins.length);
} catch (error) {
  console.error('❌ Error loading medusa-config.js:', error.message);
}

// Try database connection
const { Client } = require('pg');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DATABASE = process.env.DB_DATABASE || 'medusa_agorich';

const client = new Client({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
});

client.connect()
  .then(() => {
    console.log('✅ Database connection successful');
    return client.query('SELECT NOW()');
  })
  .then(() => {
    console.log('✅ Database query successful');
    client.end();
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    client.end();
  });
















