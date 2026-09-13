// front_end/constants/GoogleAuthConfig.ts

export const googleConfig = {
  // Web Client ID (backend) — projet artiva-92796
  webClientId: '238156643506-d2oh7p9ujnsd8q9un38bha8i8r5aptpj.apps.googleusercontent.com',
  
  // Android Client ID — projet artiva-92796
  androidClientId: '238156643506-gn16u0u60nr4vtv00drkk94u557vovp4.apps.googleusercontent.com',
  
  // Optionnel - pour développement Expo (peut être le même que web)
  expoClientId: '238156643506-d2oh7p9ujnsd8q9un38bha8i8r5aptpj.apps.googleusercontent.com',
  
  // iOS (si tu déployes sur iOS plus tard)
  iosClientId: '',
};

export const googleScopes = ['profile', 'email'];
