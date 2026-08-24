// ARTIVA/back_end/routes/livraisonRoutes.js
const express = require('express');
const router = express.Router();
const livraisonController = require('../controllers/livraisonController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// --- Côté client -------------------------------------------------------------

// GET /api/livraison/statut?pays=...&ville=...
// L'avantage est nominatif : sans authentification, impossible de dire à qui il
// appartient. Les frais de la destination sont renvoyés au passage, pour que
// l'écran de paiement affiche exactement ce qui sera facturé.
router.get('/statut', authMiddleware, livraisonController.statutClient);

// GET /api/livraison/zones — grille des tarifs.
// Sans authentification : les tarifs sont publics, et l'écran de paiement doit
// pouvoir les afficher avant même que le client se connecte.
router.get('/zones', livraisonController.listerZonesPubliques);

// --- Côté administration -----------------------------------------------------
// « /zones/admin » est déclaré AVANT « /zones/:id » : sans cela, la route
// paramétrée capterait le mot « admin » et tenterait de le lire comme un
// identifiant.

router.get('/reglages',  authMiddleware, adminMiddleware, livraisonController.lireReglagesAdmin);
router.put('/reglages',  authMiddleware, adminMiddleware, livraisonController.modifierReglagesAdmin);
router.get('/avantages', authMiddleware, adminMiddleware, livraisonController.listerAvantages);

router.get('/zones/admin',  authMiddleware, adminMiddleware, livraisonController.listerZonesAdmin);
router.post('/zones',       authMiddleware, adminMiddleware, livraisonController.creerZone);
router.put('/zones/:id',    authMiddleware, adminMiddleware, livraisonController.modifierZone);
router.delete('/zones/:id', authMiddleware, adminMiddleware, livraisonController.supprimerZone);

module.exports = router;
