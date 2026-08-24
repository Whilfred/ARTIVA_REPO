// ARTIVA/back_end/controllers/livraisonController.js
//
// Livraison gratuite méritée : acquisition, consommation, et réglages admin.
//
// Règle : dès que les achats d'un client cumulent le seuil configuré sur une
// fenêtre de N jours glissants, il gagne la livraison gratuite sur sa PROCHAINE
// commande. L'avantage expire au bout de N jours.

const db = require('../config/db');
const { resoudreZone, listerGrille } = require('../utils/shipping');

// Statuts qui ne représentent pas un achat abouti. Une commande annulée ou
// remboursée ne doit rien faire gagner : sans cela, commander 100 000 FCFA puis
// annuler suffirait à s'offrir la livraison.
const STATUTS_EXCLUS = ['cancelled', 'refunded'];

// -----------------------------------------------------------------------------
// Réglages
// -----------------------------------------------------------------------------

// Valeurs de repli si la table de réglages est absente ou vide. Elles évitent
// qu'une base incomplète fasse échouer tout passage en caisse : dans le doute,
// on applique les conditions par défaut.
const REGLAGES_DEFAUT = {
  is_active: true,
  threshold_amount: 100000,
  window_days: 7,
  validity_days: 30,
};

async function lireReglages(client = db) {
  try {
    const { rows } = await client.query(
      `SELECT is_active, threshold_amount, window_days, validity_days
         FROM free_shipping_settings WHERE id = 1`
    );
    if (rows.length === 0) return { ...REGLAGES_DEFAUT };
    return {
      is_active: rows[0].is_active,
      threshold_amount: parseFloat(rows[0].threshold_amount),
      window_days: parseInt(rows[0].window_days, 10),
      validity_days: parseInt(rows[0].validity_days, 10),
    };
  } catch (error) {
    console.error('Réglages livraison gratuite illisibles, valeurs par défaut:', error.message);
    return { ...REGLAGES_DEFAUT };
  }
}

// -----------------------------------------------------------------------------
// Progression vers le prochain avantage
// -----------------------------------------------------------------------------

/**
 * Cumul des achats du client sur la fenêtre glissante, en ne comptant que ce
 * qui n'a pas déjà servi à gagner un avantage.
 *
 * Le montant retenu est `total_amount - shipping_cost`, c'est-à-dire les
 * produits APRÈS remise promo : c'est ce que le client a réellement dépensé en
 * marchandise. Les frais de livraison sont exclus — récompenser quelqu'un pour
 * avoir payé la livraison n'aurait pas de sens.
 */
async function calculerCumul(client, userId, reglages) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(total_amount - shipping_cost), 0) AS cumul,
            COUNT(*)                                       AS nb_commandes
       FROM orders
      WHERE user_id = $1
        AND status <> ALL($2::text[])
        AND counted_in_reward_id IS NULL
        AND created_at >= NOW() - ($3 || ' days')::INTERVAL`,
    [userId, STATUTS_EXCLUS, reglages.window_days]
  );
  return {
    cumul: parseFloat(rows[0].cumul),
    nbCommandes: parseInt(rows[0].nb_commandes, 10),
  };
}

// -----------------------------------------------------------------------------
// Avantage disponible
// -----------------------------------------------------------------------------

/**
 * Renvoie l'avantage utilisable par ce client, ou null.
 *
 * Deux garde-fous :
 *  - on prend celui qui expire le plus tôt, pour ne pas laisser périmer un
 *    droit alors qu'un autre était utilisable ;
 *  - on écarte tout avantage dont une commande fondatrice a depuis été annulée
 *    ou remboursée. Le contrôle est fait ici, au moment de s'en servir, et non
 *    à l'annulation : cela évite d'avoir à intercepter tous les chemins par
 *    lesquels une commande peut changer de statut.
 *
 * `verrouiller` ajoute FOR UPDATE : indispensable dans la transaction de
 * commande, sinon deux commandes simultanées consommeraient le même avantage.
 */
async function avantageDisponible(client, userId, verrouiller = false) {
  const { rows } = await client.query(
    `SELECT id, earned_at, expires_at, qualifying_amount, triggering_order_id
       FROM free_shipping_rewards
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY expires_at ASC
      LIMIT 1
      ${verrouiller ? 'FOR UPDATE' : ''}`,
    [userId]
  );
  if (rows.length === 0) return null;

  const avantage = rows[0];

  const { rows: invalides } = await client.query(
    `SELECT COUNT(*) AS n FROM orders
      WHERE counted_in_reward_id = $1 AND status = ANY($2::text[])`,
    [avantage.id, STATUTS_EXCLUS]
  );

  if (parseInt(invalides[0].n, 10) > 0) {
    console.warn(
      `Avantage livraison #${avantage.id} écarté : une commande fondatrice a été annulée.`
    );
    return null;
  }

  return avantage;
}

