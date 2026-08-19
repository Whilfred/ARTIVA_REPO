// ARTIVA/back_end/controllers/productTagController.js
const db = require('../config/db');

// --- Créer un nouveau tag de produit (Admin) ---
exports.createProductTag = async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Le nom du tag est requis.' });
  }

  try {
    // Vérifier si le tag existe déjà (les noms de tags doivent être uniques)
    const existingTag = await db.query('SELECT id FROM product_tags WHERE name = $1', [name.trim()]);
    if (existingTag.rows.length > 0) {
      return res.status(409).json({ message: `Le tag "${name.trim()}" existe déjà.` });
    }

    const query = 'INSERT INTO product_tags (name) VALUES ($1) RETURNING *;';
    const { rows } = await db.query(query, [name.trim()]);
    res.status(201).json({ message: 'Tag de produit créé avec succès!', tag: rows[0] });
  } catch (error) {
    console.error('Erreur création tag produit:', error);
    if (error.code === '23505') { // Violation de contrainte unique (si name est bien UNIQUE)
         return res.status(409).json({ message: 'Ce nom de tag existe déjà.', detail: error.detail });
    }
    res.status(500).json({ message: 'Erreur serveur création tag produit.' });
  }
};

// --- Récupérer tous les tags de produits (Admin/Public) ---
// Utile pour l'admin panel pour lister les tags assignables,
// et potentiellement pour le frontend client pour des filtres.
exports.getAllProductTags = async (req, res) => {
  try {
    const query = 'SELECT id, name FROM product_tags ORDER BY name;';
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur récupération tags produits:', error);
    res.status(500).json({ message: 'Erreur serveur récupération tags produits.' });
  }
};

// --- Récupérer un tag de produit par son ID (Admin/Public) ---
exports.getProductTagById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'SELECT id, name FROM product_tags WHERE id = $1;';
    const { rows } = await db.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Tag de produit non trouvé.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Erreur récupération tag produit ID ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur récupération tag produit.' });
  }
};

// --- Mettre à jour un tag de produit (Admin) ---
exports.updateProductTag = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Le nom du tag est requis pour la mise à jour.' });
  }

  try {
    // Vérifier si un AUTRE tag avec le nouveau nom existe déjà
    const existingTag = await db.query('SELECT id FROM product_tags WHERE name = $1 AND id != $2', [name.trim(), id]);
    if (existingTag.rows.length > 0) {
      return res.status(409).json({ message: `Un autre tag nommé "${name.trim()}" existe déjà.` });
    }

    const query = 'UPDATE product_tags SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;'; 
    // Assure-toi d'avoir une colonne updated_at dans product_tags si tu veux l'utiliser ici
    // Si product_tags n'a pas updated_at, retire ", updated_at = CURRENT_TIMESTAMP"
    const { rows } = await db.query(query, [name.trim(), id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Tag de produit non trouvé pour la mise à jour.' });
    }
    res.status(200).json({ message: 'Tag de produit mis à jour avec succès!', tag: rows[0] });
  } catch (error) {
    console.error(`Erreur mise à jour tag produit ID ${id}:`, error);
     if (error.code === '23505') {
         return res.status(409).json({ message: 'Ce nom de tag existe déjà (conflit).', detail: error.detail });
    }
    res.status(500).json({ message: 'Erreur serveur mise à jour tag produit.' });
  }
};

// --- Supprimer un tag de produit (Admin) ---
exports.deleteProductTag = async (req, res) => {
  const { id } = req.params;
  // Important: La suppression d'un tag déliera automatiquement les produits de ce tag
  // grâce à ON DELETE CASCADE dans la table product_tag_assignments.
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Optionnel : d'abord délier explicitement pour loguer ou autre traitement
    // await client.query('DELETE FROM product_tag_assignments WHERE tag_id = $1', [id]);
    
    const deleteQuery = 'DELETE FROM product_tags WHERE id = $1 RETURNING *;';
    const result = await client.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Tag de produit non trouvé pour la suppression.' });
    }
    await client.query('COMMIT');
    res.status(200).json({ message: 'Tag de produit supprimé avec succès.', tag: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Erreur suppression tag produit ID ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur suppression tag produit.' });
  } finally {
    client.release();
  }
};