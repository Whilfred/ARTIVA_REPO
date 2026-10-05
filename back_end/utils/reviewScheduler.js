// ARTIVA/back_end/utils/reviewScheduler.js

const cron = require('node-cron');
const pool = require('../config/db');
const { sendPushNotification } = require('../services/fcmService');
const { sendReviewRequestEmail } = require('./sendEmail.js');

/**
 * Planificateur de demandes d'avis.
 *
 * Son rôle :
 * 1. Chercher les commandes livrées depuis 2h à 3h
 * 2. Qui n'ont pas encore reçu de demande d'avis
 * 3. Envoyer un email + une push pour demander un avis
 *
 * Toutes les heures à la minute :20.
 */

const HEURES_APRES_LIVRAISON = 2;
const FENETRE_HEURES = 3;

function startReviewScheduler() {
  cron.schedule('20 * * * *', async () => {
    console.log('[ReviewScheduler] Vérification des demandes d\'avis à envoyer...');

    try {
      // Chercher les commandes livrées il y a 2h à 3h, sans demande d'avis
      const result = await pool.query(
        `
        SELECT
          o.id AS order_id,
          o.user_id,
          o.order_number,
          u.name AS user_name,
          u.email AS user_email,
          u.fcm_token,
          (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS nb_produits
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.status = 'delivered'
          AND o.updated_at <= NOW() - ($1::text || ' hours')::interval
          AND o.updated_at > NOW() - ($2::text || ' hours')::interval
          AND u.is_active = true
          AND u.email IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM review_requests rr WHERE rr.order_id = o.id
          )
        ORDER BY o.updated_at ASC
        `,
        [HEURES_APRES_LIVRAISON, FENETRE_HEURES]
      );

      if (result.rows.length === 0) {
        console.log('[ReviewScheduler] Aucune demande d\'avis à envoyer.');
        return;
      }

      console.log(`[ReviewScheduler] ${result.rows.length} demande(s) d'avis à envoyer.`);

      let emailEnvoyes = 0;
      let pushEnvoyees = 0;
      let echecs = 0;

      for (const order of result.rows) {
        try {
          const user = {
            name: order.user_name,
            email: order.user_email,
            fcm_token: order.fcm_token,
          };

          // 1. Envoyer l'EMAIL (toujours, si email dispo)
          let emailSent = false;
          if (user.email) {
            try {
              await sendReviewRequestEmail(user.email, user.name, {
                orderNumber: order.order_number,
              });
              emailSent = true;
              emailEnvoyes++;
              console.log(`[ReviewScheduler] 📧 Email envoyé à ${user.email} (commande #${order.order_number})`);
            } catch (emailErr) {
              console.error(`[ReviewScheduler] ❌ Erreur email user ${order.user_id}:`, emailErr.message);
            }
          }

          // 2. Envoyer la PUSH (si token FCM dispo)
          let pushSent = false;
          if (user.fcm_token) {
            try {
              await sendPushNotification(user.fcm_token, {
                title: '⭐ Votre avis nous intéresse !',
                body: `Comment s'est passée votre commande #${order.order_number} ? Laissez-nous un avis !`,
                data: {
                  screen: 'review',
                  orderId: String(order.order_id),
                },
              });
              pushSent = true;
              pushEnvoyees++;
              console.log(`[ReviewScheduler] 📲 Push envoyée pour commande #${order.order_number}`);
            } catch (pushErr) {
              console.error(`[ReviewScheduler] ❌ Erreur push user ${order.user_id}:`, pushErr.message);
            }
          } else {
            console.log(`[ReviewScheduler] ℹ️ Pas de token FCM pour user ${order.user_id}`);
          }

          // 3. Marquer comme envoyé (empêche le spam)
          if (emailSent || pushSent) {
            await pool.query(
              `INSERT INTO review_requests (order_id, user_id) VALUES ($1, $2)`,
              [order.order_id, order.user_id]
            );
          }
        } catch (orderErr) {
          echecs++;
          console.error(`[ReviewScheduler] ❌ Erreur commande ${order.order_number}:`, orderErr.message);
        }
      }

      console.log(
        `[ReviewScheduler] Terminé : ${emailEnvoyes} emails, ${pushEnvoyees} pushs, ${echecs} échecs.`
      );
    } catch (error) {
      console.error('[ReviewScheduler Error] Erreur lors de l\'exécution :', error);
    }
  });

  console.log('[Scheduler] Planificateur de demandes d\'avis démarré avec succès.');
}

module.exports = {
  startReviewScheduler,
};
