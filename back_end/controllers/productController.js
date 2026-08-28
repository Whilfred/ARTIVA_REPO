// ARTIVA/back_end/controllers/productController.js
const db = require("../config/db");
const wishlistController = require("./wishlistController");

// --- Créer un nouveau produit (Admin) ---
exports.createProduct = async (req, res) => {
  const { 
    name, description, price, stock, image_url, 
    sku, is_published, video_url,
    category_ids, tag_ids,
    images
  } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ message: 'Le nom, le prix et le stock du produit sont requis.' });
  }
  const parsedPrice = parseFloat(price);
  const parsedStock = parseInt(stock, 10);
  const publishedStatus = is_published !== undefined ? Boolean(is_published) : false;

  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ message: 'Le prix doit être un nombre positif ou nul.' });
  }
  if (isNaN(parsedStock) || parsedStock < 0) {
    return res.status(400).json({ message: 'Le stock doit être un entier positif ou nul.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    let mainImageUrlFromRoot = req.body.image_url || null;

    const productQuery = `
      INSERT INTO products (name, description, price, stock, image_url, sku, is_published, video_url) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`;
    const productResult = await client.query(productQuery, [
      name, description || null, parsedPrice, parsedStock,
      mainImageUrlFromRoot, sku || null, publishedStatus, video_url || null
    ]);
    const createdProduct = productResult.rows[0];

    if (images && Array.isArray(images) && images.length > 0) {
      const imagePromises = images.map((img, index) => {
        if (!img.image_url) return Promise.resolve();
        return client.query(
          'INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order) VALUES ($1, $2, $3, $4, $5)',
          [createdProduct.id, img.image_url, img.alt_text || null, img.is_primary || false, img.display_order || index]
        );
      });
      await Promise.all(imagePromises.filter(p => p));
    } else if (mainImageUrlFromRoot) {
      await client.query(
        'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES ($1, $2, TRUE, 0)',
        [createdProduct.id, mainImageUrlFromRoot]
      );
    }

    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      const categoryPromises = category_ids
        .map(id => parseInt(id, 10))
        .filter(idNum => !isNaN(idNum))
        .map(validCategoryId => client.query(
          'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [createdProduct.id, validCategoryId]
        ));
      if (categoryPromises.length > 0) await Promise.all(categoryPromises);
    }

    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagPromises = tag_ids
        .map(id => parseInt(id, 10))
        .filter(idNum => !isNaN(idNum))
        .map(validTagId => client.query(
          'INSERT INTO product_tag_assignments (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [createdProduct.id, validTagId]
        ));
      if (tagPromises.length > 0) await Promise.all(tagPromises);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Produit créé avec succès!', product: createdProduct });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur détaillée lors de la création du produit:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Conflit de données (SKU ou nom déjà existant).', detail: error.detail });
    }
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Référence invalide (catégorie ou tag inexistant).', detail: error.detail });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la création du produit.' });
  } finally {
    client.release();
  }
};

