// app.config.js
import 'dotenv/config';

export default {
  name: "Artiva",
  slug: "artiva",
  version: "1.6.3",
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
    supportsTablet: true,
    // ✅ AJOUT pour les notifications
    bundleIdentifier: "com.fathanemarcos.artiva",
    googleServicesFile: "./GoogleService-Info.plist", // (si vous ciblez iOS)
    infoPlist: {
      UIBackgroundModes: ["remote-notification"]
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/Artiva_icon.png",
      backgroundColor: "#ffffff"
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "CAMERA",
      // ✅ AJOUT pour les notifications
      "NOTIFICATIONS",
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE"
    ],
    package: "com.fathanemarcos.artiva",
    versionCode: 76,
    // ✅ AJOUT pour Firebase
    googleServicesFile: "./google-services.json"
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
    "expo-sharing",
    [
      "expo-notifications",
      {
        icon: "./assets/images/Artiva_icon.png",
        color: "#4CAF50",
        sounds: []
      }
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: "34.0.0"
        },
        ios: {
          deploymentTarget: "13.4"
        }
      }
    ]
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