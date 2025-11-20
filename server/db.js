const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.eitovqmmjupbercrbeao',
  password: 'martin_19',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

  // const pool = new Pool({
  //   connectionString: process.env.DATABASE_URL,
  //   ssl: false,
  //   max: 20,
  // });

  // const pool = new Pool({
  //     user: "postgres",
  //     password: "martin_19",
  //     host: "localhost",
  //     port: 5432,
  //     database: "housekeeping_system",
  // });

module.exports = pool;
