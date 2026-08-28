// ARTIVA/back_end/utils/campaignScheduler.js

const cron = require('node-cron');
const pool = require('../config/db');
const {
  executeCampaignSend,
} = require('./../controllers/campaignController');

/**
 * Planificateur des campagnes email.
 *
 * Son rôle est uniquement de :
 * 1. rechercher les campagnes programmées arrivées à échéance ;
 * 2. les passer en "sending" ;
 * 3. déclencher executeCampaignSend().
 *
 * Toute la logique de résolution des destinataires,
 * création du snapshot et envoi des emails est centralisée
 * dans campaignController.js.
 */

function startCampaignScheduler() {
  // Exécution toutes les minutes
  cron.schedule('* * * * *', async () => {
    console.log(
      '[Scheduler] Vérification des campagnes à envoyer...'
    );

    try {
      /**
       * On récupère les campagnes programmées
       * dont la date est arrivée.
       */
      const result = await pool.query(`
        SELECT id
        FROM email_campaigns
        WHERE status = 'scheduled'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
      `);

      if (result.rows.length === 0) {
        return;
      }

      console.log(
        `[Scheduler] ${result.rows.length} campagne(s) à déclencher.`
      );

      /**
       * On traite chaque campagne.
       */
      for (const campaign of result.rows) {
        try {
          /**
           * IMPORTANT :
           *
           * On verrouille logiquement la campagne en la passant
           * de "scheduled" à "sending".
           *
           * Cela évite qu'une campagne soit déclenchée plusieurs
           * fois par le scheduler.
           */
          const claimResult = await pool.query(
            `
            UPDATE email_campaigns
            SET
              status = 'sending',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND status = 'scheduled'
            RETURNING id
            `,
            [campaign.id]
          );

          /**
           * Une autre exécution a peut-être déjà récupéré
           * cette campagne.
           */
          if (claimResult.rows.length === 0) {
            console.log(
              `[Scheduler] Campagne ${campaign.id} déjà prise en charge.`
            );

            continue;
          }

          console.log(
            `[Scheduler] Déclenchement de la campagne ${campaign.id}...`
          );

          /**
           * executeCampaignSend() s'occupe de TOUT :
           *
           * - résolution des destinataires
           * - création de email_campaign_recipients
           * - remplacement de {nom}
           * - envoi des emails
           * - statut sent / failed
           */
          await executeCampaignSend(campaign.id);

          console.log(
            `[Scheduler] Campagne ${campaign.id} terminée.`
          );
        } catch (campaignError) {
          console.error(
            `[Scheduler] Erreur campagne ${campaign.id} :`,
            campaignError
          );

          /**
           * Si une erreur globale survient, on marque
           * la campagne comme échouée.
           */
          try {
            await pool.query(
              `
              UPDATE email_campaigns
              SET
                status = 'failed',
                updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
                AND status = 'sending'
              `,
              [campaign.id]
            );
          } catch (updateError) {
            console.error(
              `[Scheduler] Impossible de mettre à jour le statut de la campagne ${campaign.id} :`,
              updateError
            );
          }
        }
      }
    } catch (error) {
      console.error(
        '[Scheduler Error] Erreur lors de l’exécution du planificateur :',
        error
      );
    }
  });

  console.log(
    '[Scheduler] Planificateur de campagnes démarré avec succès.'
  );
}

module.exports = {
  startCampaignScheduler,
};