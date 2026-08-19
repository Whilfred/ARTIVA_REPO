// ARTIVA/back_end/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const authMiddleware = require('../middlewares/authMiddleware'); // Toutes les actions wishlist nécessitent auth

// GET /api/wishlist -Récupérer la wishlist de l'utilisateur
router.get('/', authMiddleware, wishlistController.getWishlist);

// POST /api/wishlist - Ajouter un produit à la wishlist
router.post('/', authMiddleware, wishlistController.addToWishlist);

// DELETE /api/wishlist/:productId - Retirer un produit de la wishlist
router.delete('/:productId', authMiddleware, wishlistController.removeFromWishlist);

module.exports = router;