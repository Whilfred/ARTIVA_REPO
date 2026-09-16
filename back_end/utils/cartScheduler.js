// ARTIVA/back_end/utils/cartScheduler.js
const cron = require('node-cron');
const pool = require('../config/db');
const { sendPushNotification } = require('../services/fcmService');
const { sendCartReminderEmail } = require('../utils/sendEmail.js');

const HEURES_AVANT_RAPPEL = 1;
const FENETRE_HEURES = 2;

function startCartScheduler() {
  cron.schedule('30 * * * *', async () => {
    console.log('[CartScheduler] Vérification des paniers abandonnés...');

    try {
      const result = await pool.query(
        `
        SELECT 
          c.id AS cart_id,
          c.user_id,
          c.updated_at,
          u.name AS user_name,
          u.email AS user_email,
          u.fcm_token,
          json_agg(
            json_build_object(
              'product_id', ci.product_id,
              'name', p.name,
              'price', p.price,
              'quantity', ci.quantity,
              'image_url', p.image_url
            ) ORDER BY ci.added_at DESC
          ) AS items,
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
          const items = cart.items;
          const nbItems = items.reduce((sum, i) => sum + i.quantity, 0);
          const total = parseFloat(cart.total_amount || 0);

          // 1. Push
          if (cart.fcm_token) {
            await sendPushNotification(cart.fcm_token, {
              title: '🛒 Votre panier vous attend !',
              body: nbItems > 1
                ? `${nbItems} articles (${total.toLocaleString('fr-FR')} FCFA) n'attendent que vous.`
                : `"${items[0].name}" vous attend dans votre panier.`,
              data: { screen: 'cart' },
            });
          }

          // 2. Email
          if (cart.user_email) {
            await sendCartReminderEmail(cart.user_email, cart.user_name, {
              items,
              totalAmount: total,
              totalItems: nbItems,
            });
          }

          // 3. Marquer comme envoyé
          await pool.query(
            `INSERT INTO cart_reminders (cart_id, user_id) VALUES ($1, $2)`,
            [cart.cart_id, cart.user_id]
          );

          envoyees++;
          console.log(`[CartScheduler] ✅ Relance envoyée à ${cart.user_name} (${nbItems} article(s))`);
        } catch (err) {
          echecs++;
          console.error(`[CartScheduler] ❌ Erreur user ${cart.user_id}:`, err.message);
        }
      }

      console.log(`[CartScheduler] Terminé : ${envoyees} envoyées, ${echecs} échecs.`);
    } catch (error) {
      console.error('[CartScheduler Error]:', error);
    }
  });

  console.log('[Scheduler] Planificateur de paniers abandonnés démarré avec succès.');
}

module.exports = { startCartScheduler };
