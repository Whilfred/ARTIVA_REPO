// ARTIVA/back_end/utils/reviewScheduler.js

const cron = require('node-cron');
const pool = require('../config/db');
const { sendPushNotification } = require('../services/fcmService');

/**
 * Planificateur de demandes d'avis.
 *
 * Son rôle :
 * 1. Chercher les commandes livrées il y a X jours
 * 2. Qui n'ont pas encore reçu de demande d'avis
 * 3. Envoyer une push pour demander un avis
 *
 * Une fois par jour à 10h du matin.
 */

// Nombre de jours après livraison avant d'envoyer la demande
const JOURS_APRES_LIVRAISON = 7;

function startReviewScheduler() {
  // Tous les jours à 10h du matin
  cron.schedule('0 10 * * *', async () => {
    console.log('[ReviewScheduler] Vérification des demandes d\'avis à envoyer...');

    try {
      // Chercher les commandes livrées il y a X jours, sans demande d'avis
      const result = await pool.query(
        `
        SELECT 
          o.id AS order_id,
          o.user_id,
          o.order_number,
          u.fcm_token,
          u.name AS user_name,
          (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS nb_produits
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.status = 'delivered'
          AND o.updated_at <= NOW() - ($1::text || ' days')::interval
          AND o.updated_at > NOW() - (($1::int + 1)::text || ' days')::interval
          AND u.fcm_token IS NOT NULL
          AND u.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM review_requests rr WHERE rr.order_id = o.id
          )
        ORDER BY o.updated_at ASC
        `,
        [JOURS_APRES_LIVRAISON]
      );

      if (result.rows.length === 0) {
        console.log('[ReviewScheduler] Aucune demande d\'avis à envoyer.');
        return;
      }

      console.log(`[ReviewScheduler] ${result.rows.length} demande(s) d'avis à envoyer.`);

      let envoyees = 0;
      let echecs = 0;

      for (const order of result.rows) {
        try {
          const produitsTexte = order.nb_produits > 1
            ? `vos ${order.nb_produits} articles`
            : 'votre article';

          await sendPushNotification(order.fcm_token, {
            title: '⭐ Votre avis nous intéresse !',
            body: `Comment s'est passée votre commande #${order.order_number} ? Donnez votre avis sur ${produitsTexte}.`,
            data: {
              screen: 'review',
              orderId: String(order.order_id),
            },
          });

          // Marquer comme envoyé (empêche le spam)
          await pool.query(
            `INSERT INTO review_requests (order_id, user_id) VALUES ($1, $2)`,
            [order.order_id, order.user_id]
          );

          envoyees++;
          console.log(
            `[ReviewScheduler] ✅ Push envoyée pour commande #${order.order_number} (user ${order.user_id})`
          );
        } catch (pushError) {
          echecs++;
          console.error(
            `[ReviewScheduler] ❌ Erreur push commande ${order.order_number}:`,
            pushError.message
          );
        }
      }

      console.log(
        `[ReviewScheduler] Terminé : ${envoyees} envoyées, ${echecs} échecs.`
      );
    } catch (error) {
      console.error(
        '[ReviewScheduler Error] Erreur lors de l\'exécution :',
        error
      );
    }
  });

  console.log(
    '[Scheduler] Planificateur de demandes d\'avis démarré avec succès.'
  );
}

module.exports = {
  startReviewScheduler,
};
