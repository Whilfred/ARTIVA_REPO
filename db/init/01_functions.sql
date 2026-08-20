-- =============================================================================
-- 01 — Fonctions requises AVANT le schéma
-- =============================================================================
-- artiva.sql pose le trigger `trigger_users_updated_at` à sa ligne 45, mais ne
-- définit la fonction update_updated_at_column() qu'à sa ligne 68. Sur une base
-- vierge, le fichier échoue donc à la ligne 45. On définit la fonction ici, en
-- amont ; le CREATE OR REPLACE d'artiva.sql la réécrira à l'identique sans
-- provoquer d'erreur.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
