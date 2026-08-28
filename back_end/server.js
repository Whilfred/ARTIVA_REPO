// ARTIVA/back_end/server.js
const app = require('./app');
const db = require('./config/db');
const { startCampaignScheduler } = require('./utils/campaignScheduler');
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      console.error('Impossible de démarrer le serveur car la connexion à la base de données a échoué.');
      process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Serveur Artiva backend démarré sur le port ${PORT}`);
      startCampaignScheduler(); // <-- AJOUT : démarré seulement une fois le serveur bien lancé
    });

  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();