// back_end/routes/loyaltyRoutes.js
const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// ============================================================
// 🔥 ALIAS POUR COMPATIBILITÉ FRONTEND (AJOUTER CE BLOC)
// ============================================================
router.get('/fidelite', authMiddleware, loyaltyController.monStatut);

// ============================================================
// CÔTÉ CLIENT
// ============================================================
router.get('/status', authMiddleware, loyaltyController.monStatut);

// ============================================================
// CÔTÉ ADMINISTRATION
// ============================================================
router.get('/admin/clients', authMiddleware, adminMiddleware, loyaltyController.listerClients);
router.get('/admin', authMiddleware, adminMiddleware, loyaltyController.statutAdmin);
router.put('/admin', authMiddleware, adminMiddleware, loyaltyController.modifierReglages);

module.exports = router;