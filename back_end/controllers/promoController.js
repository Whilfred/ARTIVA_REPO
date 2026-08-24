// ARTIVA/back_end/controllers/promoController.js
//
// Codes promotionnels : administration (CRUD) et validation côté client.
//
// Règle cardinale : la réduction est TOUJOURS recalculée ici, à partir du
// contenu réel du panier. Le montant envoyé par l'application n'est jamais
// repris tel quel — sans quoi n'importe qui pourrait forger une requête et
// s'offrir la remise de son choix.

const db = require('../config/db');

// -----------------------------------------------------------------------------
// Choix de conception, valables pour tout ce fichier
// -----------------------------------------------------------------------------
// - La réduction porte sur le SOUS-TOTAL DES PRODUITS, jamais sur les frais de
//   livraison : ceux-ci sont une dépense réelle pour la boutique.
// - Un seul code par commande. Le cumul multiplie les cas limites (ordre
//   d'application, plafonds qui se chevauchent) pour un gain douteux.
// - La réduction est plafonnée au sous-total : un total de commande ne peut
//   pas devenir négatif.
// -----------------------------------------------------------------------------

/**
 * Applique un code à un montant et renvoie la réduction, en FCFA.
 * Fonction pure : aucun accès à la base, donc facile à vérifier.
 */
function calculerReduction(promo, sousTotal) {
  let reduction;

  if (promo.discount_type === 'percentage') {
    reduction = (sousTotal * parseFloat(promo.discount_value)) / 100;
    // Plafond explicite : « -20 %, au maximum 5 000 FCFA ».
    if (promo.max_discount_amount !== null) {
      reduction = Math.min(reduction, parseFloat(promo.max_discount_amount));
    }
  } else {
    reduction = parseFloat(promo.discount_value);
  }

  // Jamais plus que le panier lui-même.
  reduction = Math.min(reduction, sousTotal);

  // Les montants sont en FCFA, une monnaie sans subdivision en usage courant :
  // on arrondit à l'unité pour ne pas afficher « -3 333,33 FCFA ».
  return Math.max(0, Math.round(reduction));
}

/**
 * Vérifie qu'un code est utilisable par ce client, pour ce montant.
 * Renvoie soit { valide: false, message }, soit { valide: true, promo, reduction }.
 *
 * Les messages sont rédigés pour être montrés tels quels au client : ils
 * disent ce qui ne va pas et, quand c'est possible, ce qu'il peut y faire.
 * Un « code invalide » générique laisse l'utilisateur sans recours.
 */
async function verifierCode(client, code, userId, sousTotal, verrouiller = false) {
  // `verrouiller` n'est employé qu'au moment de créer la commande, dans une
  // transaction : sans FOR UPDATE, deux clients passant commande au même
  // instant pourraient consommer tous deux le dernier exemplaire d'un code
  // limité, et le quota serait dépassé.
  const { rows } = await client.query(
    `SELECT * FROM promo_codes WHERE code = $1${verrouiller ? ' FOR UPDATE' : ''}`,
    [code.trim().toUpperCase()]
  );

  if (rows.length === 0) {
    return { valide: false, message: "Ce code promo n'existe pas." };
  }

  const promo = rows[0];

  if (!promo.is_active) {
    return { valide: false, message: "Ce code promo n'est plus actif." };
  }

  const maintenant = new Date();

  if (promo.starts_at && new Date(promo.starts_at) > maintenant) {
    return { valide: false, message: "Ce code promo n'est pas encore valable." };
  }

  if (promo.expires_at && new Date(promo.expires_at) < maintenant) {
    return { valide: false, message: 'Ce code promo a expiré.' };
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { valide: false, message: "Ce code promo a atteint sa limite d'utilisation." };
  }

  const minimum = parseFloat(promo.min_purchase_amount);
  if (sousTotal < minimum) {
    const manque = Math.ceil(minimum - sousTotal);
    return {
      valide: false,
      message: `Ce code s'applique à partir de ${minimum.toLocaleString('fr-FR')} FCFA d'achat. Il vous manque ${manque.toLocaleString('fr-FR')} FCFA.`,
    };
  }

  // Limite par client : ne se vérifie que pour un utilisateur identifié.
  if (promo.max_uses_per_user !== null && userId) {
    const { rows: usages } = await client.query(
      'SELECT COUNT(*)::int AS n FROM promo_code_usages WHERE promo_code_id = $1 AND user_id = $2',
      [promo.id, userId]
    );
    if (usages[0].n >= promo.max_uses_per_user) {
      return {
        valide: false,
        message: promo.max_uses_per_user === 1
          ? 'Vous avez déjà utilisé ce code promo.'
          : `Vous avez déjà utilisé ce code ${promo.max_uses_per_user} fois.`,
      };
    }
  }

  return { valide: true, promo, reduction: calculerReduction(promo, sousTotal) };
}

