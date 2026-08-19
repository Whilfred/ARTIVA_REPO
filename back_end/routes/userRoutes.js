// ARTIVA/back_end/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware'); // Notre middleware JWT
const adminMiddleware = require('../middlewares/adminMiddleware'); // Nécessaire pour les actions admin

// GET /api/users/me - Récupérer le profil de l'utilisateur connecté
// Cette route est protégée par le authMiddleware
router.get('/me', authMiddleware, userController.getCurrentUserProfile);

// PUT /api/users/me - Mettre à jour le profil de l'utilisateur connecté
router.put('/me', authMiddleware, userController.updateMyProfile); // NOUVELLE ROUTE

// PUT /api/users/change-password - Changer son propre mot de passe
// (Assure-toi que la fonction 'changePassword' existe bien dans userController.js)
// Si tu l'as mise dans authController.js, alors cette route devrait être dans authRoutes.js
// Supposons qu'elle est dans userController.js pour l'instant :
router.put('/change-password', authMiddleware, userController.changePassword);

// PUT /api/users/me/deactivate - Désactiver son propre compte
router.put('/me/deactivate', authMiddleware, userController.deactivateMyAccount); // PAS de adminMiddleware ici

// --- Routes Admin pour la gestion des utilisateurs ---

// GET /api/users - Lister tous les utilisateurs (clients) (Admin)
router.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);

// GET /api/users/:id - Récupérer un utilisateur spécifique par son ID (Admin)
router.get('/:id', authMiddleware, adminMiddleware, userController.getUserById);

// PUT /api/users/:id - Mettre à jour un utilisateur (Admin)
router.put('/:id', authMiddleware, adminMiddleware, userController.updateUserByAdmin);

// DELETE /api/users/:id - Supprimer un utilisateur (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, userController.deleteUserByAdmin);
module.exports = router;