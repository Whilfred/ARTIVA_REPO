// ARTIVA/back_end/controllers/wishlistController.js
const db = require('../config/db');

// Récupérer la liste de souhaits de l'utilisateur connecté
exports.getWishlist = async (req, res) => {
  const userId = req.user.id; // De authMiddleware
  try {
    const query = `
      SELECT 
        p.id, p.name, p.price, p.image_url, p.stock, p.sku, p.is_published,
        -- On pourrait aussi récupérer les noms de catégories/tags ici si besoin pour l'affichage wishlist
        (SELECT ARRAY_AGG(c.name ORDER BY c.name) 
         FROM categories c JOIN product_categories pc ON c.id = pc.category_id 
         WHERE pc.product_id = p.id) as categories_names,
        (SELECT ARRAY_AGG(t.name ORDER BY t.name) 
         FROM product_tags t JOIN product_tag_assignments pta ON t.id = pta.tag_id 
         WHERE pta.product_id = p.id) as tags_names
      FROM products p
      JOIN wishlist_items wi ON p.id = wi.product_id
      WHERE wi.user_id = $1 AND p.is_published = TRUE AND p.stock > 0 -- On ne montre que les produits encore valides
      ORDER BY wi.added_at DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    // Adapter les donnés si nécessaire (ex: formater le prix)
    const wishlistProducts = rows.map(p => ({
        ...p,
        price: p.price ? `${parseFloat(p.price).toFixed(2)} FCFA` : 'N/A',
        imageUrl: p.image_url || `https://via.placeholder.com/150x150/?text=${encodeURIComponent(productName.substring(0,3))}`,
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
    // Vérifier si le produit existe et est publiable (optionnel mais bonne pratique)
    const productCheck = await db.query('SELECT id FROM products WHERE id = $1 AND is_published = TRUE AND stock > 0', [productId]);
    if (productCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Produit non trouvé, non publié ou en rupture de stock.' });
    }

    const query = 'INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *;';
    const { rows } = await db.query(query, [userId, productId]);
    
    if (rows.length > 0) {
        res.status(201).json({ message: 'Produit ajouté à la liste de souhaits.', item: rows[0] });
    } else {
        // Si ON CONFLICT DO NOTHING et que l'item existait déjà, rows sera vide.
        // On peut considérer cela comme un succès ou renvoyer un statut différent.
        res.status(200).json({ message: 'Produit déjà dans la liste de souhaits.' });
    }
  } catch (error) {
    console.error('Erreur ajout à la wishlist:', error);
    if (error.code === '23503') { // Violation de clé étrangère (product_id n'existe pas)
        return res.status(404).json({ message: 'Produit non trouvé pour ajout à la wishlist.' });
    }
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout à la liste de souhaits.' });
  }
};

// Retirer un produit de la liste de souhaits
exports.removeFromWishlist = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params; // Ou req.body si tu préfères

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