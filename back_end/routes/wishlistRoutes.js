// ARTIVA/back_end/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// GET /api/wishlist - Récupérer la wishlist de l'utilisateur connecté
router.get('/', authMiddleware, wishlistController.getWishlist);

// POST /api/wishlist - Ajouter un produit à la wishlist
router.post('/', authMiddleware, wishlistController.addToWishlist);

// DELETE /api/wishlist/:productId - Retirer un produit de la wishlist
router.delete('/:productId', authMiddleware, wishlistController.removeFromWishlist);

// GET /api/wishlist/admin/:userId - Voir la wishlist d'un utilisateur (ADMIN)
router.get('/admin/:userId', authMiddleware, adminMiddleware, wishlistController.getUserWishlistAdmin);

module.exports = router;