const express = require("express");
const db = require("../config/db.js");
const { authenticateJWT } = require("../middlewares/auth"); // Assurez-vous que ce middleware fonctionne correctement

const router = express.Router();

// --- Ajouter un avis ---
router.post("/products/:id/avis", authenticateJWT, async (req, res) => {
  console.log("POST /products/:id/avis appelé");

  const productId = parseInt(req.params.id);
  const userId = req.user?.id;
  const { etoiles, commentaire } = req.body;

  console.log("productId:", productId, "userId:", userId, "etoiles:", etoiles, "commentaire:", commentaire);

  if (isNaN(productId)) {
    console.log("ID produit invalide");
    return res.status(400).json({ message: "ID produit invalide" });
  }

  if (!userId) {
    console.log("Utilisateur non authentifié");
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  if (!etoiles || etoiles < 1 || etoiles > 5) {
    console.log("Note invalide:", etoiles);
    return res.status(400).json({ message: "Note invalide (1 à 5)" });
  }

  try {
    const result = await db.query(
      `INSERT INTO avis (user_id, product_id, etoiles, commentaire)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, productId, etoiles, commentaire || ""]
    );
    console.log("Avis inséré:", result.rows[0]);
    res.json({ avis: result.rows[0] });
  } catch (err) {
    console.error("Erreur lors de l'insertion de l'avis:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.get("/products/:id/avis", async (req, res) => {
  console.log("GET /products/:id/avis appelé");
  console.log("Params:", req.params);
  console.log("Query:", req.query);
  
  const productId = parseInt(req.params.id);
  console.log("Product ID parsed:", productId);

  try {
    const result = await db.query(
      `SELECT a.*, u.name AS user_name
       FROM avis a
       JOIN users u ON u.id = a.user_id
       WHERE a.product_id=$1 AND a.is_active=TRUE
       ORDER BY a.created_at DESC`,
      [productId]
    );
    console.log("Résultat DB:", result.rows);
    res.json({ avis: result.rows });
  } catch (err) {
    console.error("Erreur DB:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// --- Modifier / désactiver un avis ---
router.put("/avis/:id", authenticateJWT, async (req, res) => {
  console.log("PUT /avis/:id appelé");

  const avisId = parseInt(req.params.id);
  const userId = req.user?.id;
  const { etoiles, commentaire, is_active } = req.body;

  console.log("avisId:", avisId, "userId:", userId, "etoiles:", etoiles, "commentaire:", commentaire, "is_active:", is_active);

  if (isNaN(avisId)) {
    console.log("ID avis invalide");
    return res.status(400).json({ message: "ID avis invalide" });
  }

  if (!userId) {
    console.log("Utilisateur non authentifié");
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  try {
    const check = await db.query("SELECT * FROM avis WHERE id=$1", [avisId]);
    console.log("Vérification avis:", check.rows.length, "avis trouvé");

    if (check.rows.length === 0) return res.status(404).json({ message: "Avis non trouvé" });
    if (check.rows[0].user_id !== userId) {
      console.log("Utilisateur interdit de modifier cet avis");
      return res.status(403).json({ message: "Interdit" });
    }

    const result = await db.query(
      `UPDATE avis
       SET etoiles=COALESCE($1, etoiles),
           commentaire=COALESCE($2, commentaire),
           is_active=COALESCE($3, is_active),
           updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [etoiles, commentaire, is_active, avisId]
    );
    console.log("Avis modifié:", result.rows[0]);
    res.json({ avis: result.rows[0] });
  } catch (err) {
    console.error("Erreur lors de la modification de l'avis:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
