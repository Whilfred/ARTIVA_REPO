// ARTIVA/back_end/controllers/categoryController.js
const db = require('../config/db');

// Créer une nouvelle catégorie (Admin)
exports.createCategory = async (req, res) => {
  const { name, description, image_url, parent_id, slug, display_order } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Le nom de la catégorie est requis.' });
  }

  const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  try {
    const checkQuery = 'SELECT id FROM categories WHERE name = $1 OR slug = $2';
    const existingCategory = await db.query(checkQuery, [name, categorySlug]);
    if (existingCategory.rows.length > 0) {
        return res.status(409).json({ message: 'Une catégorie avec ce nom ou slug existe déjà.' });
    }

    const insertQuery = `
      INSERT INTO categories (name, description, image_url, parent_id, slug, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, image_url, parent_id, slug, display_order, created_at, updated_at; 
      -- Ajout de updated_at au RETURNING
    `;
    const newCategory = await db.query(insertQuery, [
      name,
      description || null,
      image_url || null,
      parent_id ? parseInt(parent_id, 10) : null,
      categorySlug,
      display_order ? parseInt(display_order, 10) : 0,
    ]);

    res.status(201).json({
      message: 'Catégorie créée avec succès !',
      category: newCategory.rows[0],
    });
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    if (error.code === '23503' && error.constraint && error.constraint.includes('categories_parent_id_fkey')) {
        return res.status(400).json({ message: `La catégorie parente avec l'ID ${parent_id} n'existe pas.` });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la création de la catégorie.' });
  }
};

// Lister toutes les catégories (Public)
exports.getAllCategories = async (req, res) => {
  try {
    const query = 'SELECT id, name, description, image_url, slug, parent_id, display_order FROM categories ORDER BY display_order, name;';
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des catégories.' });
  }
};

// --- NOUVEAU : Récupérer une catégorie par son ID (Public) ---
exports.getCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'SELECT id, name, description, image_url, slug, parent_id, display_order, created_at, updated_at FROM categories WHERE id = $1;';
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Erreur lors de la récupération de la catégorie ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la catégorie.' });
  }
};

// --- NOUVEAU : Mettre à jour une catégorie (Admin) ---
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, parent_id, slug, display_order } = req.body;

  if (!name) { // Le nom est toujours requis pour une mise à jour
    return res.status(400).json({ message: 'Le nom de la catégorie est requis pour la mise à jour.' });
  }

  // Générer un slug si le nom change et que slug n'est pas fourni, ou utiliser le slug fourni
  const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  try {
    // Vérifier si une AUTRE catégorie avec le même nom ou slug existe déjà
    const checkQuery = 'SELECT id FROM categories WHERE (name = $1 OR slug = $2) AND id != $3';
    const existingCategory = await db.query(checkQuery, [name, categorySlug, id]);
    if (existingCategory.rows.length > 0) {
        return res.status(409).json({ message: 'Une autre catégorie avec ce nom ou slug existe déjà.' });
    }
    
    // Vérifier si la catégorie parente est elle-même (pour éviter les boucles)
    if (parent_id && parseInt(parent_id, 10) === parseInt(id, 10)) {
        return res.status(400).json({ message: 'Une catégorie ne peut pas être sa propre parente.' });
    }


    const updateQuery = `
      UPDATE categories 
      SET 
        name = $1, 
        description = $2, 
        image_url = $3, 
        parent_id = $4, 
        slug = $5, 
        display_order = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, name, description, image_url, parent_id, slug, display_order, created_at, updated_at;
    `;
    const updatedCategory = await db.query(updateQuery, [
      name,
      description || null,
      image_url || null,
      parent_id ? parseInt(parent_id, 10) : null,
      categorySlug,
      display_order ? parseInt(display_order, 10) : 0,
      id,
    ]);

    if (updatedCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée pour la mise à jour.' });
    }

    res.status(200).json({
      message: 'Catégorie mise à jour avec succès !',
      category: updatedCategory.rows[0],
    });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la catégorie ${id}:`, error);
    if (error.code === '23503' && error.constraint && error.constraint.includes('categories_parent_id_fkey')) {
        return res.status(400).json({ message: `La catégorie parente avec l'ID ${parent_id} n'existe pas.` });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la catégorie.' });
  }
};

// --- NOUVEAU : Supprimer une catégorie (Admin) ---
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  // Attention: Si ON DELETE SET NULL est sur parent_id, la suppression d'une catégorie
  // parente mettra parent_id à NULL pour ses enfants.
  // Si ON DELETE CASCADE est sur product_categories.category_id, la suppression
  // déliera les produits de cette catégorie.
  // Tu pourrais vouloir une logique plus complexe ici (ex: empêcher la suppression si des produits y sont liés,
  // ou demander de réassigner les produits). Pour l'instant, suppression simple.
  try {
    // Optionnel: Vérifier si des produits sont liés à cette catégorie et empêcher la suppression
    // const productLinkQuery = 'SELECT COUNT(*) FROM product_categories WHERE category_id = $1';
    // const linkResult = await db.query(productLinkQuery, [id]);
    // if (linkResult.rows[0].count > 0) {
    //   return res.status(400).json({ message: `Impossible de supprimer la catégorie, ${linkResult.rows[0].count} produit(s) y sont encore liés.` });
    // }

    // Optionnel: Gérer les sous-catégories (les réassigner ou les supprimer en cascade - actuellement SET NULL)
    // Pour une suppression en cascade des enfants, il faudrait une logique récursive ou modifier la contrainte FK.

    const deleteQuery = 'DELETE FROM categories WHERE id = $1 RETURNING *;';
    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée pour la suppression.' });
    }
    res.status(200).json({ message: 'Catégorie supprimée avec succès.', category: result.rows[0] });
  } catch (error) {
    console.error(`Erreur lors de la suppression de la catégorie ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la catégorie.' });
  }
};
