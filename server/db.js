const Pool = require("pg").Pool;

const pool = new Pool({
    user: "postgres",
    password: "martin_19",
    host: "localhost",
    port: 5432,
    database: "housekeeping_system",
});

module.exports = pool;
