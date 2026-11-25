const db = require('./config/db');

async function test() {
  try {
    console.log('=== TEST 1 : Vérifier produit 49 ===');
    const product = await db.query('SELECT id, name FROM products WHERE id = 49');
    console.log('Produit 49:', product.rows);

    console.log('\n=== TEST 2 : INSERT dans user_product_clicks ===');
    const result = await db.query(
      `INSERT INTO user_product_clicks 
       (product_id, session_id, device_type, referrer, duration_seconds)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING id, product_id, session_id, device_type, clicked_at`,
      [49, 'test-local', 'windows', 'test-manuel']
    );
    console.log('✅ SUCCESS !');
    console.log('Résultat:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error('Code:', error.code);
    console.error('Détail:', error.detail);
    process.exit(1);
  }
}

test();
