const cron = require('node-cron');
const pool = require('../config/db');
const { sendPushNotification } = require('../services/fcmService');
const { sendWishlistReminderEmail } = require('../utils/sendEmail.js');

const HEURES_AVANT_RAPPEL = 24;
const FENETRE_HEURES = 25;

function startWishlistReminderScheduler() {
  cron.schedule('15 * * * *', async () => {
    console.log('[WishlistReminder] Vérification des wishlists à relancer...');

    try {
      const result = await pool.query(
        `
        SELECT 
          wi.user_id,
          u.name,
          u.email,
          u.fcm_token,
          json_agg(
            json_build_object(
              'product_id', wi.product_id,
              'name', p.name,
              'price', p.price,
              'image_url', p.image_url
            ) ORDER BY wi.added_at DESC
          ) AS products
        FROM wishlist_items wi
        JOIN users u ON u.id = wi.user_id
        JOIN products p ON p.id = wi.product_id
        WHERE wi.added_at <= NOW() - ($1::text || ' hours')::interval
          AND wi.added_at > NOW() - ($2::text || ' hours')::interval
          AND u.fcm_token IS NOT NULL
          AND u.is_active = true
          AND p.is_published = true
          AND p.stock > 0
          AND NOT EXISTS (
            SELECT 1 FROM wishlist_reminders wr 
            WHERE wr.user_id = wi.user_id AND wr.product_id = wi.product_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = wi.user_id AND ci.product_id = wi.product_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.user_id = wi.user_id 
              AND oi.product_id = wi.product_id
              AND o.created_at > wi.added_at
          )
        GROUP BY wi.user_id, u.name, u.email, u.fcm_token
        HAVING COUNT(wi.product_id) > 0
        `,
        [HEURES_AVANT_RAPPEL, FENETRE_HEURES]
      );

      if (result.rows.length === 0) {
        console.log('[WishlistReminder] Aucune wishlist à relancer.');
        return;
      }

      console.log(`[WishlistReminder] ${result.rows.length} utilisateur(s) à relancer.`);

      let envoyees = 0;
      let echecs = 0;

      for (const user of result.rows) {
        try {
          const products = user.products;
          const count = products.length;

          // 1. Push
          if (user.fcm_token) {
            await sendPushNotification(user.fcm_token, {
              title: '❤️ Vos coups de cœur vous attendent !',
              body: count > 1
                ? `${count} articles de votre wishlist sont toujours disponibles.`
                : `"${products[0].name}" est toujours dans votre wishlist.`,
              data: { screen: 'wishlist' },
            });
          }

          // 2. Email
          if (user.email) {
            await sendWishlistReminderEmail(user.email, user.name, { products });
          }

          // 3. Marquer comme envoyé (chaque produit)
          for (const p of products) {
            await pool.query(
              `INSERT INTO wishlist_reminders (user_id, product_id) 
               VALUES ($1, $2) 
               ON CONFLICT (user_id, product_id) DO NOTHING`,
              [user.user_id, p.product_id]
            );
          }

          envoyees++;
          console.log(`[WishlistReminder] ✅ Relance envoyée à ${user.name} (${count} produit(s))`);
        } catch (err) {
          echecs++;
          console.error(`[WishlistReminder] ❌ Erreur user ${user.user_id}:`, err.message);
        }
      }

      console.log(`[WishlistReminder] Terminé : ${envoyees} envoyées, ${echecs} échecs.`);
    } catch (error) {
      console.error('[WishlistReminder Error]:', error);
    }
  });

  console.log('[Scheduler] Planificateur de relance wishlist démarré avec succès.');
}

module.exports = { startWishlistReminderScheduler };
