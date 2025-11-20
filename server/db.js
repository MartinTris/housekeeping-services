const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,                          
  min: 5,                           
  idleTimeoutMillis: 30000,         
  connectionTimeoutMillis: 10000,   
  maxUses: 7500,                    
  allowExitOnIdle: false            
});

// Add error handler to prevent crashes
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});


module.exports = pool;
