const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');

// =============================================================================
// Initialisation Firebase Admin (une seule fois)
// =============================================================================

let messaging = null;

if (getApps().length === 0) {
  try {
    const serviceAccount = require(
      path.join(__dirname, '../config/firebase-service-account.json')
    );

    initializeApp({
      credential: cert(serviceAccount),
    });

    console.log('✅ Firebase Admin initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin:', error.message);
  }
}

messaging = getMessaging();

// =============================================================================
// Envoyer une notification push à UN utilisateur
// =============================================================================

const sendPushNotification = async (pushToken, { title, body, data = {} }) => {
  if (!pushToken) {
    console.warn('⚠️ Pas de token fourni');
    return { success: false, error: 'Token manquant' };
  }

  // Token Expo Push → API Expo
  if (pushToken.startsWith('ExponentPushToken[')) {
    return await sendViaExpoAPI(pushToken, { title, body, data });
  }

  // Token FCM natif → Firebase Admin
  try {
    const message = {
      token: pushToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: { channelId: 'default', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    const response = await messaging.send(message);
    console.log('✅ Notification FCM envoyée:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Erreur FCM:', error.message);
    return { success: false, error: error.message };
  }
};

// =============================================================================
// Envoyer via l'API Expo Push (recommandé pour Expo)
// =============================================================================

const sendViaExpoAPI = async (expoPushToken, { title, body, data = {} }) => {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data?.status === 'ok') {
      console.log('✅ Notification Expo envoyée:', result.data.id);
      return { success: true, id: result.data.id };
    } else {
      console.error('❌ Erreur Expo Push:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Erreur réseau Expo Push:', error.message);
    return { success: false, error: error.message };
  }
};

// =============================================================================
// Envoyer à PLUSIEURS utilisateurs
// =============================================================================

const sendMulticastNotification = async (expoPushTokens, { title, body, data = {} }) => {
  if (!expoPushTokens || expoPushTokens.length === 0) {
    console.warn('⚠️ Aucun token fourni');
    return { success: false, error: 'Aucun token' };
  }

  try {
    const messages = expoPushTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default',
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    const results = [];
    for (const chunk of chunks) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      results.push(result);
    }

    const successCount = results
      .flatMap((r) => r.data || [])
      .filter((d) => d.status === 'ok').length;

    console.log(`✅ ${successCount}/${expoPushTokens.length} notifications envoyées`);
    return {
      success: true,
      successCount,
      total: expoPushTokens.length,
      results,
    };
  } catch (error) {
    console.error('❌ Erreur multicast:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastNotification,
  getMessaging,
};
