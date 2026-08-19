// ARTIVA/front_end/app/index.tsx

import { Redirect } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoadingArtiva from './product/LoadingArtiva';

export default function StartPage() {
  const { userToken, isLoading: isAuthLoading, effectiveAppColorScheme } = useAuth();

  useEffect(() => {
    if (!isAuthLoading) {
      console.log(
        "StartPage (index.tsx): Vérification Auth terminée. Token:",
        userToken ? "Présent" : "Absent"
      );
    }
  }, [isAuthLoading, userToken]);

  if (isAuthLoading) {
    console.log("StartPage (index.tsx): Auth en cours de chargement...");
    // ✅ Remplacement du ActivityIndicator par LoadingArtiva
    return <LoadingArtiva theme={effectiveAppColorScheme || 'light'} />;
  }

  // Une fois que l'état d'authentification est connu, redirection vers les onglets
  console.log("StartPage (index.tsx): Redirection vers /(tabs)/");
  return <Redirect href="/(tabs)" />;
}