// --- Récupérer tous les produits (Publique) ---
exports.getAllProducts = async (req, res) => {
  const { category_id, tag_id, tag_name, limit, random, search } = req.query;

  try {
    let queryParams = [];
    let paramIndex = 1;

    let baseQuery = `
      SELECT 
        p.id, p.name, p.description, p.price, p.stock, p.image_url, 
        p.sku, p.is_published, p.created_at, p.updated_at, p.video_url,
        (SELECT ARRAY_AGG(c.name ORDER BY c.name) 
         FROM categories c 
         JOIN product_categories pc_names ON c.id = pc_names.category_id 
         WHERE pc_names.product_id = p.id) as categories_names,
        (SELECT ARRAY_AGG(pc.category_id)
         FROM product_categories pc
         WHERE pc.product_id = p.id) as category_ids,
        (SELECT ARRAY_AGG(t.name ORDER BY t.name) 
         FROM product_tags t 
         JOIN product_tag_assignments pta_names ON t.id = pta_names.tag_id 
         WHERE pta_names.product_id = p.id) as tags_names,
        (SELECT ARRAY_AGG(pta.tag_id)
         FROM product_tag_assignments pta
         WHERE pta.product_id = p.id) as tag_ids
      FROM products p
    `;

    let joinClauses = "";
    let whereClauses = ["p.is_published = TRUE", "p.stock > 0"];

    if (category_id) {
      joinClauses += ` JOIN product_categories pc_filter ON p.id = pc_filter.product_id`;
      whereClauses.push(`pc_filter.category_id = $${paramIndex++}`);
      queryParams.push(parseInt(category_id, 10));
    }

    if (tag_id) {
      joinClauses += ` JOIN product_tag_assignments pta_filter ON p.id = pta_filter.product_id`;
      whereClauses.push(`pta_filter.tag_id = $${paramIndex++}`);
      queryParams.push(parseInt(tag_id, 10));
    } else if (tag_name) {
      joinClauses += ` JOIN product_tag_assignments pta_filter ON p.id = pta_filter.product_id JOIN product_tags pt_filter ON pta_filter.tag_id = pt_filter.id`;
      whereClauses.push(`pt_filter.name = $${paramIndex++}`);
      queryParams.push(tag_name);
    }

    if (search) {
      whereClauses.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    let finalQuery = baseQuery + joinClauses;
    if (whereClauses.length > 0) {
      finalQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (random === 'true' || random === true) {
      finalQuery += " ORDER BY RANDOM()";
    } else {
      finalQuery += " ORDER BY p.created_at DESC";
    }

    let countQuery = `SELECT COUNT(DISTINCT p.id) FROM products p ${joinClauses}`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    const countResult = await db.query(countQuery, queryParams.slice(0, paramIndex - 1));
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const parsedLimit = limit ? parseInt(limit, 10) : null;
    const totalPages = parsedLimit ? Math.ceil(totalItems / parsedLimit) : 1;

    if (parsedLimit) {
      finalQuery += ` LIMIT $${paramIndex++}`;
      queryParams.push(parsedLimit);
    }

    const currentPage = parseInt(req.query.page, 10) || 1;
    const offset = parsedLimit ? (currentPage - 1) * parsedLimit : 0;
    finalQuery += ` OFFSET $${paramIndex++}`;
    queryParams.push(offset);

    const { rows } = await db.query(finalQuery, queryParams);

    const productsData = rows.map(product => ({
      ...product,
      category_ids: product.category_ids || [],
      categories_names: product.categories_names || [],
      tag_ids: product.tag_ids || [],
      tags_names: product.tags_names || []
    }));

    if (!productsData || productsData.length === 0) {
      return res.status(200).json({
        products: [],
        currentPage,
        totalPages: 0,
        totalItems: 0
      });
    }

    res.status(200).json({ products: productsData, currentPage, totalPages, totalItems });

  } catch (error) {
    console.error('Erreur lors de la récupération de tous les produits:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des produits.' });
  }
};

// --- Récupérer un produit par son ID ---
exports.getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const productQuery = `
      SELECT 
        p.id, p.name, p.description, p.price, p.stock, 
        p.image_url AS main_image_url,
        p.sku, p.is_published, p.created_at, p.updated_at, p.video_url,
        (SELECT ARRAY_AGG(
            json_build_object(
              'id', pi.id, 'image_url', pi.image_url,
              'alt_text', pi.alt_text, 'is_primary', pi.is_primary,
              'display_order', pi.display_order
            ) ORDER BY pi.display_order ASC, pi.is_primary DESC NULLS LAST
         ) FROM product_images pi WHERE pi.product_id = p.id) as images,
        (SELECT ARRAY_AGG(pc.category_id ORDER BY c.name)
         FROM categories c JOIN product_categories pc ON c.id = pc.category_id
         WHERE pc.product_id = p.id) as category_ids,
        (SELECT ARRAY_AGG(c.name ORDER BY c.name) 
         FROM categories c JOIN product_categories pc ON c.id = pc.category_id
         WHERE pc.product_id = p.id) as categories_names,
        (SELECT ARRAY_AGG(pta.tag_id ORDER BY t.name)
         FROM product_tags t JOIN product_tag_assignments pta ON t.id = pta.tag_id
         WHERE pta.product_id = p.id) as tag_ids,
        (SELECT ARRAY_AGG(t.name ORDER BY t.name) 
         FROM product_tags t JOIN product_tag_assignments pta ON t.id = pta.tag_id
         WHERE pta.product_id = p.id) as tags_names
      FROM products p
      WHERE p.id = $1
    `;

    const { rows } = await db.query(productQuery, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }

    const product = rows[0];
    product.images = product.images || [];
    product.category_ids = product.category_ids || [];
    product.categories_names = product.categories_names || [];
    product.tag_ids = product.tag_ids || [];
    product.tags_names = product.tags_names || [];

    if (product.images.length === 0 && product.main_image_url) {
      product.images = [{
        id: `main_${product.id}`,
        image_url: product.main_image_url,
        is_primary: true,
        display_order: 0
      }];
    }

    res.status(200).json(product);

  } catch (error) {
    console.error(`Erreur récupération produit ID ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du produit.' });
  }
};

// --- Mettre à jour un produit (Admin) ---
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, image_url, sku, is_published, category_ids, tag_ids, images, video_url } = req.body;

  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
  if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description || null); }
  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) return res.status(400).json({ message: 'Prix invalide.' });
    fields.push(`price = $${paramIndex++}`); values.push(parsedPrice);
  }

  let parsedStock; // gardée hors du bloc pour être réutilisable après le COMMIT
  if (stock !== undefined) {
    parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) return res.status(400).json({ message: 'Stock invalide.' });
    fields.push(`stock = $${paramIndex++}`); values.push(parsedStock);
  }

  if (image_url !== undefined) { fields.push(`image_url = $${paramIndex++}`); values.push(image_url || null); }
  if (sku !== undefined) { fields.push(`sku = $${paramIndex++}`); values.push(sku || null); }
  if (is_published !== undefined) { fields.push(`is_published = $${paramIndex++}`); values.push(Boolean(is_published)); }
  if (video_url !== undefined) { fields.push(`video_url = $${paramIndex++}`); values.push(video_url || null); }

  if (fields.length === 0 && (!category_ids || category_ids.length === 0) && (!tag_ids || tag_ids.length === 0)) {
    return res.status(400).json({ message: 'Aucun champ à mettre à jour pour le produit.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Stock AVANT modification : c'est la seule façon de savoir si on vient
    // de repasser de 0 (ou moins) à un stock positif, et donc s'il faut
    // prévenir la wishlist. Lu ici, dans la transaction, avant l'UPDATE.
    let oldStock = null;
    if (stock !== undefined) {
      const oldStockResult = await client.query('SELECT stock FROM products WHERE id = $1', [id]);
      if (oldStockResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ message: 'Produit non trouvé.' });
      }
      oldStock = parseInt(oldStockResult.rows[0].stock, 10);
    }

    let updatedProduct;

    if (fields.length > 0) {
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      const updateProductQuery = `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *;`;
      values.push(id);
      const updatedProductResult = await client.query(updateProductQuery, values);
      if (updatedProductResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ message: 'Produit non trouvé pour la mise à jour.' });
      }
      updatedProduct = updatedProductResult.rows[0];
    } else {
      const currentProductResult = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      if (currentProductResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ message: 'Produit non trouvé.' });
      }
      updatedProduct = currentProductResult.rows[0];
    }

    if (images !== undefined) {
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      if (Array.isArray(images) && images.length > 0) {
        const imagePromises = images.map((img, index) => {
          if (!img.image_url) return Promise.resolve();
          return client.query(
            'INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order) VALUES ($1, $2, $3, $4, $5)',
            [id, img.image_url, img.alt_text || null, img.is_primary || false, img.display_order || index]
          );
        });
        await Promise.all(imagePromises.filter(p => p));
      }
    }

    if (category_ids !== undefined) {
      await client.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
      if (Array.isArray(category_ids) && category_ids.length > 0) {
        const catPromises = category_ids
          .map(cId => parseInt(cId, 10)).filter(cId => !isNaN(cId))
          .map(catId => client.query(
            'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, catId]
          ));
        if (catPromises.length > 0) await Promise.all(catPromises);
      }
    }

    if (tag_ids !== undefined) {
      await client.query('DELETE FROM product_tag_assignments WHERE product_id = $1', [id]);
      if (Array.isArray(tag_ids) && tag_ids.length > 0) {
        const tagPromises = tag_ids
          .map(tId => parseInt(tId, 10)).filter(tId => !isNaN(tId))
          .map(tagId => client.query(
            'INSERT INTO product_tag_assignments (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, tagId]
          ));
        if (tagPromises.length > 0) await Promise.all(tagPromises);
      }
    }

    await client.query('COMMIT');

    const finalProductResult = await db.query(`
      SELECT p.*, 
        (SELECT ARRAY_AGG(json_build_object('id', pi.id, 'image_url', pi.image_url, 'alt_text', pi.alt_text, 'is_primary', pi.is_primary, 'display_order', pi.display_order) ORDER BY pi.display_order, pi.is_primary DESC) FROM product_images pi WHERE pi.product_id = p.id) as images,
        (SELECT ARRAY_AGG(pc.category_id) FROM product_categories pc WHERE pc.product_id = p.id) as category_ids,
        (SELECT ARRAY_AGG(c.name) FROM categories c JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = p.id) as categories_names,
        (SELECT ARRAY_AGG(pta.tag_id) FROM product_tag_assignments pta WHERE pta.product_id = p.id) as tag_ids,
        (SELECT ARRAY_AGG(t.name) FROM product_tags t JOIN product_tag_assignments pta ON t.id = pta.tag_id WHERE pta.product_id = p.id) as tags_names
      FROM products p WHERE p.id = $1;
    `, [id]);

    const finalProduct = finalProductResult.rows[0];
    finalProduct.images = finalProduct.images || [];
    finalProduct.category_ids = finalProduct.category_ids || [];
    finalProduct.categories_names = finalProduct.categories_names || [];
    finalProduct.tag_ids = finalProduct.tag_ids || [];
    finalProduct.tags_names = finalProduct.tags_names || [];

    res.status(200).json({ message: 'Produit mis à jour avec succès!', product: finalProduct });

    // NOUVEAU : retour en stock — HORS transaction, non bloquant.
    // Déclenché uniquement si on passe d'un stock nul/négatif à un stock
    // positif ; un simple réajustement (10 -> 15) ne doit pas spammer la
    // wishlist.
    if (oldStock !== null && oldStock <= 0 && parsedStock > 0) {
      wishlistController.notifyWishlistUsersOnRestock(id).catch((err) => {
        console.error(`Erreur notification restock produit ${id}:`, err);
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Erreur mise à jour produit ID ${id}:`, error);
    if (error.code === '23505') return res.status(409).json({ message: 'Conflit de données (ex: SKU).', detail: error.detail });
    if (error.code === '23503') return res.status(400).json({ message: 'Référence invalide (catégorie/tag).', detail: error.detail });
    res.status(500).json({ message: 'Erreur serveur mise à jour produit.' });
  } finally {
    client.release();
  }
};

