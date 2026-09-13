const db = require('../config/db');
const { sendPushNotification } = require('./fcmService');
const { sendPriceDropEmail } = require('../utils/sendEmail.js');

// Seuil minimum de baisse en pourcentage (ex: 5 = 5%)
const SEUIL_POURCENTAGE = 5;

/**
 * Notifie les utilisateurs quand un prix baisse.
 * Appelé depuis productController.updateProduct() après un UPDATE de prix.
 *
 * @param {number} productId - ID du produit
 * @param {number} oldPrice - Ancien prix
 * @param {number} newPrice - Nouveau prix
 * @param {string} productName - Nom du produit
 * @param {object} client - Client PostgreSQL (transaction)
 */
async function notifyPriceDrop(productId, oldPrice, newPrice, productName, client) {
  const db_or_client = client || db;

  try {
    if (oldPrice === null || newPrice >= oldPrice || oldPrice <= 0) {
      return;
    }

    const baisse = oldPrice - newPrice;
    const pourcentage = Math.round((baisse / oldPrice) * 100);

    if (pourcentage < SEUIL_POURCENTAGE) {
      console.log(`ℹ️ Baisse trop faible pour produit ${productId} (${pourcentage}% < ${SEUIL_POURCENTAGE}%)`);
      return;
    }

    console.log(`💰 Baisse de prix détectée pour "${productName}" : ${oldPrice} → ${newPrice} (-${pourcentage}%)`);
    const query = `
      SELECT DISTINCT
        u.id AS user_id,
        u.name,
        u.email,
        u.fcm_token,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM wishlist_items wi 
            WHERE wi.user_id = u.id AND wi.product_id = $1
          ) THEN 'wishlist'
          ELSE 'cart'
        END AS source
      FROM users u
      WHERE u.is_active = true
        AND (
          EXISTS (
            SELECT 1 FROM wishlist_items wi
            WHERE wi.user_id = u.id AND wi.product_id = $1
          )
          OR
          EXISTS (
            SELECT 1 FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = u.id AND ci.product_id = $1
          )
        )
    `;

    const { rows } = await db_or_client.query(query, [productId]);

    if (rows.length === 0) {
      console.log(`ℹ️ Aucun utilisateur en wishlist/panier pour produit ${productId}`);
      return;
    }

    console.log(`📢 Produit ${productId} en baisse : ${rows.length} utilisateur(s) à notifier`);

    let pushOk = 0;
    let emailOk = 0;
    let pushErr = 0;
    let emailErr = 0;

    for (const user of rows) {
      // 3. Envoyer la PUSH
      if (user.fcm_token) {
        try {
          await sendPushNotification(user.fcm_token, {
            title: '💰 Baisse de prix !',
            body: `"${productName}" a baissé de ${pourcentage}% ! Nouveau prix : ${newPrice} FCFA`,
            data: {
              screen: 'product',
              productId: String(productId),
            },
          });
          pushOk++;
          console.log(`📲 Push envoyée à ${user.name} (user ${user.user_id})`);
        } catch (err) {
          pushErr++;
          console.error(`❌ Erreur push user ${user.user_id}:`, err.message);
        }
      } else {
        console.log(`ℹ️ Pas de token FCM pour ${user.name} (user ${user.user_id})`);
      }

      // 4. Envoyer l'EMAIL
      if (user.email) {
        try {
          await sendPriceDropEmail(user.email, user.name, {
            productName,
            oldPrice,
            newPrice,
            pourcentage,
            source: user.source,
          });
          emailOk++;
        } catch (err) {
          emailErr++;
          console.error(`❌ Erreur email user ${user.user_id} (${user.email}):`, err.message);
        }
      }

      // 5. Tracer dans la DB (pour historique)
      try {
        await db_or_client.query(
          `INSERT INTO price_drop_notifications 
             (product_id, user_id, old_price, new_price, source)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, user.user_id, oldPrice, newPrice, user.source]
        );
      } catch (traceErr) {
        console.error(`⚠️ Erreur traçage price_drop pour user ${user.user_id}:`, traceErr.message);
      }
    }

    console.log(`✅ Baisse de prix terminée pour "${productName}" : ${pushOk} push, ${emailOk} email (${pushErr} erreurs push, ${emailErr} erreurs email)`);

  } catch (error) {
    console.error('❌ Erreur notifyPriceDrop:', error);
  }
}

module.exports = { notifyPriceDrop };
