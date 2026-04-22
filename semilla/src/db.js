const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_SERVER,
  port:     parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt:              process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool singleton — se reutiliza en toda la app
let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✓ Conectado a SQL Server:', process.env.DB_NAME);
  }
  return pool;
}

module.exports = { getPool, sql };
