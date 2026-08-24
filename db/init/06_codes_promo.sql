-- =============================================================================
-- 06 — Codes promotionnels
-- =============================================================================
-- Deux tables : la définition des codes, et le journal de leurs utilisations.
--
-- Le journal n'est pas un luxe. Sans lui, on ne peut ni limiter un code à une
-- utilisation par client, ni savoir quelle commande a bénéficié de quel code
-- lorsqu'il faut expliquer un écart de caisse. Un simple compteur ne dirait pas
-- QUI a utilisé le code.
-- =============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id                  SERIAL PRIMARY KEY,

  -- Toujours stocké en majuscules : « ETE2026 » et « ete2026 » désignent le
  -- même code. La normalisation se fait à l'écriture, pas à la lecture, pour
  -- que l'index unique fasse son travail.
  code                VARCHAR(50)  NOT NULL UNIQUE,
  description         TEXT,

  -- 'percentage' : discount_value est un pourcentage (10 = -10 %)
  -- 'fixed'      : discount_value est un montant en FCFA
  discount_type       VARCHAR(20)  NOT NULL,
  discount_value      NUMERIC(12,2) NOT NULL,

  -- Plafond de réduction, utile pour les pourcentages : « -20 %, au maximum
  -- 5 000 FCFA ». Sans plafond, une remise en pourcentage sur un gros panier
  -- peut coûter beaucoup plus que prévu.
  max_discount_amount NUMERIC(12,2),

  -- Montant minimum d'achat (hors livraison) pour que le code s'applique.
  min_purchase_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Fenêtre de validité. NULL = pas de borne de ce côté.
  starts_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,

  -- Deux limites indépendantes, toutes deux facultatives (NULL = illimité) :
  --   max_uses          : nombre total d'utilisations, tous clients confondus
  --   max_uses_per_user : nombre d'utilisations par client
  -- Un code de lancement à 100 usages n'a pas les mêmes règles qu'un code de
  -- bienvenue utilisable une seule fois par personne.
  max_uses            INTEGER,
  max_uses_per_user   INTEGER,

  -- Dénormalisation assumée : le compte se déduirait de promo_code_usages,
  -- mais la validation d'un code doit être rapide et se fait à chaque frappe
  -- du client. Mis à jour dans la même transaction que la commande.
  used_count          INTEGER      NOT NULL DEFAULT 0,

  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT promo_codes_type_check
    CHECK (discount_type IN ('percentage','fixed')),
  CONSTRAINT promo_codes_value_check
    CHECK (discount_value > 0),
  -- Un pourcentage au-delà de 100 n'a pas de sens ; la base refuse la saisie
  -- plutôt que de compter sur le panel admin pour l'empêcher.
  CONSTRAINT promo_codes_percentage_check
    CHECK (discount_type <> 'percentage' OR discount_value <= 100),
  CONSTRAINT promo_codes_dates_check
    CHECK (starts_at IS NULL OR expires_at IS NULL OR expires_at > starts_at),
  CONSTRAINT promo_codes_min_purchase_check
    CHECK (min_purchase_amount >= 0),
  CONSTRAINT promo_codes_max_uses_check
    CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT promo_codes_max_uses_per_user_check
    CHECK (max_uses_per_user IS NULL OR max_uses_per_user > 0)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code      ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);

DROP TRIGGER IF EXISTS trigger_promo_codes_updated_at ON promo_codes;
CREATE TRIGGER trigger_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------------------------------------
-- Journal des utilisations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_code_usages (
  id              SERIAL PRIMARY KEY,
  promo_code_id   INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,

  -- Si la commande est supprimée, l'utilisation reste tracée (order_id à NULL)
  -- plutôt que de disparaître : on veut garder l'historique du code.
  order_id        INTEGER REFERENCES orders(id) ON DELETE SET NULL,

  -- Montant réellement déduit. Recalculer à partir du code ne donnerait pas le
  -- même résultat si le code a été modifié depuis.
  discount_amount NUMERIC(12,2) NOT NULL,
  used_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT promo_code_usages_amount_check CHECK (discount_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_promo_usages_code_user ON promo_code_usages(promo_code_id, user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usages_order     ON promo_code_usages(order_id);


-- -----------------------------------------------------------------------------
-- Trace sur la commande
-- -----------------------------------------------------------------------------
-- Le code est recopié en clair, et non référencé par son identifiant : une
-- commande passée doit rester lisible même si le code est supprimé plus tard.
-- C'est la même logique que order_items, qui recopie déjà le nom du produit.
-- -----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code      VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_amount_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_discount_amount_check
      CHECK (discount_amount >= 0);
  END IF;
END $$;


-- =============================================================================
-- Codes de démonstration
-- =============================================================================
-- Ils couvrent chaque règle de validation, y compris celles qui doivent
-- ÉCHOUER : un code expiré ou épuisé doit être refusé proprement, avec un
-- message compréhensible. C'est aussi difficile à obtenir qu'un code valide.
-- =============================================================================
INSERT INTO promo_codes
  (code, description, discount_type, discount_value, max_discount_amount,
   min_purchase_amount, starts_at, expires_at, max_uses, max_uses_per_user, is_active)
VALUES
  -- Cas nominaux
  ('BIENVENUE10', 'Bienvenue : -10 % sur la première commande, une fois par client',
   'percentage', 10, 5000, 0, NULL, NOW() + INTERVAL '90 days', NULL, 1, TRUE),

  ('ARTIVA5000', 'Remise fixe de 5 000 FCFA dès 40 000 FCFA d''achat',
   'fixed', 5000, NULL, 40000, NULL, NOW() + INTERVAL '60 days', NULL, NULL, TRUE),

  ('NOEL25', 'Opération fin d''année : -25 %, plafonnée à 10 000 FCFA',
   'percentage', 25, 10000, 20000, NULL, NOW() + INTERVAL '30 days', 100, 2, TRUE),

  -- Cas qui doivent être REFUSÉS, chacun pour une raison différente
  ('EXPIRE2025', 'Expiré depuis longtemps — doit être refusé',
   'percentage', 20, NULL, 0, NOW() - INTERVAL '400 days', NOW() - INTERVAL '300 days', NULL, NULL, TRUE),

  ('BIENTOT', 'Pas encore commencé — doit être refusé jusqu''à sa date de début',
   'fixed', 3000, NULL, 0, NOW() + INTERVAL '30 days', NOW() + INTERVAL '60 days', NULL, NULL, TRUE),

  ('DESACTIVE', 'Désactivé par l''administrateur — doit être refusé',
   'fixed', 2000, NULL, 0, NULL, NULL, NULL, NULL, FALSE),

  ('GROSPANIER', 'Exige 100 000 FCFA d''achat — refusé sous ce montant',
   'fixed', 15000, NULL, 100000, NULL, NOW() + INTERVAL '60 days', NULL, NULL, TRUE),

  ('QUOTAPLEIN', 'Quota déjà atteint — doit être refusé',
   'fixed', 1000, NULL, 0, NULL, NOW() + INTERVAL '60 days', 5, NULL, TRUE),

  -- Réduction volontairement énorme : vérifie que le total ne devient jamais
  -- négatif et que la remise est ramenée au montant du panier.
  ('MEGA50000', 'Remise de 50 000 FCFA — teste le plafonnement au sous-total',
   'fixed', 50000, NULL, 0, NULL, NOW() + INTERVAL '60 days', NULL, NULL, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Quota de QUOTAPLEIN porté à son maximum, pour qu'il soit effectivement épuisé.
UPDATE promo_codes SET used_count = max_uses
WHERE code = 'QUOTAPLEIN' AND used_count < max_uses;
