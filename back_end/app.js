// ARTIVA/back_end/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Charger les variables d'environnement dès le départ

// Importer les routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productTagRoutes = require('./routes/productTagRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const cartRoutes = require('./routes/cartRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const promoRoutes = require('./routes/promoRoutes');
const livraisonRoutes = require('./routes/livraisonRoutes');
const avisRouter = require('./routes/avis');
const campaignRoutes = require('./routes/campaignRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API Artiva !' });
});

app.all('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Monter les routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/product-tags', productTagRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/livraison', livraisonRoutes);
app.use('/api/campaigns', campaignRoutes); // <-- Correctement placé ici

// Monter le router des avis à la racine /api
app.use('/api', avisRouter);

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Quelque chose s\'est mal passé !' });
});

module.exports = app;