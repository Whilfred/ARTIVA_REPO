// ARTIVA/back_end/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// GET /api/orders - Récupérer les commandes de l'utilisateur connecté
router.get('/', authMiddleware, orderController.getUserOrders);

// POST /api/orders - Créer une nouvelle commande (CLIENT) - À IMPLÉMENTER PLUS TARD
 router.post('/', authMiddleware, orderController.createOrder);

 // NOUVELLE ROUTE CLIENT pour voir le détail d'une de ses commandes
router.get('/:orderId', authMiddleware, orderController.getUserOrderDetail);


// --- Routes pour les Administrateurs ---
// GET /api/orders/admin/all - Lister toutes les commandes (ADMIN)
router.get('/admin/all', authMiddleware, adminMiddleware, orderController.getAllOrdersAdmin);

// GET /api/orders/admin/:orderId - Récupérer les détails d'une commande spécifique (ADMIN)
router.get('/admin/:orderId', authMiddleware, adminMiddleware, orderController.getOrderDetailsAdmin);

// PUT /api/orders/admin/:orderId/status - Mettre à jour le statut d'une commande (ADMIN)
router.put('/admin/:orderId/status', authMiddleware, adminMiddleware, orderController.updateOrderStatusAdmin);


module.exports = router;
