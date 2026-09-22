// ARTIVA/back_end/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const trackingController = require('../controllers/trackingController');

// =============================================================================
// GET /api/admin/activity - Journal d'activité (ADMIN)
// =============================================================================
// Query params :
//   - type : filtrer par event_type (ex: cart_add, wishlist_add...)
//   - userId : filtrer par user_id
//   - limit : nombre max de résultats (défaut 100)
//   - offset : pagination (défaut 0)

router.get('/activity', authMiddleware, adminMiddleware, async (req, res) => {
  const { type, userId, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM activity_log WHERE 1=1';
  const params = [];
  let idx = 1;

  if (type) {
    query += ` AND event_type = $${idx++}`;
    params.push(type);
  }
  if (userId) {
    query += ` AND user_id = $${idx++}`;
    params.push(parseInt(userId, 10));
  }

  query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const result = await db.query(query, params);

    // Total pour la pagination
    let countQuery = 'SELECT COUNT(*)::int AS total FROM activity_log WHERE 1=1';
    const countParams = [];
    let cIdx = 1;
    if (type) {
      countQuery += ` AND event_type = $${cIdx++}`;
      countParams.push(type);
    }
    if (userId) {
      countQuery += ` AND user_id = $${cIdx++}`;
      countParams.push(parseInt(userId, 10));
    }
    const countResult = await db.query(countQuery, countParams);

    res.json({
      activities: result.rows,
      total: countResult.rows[0].total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    console.error('Erreur récupération activité:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =============================================================================
// GET /api/admin/activity/stats - Statistiques rapides
// =============================================================================

router.get('/activity/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        event_type,
        COUNT(*)::int AS count
      FROM activity_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY event_type
      ORDER BY count DESC
    `);

    const total = result.rows.reduce((sum, r) => sum + r.count, 0);

    res.json({
      stats: result.rows,
      total24h: total,
    });
  } catch (error) {
    console.error('Erreur stats activité:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Tracking (admin)
router.get('/tracking/top-products', authMiddleware, adminMiddleware, trackingController.getTopClickedProducts);
router.get('/tracking/overview', authMiddleware, adminMiddleware, trackingController.getTrackingOverview);
router.get('/tracking/user/:userId', authMiddleware, adminMiddleware, trackingController.getUserClicks);
router.delete('/tracking/user/:userId', authMiddleware, adminMiddleware, trackingController.deleteUserClicks);

module.exports = router;
