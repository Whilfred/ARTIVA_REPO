// ARTIVA/front_end/app/settings/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import Colors from '../../constants/Colors'; // Ajuste le chemin
import { useColorScheme } from '../../components/useColorScheme'; // Ajuste le chemin
import { useTranslation } from 'react-i18next'; // Pour traduire les titres d'en-tête


export default function SettingsLayout() {
  const colorScheme = useColorScheme();
   const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].card,
        },
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitle: t('navigation.back', 'Retour'), // Texte du bouton retour sur iOS
      }}
    >
      <Stack.Screen name="index" options={{ title: t('settingsScreen.title', 'Mes Paramètres'), headerShown: true }} />
      <Stack.Screen name="edit-profile" options={{ title: t('settingsScreen.editProfile', 'Modifier le Profil') }} />
      <Stack.Screen name="change-password" options={{ title: t('settingsScreen.changePassword', 'Changer Mot de Passe') }} />
      <Stack.Screen name="preferences" options={{ title: t('settingsScreen.preferences', 'Préférences d\'Affichage') }} />
      <Stack.Screen name="language" options={{ title:  t('settingsScreen.language', 'Langue') }} />
    </Stack>
  );
}