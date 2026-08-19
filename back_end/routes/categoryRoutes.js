// ARTIVA/back_end/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// POST /api/categories - Créer une nouvelle catégorie (Admin requis)
router.post('/', authMiddleware, adminMiddleware, categoryController.createCategory);

// GET /api/categories - Lister toutes les catégories (Public)
router.get('/', categoryController.getAllCategories);

// GET /api/categories/:id - Récupérer une catégorie par son ID (Public)
router.get('/:id', categoryController.getCategoryById);

// PUT /api/categories/:id - Mettre à jour une catégorie (Admin requis)
router.put('/:id', authMiddleware, adminMiddleware, categoryController.updateCategory);

// DELETE /api/categories/:id - Supprimer une catégorie (Admin requis)
router.delete('/:id', authMiddleware, adminMiddleware, categoryController.deleteCategory);

module.exports = router;