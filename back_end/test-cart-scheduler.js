const pool = require('./config/db');

async function testCartScheduler() {
  try {
    console.log('🔍 Test manuel du scheduler de panier abandonné\n');
    console.log('─'.repeat(50));

    // Paniers "abandonnés"
    const abandons = await pool.query(`
      SELECT 
        c.id AS cart_id,
        c.user_id,
        c.updated_at,
        u.name AS user_name,
        u.fcm_token,
        COUNT(ci.id)::int AS nb_items,
        NOW() - c.updated_at AS temps_ecoule
      FROM carts c
      JOIN users u ON c.user_id = u.id
      JOIN cart_items ci ON ci.cart_id = c.id
      WHERE c.user_id IS NOT NULL
        AND u.fcm_token IS NOT NULL
      GROUP BY c.id, u.id
      HAVING COUNT(ci.id) > 0
      ORDER BY c.updated_at DESC
    `);

    console.log(`📋 ${abandons.rows.length} panier(s) avec items et token FCM :\n`);
    
    abandons.rows.forEach(c => {
      console.log(`  • Cart #${c.cart_id} - ${c.user_name} (user ${c.user_id})`);
      console.log(`    ${c.nb_items} article(s)`);
      console.log(`    Dernière modif : ${c.updated_at}`);
      console.log(`    Temps écoulé : ${c.temps_ecoule}`);
      console.log('');
    });

    // Paniers éligibles au rappel (>24h)
    const eligibles = await pool.query(`
      SELECT 
        c.id AS cart_id,
        c.user_id,
        u.name AS user_name,
        COUNT(ci.id)::int AS nb_items
      FROM carts c
      JOIN users u ON c.user_id = u.id
      JOIN cart_items ci ON ci.cart_id = c.id
      WHERE c.user_id IS NOT NULL
        AND c.updated_at <= NOW() - INTERVAL '24 hours'
        AND u.fcm_token IS NOT NULL
        AND u.is_active = true
        AND NOT EXISTS (SELECT 1 FROM cart_reminders cr WHERE cr.cart_id = c.id)
      GROUP BY c.id, u.id
      HAVING COUNT(ci.id) > 0
    `);

    console.log(`🎯 ${eligibles.rows.length} panier(s) éligibles au rappel (>24h) :\n`);
    eligibles.rows.forEach(c => {
      console.log(`  • Cart #${c.cart_id} - ${c.user_name} (${c.nb_items} articles)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testCartScheduler();
