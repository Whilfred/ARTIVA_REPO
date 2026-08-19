// ARTIVA/back_end/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    res.json({ totalOrders, totalUsers, totalProducts, ordersByStatus });
  } catch (err) {
    console.error("Erreur dashboard stats:", err);
    res.status(500).json({ message: "Impossible de récupérer les statistiques." });
  }
});

module.exports = router;
