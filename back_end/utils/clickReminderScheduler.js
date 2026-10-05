// ARTIVA/back_end/utils/clickReminderScheduler.js
const cron = require('node-cron');
const pool = require('../config/db');
const { sendPushNotification } = require('../services/fcmService');
const { sendClickReminderEmail } = require('./sendEmail.js');

const HEURES_AVANT_RAPPEL = 24;
const FENETRE_HEURES = 25;
const MAX_PRODUITS = 5;
const MAX_ENVOIS_PAR_SEMAINE = 3;

function startClickReminderScheduler() {
  cron.schedule('45 * * * *', async () => {
    console.log('[ClickReminder] Vérification des clics à relancer...');

    try {
      // 1. Trouver les users qui ont cliqué dans la fenêtre 24h-25h
      const usersResult = await pool.query(
        `
        SELECT DISTINCT upc.user_id
        FROM user_product_clicks upc
        JOIN users u ON u.id = upc.user_id
        WHERE upc.user_id IS NOT NULL
          AND upc.clicked_at <= NOW() - ($1::text || ' hours')::interval
          AND upc.clicked_at > NOW() - ($2::text || ' hours')::interval
          AND u.is_active = true
          AND u.email IS NOT NULL
        `,
        [HEURES_AVANT_RAPPEL, FENETRE_HEURES]
      );

      if (usersResult.rows.length === 0) {
        console.log('[ClickReminder] Aucun user à relancer.');
        return;
      }

      console.log(`[ClickReminder] ${usersResult.rows.length} user(s) à traiter.`);

      let envoyes = 0;
      let ignores = 0;
      let echecs = 0;

      for (const { user_id } of usersResult.rows) {
        try {
          // 2. Vérifier anti-spam : pas plus de 3 envois dans les 7 derniers jours
          const spamCheck = await pool.query(
            `
            SELECT COUNT(*)::int AS n
            FROM click_reminders
            WHERE user_id = $1
              AND sent_at > NOW() - INTERVAL '7 days'
            `,
            [user_id]
          );

          if (spamCheck.rows[0].n >= MAX_ENVOIS_PAR_SEMAINE) {
            console.log(`[ClickReminder] User ${user_id} ignoré (quota hebdo atteint)`);
            ignores++;
            continue;
          }

          // 3. Vérifier qu'on n'a pas déjà envoyé récemment (24h)
          const recentCheck = await pool.query(
            `
            SELECT 1 FROM click_reminders
            WHERE user_id = $1
              AND sent_at > NOW() - INTERVAL '24 hours'
            `,
            [user_id]
          );

          if (recentCheck.rows.length > 0) {
            console.log(`[ClickReminder] User ${user_id} ignoré (déjà relancé dans les 24h)`);
            ignores++;
            continue;
          }

          // 4. Récupérer les derniers produits vus (max 5, distincts)
          // En excluant ceux déjà achetés après le clic
          const productsResult = await pool.query(
            `
            WITH derniers_clics AS (
              SELECT DISTINCT ON (upc.product_id)
                upc.product_id,
                upc.clicked_at
              FROM user_product_clicks upc
              WHERE upc.user_id = $1
                AND upc.clicked_at > NOW() - INTERVAL '48 hours'
              ORDER BY upc.product_id, upc.clicked_at DESC
            )
            SELECT
              p.id,
              p.name,
              p.price,
              p.stock,
              p.image_url,
              dc.clicked_at
            FROM derniers_clics dc
            JOIN products p ON p.id = dc.product_id
            WHERE p.is_published = true
              AND NOT EXISTS (
                SELECT 1 FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.user_id = $1
                  AND oi.product_id = dc.product_id
                  AND o.created_at > dc.clicked_at
              )
            ORDER BY dc.clicked_at DESC
            LIMIT $2
            `,
            [user_id, MAX_PRODUITS]
          );

          if (productsResult.rows.length === 0) {
            console.log(`[ClickReminder] User ${user_id} : aucun produit à relancer`);
            ignores++;
            continue;
          }

          const products = productsResult.rows;
          const productIds = products.map((p) => p.id);

          // 5. Récupérer les infos du user
          const userResult = await pool.query(
            'SELECT name, email, fcm_token FROM users WHERE id = $1',
            [user_id]
          );

          if (userResult.rows.length === 0) {
            ignores++;
            continue;
          }

          const user = userResult.rows[0];

          // 6. Envoyer l'email
          let emailSent = false;
          let errorMessage = null;

          try {
            await sendClickReminderEmail(user.email, user.name, { products });
            emailSent = true;
          } catch (emailErr) {
            errorMessage = emailErr.message;
            console.error(`[ClickReminder] Erreur email user ${user_id}:`, emailErr.message);
          }

          // 7. Envoyer la push (si token dispo)
          let pushSent = false;
          if (user.fcm_token) {
            try {
              await sendPushNotification(user.fcm_token, {
                title: '👀 Vous avez regardé ces articles...',
                body: products.length > 1
                  ? `${products.length} articles vous attendent sur Artiva !`
                  : `"${products[0].name}" vous attend sur Artiva !`,
                data: { screen: 'catalog' },
              });
              pushSent = true;
            } catch (pushErr) {
              console.error(`[ClickReminder] Erreur push user ${user_id}:`, pushErr.message);
            }
          }

          // 8. Marquer dans click_reminders
          await pool.query(
            `
            INSERT INTO click_reminders
              (user_id, product_count, product_ids, email_sent, push_sent, error_message)
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              user_id,
              products.length,
              productIds,
              emailSent,
              pushSent,
              errorMessage,
            ]
          );

          envoyes++;
          console.log(
            `[ClickReminder] ✅ Relance envoyée à ${user.name} (${products.length} produit(s))`
          );
        } catch (userErr) {
          echecs++;
          console.error(`[ClickReminder] ❌ Erreur user ${user_id}:`, userErr.message);
        }
      }

      console.log(
        `[ClickReminder] Terminé : ${envoyes} envoyées, ${ignores} ignorées, ${echecs} échecs.`
      );
    } catch (error) {
      console.error('[ClickReminder Error]:', error);
    }
  });

  console.log('[Scheduler] Planificateur de rappels de clics démarré.');
}

module.exports = { startClickReminderScheduler };
