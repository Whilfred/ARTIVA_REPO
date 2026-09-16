const pool = require('./config/db');
const { sendPushNotification } = require('./services/fcmService');
const { sendWishlistReminderEmail, sendCartReminderEmail } = require('./utils/sendEmail.js');

async function test() {
  console.log('🧪 Test manuel des relances\n');
  console.log('═'.repeat(60));

  // ═══ TEST 1: WISHLIST ═══
  console.log('\n📋 TEST 1 : Relance Wishlist\n');

  const wishlistUser = await pool.query(`
    SELECT 
      wi.user_id, u.name, u.email, u.fcm_token,
      json_agg(json_build_object(
        'product_id', wi.product_id,
        'name', p.name,
        'price', p.price,
        'image_url', p.image_url
      )) AS products
    FROM wishlist_items wi
    JOIN users u ON u.id = wi.user_id
    JOIN products p ON p.id = wi.product_id
    WHERE u.fcm_token IS NOT NULL
    GROUP BY wi.user_id, u.name, u.email, u.fcm_token
    LIMIT 1
  `);

  if (wishlistUser.rows.length > 0) {
    const user = wishlistUser.rows[0];
    console.log(`👤 Utilisateur : ${user.name} (${user.email})`);
    console.log(`📦 ${user.products.length} produit(s) en wishlist\n`);

    if (user.fcm_token) {
      await sendPushNotification(user.fcm_token, {
        title: '❤️ [TEST] Vos coups de cœur vous attendent !',
        body: `${user.products.length} articles dans votre wishlist.`,
        data: { screen: 'wishlist' },
      });
      console.log('📲 Push wishlist envoyée !');
    }

    await sendWishlistReminderEmail(user.email, user.name, { products: user.products });
    console.log('📧 Email wishlist envoyé !');
  } else {
    console.log('⚠️ Aucune wishlist avec token FCM');
  }

  // ═══ TEST 2: PANIER ═══
  console.log('\n📋 TEST 2 : Relance Panier\n');

  const cartUser = await pool.query(`
    SELECT 
      c.id as cart_id, c.user_id, u.name, u.email, u.fcm_token,
      json_agg(json_build_object(
        'product_id', ci.product_id,
        'name', p.name,
        'price', p.price,
        'quantity', ci.quantity,
        'image_url', p.image_url
      )) AS items,
      SUM(ci.quantity * p.price) AS total_amount
    FROM carts c
    JOIN users u ON c.user_id = u.id
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON p.id = ci.product_id
    WHERE u.fcm_token IS NOT NULL
    GROUP BY c.id, c.user_id, u.name, u.email, u.fcm_token
    LIMIT 1
  `);

  if (cartUser.rows.length > 0) {
    const cart = cartUser.rows[0];
    const nbItems = cart.items.reduce((s, i) => s + i.quantity, 0);
    console.log(`👤 Utilisateur : ${cart.name} (${cart.email})`);
    console.log(`🛒 ${nbItems} article(s) - ${parseFloat(cart.total_amount).toLocaleString('fr-FR')} FCFA\n`);

    if (cart.fcm_token) {
      await sendPushNotification(cart.fcm_token, {
        title: '🛒 [TEST] Votre panier vous attend !',
        body: `${nbItems} articles - ${parseFloat(cart.total_amount).toLocaleString('fr-FR')} FCFA`,
        data: { screen: 'cart' },
      });
      console.log('📲 Push panier envoyée !');
    }

    await sendCartReminderEmail(cart.email, cart.name, {
      items: cart.items,
      totalAmount: parseFloat(cart.total_amount),
      totalItems: nbItems,
    });
    console.log('📧 Email panier envoyé !');
  } else {
    console.log('⚠️ Aucun panier avec token FCM');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Tests terminés !\n');
  process.exit(0);
}

test().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
