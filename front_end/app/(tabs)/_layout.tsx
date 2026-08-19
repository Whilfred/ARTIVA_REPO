// front_end/app/(tabs)/_layout.tsx

import React, { useEffect } from 'react'; // ← AJOUTER useEffect
import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router'; // ← AJOUTER
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userToken, isLoading: isAuthLoading, unreadNotificationCount } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter(); // ← AJOUTER

  // 🔥 PROTECTION : Redirige vers login si non connecté
  useEffect(() => {
    if (!isAuthLoading && !userToken) {
      router.replace('/login');
    }
  }, [userToken, isAuthLoading, router]);

  if (isAuthLoading) {
    return null;
  }

  // Si pas de token, on ne rend pas les onglets (la redirection va prendre le relais)
  if (!userToken) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          height: 65 + (insets.bottom > 0 ? insets.bottom : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHeaders.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="ShopScreen"
        options={{
          title: t('tabHeaders.shop'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'storefront' : 'storefront-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="WishlistScreen"
        options={{
          title: t('tabHeaders.wishlist'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="CartScreen"
        options={{
          title: t('tabHeaders.cart'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bag-handle' : 'bag-handle-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="ProfileScreen"
        options={{
          title: t('tabHeaders.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarBadge:
            unreadNotificationCount > 0
              ? unreadNotificationCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: 'white',
          },
        }}
      />
    </Tabs>
  );
}