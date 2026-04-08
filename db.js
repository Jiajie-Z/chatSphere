const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function getPool(retries = 10) {
  if (pool) {
    return pool;
  }

  while (retries > 0) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      await pool.query('SELECT 1');
      console.log('✅ Connected to MySQL');
      return pool;
    } catch (err) {
      console.log(`⏳ Waiting for DB... retries left: ${retries - 1}`);
      retries -= 1;

      if (retries === 0) {
        console.error('❌ Could not connect to DB:', err);
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

module.exports = { getPool };