// ARTIVA/back_end/controllers/loyaltyController.js
//
// Programme de fidélité.
//
// Le client accumule des points à chaque achat (1 point = 1 FCFA de produits,
// hors livraison). Dès que son solde atteint le seuil, un bon nominatif lui est
// attribué automatiquement à la validation de la commande, et son solde repart
// de zéro.
//
// Le bon n'est pas un objet à part : c'est une ligne de promo_codes rattachée à
// un client. Toute la validation — dates, montant minimum, quotas, recalcul
// serveur de la remise — est ainsi celle des codes promo, déjà éprouvée, plutôt
// qu'une seconde implémentation qui finirait par diverger.

const db = require('../config/db');

// Valeurs de repli si la table de réglages est vide : le programme ne doit pas
// planter une commande parce qu'une ligne de configuration manque.
const REGLAGES_DEFAUT = {
  is_active: true,
  threshold_points: 30000,
  value_divisor: 40,
  voucher_min: 750,
  voucher_max: 1000,
  validity_days: 60,
};

// Les commandes annulées ou remboursées ne rapportent rien. Même règle que la
// livraison gratuite (voir livraisonController.js), pour que les deux mécaniques
// ne donnent pas des réponses différentes sur la même commande.
const STATUTS_EXCLUS = ['cancelled', 'refunded'];

async function lireReglages(client) {
  const { rows } = await (client || db).query(
    'SELECT * FROM loyalty_settings WHERE id = 1'
  );
  if (rows.length === 0) return { ...REGLAGES_DEFAUT };
  const r = rows[0];
  return {
    is_active: r.is_active,
    threshold_points: r.threshold_points,
    value_divisor: r.value_divisor,
    voucher_min: parseFloat(r.voucher_min),
    voucher_max: parseFloat(r.voucher_max),
    validity_days: r.validity_days,
  };
}

/**
 * Valeur du bon, à partir du solde converti.
 *
 * Règle métier : le cumul divisé par 40. 30 000 donnent 750, 40 000 donnent
 * 1 000 — c'est ce qui produit la fourchette annoncée au client.
 *
 * Le plancher et le plafond ne sont pas décoratifs : sans eux, une commande
 * exceptionnelle qui ferait bondir le solde à 200 000 émettrait un bon de
 * 5 000 FCFA, très au-delà de ce que le programme annonce.
 */
function calculerValeurBon(soldeConverti, reglages) {
  const brut = soldeConverti / reglages.value_divisor;
  const borne = Math.min(Math.max(brut, reglages.voucher_min), reglages.voucher_max);
  // Le FCFA n'a pas de subdivision : un bon de 787,5 n'existe pas.
  return Math.round(borne);
}

/**
 * Fabrique un code lisible et unique.
 *
 * Sans I, O, 0 ni 1 : ces caractères se confondent à la lecture, et le client
 * doit pouvoir recopier son code depuis l'application sans se tromper.
 */
function genererCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffixe = '';
  for (let i = 0; i < 6; i++) {
    suffixe += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FIDELITE-${suffixe}`;
}

/**
 * Crédite les points d'une commande et, si le seuil est franchi, émet le bon.
 *
 * Appelée DANS la transaction de création de commande : si la commande échoue,
 * les points ne sont pas accordés. Le contraire laisserait un solde crédité
 * pour une commande inexistante.
 *
 * @param {object} client  transaction en cours
 * @param {number} montantProduits  total produits, hors livraison et hors remise
 * @returns {null | {points, solde, bon}} ce qu'il faut annoncer au client
 */
async function crediterPoints(client, userId, orderId, montantProduits) {
  const reglages = await lireReglages(client);
  if (!reglages.is_active) return null;

  const points = Math.floor(montantProduits);
  if (points <= 0) return null;

  // FOR UPDATE : deux commandes simultanées du même client liraient sinon le
  // même solde et le franchissement du seuil serait compté deux fois.
  const { rows: utilisateurs } = await client.query(
    'SELECT loyalty_points FROM users WHERE id = $1 FOR UPDATE',
    [userId]
  );
  if (utilisateurs.length === 0) return null;

  const soldeApres = utilisateurs[0].loyalty_points + points;

  await client.query('UPDATE users SET loyalty_points = $1 WHERE id = $2', [
    soldeApres,
    userId,
  ]);
  await client.query(
    `INSERT INTO loyalty_ledger (user_id, delta, reason, order_id, balance_after)
     VALUES ($1, $2, 'earned', $3, $4)`,
    [userId, points, orderId, soldeApres]
  );

  if (soldeApres < reglages.threshold_points) {
    return {
      points,
      solde: soldeApres,
      restant: reglages.threshold_points - soldeApres,
      bon: null,
    };
  }

  // --- Seuil franchi : émission du bon ---------------------------------------
  const valeur = calculerValeurBon(soldeApres, reglages);
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + reglages.validity_days);

  // Le tirage aléatoire peut théoriquement retomber sur un code existant.
  // On réessaie plutôt que de laisser la contrainte d'unicité faire échouer
  // toute la commande pour une collision à une chance sur un milliard.
  let bon = null;
  for (let essai = 0; essai < 5 && !bon; essai++) {
    try {
      const { rows } = await client.query(
        `INSERT INTO promo_codes
           (code, description, discount_type, discount_value, min_purchase_amount,
            expires_at, max_uses, max_uses_per_user, is_active, user_id, is_loyalty_reward)
         VALUES ($1, $2, 'fixed', $3, 0, $4, 1, 1, TRUE, $5, TRUE)
         RETURNING *`,
        [
          genererCode(),
          `Bon de fidélité — ${soldeApres.toLocaleString('fr-FR')} points convertis`,
          valeur,
          expiration,
          userId,
        ]
      );
      bon = rows[0];
    } catch (error) {
      if (error.code !== '23505') throw error; // 23505 = collision de code
    }
  }
  if (!bon) throw new Error("Impossible de générer un code de fidélité unique.");

  // Le solde repart de zéro : c'est l'intégralité du cumul qui a été convertie,
  // ce qui est cohérent avec une valeur de bon calculée sur ce même cumul.
  await client.query('UPDATE users SET loyalty_points = 0 WHERE id = $1', [userId]);
  await client.query(
    `INSERT INTO loyalty_ledger (user_id, delta, reason, order_id, promo_code_id, balance_after)
     VALUES ($1, $2, 'converted', $3, $4, 0)`,
    [userId, -soldeApres, orderId, bon.id]
  );

  // Notification dans l'application. Sans elle, le client ne découvrirait son
  // bon qu'en ouvrant par hasard le bon écran — et beaucoup ne le feraient pas.
  const dateLisible = expiration.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  await client.query(
    `INSERT INTO notifications (user_id, type, title, message, link_url)
     VALUES ($1, 'promotion', $2, $3, $4)`,
    [
      userId,
      `🎁 Vous avez gagné un bon de ${valeur.toLocaleString('fr-FR')} FCFA`,
      `Vos ${soldeApres.toLocaleString('fr-FR')} points de fidélité vous donnent un bon de ` +
        `${valeur.toLocaleString('fr-FR')} FCFA. Utilisez le code ${bon.code} lors de votre ` +
        `prochaine commande, valable jusqu'au ${dateLisible}.`,
      '/fidelite',
    ]
  );

  return {
    points,
    solde: 0,
    restant: reglages.threshold_points,
    bon: { code: bon.code, valeur, expire_le: expiration, points_convertis: soldeApres },
  };
}

/**
 * Reprend les points d'une commande annulée ou remboursée.
 *
 * Sans cela, un client pourrait commander, encaisser ses points, annuler, et
 * recommencer indéfiniment.
 *
 * Le bon déjà émis n'est PAS repris : le client l'a peut-être déjà utilisé, et
 * lui retirer après coup serait incompréhensible. Le solde peut donc devenir
 * négatif en théorie ; on le ramène à zéro, la contrainte de la base l'exige.
 */
async function reprendrePoints(client, orderId) {
  const { rows } = await client.query(
    `SELECT user_id, delta FROM loyalty_ledger
      WHERE order_id = $1 AND reason = 'earned'`,
    [orderId]
  );
  if (rows.length === 0) return null;

  const { user_id: userId, delta } = rows[0];

  const { rows: u } = await client.query(
    'SELECT loyalty_points FROM users WHERE id = $1 FOR UPDATE',
    [userId]
  );
  if (u.length === 0) return null;

  const soldeApres = Math.max(0, u[0].loyalty_points - delta);
  const reprise = u[0].loyalty_points - soldeApres;
  if (reprise === 0) return null;

  await client.query('UPDATE users SET loyalty_points = $1 WHERE id = $2', [soldeApres, userId]);
  await client.query(
    `INSERT INTO loyalty_ledger (user_id, delta, reason, order_id, balance_after)
     VALUES ($1, $2, 'revoked', $3, $4)`,
    [userId, -reprise, orderId, soldeApres]
  );
  return { reprise, solde: soldeApres };
}

// =============================================================================
// CÔTÉ CLIENT
// =============================================================================

