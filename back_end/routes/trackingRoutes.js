// ARTIVA/back_end/routes/trackingRoutes.js
const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// =============================================================================
// Routes publiques (user_id extrait du token JWT si présent)
// =============================================================================

router.post('/product-click', trackingController.trackProductClick);
router.post('/product-click-duration', trackingController.updateClickDuration);

// =============================================================================
// Routes admin (protection : authMiddleware + adminMiddleware)
// =============================================================================

router.get(
  '/admin/top-products',
  authMiddleware,
  adminMiddleware,
  trackingController.getTopClickedProducts
);

router.get(
  '/admin/overview',
  authMiddleware,
  adminMiddleware,
  trackingController.getTrackingOverview
);

router.get(
  '/admin/click-reminders/stats',
  authMiddleware,
  adminMiddleware,
  trackingController.getClickRemindersStats
);

router.get(
  '/admin/click-reminders',
  authMiddleware,
  adminMiddleware,
  trackingController.getClickReminders
);

router.get(
  '/admin/user/:userId',
  authMiddleware,
  adminMiddleware,
  trackingController.getUserClicks
);

router.delete(
  '/admin/user/:userId',
  authMiddleware,
  adminMiddleware,
  trackingController.deleteUserClicks
);

module.exports = router;
