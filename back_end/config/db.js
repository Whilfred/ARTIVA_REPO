require('dotenv').config();
const { Pool } = require('pg');

// Configuration PostgreSQL (LOCAL ou AIVEN selon ton .env)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

// Fonction pour tester la connexion
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT NOW()');
    console.log('Connexion à PostgreSQL réussie ✔');
    return true;
  } catch (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err);
    return false;
  } finally {
    if (client) client.release();
  }
};

// Exports
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection
};
