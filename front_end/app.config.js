// app.config.js
import 'dotenv/config';

export default {
  name: "Artiva",
  slug: "artiva",
  version: "1.5.9",
  sdkVersion: "57.0.0",
  platforms: ["ios", "android", "web"],
  orientation: "portrait",
  icon: "./assets/images/Artiva_icon.png",
  scheme: "artiva",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/Artiva_icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    // Plus de NSPhotoLibraryAddUsageDescription : le QR Code passe par la
    // feuille de partage du systeme, l'app ne touche plus a la photothèque.
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/Artiva_icon.png",
      backgroundColor: "#ffffff"
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "CAMERA"
    ],
    package: "com.fathanemarcos.artiva",
    versionCode: 73
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    "@react-native-google-signin/google-signin",
    "expo-font",
    "expo-splash-screen",
    "expo-status-bar",
    "expo-web-browser",
    "expo-video",
    "expo-sharing"
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    API_BASE_URL: process.env.API_BASE_URL ?? null,
    router: {},
    eas: {
      projectId: "f8f95457-cfcc-4619-a374-33c257ccda5e"
    }
  }
};
