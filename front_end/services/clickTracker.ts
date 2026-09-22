// ARTIVA/front_end/services/clickTracker.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../constants/Api';

const SESSION_KEY = 'anon_session_id';
const TOKEN_KEY = 'artiva-auth-token';

async function getSessionId(): Promise<string> {
  try {
    let sessionId = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      await AsyncStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return 'fallback-' + Date.now();
  }
}

function getDeviceType(): string {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export async function trackProductClick(
  productId: number | string,
  referrer: string = 'direct'
): Promise<number | null> {
  try {
    const sessionId = await getSessionId();

    // Récupérer le token dynamiquement (évite les erreurs d'import)
    let authToken: string | null = null;
    try {
      const SecureStorage = require('../constants/SecureStorage');
      authToken = await SecureStorage.getItemAsync(TOKEN_KEY);
    } catch {
      authToken = null;
    }

    const headers: any = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}/tracking/product-click`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        product_id: parseInt(String(productId), 10),
        session_id: sessionId,
        device_type: getDeviceType(),
        referrer,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.clickId || null;
  } catch (error) {
    console.warn('Erreur tracking clic:', error);
    return null;
  }
}

export async function updateClickDuration(clickId: number, durationSeconds: number): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/tracking/product-click-duration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        click_id: clickId,
        duration_seconds: Math.round(durationSeconds),
      }),
    });
  } catch (error) {
    console.warn('Erreur update duration:', error);
  }
}