/**
 * Marque l'avantage comme consommé. Le UPDATE est conditionné à
 * `used_at IS NULL` : si deux requêtes concurrentes passaient malgré tout le
 * verrou, la seconde ne modifierait aucune ligne et l'appelant le saurait.
 */
async function consommerAvantage(client, avantageId, orderId, montantEconomise) {
  const { rowCount } = await client.query(
    `UPDATE free_shipping_rewards
        SET used_at = NOW(), used_order_id = $2, shipping_saved = $3
      WHERE id = $1 AND used_at IS NULL`,
    [avantageId, orderId, montantEconomise.toFixed(2)]
  );
  return rowCount === 1;
}

// -----------------------------------------------------------------------------
// Acquisition, après création d'une commande
// -----------------------------------------------------------------------------

/**
 * Appelé dans la transaction de commande, juste après l'insertion.
 * Renvoie l'avantage créé, ou null si le seuil n'est pas atteint.
 *
 * Toutes les commandes de la fenêtre sont rattachées à l'avantage gagné, donc
 * retirées du prochain calcul : le compteur repart de zéro. Sans cela, un
 * client ayant franchi le seuil gagnerait un avantage à chacune de ses
 * commandes suivantes tant que la fenêtre resterait au-dessus.
 */
async function evaluerGain(client, userId, orderId) {
  const reglages = await lireReglages(client);
  if (!reglages.is_active) return null;

  const { cumul } = await calculerCumul(client, userId, reglages);
  if (cumul < reglages.threshold_amount) return null;

  const { rows } = await client.query(
    `INSERT INTO free_shipping_rewards
       (user_id, expires_at, qualifying_amount, triggering_order_id)
     VALUES ($1, NOW() + ($2 || ' days')::INTERVAL, $3, $4)
     RETURNING id, earned_at, expires_at, qualifying_amount`,
    [userId, reglages.validity_days, cumul.toFixed(2), orderId]
  );
  const avantage = rows[0];

  await client.query(
    `UPDATE orders
        SET counted_in_reward_id = $1
      WHERE user_id = $2
        AND status <> ALL($3::text[])
        AND counted_in_reward_id IS NULL
        AND created_at >= NOW() - ($4 || ' days')::INTERVAL`,
    [avantage.id, userId, STATUTS_EXCLUS, reglages.window_days]
  );

  console.log(
    `🎁 Livraison gratuite acquise par l'utilisateur ${userId} ` +
    `(cumul ${cumul} FCFA, valable jusqu'au ${avantage.expires_at.toISOString().slice(0, 10)})`
  );
  return avantage;
}

