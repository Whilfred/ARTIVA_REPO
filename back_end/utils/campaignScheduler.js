// ARTIVA/back_end/utils/campaignScheduler.js
const cron = require('node-cron');
const pool = require('../config/db'); // Adaptez le chemin vers votre connexion PostgreSQL si nécessaire
const { sendCampaignEmail } = require('../services/emailService'); // Ou votre utilitaire/service d'envoi Brevo

function startCampaignScheduler() {
  // S'exécute toutes les minutes
  cron.schedule('* * * * *', async () => {
    console.log('[Scheduler] Vérification des campagnes à envoyer...');
    try {
      // 1. Récupérer toutes les campagnes programmées dont l'heure est passée
      const query = `
        SELECT * FROM email_campaigns 
        WHERE status = 'scheduled' 
          AND scheduled_at <= NOW()
      `;
      const result = await pool.query(query);

      if (result.rows.length === 0) {
        return;
      }

      console.log(`[Scheduler] ${result.rows.length} campagne(s) à déclencher.`);

      // 2. Traiter chaque campagne
      for (const campaign of result.rows) {
        console.log(`[Scheduler] Lancement de la campagne ID : ${campaign.id} - "${campaign.subject}"`);
        
        // Passer la campagne au statut 'sending' pour éviter les doublons d'envoi
        await pool.query(
          "UPDATE email_campaigns SET status = 'sending' WHERE id = $1",
          [campaign.id]
        );

        let sentCount = 0;
        let failCount = 0;

        try {
          // Exécuter l'envoi effectif via la fonction d'envoi (Brevo)
          // Si vous avez déjà une fonction globale d'envoi de campagne, appelez-la ici :
          if (typeof sendCampaignEmail === 'function') {
            const res = await sendCampaignEmail(campaign);
            sentCount = res?.sentCount || 1;
            failCount = res?.failCount || 0;
          }

          // Marquer la campagne comme envoyée
          await pool.query(
            `UPDATE email_campaigns 
             SET status = 'sent', envoyes = $1, echoues = $2, sent_at = NOW() 
             WHERE id = $3`,
            [sentCount, failCount, campaign.id]
          );

          console.log(`[Scheduler] Campagne ID ${campaign.id} envoyée avec succès ! (${sentCount} envoyés, ${failCount} échecs)`);
        } catch (sendErr) {
          console.error(`[Scheduler] Échec d'envoi pour la campagne ID ${campaign.id} :`, sendErr);
          await pool.query(
            "UPDATE email_campaigns SET status = 'failed' WHERE id = $1",
            [campaign.id]
          );
        }
      }
    } catch (err) {
      console.error('[Scheduler Error] Erreur lors de l\'exécution du planificateur :', err);
    }
  });

  console.log('[Scheduler] Planificateur de campagnes démarré avec succès.');
}

module.exports = { startCampaignScheduler };