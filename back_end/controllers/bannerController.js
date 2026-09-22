// ARTIVA/back_end/controllers/bannerController.js
const db = require('../config/db');

// GET /api/banners - Liste publique (actives seulement)
exports.getPublicBanners = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, image_url, title, subtitle, link_url, display_order
       FROM home_banners
       WHERE is_active = true
       ORDER BY display_order ASC, created_at DESC`
    );
    res.json({ banners: result.rows });
  } catch (error) {
    console.error('Erreur getPublicBanners:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/admin/banners - Liste complète (admin)
exports.getAllBanners = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM home_banners
       ORDER BY display_order ASC, created_at DESC`
    );
    res.json({ banners: result.rows });
  } catch (error) {
    console.error('Erreur getAllBanners:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/admin/banners - Créer une bannière
exports.createBanner = async (req, res) => {
  const { image_url, title, subtitle, link_url, display_order, is_active } = req.body;

  if (!image_url) {
    return res.status(400).json({ message: 'image_url requis' });
  }

  try {
    const result = await db.query(
      `INSERT INTO home_banners (image_url, title, subtitle, link_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        image_url,
        title || null,
        subtitle || null,
        link_url || null,
        display_order || 0,
        is_active !== undefined ? is_active : true,
      ]
    );
    res.status(201).json({ message: 'Bannière créée', banner: result.rows[0] });
  } catch (error) {
    console.error('Erreur createBanner:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/admin/banners/:id - Modifier une bannière
exports.updateBanner = async (req, res) => {
  const { id } = req.params;
  const { image_url, title, subtitle, link_url, display_order, is_active } = req.body;

  const fields = [];
  const values = [];
  let idx = 1;

  if (image_url !== undefined) { fields.push(`image_url = $${idx++}`); values.push(image_url); }
  if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
  if (subtitle !== undefined) { fields.push(`subtitle = $${idx++}`); values.push(subtitle); }
  if (link_url !== undefined) { fields.push(`link_url = $${idx++}`); values.push(link_url); }
  if (display_order !== undefined) { fields.push(`display_order = $${idx++}`); values.push(display_order); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

  if (fields.length === 0) {
    return res.status(400).json({ message: 'Aucun champ à modifier' });
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  try {
    const result = await db.query(
      `UPDATE home_banners SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bannière non trouvée' });
    }

    res.json({ message: 'Bannière modifiée', banner: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateBanner:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/admin/banners/:id - Supprimer une bannière
exports.deleteBanner = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM home_banners WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bannière non trouvée' });
    }

    res.json({ message: 'Bannière supprimée', deletedId: id });
  } catch (error) {
    console.error('Erreur deleteBanner:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
