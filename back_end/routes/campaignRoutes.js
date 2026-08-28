// ARTIVA/back_end/routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Toutes les routes de campagnes sont réservées aux admins.
router.use(authMiddleware, adminMiddleware);

router.post('/preview', campaignController.previewRecipients);
router.post('/', campaignController.createCampaign);
router.get('/', campaignController.listCampaigns);
router.get('/:id', campaignController.getCampaignDetails);
router.post('/:id/send', campaignController.sendCampaignNow);
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;