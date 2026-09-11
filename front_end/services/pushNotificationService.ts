import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from '../constants/SecureStorage';  // ✅ VOTRE wrapper
import { API_BASE_URL } from '../constants/Api';             // ✅ Votre config API

// =============================================================================
// Configuration du handler pour les notifications en premier plan
// =============================================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// =============================================================================
// Récupérer le token Expo Push
// =============================================================================

export const registerForPushNotifications = async (): Promise<string | null> => {
  let token: string | null = null;

  if (!Device.isDevice) {
    console.warn('⚠️ Les notifications push nécessitent un appareil physique');
    return null;
  }

  try {
    // 1. Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Permission refusée');
      return null;
    }

    // 2. Canal Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications Artiva',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
      });
    }

    // 3. Token Expo Push
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('❌ projectId Expo manquant');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    token = tokenData.data;
    console.log('🔑 Token Push obtenu:', token);

    // 4. Envoi au backend
    if (token) {
      await sendTokenToBackend(token);
    }

    return token;

  } catch (error) {
    console.error('❌ Erreur récupération token:', error);
    return null;
  }
};

// =============================================================================
// Envoyer le token au backend
// =============================================================================

const sendTokenToBackend = async (token: string) => {
  try {
    // ✅ VOTRE clé de token
    const authToken = await SecureStore.getItemAsync('artiva-auth-token');
    if (!authToken) {
      console.warn('⚠️ Pas de token JWT, impossible d\'envoyer le token Push');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/users/fcm-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fcmToken: token,
        platform: Platform.OS,
        deviceId: Device.osBuildId || Device.modelName || 'unknown',
      }),
    });

    if (response.ok) {
      console.log('✅ Token envoyé au backend avec succès');
    } else {
      console.error('❌ Erreur envoi token:', await response.text());
    }
  } catch (error) {
    console.error('❌ Erreur réseau:', error);
  }
};

// =============================================================================
// Écouter les notifications
// =============================================================================

export const setupNotificationListeners = (
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) => {
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📨 Notification reçue:', notification);
    onNotificationReceived?.(notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('📱 Notification cliquée:', response);
    onNotificationTapped?.(response);
  });

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
};
