const { getMessaging } = require('./services/fcmService');

try {
  const messaging = getMessaging();
  console.log('✅ Firebase Admin chargé : OUI');
  console.log('   Messaging disponible :', !!messaging);
  console.log('   Prêt à envoyer des notifications !');
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
