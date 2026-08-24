-- =============================================================================
-- 07 — Livraison gratuite méritée
-- =============================================================================
-- Règle : dès que les achats d'un client cumulent 100 000 FCFA sur une fenêtre
-- de 7 jours glissants, il gagne la livraison gratuite sur sa PROCHAINE
-- commande. L'avantage expire 30 jours après avoir été gagné.
--
-- Contrairement à un simple seuil par commande, l'avantage se GAGNE à un
-- moment et se CONSOMME à un autre. Il lui faut donc une existence propre en
-- base : sans cela, impossible de dire à un client pourquoi il n'a plus sa
-- livraison gratuite, ni de justifier un écart de caisse.
-- =============================================================================

CREATE TABLE IF NOT EXISTS free_shipping_rewards (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  earned_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          TIMESTAMPTZ NOT NULL,

  -- Cumul qui a déclenché l'avantage. Conservé tel quel : recalculer plus tard
  -- ne donnerait pas le même chiffre si une commande est annulée entre-temps.
  qualifying_amount   NUMERIC(12,2) NOT NULL,

  -- Commande qui a fait franchir le seuil. Utile au service client : « c'est
  -- votre commande ART-2026-0042 qui vous a ouvert ce droit ».
  triggering_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,

  -- Consommation. NULL tant que l'avantage n'a pas servi.
  used_at             TIMESTAMPTZ,
  used_order_id       INTEGER REFERENCES orders(id) ON DELETE SET NULL,

  -- Ce que la gratuité a réellement coûté : 1 500 FCFA vers Cotonou, 7 200 vers
  -- Abidjan. Le même avantage n'a pas le même prix, il faut pouvoir l'additionner.
  shipping_saved      NUMERIC(12,2),

  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT free_shipping_expiry_check
    CHECK (expires_at > earned_at),
  CONSTRAINT free_shipping_amount_check
    CHECK (qualifying_amount >= 0),
  -- used_at et used_order_id vont toujours ensemble : un avantage consommé
  -- sans commande associée serait une trace inexploitable.
  CONSTRAINT free_shipping_usage_check
    CHECK ((used_at IS NULL AND used_order_id IS NULL)
        OR (used_at IS NOT NULL AND used_order_id IS NOT NULL))
);

-- Index partiel : la question posée à chaque passage en caisse est « ce client
-- a-t-il un avantage encore disponible ? ». Seules les lignes non consommées
-- sont concernées, inutile d'indexer les autres.
CREATE INDEX IF NOT EXISTS idx_free_shipping_disponible
  ON free_shipping_rewards(user_id, expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_free_shipping_user ON free_shipping_rewards(user_id);


-- -----------------------------------------------------------------------------
-- Traces sur la commande
-- -----------------------------------------------------------------------------

-- Une commande déjà comptée dans un avantage acquis ne doit plus jamais l'être.
-- Sans cela, un client ayant atteint 100 000 FCFA gagnerait un nouvel avantage
-- à CHAQUE commande suivante tant que la fenêtre de 7 jours reste au-dessus du
-- seuil. Le compteur repart donc de zéro à chaque gain.
--
-- On stocke l'identifiant de l'avantage plutôt qu'un simple booléen : cela
-- répond en plus à « sur quelles commandes ce droit a-t-il été ouvert ? »,
-- indispensable pour révoquer un avantage dont une commande a été annulée.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS counted_in_reward_id INTEGER
  REFERENCES free_shipping_rewards(id) ON DELETE SET NULL;

-- La commande a-t-elle bénéficié de la gratuité ? shipping_cost vaut 0 dans ce
-- cas, ce qui ne permet pas de distinguer « livraison offerte » de « retrait
-- sur place » ou d'une erreur de saisie.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_shipping_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- La question posée à chaque commande est « qu'a dépensé ce client, hors
-- montants déjà récompensés, depuis N jours ? ». L'index ne porte donc que sur
-- les commandes encore comptabilisables.
CREATE INDEX IF NOT EXISTS idx_orders_non_comptees
  ON orders(user_id, created_at)
  WHERE counted_in_reward_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_reward ON orders(counted_in_reward_id);


-- =============================================================================
-- Paramètres modifiables depuis le panel d'administration
-- =============================================================================
-- Le seuil, la fenêtre et la durée de validité sont des décisions commerciales,
-- pas des constantes techniques : elles doivent pouvoir changer sans nouvelle
-- version de l'application. Une opération de fin d'année peut vouloir descendre
-- le seuil à 60 000 FCFA pendant deux semaines.
--
-- Table à ligne unique (id figé à 1) plutôt qu'un magasin clé/valeur : chaque
-- réglage garde ainsi son type et ses contraintes. Un seuil négatif ou une
-- fenêtre de zéro jour sont refusés par la base, pas seulement par le panel.
-- =============================================================================
CREATE TABLE IF NOT EXISTS free_shipping_settings (
  id               INTEGER PRIMARY KEY DEFAULT 1,

  -- Interrupteur général : coupe l'acquisition de nouveaux avantages.
  -- Les avantages déjà gagnés restent honorés, voir plus bas.
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,

  threshold_amount NUMERIC(12,2) NOT NULL DEFAULT 100000,  -- cumul à atteindre
  window_days      INTEGER       NOT NULL DEFAULT 7,       -- fenêtre glissante
  validity_days    INTEGER       NOT NULL DEFAULT 30,      -- durée de l'avantage

  updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT free_shipping_settings_singleton    CHECK (id = 1),
  CONSTRAINT free_shipping_settings_threshold    CHECK (threshold_amount > 0),
  CONSTRAINT free_shipping_settings_window       CHECK (window_days BETWEEN 1 AND 365),
  CONSTRAINT free_shipping_settings_validity     CHECK (validity_days BETWEEN 1 AND 365)
);

INSERT INTO free_shipping_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trigger_free_shipping_settings_updated_at ON free_shipping_settings;
CREATE TRIGGER trigger_free_shipping_settings_updated_at
  BEFORE UPDATE ON free_shipping_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note importante sur les changements de réglages
-- -----------------------------------------------
-- expires_at est calculé et STOCKÉ au moment du gain, il n'est jamais recalculé
-- à partir de validity_days. Raccourcir la validité de 30 à 15 jours ne
-- raccourcit donc pas les avantages déjà promis : on ne reprend pas un droit
-- déjà accordé à un client. Le nouveau réglage ne vaut que pour les gains à venir.
