-- =============================================================================
-- 08 — Zones et tarifs de livraison
-- =============================================================================
-- La grille tarifaire vivait en dur dans DEUX fichiers : back_end/utils/shipping.js
-- pour la facturation et front_end/app/checkout.tsx pour l'affichage. Changer le
-- tarif d'Abidjan demandait de modifier les deux, et un oubli affichait au client
-- un prix différent de celui facturé.
--
-- La grille vit désormais ici. Les deux côtés la lisent, le panel la modifie.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Normalisation des noms de ville
-- -----------------------------------------------------------------------------
-- « Cotonou », « cotonou » et « COTONOU  » désignent la même ville, et
-- « Sèmè-Kpodji » doit se retrouver même tapé « Seme-Kpodji ». Sans cela, une
-- faute d'accent ferait basculer un client du tarif Sud (1 500) au tarif par
-- défaut (2 000).
--
-- La fonction est déclarée IMMUTABLE pour pouvoir alimenter une colonne générée :
-- la forme normalisée est ainsi calculée par la base elle-même, jamais par
-- l'application. Impossible que les deux divergent.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normaliser_libelle(valeur TEXT)
RETURNS TEXT AS $$
  SELECT lower(
    translate(
      btrim(COALESCE(valeur, '')),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
    )
  );
$$ LANGUAGE SQL IMMUTABLE;


-- -----------------------------------------------------------------------------
-- Zones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_zones (
  id            SERIAL PRIMARY KEY,

  name          VARCHAR(100)  NOT NULL,   -- « Sud Bénin », usage interne
  label         VARCHAR(150)  NOT NULL,   -- « 📍 Zone Sud Bénin », montré au client
  country       VARCHAR(100)  NOT NULL,
  cost          NUMERIC(12,2) NOT NULL,

  -- Tarif appliqué aux villes de ce pays qui ne sont listées dans aucune zone.
  -- C'est ce qui permet au Burkina Faso d'avoir un tarif unique quelle que soit
  -- la ville, sans avoir à énumérer toutes les villes du pays.
  is_country_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Dernier recours, quand même le pays est inconnu. Mieux vaut surfacturer
  -- légèrement que livrer gratuitement par accident.
  is_global_fallback BOOLEAN NOT NULL DEFAULT FALSE,

  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT shipping_zones_cost_check CHECK (cost >= 0),
  CONSTRAINT shipping_zones_name_check CHECK (btrim(name) <> ''),
  -- Une zone de repli désactivée ne remplit plus son rôle et laisserait le
  -- calcul sans solution. La base refuse la combinaison.
  CONSTRAINT shipping_zones_fallback_actif
    CHECK (NOT (is_global_fallback AND NOT is_active))
);

-- Un seul tarif par défaut par pays, et un seul repli global : sans ces index,
-- deux lignes concurrentes rendraient le calcul non déterministe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_zones_defaut_pays
  ON shipping_zones (normaliser_libelle(country))
  WHERE is_country_default;

CREATE UNIQUE INDEX IF NOT EXISTS idx_zones_repli_global
  ON shipping_zones ((TRUE))
  WHERE is_global_fallback;

CREATE INDEX IF NOT EXISTS idx_zones_pays
  ON shipping_zones (normaliser_libelle(country));

DROP TRIGGER IF EXISTS trigger_shipping_zones_updated_at ON shipping_zones;
CREATE TRIGGER trigger_shipping_zones_updated_at
  BEFORE UPDATE ON shipping_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------------------------------------
-- Villes rattachées aux zones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_zone_cities (
  id       SERIAL PRIMARY KEY,
  zone_id  INTEGER NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  city     VARCHAR(120) NOT NULL,

  -- Colonne générée : la base calcule elle-même la forme normalisée, à
  -- l'insertion comme à la mise à jour. L'application ne peut pas se tromper.
  city_normalized VARCHAR(160)
    GENERATED ALWAYS AS (normaliser_libelle(city)) STORED,

  CONSTRAINT shipping_zone_cities_nom_check CHECK (btrim(city) <> '')
);

