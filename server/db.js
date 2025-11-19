const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 20,
  });

  // const pool = new Pool({
  //     user: "postgres",
  //     password: "martin_19",
  //     host: "localhost",
  //     port: 5432,
  //     database: "housekeeping_system",
  // });

module.exports = pool;
