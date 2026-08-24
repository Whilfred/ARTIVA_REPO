// ARTIVA/back_end/routes/promoRoutes.js
const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// --- Côté client -------------------------------------------------------------

// POST /api/promo/valider — vérifier un code et connaître la réduction.
// Authentification requise : sans identifier le client, impossible de faire
// respecter une limite « une utilisation par personne ».
router.post('/valider', authMiddleware, promoController.validerCode);

// --- Côté administration -----------------------------------------------------
// Placé APRÈS /valider : sans cela, la route paramétrée /:id capterait
// l'adresse « valider » et renverrait une erreur incompréhensible.

router.get('/',       authMiddleware, adminMiddleware, promoController.listerCodes);
router.post('/',      authMiddleware, adminMiddleware, promoController.creerCode);
router.get('/:id',    authMiddleware, adminMiddleware, promoController.detailCode);
router.put('/:id',    authMiddleware, adminMiddleware, promoController.modifierCode);
router.delete('/:id', authMiddleware, adminMiddleware, promoController.supprimerCode);

module.exports = router;
