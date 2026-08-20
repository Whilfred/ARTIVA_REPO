-- =============================================================================
-- 03 — Tables utilisées par le backend mais absentes d'artiva.sql
-- =============================================================================
-- Ces deux tables existent dans la base de production (créées à la main au fil
-- du développement) mais n'ont jamais été reportées dans artiva.sql. Sans elles,
-- « mot de passe oublié » et les avis produits renvoient une erreur 500.
--
--   password_reset_codes -> back_end/controllers/authController.js
--   avis                 -> back_end/routes/avis.js
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Codes de réinitialisation de mot de passe (envoyés par email, valables 1h)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_codes (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code        VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_id
    ON password_reset_codes(user_id);

COMMENT ON TABLE password_reset_codes IS 'Codes à 6 chiffres pour la réinitialisation du mot de passe.';

-- -----------------------------------------------------------------------------
-- Avis produits (note de 1 à 5 étoiles + commentaire)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS avis (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    etoiles     SMALLINT NOT NULL CHECK (etoiles BETWEEN 1 AND 5),
    commentaire TEXT DEFAULT '',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_avis_product_id ON avis(product_id);
CREATE INDEX IF NOT EXISTS idx_avis_user_id    ON avis(user_id);

CREATE TRIGGER trigger_avis_updated_at
BEFORE UPDATE ON avis
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE avis IS 'Avis et notes laissés par les clients sur les produits.';

-- =============================================================================
-- Colonnes utilisées par le backend mais absentes d'artiva.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- products.video_url — vidéo de présentation du produit.
-- Utilisée par back_end/controllers/productController.js (SELECT, INSERT et
-- UPDATE), par le lecteur vidéo de front_end/app/product/[id].tsx et par le
-- formulaire admin_panel/src/components/ProductFormModal.js.
-- Sans elle, TOUTES les routes produits renvoient une erreur 500
-- (« column p.video_url does not exist »).
-- -----------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN products.video_url IS 'URL d''une vidéo de présentation du produit (optionnel).';
