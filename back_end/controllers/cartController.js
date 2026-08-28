const db = require('../config/db');

// --- Récupérer ou créer le panier actif de l'utilisateur ---
async function getActiveCart(userId, client) {
  const currentClient = client || db;
  let cartResult = await currentClient.query(
    'SELECT id FROM carts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', 
    [userId]
  );

  if (cartResult.rows.length > 0) {
    return cartResult.rows[0];
  } else {
    const newCartResult = await currentClient.query(
      'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    return newCartResult.rows[0];
  }
}

// --- Récupérer le panier de l'utilisateur connecté ---
exports.getUserCart = async (req, res) => {
  const userId = req.user.id;
  try {
    const cart = await getActiveCart(userId);
    if (!cart) {
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
      WHERE ci.cart_id = $1 AND p.is_published = TRUE
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
    
    const adaptedItems = items.map(item => ({
        ...item,
        id: item.productId,
        price: item.price ? `${parseFloat(item.price).toFixed(2)} FCFA` : 'N/A',
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

// --- Ajouter/Mettre à jour un article dans le panier ---
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

    const cart = await getActiveCart(userId, client);

    const productResult = await client.query('SELECT stock, price, name FROM products WHERE id = $1 AND is_published = TRUE', [productId]);
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Produit non trouvé ou non disponible.' });
    }
    const productStock = productResult.rows[0].stock;
    const productName = productResult.rows[0].name;
    const productPrice = productResult.rows[0].price;

    const existingItemResult = await client.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, productId]
    );

    let finalQuantity = parsedQuantity;
    if (finalQuantity > productStock) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ message: `Stock insuffisant pour ${productName}. Disponible: ${productStock}` });
    }

    let savedItem;
    if (existingItemResult.rows.length > 0) {
      const updatedItemResult = await client.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
        [finalQuantity, existingItemResult.rows[0].id]
      );
      savedItem = updatedItemResult.rows[0];
    } else {
      const newItemResult = await client.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
        [cart.id, productId, finalQuantity]
      );
      savedItem = newItemResult.rows[0];
    }
    
    await client.query('COMMIT');
    res.status(200).json({ 
        message: 'Article mis à jour dans le panier.', 
        item: { 
            ...savedItem, 
            id: savedItem.product_id, 
            name: productName, 
            price: `${parseFloat(productPrice).toFixed(2)} FCFA`, 
            imageUrl: (await client.query('SELECT image_url FROM products WHERE id=$1',[savedItem.product_id])).rows[0]?.image_url,
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

// --- Supprimer un article du panier ---
exports.removeItemFromCart = async (req, res) => {
  const userId = req.user.id;
  const { cartItemId } = req.params;

  if (!cartItemId) {
    return res.status(400).json({ message: 'ID de l\'article du panier manquant.' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cart = await getActiveCart(userId, client);

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

    await client.query('COMMIT');
    res.status(200).json({ message: 'Panier vidé avec succès.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur pour vider le panier:', error);
    res.status(500).json({ message: 'Erreur serveur lors du vidage du panier.' });
  } finally {
    client.release();
  }
};

// --- Voir le panier d'un utilisateur (ADMIN) ---
exports.getUserCartAdmin = async (req, res) => {
  const targetUserId = req.params.userId;
  try {
    const cart = await getActiveCart(targetUserId);
    if (!cart) {
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
      WHERE ci.cart_id = $1
      ORDER BY ci.added_at DESC;
    `;
    const { rows: items } = await db.query(itemsQuery, [cart.id]);

    res.status(200).json({ cartId: cart.id, items });
  } catch (error) {
    console.error('Erreur admin récupération panier:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
