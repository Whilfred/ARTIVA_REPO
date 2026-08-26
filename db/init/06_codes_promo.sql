-- =============================================================================
-- 06 — Codes promotionnels : données de démonstration
-- =============================================================================
-- Les tables (promo_codes, promo_code_usages) sont définies dans artiva.sql,
-- avec le reste du schéma. Ce fichier ne contient que des codes d'exemple, qui
-- n'ont pas leur place dans une base de production.
--
-- Ils couvrent chaque règle de validation, y compris celles qui doivent
-- ÉCHOUER : un code expiré ou épuisé doit être refusé proprement, avec un
-- message compréhensible. C'est aussi difficile à obtenir qu'un code valide.
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
