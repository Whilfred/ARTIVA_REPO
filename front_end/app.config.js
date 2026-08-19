// app.config.js
import 'dotenv/config';

export default {
  name: "Artiva",
  slug: "artiva",
  version: "1.2.6",
  sdkVersion: "54.0.0",
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
    versionCode: 35,
    // ❌ SUPPRIMEZ TOUT intentFilters
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    "@react-native-google-signin/google-signin"
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    API_BASE_URL: process.env.API_BASE_URL ?? "https://back-end-purple-log-1280.fly.dev/api",
    router: {},
    eas: {
      projectId: "f8f95457-cfcc-4619-a374-33c257ccda5e"
    }
  }
};
