// ARTIVA/front_end/app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, SplashScreen, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import LoadingArtiva from './product/LoadingArtiva';

// Depuis le SDK 56, expo-router refuse de cohabiter avec react-navigation :
// il fournit lui-meme ThemeProvider, DarkTheme et DefaultTheme.

SplashScreen.preventAutoHideAsync();

function AppNavigationStack() {
  const { isLoading, effectiveAppColorScheme } = useAuth();

  const navigationTheme = effectiveAppColorScheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      console.log("AppNavigationStack: Chargement Auth & Thème terminé, Splash Screen masqué. Thème effectif:", effectiveAppColorScheme);
    } else {
      console.log("AppNavigationStack: Chargement Auth ou Thème en cours...");
    }
  }, [isLoading, effectiveAppColorScheme]);

  // ✅ CORRECTION : Utiliser effectiveAppColorScheme au lieu de currentScheme
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