// =============================================================================
// CÔTÉ CLIENT
// =============================================================================

/**
 * POST /api/promo/valider
 * Body : { code, cart_items: [{ product_id, quantity }] }
 *
 * Le sous-total est recalculé depuis les prix en base, et non repris du corps
 * de la requête : le client pourrait annoncer un panier de 500 000 FCFA pour
 * franchir un montant minimum qu'il n'atteint pas.
 */
exports.validerCode = async (req, res) => {
  const { code, cart_items } = req.body;
  const userId = req.user ? req.user.id : null;

  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ message: 'Le code promo est requis.' });
  }
  if (!Array.isArray(cart_items) || cart_items.length === 0) {
    return res.status(400).json({ message: 'Le panier est vide.' });
  }

  try {
    const ids = cart_items
      .map((i) => parseInt(i.product_id, 10))
      .filter((n) => Number.isInteger(n));

    if (ids.length === 0) {
      return res.status(400).json({ message: 'Aucun article valide dans le panier.' });
    }

    const { rows: produits } = await db.query(
      'SELECT id, price FROM products WHERE id = ANY($1::int[])',
      [ids]
    );
    const prixParId = new Map(produits.map((p) => [p.id, parseFloat(p.price)]));

    let sousTotal = 0;
    for (const item of cart_items) {
      const prix = prixParId.get(parseInt(item.product_id, 10));
      const quantite = parseInt(item.quantity, 10);
      if (prix === undefined || !Number.isInteger(quantite) || quantite <= 0) continue;
      sousTotal += prix * quantite;
    }

    const resultat = await verifierCode(db, code, userId, sousTotal);

    if (!resultat.valide) {
      // 200 et non 4xx : un code refusé n'est pas une erreur technique, c'est
      // une réponse métier que l'écran doit afficher normalement.
      return res.status(200).json({ valide: false, message: resultat.message });
    }

    return res.status(200).json({
      valide: true,
      code: resultat.promo.code,
      description: resultat.promo.description,
      discount_type: resultat.promo.discount_type,
      discount_value: parseFloat(resultat.promo.discount_value),
      reduction: resultat.reduction,
      sous_total: Math.round(sousTotal),
      message: `Code appliqué : -${resultat.reduction.toLocaleString('fr-FR')} FCFA`,
    });
  } catch (error) {
    console.error('Erreur validation code promo:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la validation du code.' });
  }
};

// =============================================================================
// CÔTÉ ADMINISTRATION
// =============================================================================

