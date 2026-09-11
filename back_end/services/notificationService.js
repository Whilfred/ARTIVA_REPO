const db = require('../config/db');
const { sendPushNotification, sendMulticastNotification } = require('./fcmService');

// =============================================================================
// NOTIFIER UN UTILISATEUR SPÉCIFIQUE
// =============================================================================

/**
 * Envoie une notification push à un utilisateur (via son user_id)
 * ET enregistre une notification in-app en base.
 */
const notifyUser = async (userId, { title, body, data = {}, type = 'general', linkUrl = null, saveInApp = true }) => {
  try {
    // 1. Récupérer le token FCM de l'utilisateur
    const result = await db.query(
      'SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL',
      [userId]
    );

    // 2. Enregistrer la notification in-app (toujours)
    if (saveInApp) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, link_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, title, body, linkUrl]
      );
    }

    // 3. Envoyer la push si un token existe
    if (result.rows.length > 0 && result.rows[0].fcm_token) {
      const pushResult = await sendPushNotification(result.rows[0].fcm_token, {
        title,
        body,
        data: { ...data, type, linkUrl },
      });
      console.log(`📲 Push envoyée à user ${userId}:`, pushResult.success ? '✅' : '❌');
      return pushResult;
    } else {
      console.log(`ℹ️ Pas de token FCM pour user ${userId}, notification in-app seulement`);
      return { success: true, savedInApp: true, pushSent: false };
    }
  } catch (error) {
    console.error(`❌ Erreur notifyUser (${userId}):`, error.message);
    return { success: false, error: error.message };
  }
};

// =============================================================================
// NOTIFIER TOUS LES UTILISATEURS (Admin)
// =============================================================================

const notifyAllUsers = async ({ title, body, data = {}, type = 'announcement', linkUrl = null }) => {
  try {
    const result = await db.query(
      `SELECT id, fcm_token FROM users 
       WHERE fcm_token IS NOT NULL 
       AND is_active = true 
       AND is_deleted = false`
    );

    if (result.rows.length === 0) {
      console.log('⚠️ Aucun utilisateur avec un token FCM');
      return { success: false, error: 'Aucun destinataire' };
    }

    // 1. Enregistrer les notifications in-app en batch
    for (const user of result.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, link_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, type, title, body, linkUrl]
      );
    }

    // 2. Envoyer les pushs en multicast
    const tokens = result.rows.map((u) => u.fcm_token);
    const pushResult = await sendMulticastNotification(tokens, {
      title,
      body,
      data: { ...data, type, linkUrl },
    });

    console.log(`📢 Broadcast envoyé à ${result.rows.length} utilisateurs`);
    return pushResult;
  } catch (error) {
    console.error('❌ Erreur notifyAllUsers:', error.message);
    return { success: false, error: error.message };
  }
};

// =============================================================================
// NOTIFICATIONS PRÉDÉFINIES (templates)
// =============================================================================

/**
 * 🛒 Nouvelle commande reçue
 */
const notifyOrderCreated = async (userId, orderData) => {
  return notifyUser(userId, {
    title: '🛒 Commande reçue !',
    body: `Votre commande #${orderData.order_number} a bien été enregistrée. Merci !`,
    data: { screen: 'order', orderId: orderData.id },
    type: 'order_placed',
    linkUrl: `/orders/${orderData.id}`,
  });
};

/**
 * 📦 Changement de statut de commande
 */
const notifyOrderStatusChanged = async (userId, orderData, newStatus, trackingNumber) => {
  const messages = {
    processing: {
      title: '👨‍🍳 Commande en préparation',
      body: `Votre commande #${orderData.order_number} est en cours de préparation.`,
    },
    shipped: {
      title: '🚚 Commande expédiée !',
      body: `Votre commande #${orderData.order_number} est en route.` +
        (trackingNumber ? ` Suivi : ${trackingNumber}` : ''),
    },
    delivered: {
      title: '📦 Commande livrée !',
      body: `Votre commande #${orderData.order_number} a été livrée. Bonne découverte !`,
    },
    cancelled: {
      title: '❌ Commande annulée',
      body: `Votre commande #${orderData.order_number} a été annulée.`,
    },
    refunded: {
      title: '💸 Remboursement en cours',
      body: `Votre commande #${orderData.order_number} sera remboursée.`,
    },
    failed: {
      title: '⚠️ Paiement échoué',
      body: `Le paiement de votre commande #${orderData.order_number} a échoué.`,
    },
  };

  const msg = messages[newStatus];
  if (!msg) {
    console.log(`ℹ️ Pas de notification pour le statut: ${newStatus}`);
    return { success: true, skipped: true };
  }

  return notifyUser(userId, {
    title: msg.title,
    body: msg.body,
    data: { screen: 'order', orderId: orderData.id },
    type: `order_${newStatus}`,
    linkUrl: `/orders/${orderData.id}`,
  });
};

/**
 * 🎁 Livraison gratuite débloquée
 */
const notifyFreeShippingEarned = async (userId, amount, expiresAt) => {
  return notifyUser(userId, {
    title: '🎁 Livraison gratuite débloquée !',
    body: `Vos achats (${amount} FCFA) vous offrent la livraison sur votre prochaine commande !`,
    data: { screen: 'home' },
    type: 'free_shipping_earned',
    linkUrl: '/orders',
  });
};

/**
 * 🎉 Bon d'achat de bienvenue
 */
const notifyWelcomeGift = async (userId, promoCode, amount = 2000) => {
  return notifyUser(userId, {
    title: `🎁 ${amount} FCFA offerts !`,
    body: `Utilisez le code ${promoCode} sur votre première commande.`,
    data: { screen: 'home', promoCode },
    type: 'welcome_gift',
    linkUrl: '/(tabs)',
  });
};

/**
 * ❤️ Retour en stock (wishlist)
 */
const notifyWishlistRestock = async (userId, product) => {
  return notifyUser(userId, {
    title: '🎉 Article de retour en stock !',
    body: `${product.name} est de nouveau disponible. Dépêchez-vous !`,
    data: { screen: 'product', productId: product.id },
    type: 'wishlist_restock',
    linkUrl: `/product/${product.id}`,
  });
};

/**
 * 💰 Promotion personnalisée
 */
const notifyPromotion = async (userId, { title, body, promoCode, linkUrl }) => {
  return notifyUser(userId, {
    title: title || '🔥 Promo exclusive !',
    body: body || `Un code promo vous attend : ${promoCode}`,
    data: { screen: 'promotions', promoCode },
    type: 'promotion',
    linkUrl: linkUrl || '/(tabs)',
  });
};

module.exports = {
  notifyUser,
  notifyAllUsers,
  notifyOrderCreated,
  notifyOrderStatusChanged,
  notifyFreeShippingEarned,
  notifyWelcomeGift,
  notifyWishlistRestock,
  notifyPromotion,
};
