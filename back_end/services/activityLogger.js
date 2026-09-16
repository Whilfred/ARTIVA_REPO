// ARTIVA/back_end/services/activityLogger.js
// Service pour tracer toutes les activités des utilisateurs.

const db = require('../config/db');

// Types d'événements (pour cohérence)
const EVENT_TYPES = {
  WISHLIST_ADD: 'wishlist_add',
  WISHLIST_REMOVE: 'wishlist_remove',
  CART_ADD: 'cart_add',
  CART_UPDATE: 'cart_update',
  CART_REMOVE: 'cart_remove',
  APP_LOGIN: 'app_login',
  APP_LOGOUT: 'app_logout',
  APP_OPEN: 'app_open',
  APP_EXIT: 'app_exit',
  EMAIL_SENT: 'email_sent',
  PUSH_SENT: 'push_sent',
  ORDER_CREATED: 'order_created',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  USER_REGISTER: 'user_register',
};

/**
 * Enregistre une activité dans la table activity_log.
 * 
 * @param {Object} params
 * @param {number} params.userId - ID de l'utilisateur (peut être null)
 * @param {string} params.userName - Nom de l'utilisateur
 * @param {string} params.userEmail - Email de l'utilisateur
 * @param {string} params.eventType - Type d'événement (voir EVENT_TYPES)
 * @param {string} params.title - Titre court
 * @param {string} params.description - Description détaillée
 * @param {Object} params.metadata - Données supplémentaires (JSONB)
 */
async function logActivity({ userId, userName, userEmail, eventType, title, description, metadata = {} }) {
  try {
    await db.query(
      `INSERT INTO activity_log (user_id, user_name, user_email, event_type, title, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        userName || null,
        userEmail || null,
        eventType,
        title || null,
        description || null,
        JSON.stringify(metadata),
      ]
    );
    console.log(`📝 Activity logged: ${eventType} - ${title || description}`);
  } catch (error) {
    console.error('❌ Erreur logActivity:', error.message);
    // Ne jamais planter l'app à cause d'un log raté
  }
}

/**
 * Enregistre qu'un email a été envoyé.
 */
async function logEmailSent({ userId, userName, userEmail, emailType, subject }) {
  return logActivity({
    userId,
    userName,
    userEmail,
    eventType: EVENT_TYPES.EMAIL_SENT,
    title: `Email envoyé : ${subject || emailType}`,
    description: `Type: ${emailType}`,
    metadata: { emailType, subject },
  });
}

/**
 * Enregistre qu'une push a été envoyée.
 */
async function logPushSent({ userId, userName, userEmail, pushTitle, pushBody }) {
  return logActivity({
    userId,
    userName,
    userEmail,
    eventType: EVENT_TYPES.PUSH_SENT,
    title: `Push envoyée : ${pushTitle}`,
    description: pushBody || '',
    metadata: { pushTitle, pushBody },
  });
}

module.exports = {
  logActivity,
  logEmailSent,
  logPushSent,
  EVENT_TYPES,
};
