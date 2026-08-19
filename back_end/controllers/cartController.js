// ARTIVA/back_end/controllers/cartController.js
const db = require('../config/db');

// --- Récupérer ou créer le panier actif de l'utilisateur ---
// Cette fonction helper sera utilisée par d'autres fonctions du contrôleur
async function getActiveCart(userId, client) {
  const currentClient = client || db; // Utilise le client de transaction si fourni, sinon le pool db
  // Chercher un panier non validé pour cet utilisateur
  let cartResult = await currentClient.query(
    'SELECT id FROM carts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', 
    // (On pourrait ajouter une condition "AND is_checked_out = FALSE" si on avait ce champ
    // et qu'on ne supprimait pas le panier après commande)
    [userId]
  );

  if (cartResult.rows.length > 0) {
    return cartResult.rows[0]; // Retourne le panier existant
  } else {
    // Si pas de panier actif, en créer un nouveau
    const newCartResult = await currentClient.query(
      'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    return newCartResult.rows[0]; // Retourne le nouveau panier créé
  }
}

// --- Récupérer le panier de l'utilisateur connecté (avec les items et détails produit) ---
exports.getUserCart = async (req, res) => {
  const userId = req.user.id;
  try {
    const cart = await getActiveCart(userId);
    if (!cart) { // Ne devrait pas arriver si getActiveCart en crée un
      return res.status(200).json({ items: [], totalAmount: 0, totalItems: 0 });
    }

    const itemsQuery = `
      SELECT 
        ci.id as "cartItemId", 
        ci.quantity,
        p.id as "productId", 
        p.name, 
        p.price, 
        p.image_url as "imageUrl", 
        p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1 AND p.is_published = TRUE -- On ne veut que les produits encore valides
      ORDER BY ci.added_at DESC;
    `;
    const { rows: items } = await db.query(itemsQuery, [cart.id]);

    let totalAmount = 0;
    let totalItems = 0;
    items.forEach(item => {
      const itemPrice = parseFloat(item.price);
      if (!isNaN(itemPrice)) {
        totalAmount += itemPrice * item.quantity;
      }
      totalItems += item.quantity;
    });
    
    // Adapter les items pour le frontend (ex: formater le prix)
    const adaptedItems = items.map(item => ({
        ...item, // Garde product.id as productId, etc.
        id: item.productId, // Le frontend CartItem attend 'id' pour le produit
        price: item.price ? `${parseFloat(item.price).toFixed(2)} FCFA` : 'N/A', // Formater
    }));

    res.status(200).json({ 
      cartId: cart.id, 
      items: adaptedItems, 
      totalAmount: parseFloat(totalAmount.toFixed(2)), 
      totalItems 
    });
  } catch (error) {
    console.error('Erreur récupération du panier utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du panier.' });
  }
};


// --- Ajouter/Mettre à jour un article dans le panier de l'utilisateur ---
exports.addItemToCart = async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined || parseInt(quantity, 10) <= 0) {
    return res.status(400).json({ message: 'ID produit et quantité positive sont requis.' });
  }
  const parsedQuantity = parseInt(quantity, 10);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const cart = await getActiveCart(userId, client); // Passe le client pour la transaction

    // Vérifier le stock du produit
    const productResult = await client.query('SELECT stock, price, name FROM products WHERE id = $1 AND is_published = TRUE', [productId]);
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Produit non trouvé ou non disponible.' });
    }
    const productStock = productResult.rows[0].stock;
    const productName = productResult.rows[0].name;
    const productPrice = productResult.rows[0].price;


    // Vérifier si l'article est déjà dans le panier
    const existingItemResult = await client.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, productId]
    );

    let finalQuantity = parsedQuantity;
    if (existingItemResult.rows.length > 0) {
      // Si l'article existe, on met à jour la quantité (ou on additionne selon la logique voulue)
      // Ici, on remplace la quantité par celle fournie (le frontend gérera l'incrément)
      finalQuantity = parsedQuantity; 
    }
    
    if (finalQuantity > productStock) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ message: `Stock insuffisant pour ${productName}. Disponible: ${productStock}` });
    }

    let savedItem;
    if (existingItemResult.rows.length > 0) {
      // Mettre à jour la quantité
      const updatedItemResult = await client.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
        [finalQuantity, existingItemResult.rows[0].id]
      );
      savedItem = updatedItemResult.rows[0];
    } else {
      // Insérer le nouvel article
      const newItemResult = await client.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
        [cart.id, productId, finalQuantity]
      );
      savedItem = newItemResult.rows[0];
    }
    
    await client.query('COMMIT');
    // Renvoyer l'item ajouté/mis à jour avec les détails du produit pour faciliter la mise à jour de l'UI
    res.status(200).json({ 
        message: 'Article mis à jour dans le panier.', 
        item: { 
            ...savedItem, 
            id: savedItem.product_id, // Pour correspondre au type Product/CartItem du frontend
            name: productName, 
            price: `${parseFloat(productPrice).toFixed(2)} FCFA`, 
            imageUrl: (await client.query('SELECT image_url FROM products WHERE id=$1',[savedItem.product_id])).rows[0]?.image_url, // Récupérer l'image
            stock: productStock 
        } 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur ajout/màj article panier:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du panier.' });
  } finally {
    client.release();
  }
};


