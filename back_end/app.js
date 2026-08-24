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
const avisRouter = require('./routes/avis'); // <-- Ajouter le router des avis

// NOTE : routes/dashboardRoutes.js n'est volontairement PAS importé ici.
// C'est un reliquat écrit pour Mongoose/MongoDB (Order.countDocuments(),
// Order.aggregate(), require('../models/User')...) alors que le projet tourne
// sur PostgreSQL et n'a pas de dossier models/. L'importer ferait planter le
// serveur au démarrage. Le tableau de bord du panel admin n'en a pas besoin :
// il calcule ses statistiques à partir de /api/orders, /api/users et
// /api/products.

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev')); <-- Supprimé car tu ne veux pas l'utiliser

// Route de test simple
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API Artiva !' });
});

// Route de santé : l'app mobile l'interroge pour savoir si le serveur répond
// (front_end/context/AuthContext.tsx envoie un HEAD sur /api/health).
// Elle était appelée côté client mais n'avait jamais été définie ici.
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

// Monter le router des avis à la racine /api
app.use('/api', avisRouter); // <-- toutes les routes dans avis.js auront le préfixe /api

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Quelque chose s\'est mal passé !' });
});

module.exports = app;