// -----------------------------------------------------------------------------
// GET /api/livraison/statut — consulté par l'écran de paiement
// -----------------------------------------------------------------------------
exports.statutClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const reglages = await lireReglages();

    const avantage = await avantageDisponible(db, userId);
    const { cumul } = await calculerCumul(db, userId, reglages);

    // Les frais sont calculés ici, et non par l'application : l'écran de
    // paiement affiche ainsi exactement ce qui sera facturé.
    const pays  = req.query.pays  || null;
    const ville = req.query.ville || null;
    const zone  = pays ? await resoudreZone(db, pays, ville) : null;
    const fraisNormaux = zone ? zone.cost : null;

    return res.status(200).json({
      actif: reglages.is_active,
      seuil: reglages.threshold_amount,
      fenetre_jours: reglages.window_days,

      avantage_disponible: Boolean(avantage),
      expire_le: avantage ? avantage.expires_at : null,

      cumul_actuel: cumul,
      restant: Math.max(0, reglages.threshold_amount - cumul),

      frais_normaux: fraisNormaux,
      frais_a_payer: avantage ? 0 : fraisNormaux,
      zone: zone ? zone.label : null,
    });
  } catch (error) {
    console.error('Erreur statut livraison:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// -----------------------------------------------------------------------------
// Administration des réglages
// -----------------------------------------------------------------------------

// GET /api/livraison/reglages
exports.lireReglagesAdmin = async (req, res) => {
  try {
    const reglages = await lireReglages();

    // Quelques chiffres pour que l'écran ne soit pas un formulaire aveugle :
    // savoir combien d'avantages sont en circulation change la lecture qu'on
    // fait d'un changement de seuil.
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > NOW()) AS disponibles,
         COUNT(*) FILTER (WHERE used_at IS NOT NULL)                    AS consommes,
         COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at <= NOW()) AS expires,
         COALESCE(SUM(shipping_saved), 0)                               AS total_offert
       FROM free_shipping_rewards`
    );

    return res.status(200).json({
      reglages,
      statistiques: {
        disponibles:  parseInt(rows[0].disponibles, 10),
        consommes:    parseInt(rows[0].consommes, 10),
        expires:      parseInt(rows[0].expires, 10),
        total_offert: parseFloat(rows[0].total_offert),
      },
    });
  } catch (error) {
    console.error('Erreur lecture réglages livraison:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PUT /api/livraison/reglages
exports.modifierReglagesAdmin = async (req, res) => {
  const { is_active, threshold_amount, window_days, validity_days } = req.body;

  // Validation ici en plus des contraintes CHECK : la base refuserait la
  // valeur, mais avec un message d'erreur Postgres illisible pour l'admin.
  const erreurs = [];

  if (threshold_amount !== undefined) {
    const v = Number(threshold_amount);
    if (!Number.isFinite(v) || v <= 0) {
      erreurs.push('Le seuil doit être un montant supérieur à 0.');
    }
  }
  if (window_days !== undefined) {
    const v = Number(window_days);
    if (!Number.isInteger(v) || v < 1 || v > 365) {
      erreurs.push('La fenêtre doit être un nombre entier de 1 à 365 jours.');
    }
  }
  if (validity_days !== undefined) {
    const v = Number(validity_days);
    if (!Number.isInteger(v) || v < 1 || v > 365) {
      erreurs.push('La validité doit être un nombre entier de 1 à 365 jours.');
    }
  }
  if (is_active !== undefined && typeof is_active !== 'boolean') {
    erreurs.push('Le champ « actif » doit être vrai ou faux.');
  }

  if (erreurs.length > 0) {
    return res.status(400).json({ message: erreurs.join(' ') });
  }

  // Mise à jour partielle : l'écran peut n'envoyer que le champ modifié.
  const champs = [];
  const valeurs = [];
  const ajouter = (colonne, valeur) => {
    champs.push(`${colonne} = $${champs.length + 1}`);
    valeurs.push(valeur);
  };

  if (is_active !== undefined)        ajouter('is_active', is_active);
  if (threshold_amount !== undefined) ajouter('threshold_amount', Number(threshold_amount));
  if (window_days !== undefined)      ajouter('window_days', Number(window_days));
  if (validity_days !== undefined)    ajouter('validity_days', Number(validity_days));

  if (champs.length === 0) {
    return res.status(400).json({ message: 'Aucune modification fournie.' });
  }

  try {
    // INSERT ... ON CONFLICT plutôt qu'un UPDATE seul : si la ligne unique
    // n'existe pas encore, l'écran d'administration doit pouvoir la créer.
    await db.query(
      `INSERT INTO free_shipping_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`
    );
    const { rows } = await db.query(
      `UPDATE free_shipping_settings SET ${champs.join(', ')}
        WHERE id = 1
        RETURNING is_active, threshold_amount, window_days, validity_days`,
      valeurs
    );

    return res.status(200).json({
      message: 'Conditions de livraison gratuite mises à jour.',
      reglages: {
        is_active: rows[0].is_active,
        threshold_amount: parseFloat(rows[0].threshold_amount),
        window_days: parseInt(rows[0].window_days, 10),
        validity_days: parseInt(rows[0].validity_days, 10),
      },
    });
  } catch (error) {
    console.error('Erreur modification réglages livraison:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement.' });
  }
};

// GET /api/livraison/avantages — journal, pour l'administration
exports.listerAvantages = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.earned_at, r.expires_at, r.qualifying_amount,
              r.used_at, r.shipping_saved,
              u.name, u.email,
              od.order_number AS commande_declencheuse,
              ou.order_number AS commande_utilisation,
              CASE
                WHEN r.used_at IS NOT NULL   THEN 'consommé'
                WHEN r.expires_at <= NOW()   THEN 'expiré'
                ELSE 'disponible'
              END AS statut
         FROM free_shipping_rewards r
         JOIN users u  ON u.id = r.user_id
         LEFT JOIN orders od ON od.id = r.triggering_order_id
         LEFT JOIN orders ou ON ou.id = r.used_order_id
        ORDER BY r.earned_at DESC
        LIMIT 200`
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur liste avantages livraison:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Réutilisés par orderController, dans la transaction de commande.
exports.lireReglages       = lireReglages;
exports.calculerCumul      = calculerCumul;
exports.avantageDisponible = avantageDisponible;
exports.consommerAvantage  = consommerAvantage;
exports.evaluerGain        = evaluerGain;

// =============================================================================
// Zones et tarifs de livraison
// =============================================================================

// GET /api/livraison/zones — grille complète, consultée par l'écran de paiement.
// Volontairement accessible sans authentification : les tarifs sont une
// information publique, et l'écran doit pouvoir les afficher avant même que le
// client ait un panier.
exports.listerZonesPubliques = async (req, res) => {
  try {
    const zones = await listerGrille();

    // L'application a besoin de la liste des pays pour son sélecteur, et des
    // villes de chacun. La reconstruire côté client à partir des zones
    // dupliquerait une logique qui n'a qu'un seul endroit légitime : ici.
    const parPays = new Map();
    for (const z of zones) {
      if (!parPays.has(z.country)) parPays.set(z.country, []);
      parPays.get(z.country).push(...z.cities);
    }

    return res.status(200).json({
      zones,
      pays: [...parPays.entries()].map(([nom, villes]) => ({
        nom,
        villes: villes.sort((a, b) => a.localeCompare(b, 'fr')),
      })),
    });
  } catch (error) {
    console.error('Erreur liste des zones:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// GET /api/livraison/zones/admin — inclut les zones désactivées.
exports.listerZonesAdmin = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT z.*,
              COALESCE(
                ARRAY_AGG(c.city ORDER BY c.city) FILTER (WHERE c.id IS NOT NULL),
                '{}'
              ) AS cities
         FROM shipping_zones z
         LEFT JOIN shipping_zone_cities c ON c.zone_id = z.id
        GROUP BY z.id
        ORDER BY z.sort_order, z.id`
    );
    return res.status(200).json(
      rows.map((z) => ({ ...z, cost: parseFloat(z.cost) }))
    );
  } catch (error) {
    console.error('Erreur liste des zones (admin):', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * Valide le corps d'une création ou modification de zone.
 * Renvoie un tableau de messages ; vide si tout va bien.
 */
function validerZone(corps, creation) {
  const erreurs = [];
  const requis = (v) => v !== undefined && v !== null && String(v).trim() !== '';

  if (creation || corps.name !== undefined) {
    if (!requis(corps.name)) erreurs.push('Le nom de la zone est obligatoire.');
  }
  if (creation || corps.label !== undefined) {
    if (!requis(corps.label)) erreurs.push("Le libellé affiché au client est obligatoire.");
  }
  if (creation || corps.country !== undefined) {
    if (!requis(corps.country)) erreurs.push('Le pays est obligatoire.');
  }
  if (creation || corps.cost !== undefined) {
    const v = Number(corps.cost);
    if (!Number.isFinite(v) || v < 0) erreurs.push('Le tarif doit être un montant positif ou nul.');
  }
  if (corps.cities !== undefined && !Array.isArray(corps.cities)) {
    erreurs.push('La liste des villes doit être un tableau.');
  }
  return erreurs;
}

/**
 * Remplace la liste des villes d'une zone.
 *
 * On efface puis on réinsère plutôt que de calculer un différentiel : la liste
 * fait quelques dizaines d'entrées, et le différentiel n'apporterait qu'un
 * risque d'incohérence supplémentaire. Le tout dans une transaction, pour qu'un
 * doublon détecté en cours de route ne laisse pas la zone sans aucune ville.
 */
async function remplacerVilles(client, zoneId, villes) {
  await client.query('DELETE FROM shipping_zone_cities WHERE zone_id = $1', [zoneId]);

  const propres = [...new Set(
    villes.map((v) => String(v).trim()).filter((v) => v !== '')
  )];

  for (const ville of propres) {
    try {
      await client.query(
        'INSERT INTO shipping_zone_cities (zone_id, city) VALUES ($1, $2)',
        [zoneId, ville]
      );
    } catch (error) {
      // 23505 = violation d'unicité : la ville appartient déjà à une AUTRE zone.
      // Message explicite plutôt que l'erreur Postgres brute, qui ne dirait pas
      // laquelle pose problème.
      if (error.code === '23505') {
        const err = new Error(
          `La ville « ${ville} » est déjà rattachée à une autre zone. ` +
          `Une ville ne peut appartenir qu'à une seule zone, sinon son tarif serait ambigu.`
        );
        err.statusCode = 400;
        throw err;
      }
      throw error;
    }
  }
  return propres.length;
}

