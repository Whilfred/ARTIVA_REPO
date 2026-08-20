// =============================================================================
// front_end/constants/SecureStorage.ts
// Stockage du jeton d'authentification, valable sur mobile ET dans le navigateur.
// =============================================================================
// `expo-secure-store` ne fonctionne que sur iOS et Android : son implémentation
// web (node_modules/expo-secure-store/build/ExpoSecureStore.web.js) se réduit à
// `export default {}`. Appeler setItemAsync() depuis un navigateur échoue donc,
// le jeton n'est jamais enregistré, et l'utilisateur est renvoyé à l'écran de
// connexion juste après avoir saisi son code — sans message d'erreur.
//
// Ce module expose les trois mêmes fonctions et choisit le support selon la
// plateforme :
//   - mobile   -> SecureStore (Keychain iOS / Keystore Android, chiffré)
//   - web      -> localStorage du navigateur
//
// ⚠ Le navigateur n'offre aucun équivalent chiffré : localStorage est lisible
// par tout script de la page. C'est acceptable pour le développement et les
// tests, mais le mode web ne doit pas servir à manipuler de vrais comptes
// clients en production.
// =============================================================================

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    // `window` est absent pendant le rendu statique côté serveur d'expo-router.
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
