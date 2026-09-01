// ARTIVA/back_end/controllers/loyaltyController.js
//
// Programme de fidélité.
//
// Le client accumule des points à chaque achat selon le diviseur en fonction du total dépensé.
// Dès que son solde atteint 30000 points, un bon nominatif lui est attribué automatiquement
// et son solde repart de zéro.
//
// Diviseurs :
// - 0 - 99 999 FCFA : 40
// - 100 000 - 199 999 FCFA : 50
// - 200 000 - 299 999 FCFA : 55
// - 300 000 - 999 999 FCFA : 60
// - 1 000 000+ FCFA : 70

const db = require('../config/db');

const REGLAGES_DEFAUT = {
  is_active: true,
  threshold_points: 30000,
  value_divisor: 40,
  voucher_min: 750,
  voucher_max: 1000,
  validity_days: 60,
};

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
 * Détermine le diviseur en fonction du total dépensé
 */
function getDivisor(totalSpent) {
  if (totalSpent < 100000) return 40;
  if (totalSpent < 200000) return 50;
  if (totalSpent < 300000) return 55;
  if (totalSpent < 1000000) return 60;
  return 70;
}

function calculerValeurBon(soldeConverti, reglages) {
  const brut = soldeConverti / reglages.value_divisor;
  const borne = Math.min(Math.max(brut, reglages.voucher_min), reglages.voucher_max);
  return Math.round(borne);
}

function genererCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffixe = '';
  for (let i = 0; i < 6; i++) {
    suffixe += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FIDELITE-${suffixe}`;
}

/**
 * Crédite les points et génère un bon cumulé si le seuil est atteint
 */
async function crediterPoints(client, userId, orderId, montantProduits) {
  console.log('🔍 crediterPoints - Début');
  console.log('👤 userId:', userId);
  console.log('💰 montantProduits:', montantProduits);
  
  const reglages = await lireReglages(client);
  console.log('⚙️ reglages:', reglages);
  
  if (!reglages.is_active) {
    console.log('❌ Programme inactif');
    return null;
  }

  const { rows: utilisateurs } = await client.query(
    'SELECT loyalty_points, total_spent FROM users WHERE id = $1 FOR UPDATE',
    [userId]
  );
  if (utilisateurs.length === 0) return null;

  const currentTotalSpent = parseFloat(utilisateurs[0].total_spent || 0);
  const nouveauTotalSpent = currentTotalSpent + montantProduits;
  
  // 🔥 Déterminer le diviseur selon le NOUVEAU total
  const divisor = getDivisor(nouveauTotalSpent);
  console.log(`📊 Diviseur pour ${nouveauTotalSpent} FCFA: ${divisor}`);
  
  // 🔥 Calculer les points : montant / diviseur
  const points = Math.floor(montantProduits / divisor);
  console.log(`📊 points calculés (${montantProduits}/${divisor}): ${points}`);
  
  if (points <= 0) {
    console.log('❌ points <= 0, retour null');
    return null;
  }

  const soldeApres = utilisateurs[0].loyalty_points + points;

  await client.query(
    'UPDATE users SET loyalty_points = $1, total_spent = $2 WHERE id = $3',
    [soldeApres, nouveauTotalSpent, userId]
  );
  await client.query(
    `INSERT INTO loyalty_ledger (user_id, delta, reason, order_id, balance_after, total_spent_after)
     VALUES ($1, $2, 'earned', $3, $4, $5)`,
    [userId, points, orderId, soldeApres, nouveauTotalSpent]
  );
  
  console.log(`✅ Points crédités: +${points}, nouveau solde: ${soldeApres}`);

  // Si le seuil est atteint (30 000 points)
  if (soldeApres >= reglages.threshold_points) {
    const nombreBons = Math.floor(soldeApres / reglages.threshold_points);
    const pointsUtilises = nombreBons * reglages.threshold_points;
    const pointsRestants = soldeApres - pointsUtilises;
    
    // 🔥 Valeur du bon = points utilisés / diviseur actuel
    const valeurBon = Math.floor(pointsUtilises / divisor);
    console.log(`📊 ${nombreBons} bon(s) cumulés, valeur: ${valeurBon} FCFA (diviseur: ${divisor})`);
    
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + reglages.validity_days);

    // 🔥 Générer UN SEUL bon cumulé
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
            `Bon de fidélité — ${pointsUtilises.toLocaleString('fr-FR')} points convertis`,
            valeurBon,
            expiration,
            userId,
          ]
        );
        bon = rows[0];
      } catch (error) {
        if (error.code !== '23505') throw error;
      }
    }
    if (!bon) throw new Error("Impossible de générer un code de fidélité unique.");

    // Mettre à jour le solde
    await client.query(
      'UPDATE users SET loyalty_points = $1 WHERE id = $2',
      [pointsRestants, userId]
    );
    
    await client.query(
      `INSERT INTO loyalty_ledger (user_id, delta, reason, order_id, promo_code_id, balance_after)
       VALUES ($1, $2, 'converted', $3, $4, $5)`,
      [userId, -pointsUtilises, orderId, bon.id, pointsRestants]
    );
    
    console.log(`🎁 Bon généré: ${bon.code} (${valeurBon} FCFA)`);
    console.log(`📊 Nouveau solde: ${pointsRestants} points`);

    // Notification
    const dateLisible = expiration.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link_url)
       VALUES ($1, 'promotion', $2, $3, $4)`,
      [
        userId,
        `🎁 Vous avez gagné un bon de ${valeurBon.toLocaleString('fr-FR')} FCFA`,
        `Vos ${pointsUtilises.toLocaleString('fr-FR')} points de fidélité vous donnent un bon de ` +
          `${valeurBon.toLocaleString('fr-FR')} FCFA. Utilisez le code ${bon.code} lors de votre ` +
          `prochaine commande, valable jusqu'au ${dateLisible}.`,
        '/fidelite',
      ]
    );

    return {
      points,
      solde: pointsRestants,
      restant: Math.max(0, reglages.threshold_points - pointsRestants),
      bon: { code: bon.code, valeur: valeurBon, expire_le: expiration, points_convertis: pointsUtilises },
    };
  }

  return {
    points,
    solde: soldeApres,
    restant: reglages.threshold_points - soldeApres,
    bon: null,
  };
}