/** GET /api/promo — liste complète, avec le nombre d'utilisations réelles. */
exports.listerCodes = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*,
             (SELECT COUNT(*)::int FROM promo_code_usages u WHERE u.promo_code_id = p.id) AS utilisations,
             CASE
               WHEN NOT p.is_active                                    THEN 'inactif'
               WHEN p.expires_at IS NOT NULL AND p.expires_at < NOW()  THEN 'expiré'
               WHEN p.starts_at  IS NOT NULL AND p.starts_at  > NOW()  THEN 'à venir'
               WHEN p.max_uses   IS NOT NULL AND p.used_count >= p.max_uses THEN 'épuisé'
               ELSE 'actif'
             END AS statut
      FROM promo_codes p
      ORDER BY p.created_at DESC
    `);
    return res.status(200).json({ codes: rows });
  } catch (error) {
    console.error('Erreur liste codes promo:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/** GET /api/promo/:id — détail d'un code et ses dernières utilisations. */
exports.detailCode = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM promo_codes WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Code promo introuvable.' });
    }

    const { rows: usages } = await db.query(`
      SELECT u.id, u.discount_amount, u.used_at,
             us.name AS client_nom, us.email AS client_email,
             o.order_number
      FROM promo_code_usages u
      JOIN users us ON us.id = u.user_id
      LEFT JOIN orders o ON o.id = u.order_id
      WHERE u.promo_code_id = $1
      ORDER BY u.used_at DESC
      LIMIT 50
    `, [req.params.id]);

    return res.status(200).json({ code: rows[0], utilisations: usages });
  } catch (error) {
    console.error('Erreur détail code promo:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * Contrôles communs à la création et à la modification.
 * La base porte déjà ces règles en contraintes ; on les vérifie ici pour
 * renvoyer un message clair plutôt qu'une erreur PostgreSQL brute.
 */
function validerSaisie({ code, discount_type, discount_value, min_purchase_amount,
                         max_discount_amount, starts_at, expires_at,
                         max_uses, max_uses_per_user }, creation) {
  if (creation && (!code || !code.trim())) return 'Le code est requis.';
  if (code && !/^[A-Za-z0-9_-]{3,50}$/.test(code.trim())) {
    return 'Le code doit contenir entre 3 et 50 caractères : lettres, chiffres, tiret ou souligné.';
  }
  if (creation && !discount_type) return 'Le type de réduction est requis.';
  if (discount_type && !['percentage', 'fixed'].includes(discount_type)) {
    return "Le type de réduction doit être 'percentage' ou 'fixed'.";
  }
  if (discount_value !== undefined) {
    const v = parseFloat(discount_value);
    if (!(v > 0)) return 'La valeur de la réduction doit être supérieure à zéro.';
    if (discount_type === 'percentage' && v > 100) {
      return 'Un pourcentage de réduction ne peut pas dépasser 100.';
    }
  } else if (creation) {
    return 'La valeur de la réduction est requise.';
  }
  if (min_purchase_amount !== undefined && min_purchase_amount !== null
      && parseFloat(min_purchase_amount) < 0) {
    return "Le montant minimum d'achat ne peut pas être négatif.";
  }
  if (max_discount_amount !== undefined && max_discount_amount !== null
      && max_discount_amount !== '' && parseFloat(max_discount_amount) <= 0) {
    return 'Le plafond de réduction doit être supérieur à zéro.';
  }
  if (starts_at && expires_at && new Date(expires_at) <= new Date(starts_at)) {
    return "La date d'expiration doit être postérieure à la date de début.";
  }
  for (const [champ, valeur] of [['max_uses', max_uses], ['max_uses_per_user', max_uses_per_user]]) {
    if (valeur !== undefined && valeur !== null && valeur !== ''
        && !(parseInt(valeur, 10) > 0)) {
      return `Le champ ${champ} doit être un entier positif.`;
    }
  }
  return null;
}

/** Convertit '' en NULL — les formulaires HTML envoient des chaînes vides. */
const ouNull = (v) => (v === undefined || v === null || v === '' ? null : v);

/** POST /api/promo — création. */
exports.creerCode = async (req, res) => {
  const erreur = validerSaisie(req.body, true);
  if (erreur) return res.status(400).json({ message: erreur });

  const {
    code, description, discount_type, discount_value, max_discount_amount,
    min_purchase_amount, starts_at, expires_at, max_uses, max_uses_per_user,
    is_active,
  } = req.body;

  try {
    const { rows } = await db.query(`
      INSERT INTO promo_codes
        (code, description, discount_type, discount_value, max_discount_amount,
         min_purchase_amount, starts_at, expires_at, max_uses, max_uses_per_user, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      code.trim().toUpperCase(),
      ouNull(description),
      discount_type,
      parseFloat(discount_value),
      ouNull(max_discount_amount),
      min_purchase_amount ? parseFloat(min_purchase_amount) : 0,
      ouNull(starts_at),
      ouNull(expires_at),
      ouNull(max_uses),
      ouNull(max_uses_per_user),
      is_active !== undefined ? Boolean(is_active) : true,
    ]);

    return res.status(201).json({ message: 'Code promo créé.', code: rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce code existe déjà.' });
    }
    console.error('Erreur création code promo:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création.' });
  }
};

