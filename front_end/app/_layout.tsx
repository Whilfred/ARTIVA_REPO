// ARTIVA/front_end/app/_layout.tsx
import React, { useEffect, useRef } from 'react';
import { Stack, SplashScreen, ThemeProvider, DarkTheme, DefaultTheme, router } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import LoadingArtiva from './product/LoadingArtiva';

// ✅ AJOUT : import du service de notifications
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from '../services/pushNotificationService';

SplashScreen.preventAutoHideAsync();

function AppNavigationStack() {
  const { isLoading, effectiveAppColorScheme, userToken } = useAuth();
  const notificationInitialized = useRef(false);

  const navigationTheme = effectiveAppColorScheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      console.log("AppNavigationStack: Chargement Auth & Thème terminé, Splash Screen masqué. Thème effectif:", effectiveAppColorScheme);
    } else {
      console.log("AppNavigationStack: Chargement Auth ou Thème en cours...");
    }
  }, [isLoading, effectiveAppColorScheme]);

  // ✅ AJOUT : Initialiser les notifications quand l'utilisateur est connecté
  useEffect(() => {
    // Ne pas initialiser si pas connecté, si en chargement, ou si déjà fait
    if (!userToken || isLoading || notificationInitialized.current) {
      return;
    }

    notificationInitialized.current = true;
    console.log("🔔 Initialisation des notifications push...");

    const initPushNotifications = async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          console.log('✅ Notifications push initialisées avec succès');
        }
      } catch (error) {
        console.error('❌ Erreur initialisation push:', error);
      }
    };

    initPushNotifications();

    // Configurer les écouteurs de notifications
    const cleanup = setupNotificationListeners(
      // Notification reçue (app au premier plan)
      (notification) => {
        const { title, body } = notification.request.content;
        console.log('📨 Notification reçue:', { title, body });
      },
      // Notification cliquée (navigation)
      (response) => {
        const data = response.notification.request.content.data;
        console.log('📱 Notification cliquée, données:', data);

        // Navigation selon le type de notification
        if (data?.screen === 'order' && data?.orderId) {
          router.push(`/orders/${data.orderId}`);
        } else if (data?.screen === 'product' && data?.productId) {
          router.push(`/product/${data.productId}`);
        } else if (data?.screen === 'wishlist') {
          router.push('/(tabs)');
        } else if (data?.screen === 'notifications') {
          router.push('/notifications');
        } else if (data?.screen === 'promotions') {
          router.push('/(tabs)');
        }
      }
    );

    // Nettoyage
    return () => {
      cleanup();
    };
  }, [userToken, isLoading]);

  // Réinitialiser le flag lors de la déconnexion
  useEffect(() => {
    if (!userToken) {
      notificationInitialized.current = false;
    }
  }, [userToken]);

  if (isLoading) {
    return <LoadingArtiva theme={effectiveAppColorScheme || 'light'} />;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Information' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: 'Mes Notifications' }} />
        <Stack.Screen name="category-products/[categoryId]" options={{ title: 'Produits par Catégorie' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Détail du Produit' }} />
        <Stack.Screen name="checkout" options={{ title: 'Validation Commande', presentation: 'modal' }} />
        <Stack.Screen name="tag/[tag]" options={{ title: 'Produits par Tag' }} />
        <Stack.Screen name="orders/[orderId]" options={{ title: 'Détails Commande' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <I18nextProvider i18n={i18n}>
            <AppNavigationStack />
          </I18nextProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