// --- Supprimer un produit (Admin) ---
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *;', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Produit non trouvé pour la suppression.' });
    }
    await client.query('COMMIT');
    res.status(200).json({ message: 'Produit supprimé avec succès.', product: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Erreur suppression produit ID ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur suppression produit.' });
  } finally {
    if (client) client.release();
  }
};

// --- Lister tous les produits pour l'ADMIN (publiés ou non) ---
exports.getAllProductsAdmin = async (req, res) => {
  const { page = 1, limit = 1000 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const query = `
      SELECT 
        p.id, p.name, p.description, p.price, p.stock, p.image_url, 
        p.sku, p.is_published, p.created_at, p.updated_at, p.video_url,
        (SELECT ARRAY_AGG(c.name ORDER BY c.name) FROM categories c JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = p.id) as categories_names,
        (SELECT ARRAY_AGG(pc.category_id) FROM product_categories pc WHERE pc.product_id = p.id) as category_ids,
        (SELECT ARRAY_AGG(t.name ORDER BY t.name) FROM product_tags t JOIN product_tag_assignments pta ON t.id = pta.tag_id WHERE pta.product_id = p.id) as tags_names,
        (SELECT ARRAY_AGG(pta.tag_id) FROM product_tag_assignments pta WHERE pta.product_id = p.id) as tag_ids,
        COUNT(*) OVER() AS total_count 
      FROM products p
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const { rows } = await db.query(query, [limit, offset]);

    const totalItems = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const totalPages = Math.ceil(totalItems / limit);

    const productsData = rows.map(({ total_count, ...product }) => ({
      ...product,
      category_ids: product.category_ids || [],
      categories_names: product.categories_names || [],
      tag_ids: product.tag_ids || [],
      tags_names: product.tags_names || []
    }));

    res.status(200).json({
      products: productsData,
      currentPage: parseInt(page, 10),
      totalPages,
      totalItems
    });
  } catch (error) {
    console.error('Erreur admin récupération de tous les produits:', error);
    res.status(500).json({ message: 'Erreur serveur admin lors de la récupération des produits.' });
  }
};