/**
 * Reprend les points d'une commande annulée
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
    'SELECT loyalty_points, total_spent FROM users WHERE id = $1 FOR UPDATE',
    [userId]
  );
  if (u.length === 0) return null;

  const { rows: orderTotal } = await client.query(
    'SELECT total_amount FROM orders WHERE id = $1',
    [orderId]
  );
  const orderAmount = orderTotal.length > 0 ? parseFloat(orderTotal[0].total_amount) : 0;
  const nouveauTotalSpent = Math.max(0, parseFloat(u[0].total_spent || 0) - orderAmount);
  const divisor = getDivisor(nouveauTotalSpent);

  const soldeApres = Math.max(0, u[0].loyalty_points - delta);
  const reprise = u[0].loyalty_points - soldeApres;
  if (reprise === 0) return null;

  await client.query(
    'UPDATE users SET loyalty_points = $1, total_spent = $2 WHERE id = $3',
    [soldeApres, nouveauTotalSpent, userId]
  );
  await client.query(
    `INSERT INTO loyalty_ledger (user_id, delta, reason, order_id, balance_after, total_spent_after)
     VALUES ($1, $2, 'revoked', $3, $4, $5)`,
    [userId, -reprise, orderId, soldeApres, nouveauTotalSpent]
  );
  return { reprise, solde: soldeApres, totalSpent: nouveauTotalSpent };
}

/**
 * Initialisation des anciennes commandes
 */