-- Une même ville ne peut pas appartenir à deux zones : le tarif serait ambigu.
CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_cities_unique
  ON shipping_zone_cities (city_normalized);

CREATE INDEX IF NOT EXISTS idx_zone_cities_zone ON shipping_zone_cities (zone_id);


-- =============================================================================
-- Grille actuelle, reprise à l'identique
-- =============================================================================
-- Ces valeurs reproduisent exactement le comportement d'avant : Sud Bénin
-- 1 500, Nord Bénin 2 000, Burkina 5 000, Côte d'Ivoire 7 200, et 2 000 pour
-- toute destination non reconnue.
-- =============================================================================

INSERT INTO shipping_zones (name, label, country, cost, is_country_default, is_global_fallback, sort_order)
SELECT * FROM (VALUES
  ('Sud Bénin',    '📍 Zone Sud Bénin',                        'Bénin',         1500.00, FALSE, FALSE, 1),
  ('Nord Bénin',   '📍 Zone Nord Bénin',                       'Bénin',         2000.00, TRUE,  TRUE,  2),
  ('Burkina Faso', '🌍 International — Bénin ↔ Burkina Faso',  'Burkina Faso',  5000.00, TRUE,  FALSE, 3),
  ('Côte d''Ivoire','🌍 International — Bénin ↔ Côte d''Ivoire','Côte d''Ivoire',7200.00, TRUE,  FALSE, 4)
) AS v(name, label, country, cost, is_country_default, is_global_fallback, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM shipping_zones);

-- Villes, rattachées par le nom de leur zone pour ne pas dépendre des
-- identifiants attribués par la séquence.
INSERT INTO shipping_zone_cities (zone_id, city)
SELECT z.id, v.ville
FROM (VALUES
  ('Sud Bénin', 'Cotonou'), ('Sud Bénin', 'Porto-Novo'), ('Sud Bénin', 'Abomey-Calavi'),
  ('Sud Bénin', 'Sèmè-Kpodji'), ('Sud Bénin', 'Ouidah'), ('Sud Bénin', 'Allada'),
  ('Sud Bénin', 'Lokossa'), ('Sud Bénin', 'Dogbo'), ('Sud Bénin', 'Grand-Popo'),
  ('Sud Bénin', 'Sakété'), ('Sud Bénin', 'Kétou'),

  ('Nord Bénin', 'Parakou'), ('Nord Bénin', 'Djougou'), ('Nord Bénin', 'Kandi'),
  ('Nord Bénin', 'Natitingou'), ('Nord Bénin', 'Bohicon'), ('Nord Bénin', 'Abomey'),
  ('Nord Bénin', 'Savalou'), ('Nord Bénin', 'Dassa-Zoumé'), ('Nord Bénin', 'Nikki'),
  ('Nord Bénin', 'Tanguiéta'), ('Nord Bénin', 'Malanville'), ('Nord Bénin', 'Banikoara'),

  ('Burkina Faso', 'Ouagadougou'), ('Burkina Faso', 'Bobo-Dioulasso'),
  ('Burkina Faso', 'Koudougou'), ('Burkina Faso', 'Ouahigouya'), ('Burkina Faso', 'Kaya'),
  ('Burkina Faso', 'Banfora'), ('Burkina Faso', 'Fada N''Gourma'),

  ('Côte d''Ivoire', 'Abidjan'), ('Côte d''Ivoire', 'Yamoussoukro'),
  ('Côte d''Ivoire', 'Bouaké'), ('Côte d''Ivoire', 'San-Pédro'),
  ('Côte d''Ivoire', 'Korhogo'), ('Côte d''Ivoire', 'Daloa')
) AS v(zone, ville)
JOIN shipping_zones z ON z.name = v.zone
WHERE NOT EXISTS (
  SELECT 1 FROM shipping_zone_cities c
   WHERE c.city_normalized = normaliser_libelle(v.ville)
);
