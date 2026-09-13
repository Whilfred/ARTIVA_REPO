// ARTIVA/back_end/utils/cartScheduler.js

const cron = require('node-cron');
const pool = require('../config/db');
const { sendPushNotification } = require('../services/fcmService');

/**
 * Planificateur de rappels de panier abandonné.
 *
 * Son rôle :
 * 1. Chercher les paniers modifiés il y a plus de 24h
 * 2. Qui appartiennent à un utilisateur connecté avec token FCM
 * 3. Qui n'ont pas encore reçu de rappel
 * 4. Envoyer une push pour inciter à finaliser
 *
 * Tourne toutes les heures.
 */

// Nombre d'heures après la dernière modification avant d'envoyer le rappel
const HEURES_AVANT_RAPPEL = 24;

// Fenêtre pour éviter les doublons (1 heure)
const FENETRE_HEURES = 25;

function startCartScheduler() {
  // Toutes les heures à la minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[CartScheduler] Vérification des paniers abandonnés...');

    try {
      // Chercher les paniers abandonnés depuis X heures
      const result = await pool.query(
        `
        SELECT 
          c.id AS cart_id,
          c.user_id,
          c.updated_at,
          u.name AS user_name,
          u.fcm_token,
          COUNT(ci.id)::int AS nb_items,
          SUM(ci.quantity * p.price) AS total_amount
        FROM carts c
        JOIN users u ON c.user_id = u.id
        JOIN cart_items ci ON ci.cart_id = c.id
        JOIN products p ON p.id = ci.product_id
        WHERE c.user_id IS NOT NULL
          AND c.updated_at <= NOW() - ($1::text || ' hours')::interval
          AND c.updated_at > NOW() - ($2::text || ' hours')::interval
          AND u.fcm_token IS NOT NULL
          AND u.is_active = true
          AND p.is_published = true
          AND NOT EXISTS (
            SELECT 1 FROM cart_reminders cr WHERE cr.cart_id = c.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE o.user_id = c.user_id
              AND o.created_at > c.updated_at
          )
        GROUP BY c.id, u.id
        HAVING COUNT(ci.id) > 0
        ORDER BY c.updated_at ASC
        `,
        [HEURES_AVANT_RAPPEL, FENETRE_HEURES]
      );

      if (result.rows.length === 0) {
        console.log('[CartScheduler] Aucun panier abandonné à relancer.');
        return;
      }

      console.log(`[CartScheduler] ${result.rows.length} panier(s) à relancer.`);

      let envoyees = 0;
      let echecs = 0;

      for (const cart of result.rows) {
        try {
          const nbItems = cart.nb_items;
          const total = parseFloat(cart.total_amount || 0);
          const totalFormate = total.toLocaleString('fr-FR');

          const body = nbItems > 1
            ? `Vous avez ${nbItems} articles dans votre panier (${totalFormate} FCFA). Finalisez votre commande !`
            : `Vous avez 1 article dans votre panier (${totalFormate} FCFA). Finalisez votre commande !`;

          await sendPushNotification(cart.fcm_token, {
            title: '🛒 Votre panier vous attend !',
            body: body,
            data: {
              screen: 'cart',
              cartId: String(cart.cart_id),
            },
          });

          // Marquer comme envoyé (empêche le spam)
          await pool.query(
            `INSERT INTO cart_reminders (cart_id, user_id) VALUES ($1, $2)`,
            [cart.cart_id, cart.user_id]
          );

          envoyees++;
          console.log(
            `[CartScheduler] ✅ Push envoyée à ${cart.user_name} (user ${cart.user_id}) - ${nbItems} article(s)`
          );
        } catch (pushError) {
          echecs++;
          console.error(
            `[CartScheduler] ❌ Erreur push user ${cart.user_id}:`,
            pushError.message
          );
        }
      }

      console.log(
        `[CartScheduler] Terminé : ${envoyees} envoyées, ${echecs} échecs.`
      );
    } catch (error) {
      console.error(
        '[CartScheduler Error] Erreur lors de l\'exécution :',
        error
      );
    }
  });

  console.log(
    '[Scheduler] Planificateur de paniers abandonnés démarré avec succès.'
  );
}

module.exports = {
  startCartScheduler,
};
