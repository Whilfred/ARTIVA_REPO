// ARTIVA/front_end/context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import * as SecureStore from "../constants/SecureStorage"; // SecureStore sur mobile, localStorage sur web — voir ce fichier
import { Appearance, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier
import { normalizeColorScheme } from "../constants/ColorScheme";
// import { GoogleSignin } from '@react-native-google-signin/google-signin'; // COMMENTÉ
// import { googleConfig } from '../constants/GoogleAuthConfig'; // COMMENTÉ

// --- Constantes ---
const TOKEN_KEY = "artiva-auth-token";
const USER_INFO_KEY = "artiva-user-info";
const THEME_PREFERENCE_KEY = "artiva-theme-preference";
// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

// --- Types ---
export interface User {
  id: number | string;
  name: string;
  email: string;
  role: "customer" | "admin" | string;
  address?: string;
  phone?: string;
  profileImageFromAuthContext?: string;
}

export type AppColorSchemePreference = "light" | "dark" | "system";

interface AuthContextType {
  signIn: (token: string, userData: User) => Promise<void>;
  signOut: () => Promise<void>;
  // signInWithGoogle: () => Promise<void>; // COMMENTÉ
  user: User | null;
  userToken: string | null;
  isLoading: boolean;
  isGoogleSigningIn: boolean;
  unreadNotificationCount: number;
  fetchUnreadNotificationCount: () => Promise<void>;
  appColorSchemePreference: AppColorSchemePreference;
  setColorSchemePreference: (scheme: AppColorSchemePreference) => Promise<void>;
  effectiveAppColorScheme: "light" | "dark";
  updateUserInContext: (newUserData: Partial<User>) => void;
}

// --- Contexte ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// --- Fournisseur de Contexte ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthDataLoading, setIsAuthDataLoading] = useState(true);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  // États pour le thème
  const [appColorSchemePreference, setAppColorSchemePreferenceState] =
    useState<AppColorSchemePreference>("system");
  const [effectiveAppColorScheme, setEffectiveAppColorScheme] = useState<
    "light" | "dark"
  >(normalizeColorScheme(Appearance.getColorScheme()));
  const [isThemePreferenceLoading, setIsThemePreferenceLoading] = useState(true);

  // ===== INITIALISATION GOOGLE SIGN-IN ===== COMMENTÉ
  // useEffect(() => {
  //   GoogleSignin.configure({
  //     webClientId: googleConfig.webClientId,
  //     offlineAccess: true,
  //     forceCodeForRefreshToken: true,
  //   });
  //   console.log("AuthContext: GoogleSignin configuré");
  // }, []);

  // 1. Charger le token et les informations utilisateur au démarrage
  useEffect(() => {
    const bootstrapAuthData = async () => {
      setIsAuthDataLoading(true);
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUserJson = await SecureStore.getItemAsync(USER_INFO_KEY);

        if (storedToken && storedUserJson) {
          setUserToken(storedToken);
          setUser(JSON.parse(storedUserJson) as User);
          console.log("AuthContext: Données d'authentification chargées.");
        } else {
          console.log("AuthContext: Aucune donnée d'authentification trouvée.");
        }
      } catch (e) {
        console.error("AuthContext: Erreur chargement token/user", e);
        setUserToken(null);
        setUser(null);
      } finally {
        setIsAuthDataLoading(false);
      }
    };
    bootstrapAuthData();
  }, []);

  // 2. Charger la préférence de thème
  useEffect(() => {
    let appearanceListenerSubscription: { remove: () => void } | undefined;

    const handleSystemThemeChange = (preferences: Appearance.AppearancePreferences) => {
      setAppColorSchemePreferenceState((currentStoredPref) => {
        if (currentStoredPref === "system") {
          const newSystemScheme = normalizeColorScheme(preferences.colorScheme);
          setEffectiveAppColorScheme(newSystemScheme);
        }
        return currentStoredPref;
      });
    };

    const loadThemePreference = async () => {
      setIsThemePreferenceLoading(true);
      try {
        const storedScheme = (await AsyncStorage.getItem(THEME_PREFERENCE_KEY)) as AppColorSchemePreference | null;
        const initialPreference = storedScheme || "system";
        setAppColorSchemePreferenceState(initialPreference);

        if (initialPreference === "system") {
          const systemTheme = normalizeColorScheme(Appearance.getColorScheme());
          setEffectiveAppColorScheme(systemTheme);
          appearanceListenerSubscription = Appearance.addChangeListener(handleSystemThemeChange);
        } else {
          setEffectiveAppColorScheme(initialPreference);
        }
      } catch (e) {
        console.error("AuthContext: Erreur chargement préférence thème", e);
        setAppColorSchemePreferenceState("system");
        setEffectiveAppColorScheme(normalizeColorScheme(Appearance.getColorScheme()));
      } finally {
        setIsThemePreferenceLoading(false);
      }
    };

    loadThemePreference();

    return () => {
      if (appearanceListenerSubscription) {
        appearanceListenerSubscription.remove();
      }
    };
  }, []);

  // 3. Récupérer les notifications non lues
  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!userToken) {
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data && typeof data.unreadCount === "number") {
        setUnreadNotificationCount(data.unreadCount);
      }
    } catch (e) {
      console.error("AuthContext: Erreur fetchUnreadNotificationCount", e);
    }
  }, [userToken]);

  useEffect(() => {
    if (!isAuthDataLoading && !isThemePreferenceLoading) {
      fetchUnreadNotificationCount();
    }
  }, [userToken, isAuthDataLoading, isThemePreferenceLoading, fetchUnreadNotificationCount]);

  // --- Fonctions d'action ---
  const signIn = async (token: string, userData: User) => {
    setIsAuthDataLoading(true);
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(userData));
      setUserToken(token);
      setUser(userData);
    } catch (e) {
      console.error("AuthContext: Erreur signIn", e);
      setUserToken(null);
      setUser(null);
    } finally {
      setIsAuthDataLoading(false);
    }
  };

  const signOut = async () => {
    setIsAuthDataLoading(true);
    try {
      // await GoogleSignin.signOut(); // COMMENTÉ
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_INFO_KEY);
    } catch (e) {
      console.error("AuthContext: Erreur signOut", e);
    } finally {
      setUserToken(null);
      setUser(null);
      setUnreadNotificationCount(0);
      setIsAuthDataLoading(false);
    }
  };

  const updateUserInContext = (newUserData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...newUserData };
      SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  // ===== FONCTION DE RÉVEIL DU BACKEND =====
  const wakeUpBackend = useCallback(async () => {
    try {
      console.log("AuthContext: Réveil du backend...");
      await fetch(`${API_BASE_URL}/health`, { method: 'HEAD' });
      console.log("AuthContext: Backend réveillé");
    } catch (e) {
      console.log("AuthContext: Backend déjà actif ou indisponible");
    }
  }, []);

  // ===== CONNEXION GOOGLE ===== COMMENTÉ
  // const signInWithGoogle = useCallback(async () => {
  //   console.log("AuthContext: Démarrage connexion Google...");
  //   setIsGoogleSigningIn(true);
  //   await wakeUpBackend();
  //   try {
  //     await GoogleSignin.hasPlayServices();
  //     const response = await GoogleSignin.signIn();
  //     const idToken = response?.data?.idToken;
  //     const userGoogle = response?.data?.user;
  //     if (!idToken) {
  //       throw new Error("Aucun idToken reçu de Google");
  //     }
  //     if (!userGoogle?.email) {
  //       throw new Error("Aucune information utilisateur reçue");
  //     }
  //     console.log("AuthContext: Google user:", userGoogle.email);
  //     const backendResponse = await fetch(`${API_BASE_URL}/auth/google`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         googleId: idToken,
  //         email: userGoogle.email,
  //         name: userGoogle.name,
  //         picture: userGoogle.photo,
  //       }),
  //     });
  //     const responseText = await backendResponse.text();
  //     if (responseText.trim().startsWith('<')) {
  //       console.error("AuthContext: Réponse HTML reçue au lieu de JSON");
  //       throw new Error("Le serveur répond avec une erreur. Veuillez réessayer.");
  //     }
  //     const data = JSON.parse(responseText);
  //     if (backendResponse.ok) {
  //       await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  //       setUserToken(data.token);
  //       const userData: User = {
  //         id: data.user.id,
  //         name: data.user.name,
  //         email: data.user.email,
  //         role: data.user.role || 'customer',
  //         profileImageFromAuthContext: data.user.picture || userGoogle.photo,
  //       };
  //       await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(userData));
  //       setUser(userData);
  //       setIsGoogleSigningIn(false);
  //       Alert.alert('Succès', 'Connecté avec Google !');
  //     } else {
  //       throw new Error(data.message || 'Erreur connexion Google');
  //     }
  //   } catch (error: any) {
  //     console.error('AuthContext: Erreur:', error);
  //     setIsGoogleSigningIn(false);
  //     if (error.code !== 'SIGN_IN_CANCELLED') {
  //       Alert.alert('Erreur', error.message || 'Connexion Google impossible');
  //     }
  //   }
  // }, [wakeUpBackend]);

  const setColorSchemePreferenceInternal = async (scheme: AppColorSchemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, scheme);
      setAppColorSchemePreferenceState(scheme);
      if (scheme === "system") {
        setEffectiveAppColorScheme(normalizeColorScheme(Appearance.getColorScheme()));
      } else {
        setEffectiveAppColorScheme(scheme);
      }
    } catch (e) {
      console.error("AuthContext: Erreur sauvegarde préférence thème", e);
    }
  };

  const authContextValue: AuthContextType = {
    signIn,
    signOut,
    // signInWithGoogle, // COMMENTÉ
    user,
    userToken,
    isLoading: isAuthDataLoading || isThemePreferenceLoading,
    isGoogleSigningIn,
    unreadNotificationCount,
    fetchUnreadNotificationCount,
    appColorSchemePreference,
    setColorSchemePreference: setColorSchemePreferenceInternal,
    effectiveAppColorScheme,
    updateUserInContext,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}