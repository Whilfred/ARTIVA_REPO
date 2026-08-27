// app.config.js
import 'dotenv/config';

export default {
  name: "Artiva",
  slug: "artiva",
  version: "1.4.1",
  sdkVersion: "57.0.0",
  platforms: ["ios", "android", "web"],
  orientation: "portrait",
  icon: "./assets/images/Artiva_icon.png",
  scheme: "artiva",  // ← Gardez ceci
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/Artiva_icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSPhotoLibraryAddUsageDescription: "Cette app a besoin d'accéder à vos photos pour sauvegarder le QR Code."
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/Artiva_icon.png",
      backgroundColor: "#ffffff"
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "CAMERA"
    ],
    package: "com.fathanemarcos.artiva",
    versionCode: 42,
    // ❌ SUPPRIMEZ TOUT intentFilters
  },
  web: {
    bundler: "metro",
    // "single" = application monopage, sans prerendu cote serveur.
    //
    // En "static", expo-router execute chaque ecran dans Node pour generer le
    // HTML. Depuis le SDK 57 ce prerendu echoue sur checkout.tsx ("Class
    // extends value undefined"), a cause d'une bibliotheque tierce qui suppose
    // un environnement natif. Le rendu serveur n'apporte rien ici : cette
    // application mobile n'est ouverte dans un navigateur que pour les tests.
    output: "single",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    "@react-native-google-signin/google-signin",
    // Depuis le SDK 57, ces modules doivent être déclarés explicitement ici :
    // le CLI les réclame au lancement s'ils manquent.
    "expo-font",
    "expo-splash-screen",
    "expo-status-bar",
    "expo-web-browser",
    "expo-video"
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    // L'adresse du backend est désormais résolue par constants/Api.ts (qui
    // détecte automatiquement l'IP de la machine de développement). On garde la
    // clé ici pour compatibilité, mais elle n'est plus la source de vérité.
    //
    // --- PRODUCTION (désactivé en local) ---
    // API_BASE_URL: process.env.API_BASE_URL ?? "https://back-end-purple-log-1280.fly.dev/api",
    API_BASE_URL: process.env.API_BASE_URL ?? null,
    router: {},
    eas: {
      projectId: "f8f95457-cfcc-4619-a374-33c257ccda5e"
    }
  }
};