// GET /api/fidelite — solde, progression, bons et historique.
exports.monStatut = async (req, res) => {
  try {
    const userId = req.user.id;
    const reglages = await lireReglages();

    const { rows: u } = await db.query('SELECT loyalty_points FROM users WHERE id = $1', [userId]);
    if (u.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    const solde = u[0].loyalty_points;

    // Les bons du client, avec leur état réel. Un bon consommé apparaît dans
    // promo_code_usages ; un bon périmé a simplement dépassé sa date.
    const { rows: bons } = await db.query(
      `SELECT p.id, p.code, p.discount_value AS valeur, p.expires_at,
              EXISTS (SELECT 1 FROM promo_code_usages pu WHERE pu.promo_code_id = p.id) AS utilise
         FROM promo_codes p
        WHERE p.user_id = $1 AND p.is_loyalty_reward = TRUE
        ORDER BY p.created_at DESC`,
      [userId]
    );

    const maintenant = new Date();
    const bonsFormates = bons.map((b) => ({
      code: b.code,
      valeur: parseFloat(b.valeur),
      expire_le: b.expires_at,
      etat: b.utilise
        ? 'utilise'
        : new Date(b.expires_at) < maintenant
        ? 'expire'
        : 'disponible',
    }));

    const { rows: historique } = await db.query(
      `SELECT delta, reason, balance_after, created_at, order_id
         FROM loyalty_ledger WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    return res.status(200).json({
      actif: reglages.is_active,
      solde,
      seuil: reglages.threshold_points,
      restant: Math.max(0, reglages.threshold_points - solde),
      // Ce que vaudrait le bon si le seuil était atteint maintenant : permet
      // d'annoncer un montant concret plutôt qu'une promesse vague.
      valeur_estimee: calculerValeurBon(Math.max(solde, reglages.threshold_points), reglages),
      validite_jours: reglages.validity_days,
      bons: bonsFormates,
      historique,
    });
  } catch (error) {
    console.error('Erreur statut fidélité:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// =============================================================================
// CÔTÉ ADMINISTRATION
// =============================================================================

// GET /api/fidelite/admin — réglages et vue d'ensemble.
exports.statutAdmin = async (req, res) => {
  try {
    const reglages = await lireReglages();

    const { rows } = await db.query(
      `SELECT COUNT(*)::int                                                   AS bons_emis,
              COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM promo_code_usages pu WHERE pu.promo_code_id = p.id
              ))::int                                                         AS bons_utilises,
              COUNT(*) FILTER (WHERE p.expires_at < NOW() AND NOT EXISTS (
                SELECT 1 FROM promo_code_usages pu WHERE pu.promo_code_id = p.id
              ))::int                                                         AS bons_expires,
              COALESCE(SUM(p.discount_value), 0)                              AS valeur_emise
         FROM promo_codes p WHERE p.is_loyalty_reward = TRUE`
    );

    const { rows: soldes } = await db.query(
      `SELECT COALESCE(SUM(loyalty_points), 0)::int AS points_en_circulation,
              COUNT(*) FILTER (WHERE loyalty_points > 0)::int AS clients_avec_points
         FROM users`
    );

    return res.status(200).json({
      reglages,
      statistiques: {
        bons_emis: rows[0].bons_emis,
        bons_utilises: rows[0].bons_utilises,
        bons_expires: rows[0].bons_expires,
        valeur_emise: parseFloat(rows[0].valeur_emise),
        points_en_circulation: soldes[0].points_en_circulation,
        clients_avec_points: soldes[0].clients_avec_points,
      },
    });
  } catch (error) {
    console.error('Erreur statut fidélité admin:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PUT /api/fidelite/admin — modifier les réglages.
exports.modifierReglages = async (req, res) => {
  const champsAutorises = [
    'is_active', 'threshold_points', 'value_divisor',
    'voucher_min', 'voucher_max', 'validity_days',
  ];

  const champs = [];
  const valeurs = [];
  for (const nom of champsAutorises) {
    if (req.body[nom] === undefined) continue;
    champs.push(`${nom} = $${champs.length + 1}`);
    valeurs.push(nom === 'is_active' ? Boolean(req.body[nom]) : Number(req.body[nom]));
  }

  if (champs.length === 0) {
    return res.status(400).json({ message: 'Aucun réglage à modifier.' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE loyalty_settings SET ${champs.join(', ')} WHERE id = 1 RETURNING *`,
      valeurs
    );
    return res.status(200).json({ message: 'Réglages enregistrés.', reglages: rows[0] });
  } catch (error) {
    // 23514 = contrainte CHECK : seuil négatif, plancher au-dessus du plafond,
    // validité hors bornes. Le message de la base est illisible pour un
    // administrateur, on explique à sa place.
    if (error.code === '23514') {
      return res.status(400).json({
        message:
          'Valeurs incohérentes : le seuil et le diviseur doivent être positifs, ' +
          'le montant minimum du bon ne peut pas dépasser le maximum, et la ' +
          'validité doit être comprise entre 1 et 365 jours.',
      });
    }
    console.error('Erreur modification réglages fidélité:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// GET /api/fidelite/admin/clients — classement des clients par points.
exports.listerClients = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.loyalty_points,
              (SELECT COUNT(*)::int FROM promo_codes p
                WHERE p.user_id = u.id AND p.is_loyalty_reward = TRUE) AS bons_recus
         FROM users u
        WHERE u.loyalty_points > 0
           OR EXISTS (SELECT 1 FROM promo_codes p
                       WHERE p.user_id = u.id AND p.is_loyalty_reward = TRUE)
        ORDER BY u.loyalty_points DESC, bons_recus DESC
        LIMIT 100`
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur liste clients fidélité:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Exposées à orderController, qui les appelle dans sa transaction.
exports.crediterPoints = crediterPoints;
exports.reprendrePoints = reprendrePoints;
exports.calculerValeurBon = calculerValeurBon;
exports.lireReglages = lireReglages;
exports.STATUTS_EXCLUS = STATUTS_EXCLUS;
