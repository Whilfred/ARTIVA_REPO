// ARTIVA/back_end/controllers/wishlistController.js
const db = require('../config/db');
const { sendWishlistRestockEmail } = require('../utils/sendEmail.js');
const { sendPushNotification } = require('../services/fcmService');

// Récupérer la liste de souhaits de l'utilisateur connecté
exports.getWishlist = async (req, res) => {
  const userId = req.user.id; // De authMiddleware
  try {
    const query = `
      SELECT 
        p.id, p.name, p.price, p.image_url, p.stock, p.sku, p.is_published,
        (SELECT ARRAY_AGG(c.name ORDER BY c.name) 
         FROM categories c JOIN product_categories pc ON c.id = pc.category_id 
         WHERE pc.product_id = p.id) as categories_names,
        (SELECT ARRAY_AGG(t.name ORDER BY t.name) 
         FROM product_tags t JOIN product_tag_assignments pta ON t.id = pta.tag_id 
         WHERE pta.product_id = p.id) as tags_names
      FROM products p
      JOIN wishlist_items wi ON p.id = wi.product_id
      WHERE wi.user_id = $1 AND p.is_published = TRUE AND p.stock > 0
      ORDER BY wi.added_at DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    const wishlistProducts = rows.map(p => ({
        ...p,
        price: p.price ? `${parseFloat(p.price).toFixed(2)} FCFA` : 'N/A',
        imageUrl: p.image_url || `https://via.placeholder.com/150x150/?text=${encodeURIComponent(p.name.substring(0,3))}`,
        categories_names: p.categories_names || [],
        tags_names: p.tags_names || []
    }));
    res.status(200).json(wishlistProducts);
  } catch (error) {
    console.error('Erreur récupération wishlist:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la liste de souhaits.' });
  }
};

// Ajouter un produit à la liste de souhaits
exports.addToWishlist = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'ID du produit manquant.' });
  }

  try {
    const productCheck = await db.query('SELECT id FROM products WHERE id = $1 AND is_published = TRUE AND stock > 0', [productId]);
    if (productCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Produit non trouvé, non publié ou en rupture de stock.' });
    }

    const query = 'INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *;';
    const { rows } = await db.query(query, [userId, productId]);
    
    if (rows.length > 0) {
        res.status(201).json({ message: 'Produit ajouté à la liste de souhaits.', item: rows[0] });
    } else {
        res.status(200).json({ message: 'Produit déjà dans la liste de souhaits.' });
    }
  } catch (error) {
    console.error('Erreur ajout à la wishlist:', error);
    if (error.code === '23503') {
        return res.status(404).json({ message: 'Produit non trouvé pour ajout à la wishlist.' });
    }
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout à la liste de souhaits.' });
  }
};

// Retirer un produit de la liste de souhaits
exports.removeFromWishlist = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ message: 'ID du produit manquant.' });
  }

  try {
    const query = 'DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2 RETURNING *;';
    const result = await db.query(query, [userId, productId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Produit non trouvé dans la liste de souhaits de l\'utilisateur.' });
    }
    res.status(200).json({ message: 'Produit retiré de la liste de souhaits.', item: result.rows[0] });
  } catch (error) {
    console.error('Erreur suppression de la wishlist:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la liste de souhaits.' });
  }
};

// --- Notifier les utilisateurs ayant ce produit en wishlist qu'il est de retour en stock ---
// À appeler depuis productController.js, juste après un UPDATE qui fait
// passer le stock de 0 (ou moins) à un nombre positif. Ne fait rien si
// le produit n'est dans aucune wishlist.
exports.notifyWishlistUsersOnRestock = async (productId, client) => {
  const db_or_client = client || db;
  try {
    // Récupérer les infos utilisateurs ET leur token FCM en une seule requête
    const query = `
      SELECT 
        u.id AS user_id,
        u.email, 
        u.name, 
        u.fcm_token,
        p.name AS product_name, 
        p.price,
        p.image_url
      FROM wishlist_items wi
      JOIN users u ON u.id = wi.user_id
      JOIN products p ON p.id = wi.product_id
      WHERE wi.product_id = $1
        AND u.is_active = true;
    `;
    const { rows } = await db_or_client.query(query, [productId]);

    if (rows.length === 0) {
      console.log(`ℹ️ Aucun utilisateur en wishlist pour le produit ${productId}`);
      return;
    }

    console.log(`📢 Produit ${productId} de retour en stock : ${rows.length} utilisateur(s) à notifier`);

    // Récupérer le nom du produit (identique pour tous)
    const productName = rows[0].product_name;

    for (const row of rows) {
      // 1. Envoyer l'email (logique existante)
      try {
        await sendWishlistRestockEmail(row.email, [{ 
          name: row.product_name, 
          price: row.price 
        }]);
      } catch (emailError) {
        console.error(`Erreur envoi email restock wishlist à ${row.email}:`, emailError);
      }

      // 2. NOUVEAU : Envoyer la push (si l'utilisateur a un token)
      if (row.fcm_token) {
        try {
          await sendPushNotification(row.fcm_token, {
            title: '🎉 Article de retour en stock !',
            body: `"${productName}" est de nouveau disponible. Dépêchez-vous !`,
            data: { 
              screen: 'product', 
              productId: String(productId) 
            },
          });
          console.log(`📲 Push "retour en stock" envoyée à ${row.name} (user ${row.user_id})`);
        } catch (pushError) {
          console.error(`Erreur push restock à user ${row.user_id}:`, pushError.message);
        }
      } else {
        console.log(`ℹ️ Pas de token FCM pour ${row.name} (user ${row.user_id})`);
      }
    }

    console.log(`✅ Notifications restock terminées pour le produit ${productId}`);
  } catch (error) {
    console.error('Erreur notification wishlist restock:', error);
  }
};

// --- Voir la wishlist d'un utilisateur (ADMIN) ---
exports.getUserWishlistAdmin = async (req, res) => {
  const targetUserId = req.params.userId;

  if (!targetUserId) {
    return res.status(400).json({ message: 'ID utilisateur manquant.' });
  }

  try {
    const query = `
      SELECT 
        wi.product_id AS "productId",
        wi.added_at AS "addedAt",
        p.name,
        p.price,
        p.image_url AS "imageUrl",
        p.stock,
        p.is_published
      FROM wishlist_items wi
      JOIN products p ON p.id = wi.product_id
      WHERE wi.user_id = $1
      ORDER BY wi.added_at DESC;
    `;
    const { rows } = await db.query(query, [targetUserId]);

    const items = rows.map(item => ({
      ...item,
      price: item.price ? `${parseFloat(item.price).toFixed(2)} FCFA` : 'N/A',
    }));

    res.status(200).json({ items });
  } catch (error) {
    console.error('Erreur admin récupération wishlist:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};