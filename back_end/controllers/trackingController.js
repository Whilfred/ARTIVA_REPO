// ARTIVA/back_end/controllers/trackingController.js
// Tracking des clics produits — pour analyse interne et marketing.
// Consentement requis (voir politique de confidentialité).

const db = require('../config/db');
const jwt = require('jsonwebtoken');

// =============================================================================
// Récupérer l'user_id depuis le token JWT (optionnel)
// =============================================================================

function getUserIdFromToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || null;
  } catch {
    return null;
  }
}

// =============================================================================
// POST /api/tracking/product-click
// =============================================================================

exports.trackProductClick = async (req, res) => {
  // ⚠️ LOG DE DEBUG
  console.log('🔥🔥🔥 ROUTE TRACKING ATTEINTE 🔥🔥🔥');
  console.log('🔥 Body reçu:', req.body);
  console.log('🔥 Headers:', req.headers);

  const { product_id, session_id, device_type, referrer } = req.body;

  if (!product_id) {
    console.log('❌ product_id manquant');
    return res.status(400).json({ message: 'product_id requis' });
  }

  const userId = getUserIdFromToken(req);
  console.log('🔥 userId extrait:', userId);

  try {
    console.log('🔥 Tentative INSERT...');
    const result = await db.query(
      `INSERT INTO user_product_clicks 
       (user_id, session_id, product_id, device_type, referrer, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, 0)
       RETURNING id`,
      [
        userId,
        (session_id || '').slice(0, 64) || null,
        product_id,
        (device_type || 'unknown').slice(0, 20),
        (referrer || 'direct').slice(0, 100),
      ]
    );

    console.log('✅ INSERT OK, id:', result.rows[0].id);

    res.status(201).json({
      message: 'Clic enregistré',
      clickId: result.rows[0].id,
      userId: userId || null,
    });
  } catch (error) {
    console.error('❌❌❌ ERREUR TRACKING:', error);
    console.error('❌ Message:', error.message);
    console.error('❌ Code:', error.code);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// =============================================================================
// POST /api/tracking/product-click-duration
// =============================================================================

exports.updateClickDuration = async (req, res) => {
  const { click_id, duration_seconds } = req.body;

  if (!click_id || duration_seconds === undefined) {
    return res.status(400).json({ message: 'click_id et duration_seconds requis' });
  }

  const duration = Math.max(0, Math.min(3600, parseInt(duration_seconds, 10)));

  try {
    await db.query(
      'UPDATE user_product_clicks SET duration_seconds = $1 WHERE id = $2',
      [duration, click_id]
    );
    res.status(200).json({ message: 'Durée mise à jour' });
  } catch (error) {
    console.error('Erreur update durée:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// =============================================================================
// GET /api/admin/tracking/top-products (ADMIN)
// =============================================================================

exports.getTopClickedProducts = async (req, res) => {
  const { period = '7', limit = 20 } = req.query;

  try {
    const result = await db.query(
      `SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.price,
        p.image_url,
        COUNT(upc.id)::int AS total_clicks,
        COUNT(DISTINCT upc.user_id)::int AS unique_users,
        COUNT(DISTINCT upc.session_id)::int AS unique_sessions,
        ROUND(AVG(upc.duration_seconds))::int AS avg_duration_seconds,
        MAX(upc.clicked_at) AS last_click
      FROM user_product_clicks upc
      JOIN products p ON p.id = upc.product_id
      WHERE upc.clicked_at > NOW() - ($1::text || ' days')::interval
      GROUP BY p.id
      ORDER BY total_clicks DESC
      LIMIT $2`,
      [period, parseInt(limit, 10)]
    );
    res.json({ products: result.rows });
  } catch (error) {
    console.error('Erreur stats produits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// =============================================================================
// GET /api/admin/tracking/user/:userId (ADMIN)
// Voir les clics d'un utilisateur spécifique
// =============================================================================

exports.getUserClicks = async (req, res) => {
  const { userId } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  try {
    const result = await db.query(
      `SELECT 
        upc.id,
        upc.product_id,
        p.name AS product_name,
        p.price,
        p.image_url,
        upc.duration_seconds,
        upc.device_type,
        upc.referrer,
        upc.clicked_at
      FROM user_product_clicks upc
      JOIN products p ON p.id = upc.product_id
      WHERE upc.user_id = $1
      ORDER BY upc.clicked_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const countResult = await db.query(
      'SELECT COUNT(*)::int AS total FROM user_product_clicks WHERE user_id = $1',
      [userId]
    );

    res.json({
      clicks: result.rows,
      total: countResult.rows[0].total,
    });
  } catch (error) {
    console.error('Erreur user clicks:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// =============================================================================
// GET /api/admin/tracking/overview (ADMIN)
// =============================================================================

exports.getTrackingOverview = async (req, res) => {
  const { period = '7' } = req.query;

  try {
    const totalResult = await db.query(
      `SELECT 
        COUNT(*)::int AS total_clicks,
        COUNT(DISTINCT user_id)::int AS unique_users,
        COUNT(DISTINCT product_id)::int AS unique_products,
        COUNT(DISTINCT session_id)::int AS unique_sessions,
        ROUND(AVG(duration_seconds))::int AS avg_duration
      FROM user_product_clicks
      WHERE clicked_at > NOW() - ($1::text || ' days')::interval`,
      [period]
    );

    const byDayResult = await db.query(
      `SELECT 
        DATE(clicked_at) AS date,
        COUNT(*)::int AS clicks,
        COUNT(DISTINCT user_id)::int AS users
      FROM user_product_clicks
      WHERE clicked_at > NOW() - ($1::text || ' days')::interval
      GROUP BY DATE(clicked_at)
      ORDER BY DATE(clicked_at) ASC`,
      [period]
    );

    const byDeviceResult = await db.query(
      `SELECT device_type, COUNT(*)::int AS clicks
      FROM user_product_clicks
      WHERE clicked_at > NOW() - ($1::text || ' days')::interval
      GROUP BY device_type
      ORDER BY clicks DESC`,
      [period]
    );

    const topUsersResult = await db.query(
      `SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        COUNT(upc.id)::int AS total_clicks
      FROM user_product_clicks upc
      JOIN users u ON u.id = upc.user_id
      WHERE upc.clicked_at > NOW() - ($1::text || ' days')::interval
        AND upc.user_id IS NOT NULL
      GROUP BY u.id
      ORDER BY total_clicks DESC
      LIMIT 10`,
      [period]
    );

    res.json({
      overview: totalResult.rows[0],
      byDay: byDayResult.rows,
      byDevice: byDeviceResult.rows,
      topUsers: topUsersResult.rows,
    });
  } catch (error) {
    console.error('Erreur overview tracking:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// =============================================================================
// DELETE /api/admin/tracking/user/:userId (ADMIN - droit à l'effacement)
// =============================================================================

exports.deleteUserClicks = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM user_product_clicks WHERE user_id = $1',
      [userId]
    );

    res.json({
      message: `${result.rowCount} clic(s) supprimé(s)`,
      deletedCount: result.rowCount,
    });
  } catch (error) {
    console.error('Erreur suppression clics:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// =============================================================================
// GET /api/admin/tracking/click-reminders (ADMIN)
// Liste des rappels de clics envoyés
// =============================================================================

exports.getClickReminders = async (req, res) => {
  const { user_id, period = '30', limit = 100, offset = 0 } = req.query;

  try {
    const conditions = [`cr.sent_at > NOW() - ($1::text || ' days')::interval`];
    const params = [period];
    let paramIndex = 2;

    if (user_id) {
      conditions.push(`cr.user_id = $${paramIndex++}`);
      params.push(parseInt(user_id, 10));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(
      `
      SELECT
        cr.id,
        cr.user_id,
        u.name AS user_name,
        u.email AS user_email,
        cr.sent_at,
        cr.product_count,
        cr.product_ids,
        cr.email_sent,
        cr.push_sent,
        cr.error_message
      FROM click_reminders cr
      LEFT JOIN users u ON u.id = cr.user_id
      ${whereClause}
      ORDER BY cr.sent_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `,
      [...params, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM click_reminders cr ${whereClause}`,
      params
    );

    res.json({
      reminders: result.rows,
      total: countResult.rows[0].total,
    });
  } catch (error) {
    console.error('Erreur click reminders:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// =============================================================================
// GET /api/admin/tracking/click-reminders/stats (ADMIN)
// Statistiques globales des rappels de clics
// =============================================================================

exports.getClickRemindersStats = async (req, res) => {
  const { period = '30' } = req.query;

  try {
    // Stats globales
    const globalResult = await db.query(
      `
      SELECT
        COUNT(*)::int AS total_reminders,
        COUNT(DISTINCT user_id)::int AS unique_users,
        SUM(CASE WHEN email_sent THEN 1 ELSE 0 END)::int AS emails_envoyes,
        SUM(CASE WHEN push_sent THEN 1 ELSE 0 END)::int AS pushs_envoyees,
        SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END)::int AS erreurs,
        ROUND(AVG(product_count), 1) AS avg_products
      FROM click_reminders
      WHERE sent_at > NOW() - ($1::text || ' days')::interval
      `,
      [period]
    );

    // Par jour
    const byDayResult = await db.query(
      `
      SELECT
        DATE(sent_at) AS date,
        COUNT(*)::int AS reminders,
        COUNT(DISTINCT user_id)::int AS users,
        SUM(CASE WHEN email_sent THEN 1 ELSE 0 END)::int AS emails
      FROM click_reminders
      WHERE sent_at > NOW() - ($1::text || ' days')::interval
      GROUP BY DATE(sent_at)
      ORDER BY DATE(sent_at) ASC
      `,
      [period]
    );

    // Top users relancés
    const topUsersResult = await db.query(
      `
      SELECT
        u.id AS user_id,
        u.name,
        u.email,
        COUNT(cr.id)::int AS total_reminders,
        MAX(cr.sent_at) AS last_reminder
      FROM click_reminders cr
      JOIN users u ON u.id = cr.user_id
      WHERE cr.sent_at > NOW() - ($1::text || ' days')::interval
      GROUP BY u.id
      ORDER BY total_reminders DESC
      LIMIT 10
      `,
      [period]
    );

    res.json({
      overview: globalResult.rows[0],
      byDay: byDayResult.rows,
      topUsers: topUsersResult.rows,
    });
  } catch (error) {
    console.error('Erreur stats click reminders:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
