const db = require('./config/db');
const { sendPushNotification } = require('./services/fcmService');

async function testNotification() {
  try {
    console.log('🔍 Recherche d\'un utilisateur avec un token FCM...');

    // 1. Récupérer le premier utilisateur avec un token FCM
    const result = await db.query(
      'SELECT id, name, email, fcm_token, fcm_platform FROM users WHERE fcm_token IS NOT NULL LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('⚠️ Aucun utilisateur avec un token FCM dans la base.');
      console.log('');
      console.log('💡 Pour enregistrer un token :');
      console.log('   1. Ouvrez l\'app ARTIVA sur votre téléphone');
      console.log('   2. Connectez-vous avec un compte');
      console.log('   3. Le token sera envoyé automatiquement');
      console.log('');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ Utilisateur trouvé :');
    console.log(`   Nom      : ${user.name}`);
    console.log(`   Email    : ${user.email}`);
    console.log(`   Platform : ${user.fcm_platform}`);
    console.log(`   Token    : ${user.fcm_token.substring(0, 40)}...`);
    console.log('');
    console.log('📤 Envoi de la notification...');

    // 2. Envoyer la notification
    const response = await sendPushNotification(user.fcm_token, {
      title: '🔔 Test ARTIVA',
      body: 'Félicitations ! Vos notifications push fonctionnent !',
      data: {
        screen: 'home',
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('');
    console.log('📨 Résultat :', JSON.stringify(response, null, 2));

    if (response.success) {
      console.log('');
      console.log('🎉 Notification envoyée avec succès !');
      console.log('   Vérifiez votre téléphone 📱');
    } else {
      console.log('');
      console.log('❌ Échec de l\'envoi :', response.error);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testNotification();
