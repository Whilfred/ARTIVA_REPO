// ARTIVA/back_end/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// GET /api/products - Récupérer tous les produits (Publique)
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Récupérer un produit par son ID (Publique)
router.get('/:id', productController.getProductById);

// POST /api/products - Créer un nouveau produit (Admin)
router.post('/', authMiddleware, adminMiddleware, productController.createProduct);

// PUT /api/products/:id - Mettre à jour un produit (Admin)
router.put('/:id', authMiddleware, adminMiddleware, productController.updateProduct);

// DELETE /api/products/:id - Supprimer un produit (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

// NOUVELLE ROUTE ADMIN pour lister TOUS les produits (publiés ou non)
router.get('/admin/all', authMiddleware, adminMiddleware, productController.getAllProductsAdmin);

module.exports = router;