async function initialiserPointsUtilisateur(client, userId) {
  console.log('🔄 Initialisation des points pour l\'utilisateur:', userId);
  
  const currentClient = client || db;
  
  const { rows: totalOrders } = await currentClient.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS total_spent,
            COUNT(*) AS total_orders
     FROM orders 
     WHERE user_id = $1 
       AND status NOT IN ('cancelled', 'refunded')`,
    [userId]
  );
  
  const totalSpent = parseFloat(totalOrders[0]?.total_spent || 0);
  const totalOrdersCount = parseInt(totalOrders[0]?.total_orders || 0);
  
  console.log(`📊 Utilisateur ${userId}: ${totalOrdersCount} commandes, total: ${totalSpent} FCFA`);
  
  if (totalOrdersCount === 0) {
    console.log('ℹ️ Aucune commande trouvée, pas d\'initialisation');
    return false;
  }
  
  const { rows: user } = await currentClient.query(
    'SELECT loyalty_points, total_spent FROM users WHERE id = $1',
    [userId]
  );
  
  const currentPoints = user[0]?.loyalty_points || 0;
  const currentTotalSpent = parseFloat(user[0]?.total_spent || 0);
  
  if (currentPoints > 0 && currentTotalSpent > 0) {
    console.log(`✅ Utilisateur déjà initialisé (${currentPoints} points)`);
    return false;
  }
  
  // 🔥 Déterminer le diviseur selon le total
  const divisor = getDivisor(totalSpent);
  console.log(`📊 Diviseur pour ${totalSpent} FCFA: ${divisor}`);
  
  // 🔥 Calculer les points : total / diviseur
  const points = Math.floor(totalSpent / divisor);
  console.log(`📊 Points calculés (${totalSpent}/${divisor}): ${points}`);
  
  await currentClient.query(
    'UPDATE users SET loyalty_points = $1, total_spent = $2 WHERE id = $3',
    [points, totalSpent, userId]
  );
  
  await currentClient.query(
    `INSERT INTO loyalty_ledger (user_id, delta, reason, balance_after, total_spent_after)
     VALUES ($1, $2, 'initialized', $3, $4)`,
    [userId, points, points, totalSpent]
  );
  
  console.log(`✅ Utilisateur ${userId} initialisé avec ${points} points (diviseur: ${divisor})`);
  console.log(`ℹ️ Les bons seront générés lors des prochaines commandes`);
  
  return true;
}

// =============================================================================
// CÔTÉ CLIENT
// =============================================================================

exports.monStatut = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 monStatut - userId:', userId);
    
    const { rows: check } = await db.query(
      'SELECT loyalty_points, total_spent FROM users WHERE id = $1',
      [userId]
    );
    
    const hasPoints = check[0]?.loyalty_points > 0;
    const hasTotalSpent = parseFloat(check[0]?.total_spent || 0) > 0;
    
    if (!hasPoints && !hasTotalSpent) {
      const { rows: orders } = await db.query(
        'SELECT COUNT(*)::int as count FROM orders WHERE user_id = $1 AND status NOT IN ($2, $3)',
        [userId, 'cancelled', 'refunded']
      );
      
      if (orders[0]?.count > 0) {
        console.log(`🔄 Initialisation automatique pour l'utilisateur ${userId} (${orders[0].count} commandes)`);
        await initialiserPointsUtilisateur(null, userId);
      }
    }
    
    const reglages = await lireReglages();

    const { rows: u } = await db.query(
      'SELECT loyalty_points, total_spent FROM users WHERE id = $1',
      [userId]
    );
    if (u.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    
    const solde = u[0].loyalty_points;
    const totalSpent = parseFloat(u[0].total_spent || 0);

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

    // 🔥 BONUS DE BIENVENUE - 2 000 FCFA - 120 JOURS
    const { rows: welcomeCheck } = await db.query(
      `SELECT id FROM promo_codes 
       WHERE user_id = $1 AND code LIKE 'BIENVENUE%'`,
      [userId]
    );
    const hasWelcomeBonus = welcomeCheck.length > 0;

    if (!hasWelcomeBonus) {
      const { rows: ordersCount } = await db.query(
        'SELECT COUNT(*)::int as count FROM orders WHERE user_id = $1',
        [userId]
      );
      
      if (ordersCount[0].count === 0) {
        const code = `BIENVENUE${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 120); // 120 jours
        
        await db.query(
          `INSERT INTO promo_codes 
           (code, description, discount_type, discount_value, min_purchase_amount,
            expires_at, max_uses, max_uses_per_user, is_active, user_id, is_loyalty_reward)
           VALUES ($1, $2, 'fixed', $3, 0, $4, 1, 1, TRUE, $5, FALSE)`,
          [code, 'Bonus de bienvenue - 2000 FCFA', 2000, expiresAt, userId]
        );
        
        console.log(`🎁 Bonus de bienvenue créé pour l'utilisateur ${userId}: ${code} (valable 120 jours)`);
      }
    }

    return res.status(200).json({
      actif: reglages.is_active,
      solde,
      total_spent: totalSpent,
      seuil: reglages.threshold_points,
      restant: Math.max(0, reglages.threshold_points - solde),
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

exports.crediterPoints = crediterPoints;
exports.reprendrePoints = reprendrePoints;
exports.calculerValeurBon = calculerValeurBon;
exports.lireReglages = lireReglages;
exports.STATUTS_EXCLUS = STATUTS_EXCLUS;