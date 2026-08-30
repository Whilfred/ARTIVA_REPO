// ARTIVA/back_end/routes/loyaltyRoutes.js
const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// --- Côté client -------------------------------------------------------------
router.get('/', authMiddleware, loyaltyController.monStatut);

// --- Côté administration -----------------------------------------------------
// « /admin/clients » est déclaré AVANT « /admin » : l'ordre importe peu ici
// puisque aucune route n'est paramétrée, mais le garder explicite évite qu'un
// futur « /admin/:id » ne capture « clients ».
router.get('/admin/clients', authMiddleware, adminMiddleware, loyaltyController.listerClients);
router.get('/admin',         authMiddleware, adminMiddleware, loyaltyController.statutAdmin);
router.put('/admin',         authMiddleware, adminMiddleware, loyaltyController.modifierReglages);

module.exports = router;