// --- Supprimer un article du panier de l'utilisateur ---
exports.removeItemFromCart = async (req, res) => {
  const userId = req.user.id;
  const { cartItemId } = req.params; // On va utiliser l'ID de l'item du panier pour la suppression

  if (!cartItemId) {
    return res.status(400).json({ message: 'ID de l\'article du panier manquant.' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cart = await getActiveCart(userId, client);

    // S'assurer que l'item appartient bien au panier de l'utilisateur
    const deleteResult = await client.query(
      'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING product_id',
      [cartItemId, cart.id]
    );

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Article non trouvé dans le panier de l\'utilisateur.' });
    }
    
    await client.query('COMMIT');
    res.status(200).json({ message: 'Article supprimé du panier.', deletedCartItemId: cartItemId, productId: deleteResult.rows[0].product_id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur suppression article panier:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'article du panier.' });
  } finally {
    client.release();
  }
};

// --- Vider le panier de l'utilisateur ---
exports.clearUserCart = async (req, res) => {
  const userId = req.user.id;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cart = await getActiveCart(userId, client);
    
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
    // Optionnel: supprimer le panier lui-même ou le garder pour l'historique ?
    // Si on le supprime: await client.query('DELETE FROM carts WHERE id = $1', [cart.id]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Panier vidé avec succès.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur pour vider le panier:', error);
    res.status(500).json({ message: 'Erreur serveur lors du vidage du panier.' });
  } finally {
    client.release();
  }

  
  // Récupérer le panier actif de l'utilisateur connecté et ses articles
exports.getCurrentUserCart = async (req, res) => {
  const userId = req.user.id; // De authMiddleware

  try {
    // 1. Trouver le panier actif de l'utilisateur (on suppose un seul panier actif par utilisateur pour l'instant)
    //    Si tu gères guest_token, la logique serait plus complexe pour potentiellement fusionner.
    //    Pour l'instant, on cherche un panier lié à user_id.
    //    Si tu n'as pas de table 'carts' séparée et que 'cart_items' référence directement 'users', adapte.
    //    Ici, je suppose que tu as une table 'carts' avec une colonne 'user_id'.

    let cartQuery = 'SELECT id FROM carts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1';
    // Si tu as un champ is_active ou is_checked_out=false sur carts :
    // cartQuery = 'SELECT id FROM carts WHERE user_id = $1 AND is_checked_out = FALSE ORDER BY created_at DESC LIMIT 1';
    
    const cartResult = await db.query(cartQuery, [userId]);

    if (cartResult.rows.length === 0) {
      // Aucun panier actif trouvé pour cet utilisateur, renvoyer un panier vide
      return res.status(200).json([]); // Un tableau vide est une réponse valide pour un panier vide
    }

    const cartId = cartResult.rows[0].id;

    // 2. Récupérer les articles de ce panier, en joignant les infos du produit
    const itemsQuery = `
      SELECT 
        ci.id as "cartItemId", 
        ci.quantity,
        ci.added_at as "addedAt",
        p.id, 
        p.name, 
        p.price, 
        p.image_url as "imageUrl", -- Assurer que le nom de champ correspond à ce que CartItem attend
        p.stock,
        p.description, -- Et autres champs de Product si besoin dans CartItem
        p.sku,
        p.is_published
        -- Tu peux ajouter categories_names et tags_names ici si tu les affiches dans le panier
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1 AND p.is_published = TRUE AND p.stock > 0 
      -- On ne montre que les produits encore valides dans le panier
      ORDER BY ci.added_at ASC;
    `;
    const { rows: cartItems } = await db.query(itemsQuery, [cartId]);
    
    // Adapter les données pour correspondre au type CartItem du frontend si nécessaire
    const adaptedCartItems = cartItems.map(item => ({
        ...item, // Garde les champs de base du produit
        id: String(item.id), // ID du produit, s'assurer que c'est une chaîne
        cartItemId: item.cartItemId, // ID de l'entrée cart_item
        quantity: item.quantity,
        // Le prix est déjà un nombre/chaîne de l'API produit, pas besoin de le reformater ici
        // sauf si tu veux le stocker différemment dans cart_items.
        // Ici, 'price' vient directement de la table 'products'.
        // Ton CartContext s'attend à ce que 'price' soit une chaîne formatée comme "XX.XX FCFA".
        // Donc, adaptons-le ici aussi :
        price: item.price ? `${parseFloat(item.price).toFixed(2)} FCFA` : 'N/A',
        imageUrl: item.imageUrl || `https://via.placeholder.com/80x80/?text=${encodeURIComponent(item.name || 'Prod')}`,

    }));

    res.status(200).json(adaptedCartItems); // Renvoyer le tableau d'articles du panier

  } catch (error) {
    console.error('Erreur récupération panier utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du panier.' });
  }
}};