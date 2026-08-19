// ARTIVA/back_end/routes/productTagRoutes.js
const express = require('express');
const router = express.Router();
const productTagController = require('../controllers/productTagController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// POST /api/product-tags - Créer un nouveau tag (Admin)
router.post('/', authMiddleware, adminMiddleware, productTagController.createProductTag);

// GET /api/product-tags - Lister tous les tags (Public/Admin)
router.get('/', productTagController.getAllProductTags);

// GET /api/product-tags/:id - Récupérer un tag par ID (Public/Admin)
router.get('/:id', productTagController.getProductTagById);

// PUT /api/product-tags/:id - Mettre à jour un tag (Admin)
router.put('/:id', authMiddleware, adminMiddleware, productTagController.updateProductTag);

// DELETE /api/product-tags/:id - Supprimer un tag (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, productTagController.deleteProductTag);

module.exports = router;