// POST /api/livraison/zones
exports.creerZone = async (req, res) => {
  const erreurs = validerZone(req.body, true);
  if (erreurs.length > 0) return res.status(400).json({ message: erreurs.join(' ') });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Un seul défaut par pays et un seul repli global : on libère l'ancien
    // avant d'installer le nouveau, sinon l'index unique refuserait l'insertion
    // avec un message incompréhensible pour l'administrateur.
    if (req.body.is_country_default) {
      await client.query(
        `UPDATE shipping_zones SET is_country_default = FALSE
          WHERE normaliser_libelle(country) = normaliser_libelle($1)`,
        [req.body.country]
      );
    }
    if (req.body.is_global_fallback) {
      await client.query('UPDATE shipping_zones SET is_global_fallback = FALSE');
    }

    const { rows } = await client.query(
      `INSERT INTO shipping_zones
         (name, label, country, cost, is_country_default, is_global_fallback, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        String(req.body.name).trim(),
        String(req.body.label).trim(),
        String(req.body.country).trim(),
        Number(req.body.cost),
        Boolean(req.body.is_country_default),
        Boolean(req.body.is_global_fallback),
        req.body.is_active === undefined ? true : Boolean(req.body.is_active),
        Number(req.body.sort_order) || 0,
      ]
    );

    if (Array.isArray(req.body.cities)) {
      await remplacerVilles(client, rows[0].id, req.body.cities);
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Zone créée.', zone: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.statusCode === 400) return res.status(400).json({ message: error.message });
    console.error('Erreur création zone:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création.' });
  } finally {
    client.release();
  }
};

// PUT /api/livraison/zones/:id
exports.modifierZone = async (req, res) => {
  const erreurs = validerZone(req.body, false);
  if (erreurs.length > 0) return res.status(400).json({ message: erreurs.join(' ') });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existantes } = await client.query(
      'SELECT * FROM shipping_zones WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (existantes.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Zone introuvable.' });
    }
    const zone = existantes[0];
    const pays = req.body.country !== undefined ? String(req.body.country).trim() : zone.country;

    if (req.body.is_country_default) {
      await client.query(
        `UPDATE shipping_zones SET is_country_default = FALSE
          WHERE normaliser_libelle(country) = normaliser_libelle($1) AND id <> $2`,
        [pays, zone.id]
      );
    }
    if (req.body.is_global_fallback) {
      await client.query('UPDATE shipping_zones SET is_global_fallback = FALSE WHERE id <> $1', [zone.id]);
    }

    // Mise à jour partielle : l'écran peut n'envoyer que le champ modifié.
    const champs = [];
    const valeurs = [];
    const ajouter = (colonne, valeur) => {
      champs.push(`${colonne} = $${champs.length + 1}`);
      valeurs.push(valeur);
    };

    if (req.body.name !== undefined)    ajouter('name', String(req.body.name).trim());
    if (req.body.label !== undefined)   ajouter('label', String(req.body.label).trim());
    if (req.body.country !== undefined) ajouter('country', pays);
    if (req.body.cost !== undefined)    ajouter('cost', Number(req.body.cost));
    if (req.body.is_country_default !== undefined) ajouter('is_country_default', Boolean(req.body.is_country_default));
    if (req.body.is_global_fallback !== undefined) ajouter('is_global_fallback', Boolean(req.body.is_global_fallback));
    if (req.body.is_active !== undefined)  ajouter('is_active', Boolean(req.body.is_active));
    if (req.body.sort_order !== undefined) ajouter('sort_order', Number(req.body.sort_order) || 0);

    let misAJour = zone;
    if (champs.length > 0) {
      valeurs.push(zone.id);
      const { rows } = await client.query(
        `UPDATE shipping_zones SET ${champs.join(', ')} WHERE id = $${valeurs.length} RETURNING *`,
        valeurs
      );
      misAJour = rows[0];
    }

    if (Array.isArray(req.body.cities)) {
      await remplacerVilles(client, zone.id, req.body.cities);
    }

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Zone mise à jour.', zone: misAJour });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.statusCode === 400) return res.status(400).json({ message: error.message });
    // 23514 = contrainte CHECK : typiquement une zone de repli qu'on désactive.
    if (error.code === '23514') {
      return res.status(400).json({
        message: "Impossible : la zone de repli global ne peut pas être désactivée. " +
                 "Désignez d'abord une autre zone comme repli.",
      });
    }
    console.error('Erreur modification zone:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la modification.' });
  } finally {
    client.release();
  }
};

// DELETE /api/livraison/zones/:id
exports.supprimerZone = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT is_global_fallback FROM shipping_zones WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Zone introuvable.' });

    // Supprimer le repli laisserait les destinations inconnues sans tarif, et
    // toute commande vers l'une d'elles échouerait.
    if (rows[0].is_global_fallback) {
      return res.status(400).json({
        message: "Cette zone sert de repli pour les destinations non reconnues. " +
                 "Désignez d'abord une autre zone comme repli avant de la supprimer.",
      });
    }

    // Les villes partent en cascade (ON DELETE CASCADE). Les commandes passées
    // ne sont pas touchées : elles ont recopié leur tarif et leur libellé.
    await db.query('DELETE FROM shipping_zones WHERE id = $1', [req.params.id]);
    return res.status(200).json({ message: 'Zone supprimée.' });
  } catch (error) {
    console.error('Erreur suppression zone:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
  }
};