/**
 * PUT /api/promo/:id — modification.
 * Seuls les champs présents dans le corps sont touchés, pour qu'une
 * modification partielle depuis le panel n'efface pas le reste.
 */
exports.modifierCode = async (req, res) => {
  const erreur = validerSaisie(req.body, false);
  if (erreur) return res.status(400).json({ message: erreur });

  const champs = [
    'code', 'description', 'discount_type', 'discount_value', 'max_discount_amount',
    'min_purchase_amount', 'starts_at', 'expires_at', 'max_uses', 'max_uses_per_user',
    'is_active',
  ];

  const set = [];
  const valeurs = [];
  for (const champ of champs) {
    if (req.body[champ] === undefined) continue;
    let valeur = req.body[champ];
    if (champ === 'code') valeur = String(valeur).trim().toUpperCase();
    else if (champ === 'is_active') valeur = Boolean(valeur);
    else if (['discount_value', 'min_purchase_amount'].includes(champ)) valeur = parseFloat(valeur);
    else valeur = ouNull(valeur);
    valeurs.push(valeur);
    set.push(`${champ} = $${valeurs.length}`);
  }

  if (set.length === 0) {
    return res.status(400).json({ message: 'Aucun champ à modifier.' });
  }

  valeurs.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE promo_codes SET ${set.join(', ')} WHERE id = $${valeurs.length} RETURNING *`,
      valeurs
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Code promo introuvable.' });
    }
    return res.status(200).json({ message: 'Code promo mis à jour.', code: rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce code existe déjà.' });
    }
    console.error('Erreur modification code promo:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour.' });
  }
};

/**
 * DELETE /api/promo/:id
 *
 * Un code déjà utilisé n'est pas supprimé mais désactivé : l'effacer ferait
 * disparaître l'historique des commandes qui en ont bénéficié, et fausserait
 * toute analyse ultérieure de la campagne.
 */
exports.supprimerCode = async (req, res) => {
  try {
    const { rows: usages } = await db.query(
      'SELECT COUNT(*)::int AS n FROM promo_code_usages WHERE promo_code_id = $1',
      [req.params.id]
    );

    if (usages[0].n > 0) {
      const { rows } = await db.query(
        'UPDATE promo_codes SET is_active = FALSE WHERE id = $1 RETURNING *',
        [req.params.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Code promo introuvable.' });
      }
      return res.status(200).json({
        message: `Ce code a déjà été utilisé ${usages[0].n} fois : il a été désactivé plutôt que supprimé, pour préserver l'historique des commandes.`,
        code: rows[0],
        desactive: true,
      });
    }

    const { rowCount } = await db.query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Code promo introuvable.' });
    }
    return res.status(200).json({ message: 'Code promo supprimé.', desactive: false });
  } catch (error) {
    console.error('Erreur suppression code promo:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
  }
};

// Réutilisés par orderController au moment de créer la commande : la remise y
// est revérifiée dans la transaction, et non reprise de l'écran de paiement.
exports.verifierCode = verifierCode;
exports.calculerReduction = calculerReduction;
