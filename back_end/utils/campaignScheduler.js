// ARTIVA/back_end/utils/campaignScheduler.js
const cron = require('node-cron');
const pool = require('../config/db'); // Adaptez le chemin vers votre connexion PostgreSQL si nécessaire
const { sendCampaignEmail } = require('./sendEmail');
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
let sentCount = 0;
        let failCount = 0;

        try {
          // 1. Récupérer tous les destinataires prévus pour cette campagne
          const recipientsRes = await pool.query(
            "SELECT * FROM email_campaign_recipients WHERE campaign_id = $1 AND status = 'pending'",
            [campaign.id]
          );

          const recipients = recipientsRes.rows;

          if (recipients.length === 0) {
            console.log(`[Scheduler] Aucun destinataire en attente pour la campagne ID ${campaign.id}`);
          }

          // 2. Boucler sur chaque destinataire pour envoyer l'e-mail
          for (const recipient of recipients) {
            try {
              // Appel de la fonction de sendEmail.js avec les bonnes propriétés (body_html de votre table)
              await sendCampaignEmail(recipient.email, {
                subject: campaign.subject,
                html: campaign.body_html
              });

              // Mettre à jour le statut du destinataire en 'sent'
              await pool.query(
                "UPDATE email_campaign_recipients SET status = 'sent', sent_at = NOW() WHERE id = $1",
                [recipient.id]
              );
              sentCount++;
            } catch (recipientErr) {
              console.error(`[Scheduler] Échec d'envoi pour ${recipient.email} :`, recipientErr);
              // Mettre à jour le statut du destinataire en 'failed' avec l'erreur
              await pool.query(
                "UPDATE email_campaign_recipients SET status = 'failed', error = $1 WHERE id = $2",
                [recipientErr.message, recipient.id]
              );
              failCount++;
            }
          }

          // 3. Marquer la campagne globale comme envoyée
          await pool.query(
            `UPDATE email_campaigns 
             SET status = 'sent', sent_at = NOW() 
             WHERE id = $1`,
            [campaign.id]
          );

          console.log(`[Scheduler] Campagne ID ${campaign.id} terminée ! (${sentCount} envoyés, ${failCount} échecs)`);
        } catch (sendErr) {
          console.error(`[Scheduler] Erreur globale pour la campagne ID ${campaign.id} :`, sendErr);
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