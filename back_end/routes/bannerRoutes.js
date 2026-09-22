// ARTIVA/back_end/routes/bannerRoutes.js
const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');

// Public
router.get('/', bannerController.getPublicBanners);

module.exports = router;
