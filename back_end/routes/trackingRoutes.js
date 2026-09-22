// ARTIVA/back_end/routes/trackingRoutes.js
const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

// Routes publiques (user_id extrait du token JWT si présent)
router.post('/product-click', trackingController.trackProductClick);
router.post('/product-click-duration', trackingController.updateClickDuration);

module.exports = router;