// front_end/constants/GoogleAuthConfig.ts

export const googleConfig = {
  // Web Client ID (backend)
  webClientId: '140318387654-145f5amfrakiu9o511h49qflo016elga.apps.googleusercontent.com',
  
  // Android Client ID (NOUVEAU - pour l'app production)
  androidClientId: '140318387654-m352bk8ot7stp37pntftfftn845l8kno.apps.googleusercontent.com',
  
  // Optionnel - pour développement Expo (peut être le même que web)
  expoClientId: '140318387654-145f5amfrakiu9o511h49qflo016elga.apps.googleusercontent.com',
  
  // iOS (si tu déployes sur iOS plus tard)
  iosClientId: '',
};

export const googleScopes = ['profile', 'email'];