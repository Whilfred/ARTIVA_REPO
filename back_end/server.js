// const express = require('express');
// const { Pool } = require('pg');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const cors = require('cors');
// const dotenv = require('dotenv');

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const pool = new Pool({
//   host: 'localhost',
//   user: 'postgres',
//   password: 'othi',
//   database: 'artiva',
//   port: 5432,
// });

// pool.connect()
//   .then(() => console.log('✅ Connexion réussie à PostgreSQL'))
//   .catch(err => {
//     console.error('❌ Erreur de connexion à PostgreSQL:', err);
//     process.exit(1);
//   });







// ARTIVA/back_end/server.js
const app = require('./app'); // Importe l'application Express depuis app.js
const db = require('./config/db'); // Importe notre module de base de données

const PORT = process.env.PORT || 3001; // Récupère le port depuis .env ou utilise 3001 par défaut

// Fonction pour démarrer le serveur
async function startServer() {
  try {
    // Tester la connexion à la base de données avant de démarrer le serveur
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      console.error('Impossible de démarrer le serveur car la connexion à la base de données a échoué.');
      process.exit(1); // Quitte le processus si la connexion échoue
    }

    // Démarrer le serveur Express pour écouter les requêtes
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur Artiva backend démarré sur le port ${PORT}`);
});

  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// app.get('/make-google-id-text', async (req, res) => {
//   try {
//     await db.query("ALTER TABLE users ALTER COLUMN google_id TYPE TEXT;");
//     res.send("✅ La colonne google_id est maintenant de type TEXT.");
//   } catch (err) {
//     res.status(500).send("❌ Erreur : " + err.message);
//   }
// });

startServer(); // Appelle la fonction pour démarrer le serveur