// ARTIVA/back_end/utils/shipping.js
// =============================================================================
// Frais de livraison — référence faisant autorité
// =============================================================================
// La grille vit en base (voir db/init/08_zones_livraison.sql), plus dans le code.
// Elle était auparavant dupliquée entre ce fichier et front_end/app/checkout.tsx :
// changer un tarif demandait de modifier les deux, et un oubli affichait au
// client un prix différent de celui facturé.
//
// Le montant envoyé par l'application n'est jamais repris : il n'est qu'un
// affichage, recalculé ici à partir du pays et de la ville réels.
// =============================================================================

const db = require('../config/db');

/**
 * Résout la zone de livraison d'une destination.
 *
 * Trois niveaux, du plus précis au plus général :
 *   1. la ville est explicitement rattachée à une zone de ce pays ;
 *   2. à défaut, le tarif par défaut du pays — c'est ce qui permet au Burkina
 *      Faso d'avoir un tarif unique sans énumérer toutes ses villes ;
 *   3. à défaut, le repli global, pour un pays inconnu.
 *
 * La correspondance de ville est volontairement limitée aux zones du pays
 * indiqué. Sinon « Bénin / Abidjan » — combinaison impossible depuis
 * l'application, mais forgeable — irait chercher le tarif ivoirien.
 *
 * La normalisation (casse, accents, espaces) est faite par la base via
 * normaliser_libelle(), et nulle part ailleurs : une seule implémentation, donc
 * aucune divergence possible entre l'écriture et la lecture.
 *
 * @param {object} client  connexion ou transaction en cours
 * @returns {{id:number, name:string, label:string, cost:number}}
 */
async function resoudreZone(client, pays, ville) {
  const { rows } = await (client || db).query(
    `SELECT z.id, z.name, z.label, z.cost,
            CASE
              WHEN c.id IS NOT NULL THEN 1
              -- La correspondance de pays est indispensable ici : sans elle, la
              -- zone de repli global, qui est aussi le défaut de SON pays,
              -- décrochait la priorité 2 pour n'importe quelle destination et
              -- passait devant le vrai tarif du pays demandé.
              WHEN z.is_country_default
               AND normaliser_libelle(z.country) = normaliser_libelle($1) THEN 2
              ELSE 3
            END AS priorite
       FROM shipping_zones z
       LEFT JOIN shipping_zone_cities c
              ON c.zone_id = z.id
             AND c.city_normalized = normaliser_libelle($2)
      WHERE z.is_active
        AND (
              (c.id IS NOT NULL AND normaliser_libelle(z.country) = normaliser_libelle($1))
           OR (z.is_country_default AND normaliser_libelle(z.country) = normaliser_libelle($1))
           OR z.is_global_fallback
            )
      ORDER BY priorite, z.sort_order, z.id  -- départage stable
      LIMIT 1`,
    [pays || '', ville || '']
  );

  if (rows.length === 0) {
    // Aucune zone applicable et aucun repli : plutôt que de livrer gratuitement
    // par accident, on refuse. Le cas ne peut survenir que si l'administration a
    // désactivé ou supprimé la zone de repli.
    const err = new Error(
      "Aucune zone de livraison ne correspond à cette destination, et aucune zone " +
      "de repli n'est définie. Vérifiez la configuration des zones."
    );
    err.statusCode = 500;
    throw err;
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    label: rows[0].label,
    cost: parseFloat(rows[0].cost),
  };
}

/** Frais de livraison seuls, en FCFA. */
async function calculerFraisLivraison(client, pays, ville) {
  return (await resoudreZone(client, pays, ville)).cost;
}

/** Libellé de la zone, repris dans shipping_method et les emails. */
async function libelleZone(client, pays, ville) {
  return (await resoudreZone(client, pays, ville)).label;
}

/**
 * Grille complète, telle que l'écran de paiement en a besoin : les pays
 * disponibles, leurs villes, et le tarif de chacune.
 *
 * Les zones inactives sont exclues : une zone désactivée ne doit plus être
 * proposée au client, sans quoi il choisirait une destination que la commande
 * refuserait ensuite.
 */
async function listerGrille(client) {
  const { rows } = await (client || db).query(
    `SELECT z.id, z.name, z.label, z.country, z.cost,
            z.is_country_default, z.is_global_fallback, z.sort_order,
            COALESCE(
              ARRAY_AGG(c.city ORDER BY c.city) FILTER (WHERE c.id IS NOT NULL),
              '{}'
            ) AS cities
       FROM shipping_zones z
       LEFT JOIN shipping_zone_cities c ON c.zone_id = z.id
      WHERE z.is_active
      GROUP BY z.id
      ORDER BY z.sort_order, z.id`
  );

  return rows.map((z) => ({
    id: z.id,
    name: z.name,
    label: z.label,
    country: z.country,
    cost: parseFloat(z.cost),
    is_country_default: z.is_country_default,
    is_global_fallback: z.is_global_fallback,
    cities: z.cities,
  }));
}

module.exports = {
  resoudreZone,
  calculerFraisLivraison,
  libelleZone,
  listerGrille,
};
