// ARTIVA/back_end/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware'); // Toutes les actions panier nécessitent auth

// GET /api/cart - Récupérer le panier de l'utilisateur connecté
router.get('/', authMiddleware, cartController.getUserCart);

// POST /api/cart/items - Ajouter un article au panier / Mettre à jour la quantité
// On utilise POST pour "créer" ou "modifier" une ressource cart_item.
// Une alternative serait PUT /api/cart/items/:productId pour la mise à jour de quantité.
router.post('/items', authMiddleware, cartController.addItemToCart);

// DELETE /api/cart/items/:cartItemId - Supprimer un article spécifique du panier
router.delete('/items/:cartItemId', authMiddleware, cartController.removeItemFromCart);

// DELETE /api/cart - Vider tout le panier de l'utilisateur
router.delete('/clear', authMiddleware, cartController.clearUserCart);


module.exports = router;