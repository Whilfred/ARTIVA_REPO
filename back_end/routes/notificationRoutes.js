// ARTIVA/back_end/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/notifications - Récupérer les notifications de l'utilisateur
router.get('/', authMiddleware, notificationController.getUserNotifications);

// PUT /api/notifications/:notificationId/read - Marquer une notification comme lue
// Ou POST si tu préfères pour une action, mais PUT pour une mise à jour d'état est courant
router.put('/:notificationId/read', authMiddleware, notificationController.markNotificationAsRead);

// PUT /api/notifications/read-all - Marquer toutes les notifications comme lues
router.put('/read-all', authMiddleware, notificationController.markAllNotificationsAsRead); // Utilise la même fonction avec un flag dans le body

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, notificationController.getUnreadNotificationsCount);

module.exports = router;