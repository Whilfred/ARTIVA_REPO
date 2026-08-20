-- =============================================================================
-- 04 — Jeu de données de DÉMONSTRATION (développement local uniquement)
-- =============================================================================
-- Ne jamais exécuter ce fichier sur la base de production : il crée des comptes
-- avec des mots de passe connus.
--
--   Admin  (panel web) : admin@artiva.local  / admin123
--   Client (app mobile): client@artiva.local / client123
--
-- Les hachages ci-dessous sont des bcrypt (10 tours) de ces mots de passe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Comptes
-- -----------------------------------------------------------------------------
INSERT INTO admin (email, password_hash, role) VALUES
  ('admin@artiva.local', '$2b$10$8/a0rBumOUKJg5NuXAsDt.0D7skLtmV0YOgLvtSFEsaqQuvhYz.76', 'super_admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, address, phone, role, is_email_verified) VALUES
  ('Client Test', 'client@artiva.local', '$2b$10$i0ADwcfuAAnHhNlKCkDvIu0vQohIIcaV47Re2rYsqKH77KOmS2.qm',
   '12 rue des Artisans, Cotonou', '+22990000000', 'customer', TRUE)
ON CONFLICT (email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Catégories racines
-- -----------------------------------------------------------------------------
INSERT INTO categories (name, description, slug, image_url, display_order) VALUES
  ('Décoration',   'Objets de décoration artisanaux pour la maison', 'decoration',   'https://picsum.photos/seed/artiva-deco/400/400',   1),
  ('Mode',         'Vêtements et accessoires faits main',            'mode',         'https://picsum.photos/seed/artiva-mode/400/400',   2),
  ('Bijoux',       'Bijoux artisanaux et pièces uniques',            'bijoux',       'https://picsum.photos/seed/artiva-bijoux/400/400', 3),
  ('Maroquinerie', 'Sacs, ceintures et articles en cuir',            'maroquinerie', 'https://picsum.photos/seed/artiva-cuir/400/400',   4),
  ('Art de la table', 'Vaisselle et ustensiles artisanaux',          'art-table',    'https://picsum.photos/seed/artiva-table/400/400',  5)
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Sous-catégories (l'écran Boutique affiche les racines à gauche, les
-- sous-catégories à droite : il en faut donc au moins quelques-unes)
-- -----------------------------------------------------------------------------
INSERT INTO categories (name, description, slug, parent_id, display_order) VALUES
  ('Vases',       'Vases en terre cuite et céramique', 'vases',       (SELECT id FROM categories WHERE slug='decoration'),   1),
  ('Tableaux',    'Toiles et peintures originales',    'tableaux',    (SELECT id FROM categories WHERE slug='decoration'),   2),
  ('Pagnes',      'Tissus et pagnes traditionnels',    'pagnes',      (SELECT id FROM categories WHERE slug='mode'),         1),
  ('Chemises',    'Chemises en tissu wax',             'chemises',    (SELECT id FROM categories WHERE slug='mode'),         2),
  ('Colliers',    'Colliers artisanaux',               'colliers',    (SELECT id FROM categories WHERE slug='bijoux'),       1),
  ('Bracelets',   'Bracelets en perles et cuir',       'bracelets',   (SELECT id FROM categories WHERE slug='bijoux'),       2),
  ('Sacs',        'Sacs en cuir véritable',            'sacs',        (SELECT id FROM categories WHERE slug='maroquinerie'), 1)
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Tags — les noms doivent correspondre EXACTEMENT à FEATURED_TAG_NAMES
-- dans front_end/app/(tabs)/index.tsx, sinon la page d'accueil reste vide.
-- -----------------------------------------------------------------------------
INSERT INTO product_tags (name) VALUES
  ('Nouveauté'), ('Populaire'), ('Pour Vous'), ('Meilleures Ventes'), ('Promotion')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Produits
-- -----------------------------------------------------------------------------
INSERT INTO products (name, description, price, stock, sku, image_url, is_published) VALUES
  ('Vase en terre cuite',        'Vase façonné à la main, finition mate. Pièce unique.',            15000.00, 12, 'ART-VAS-001', 'https://picsum.photos/seed/artiva-p1/600/600', TRUE),
  ('Panier tressé raphia',       'Panier tressé en raphia naturel, idéal rangement ou marché.',      8500.00, 30, 'ART-PAN-002', 'https://picsum.photos/seed/artiva-p2/600/600', TRUE),
  ('Tableau « Marché »',         'Toile acrylique 60x40 cm signée par l''artiste.',                 45000.00,  3, 'ART-TAB-003', 'https://picsum.photos/seed/artiva-p3/600/600', TRUE),
  ('Chemise wax homme',          'Chemise coupe droite en tissu wax, 100% coton.',                  22000.00, 18, 'ART-CHE-004', 'https://picsum.photos/seed/artiva-p4/600/600', TRUE),
  ('Pagne tissé traditionnel',   'Pagne tissé main, 2 mètres, motifs traditionnels.',               30000.00, 10, 'ART-PAG-005', 'https://picsum.photos/seed/artiva-p5/600/600', TRUE),
  ('Collier perles de verre',    'Collier en perles de verre recyclé, fermoir ajustable.',          12000.00, 25, 'ART-COL-006', 'https://picsum.photos/seed/artiva-p6/600/600', TRUE),
  ('Bracelet cuir tressé',       'Bracelet en cuir véritable tressé à la main.',                     6500.00, 40, 'ART-BRA-007', 'https://picsum.photos/seed/artiva-p7/600/600', TRUE),
  ('Sac à main cuir',            'Sac en cuir pleine fleur, doublure coton, bandoulière amovible.', 55000.00,  6, 'ART-SAC-008', 'https://picsum.photos/seed/artiva-p8/600/600', TRUE),
  ('Set de 4 bols en bois',      'Bols tournés dans du bois d''iroko, traités alimentaire.',        18000.00, 15, 'ART-BOL-009', 'https://picsum.photos/seed/artiva-p9/600/600', TRUE),
  ('Plateau de service sculpté', 'Plateau en bois sculpté, motifs géométriques.',                   14000.00, 20, 'ART-PLA-010', 'https://picsum.photos/seed/artiva-p10/600/600', TRUE),
  ('Lampe en bambou',            'Lampe de chevet en bambou tressé, douille E27.',                  27000.00,  8, 'ART-LAM-011', 'https://picsum.photos/seed/artiva-p11/600/600', TRUE),
  ('Coussin brodé main',         'Housse de coussin 45x45 cm brodée à la main.',                     9500.00, 22, 'ART-COU-012', 'https://picsum.photos/seed/artiva-p12/600/600', TRUE),
  ('Statuette en ébène',         'Statuette sculptée dans l''ébène massif, 25 cm.',                 65000.00,  4, 'ART-STA-013', 'https://picsum.photos/seed/artiva-p13/600/600', TRUE),
  ('Boucles d''oreilles bronze', 'Boucles d''oreilles coulées en bronze, finition polie.',           11000.00, 28, 'ART-BOU-014', 'https://picsum.photos/seed/artiva-p14/600/600', TRUE),
  ('Ceinture cuir gravée',       'Ceinture en cuir gravée main, boucle laiton.',                    19000.00, 14, 'ART-CEI-015', 'https://picsum.photos/seed/artiva-p15/600/600', TRUE),
  ('Brouillon non publié',       'Produit masqué : sert à vérifier le filtre publié/masqué.',        1000.00,  0, 'ART-DRA-016', NULL, FALSE)
ON CONFLICT (sku) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Galerie d'images (2 à 3 images par produit publié, pour tester le carrousel)
-- -----------------------------------------------------------------------------
INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
SELECT p.id, p.image_url, p.name, TRUE, 0
FROM products p
WHERE p.image_url IS NOT NULL;

INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
SELECT p.id, 'https://picsum.photos/seed/' || p.sku || '-b/600/600', p.name || ' (vue 2)', FALSE, 1
FROM products p
WHERE p.image_url IS NOT NULL;

INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
SELECT p.id, 'https://picsum.photos/seed/' || p.sku || '-c/600/600', p.name || ' (vue 3)', FALSE, 2
FROM products p
WHERE p.image_url IS NOT NULL AND p.stock > 10;

-- -----------------------------------------------------------------------------
-- Rattachement produits <-> catégories
-- -----------------------------------------------------------------------------
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id FROM products p, categories c WHERE (p.sku, c.slug) IN (
  ('ART-VAS-001','decoration'), ('ART-VAS-001','vases'),
  ('ART-PAN-002','decoration'),
  ('ART-TAB-003','decoration'), ('ART-TAB-003','tableaux'),
  ('ART-CHE-004','mode'),       ('ART-CHE-004','chemises'),
  ('ART-PAG-005','mode'),       ('ART-PAG-005','pagnes'),
  ('ART-COL-006','bijoux'),     ('ART-COL-006','colliers'),
  ('ART-BRA-007','bijoux'),     ('ART-BRA-007','bracelets'),
  ('ART-SAC-008','maroquinerie'), ('ART-SAC-008','sacs'),
  ('ART-BOL-009','art-table'),
  ('ART-PLA-010','art-table'),
  ('ART-LAM-011','decoration'),
  ('ART-COU-012','decoration'),
  ('ART-STA-013','decoration'),
  ('ART-BOU-014','bijoux'),
  ('ART-CEI-015','maroquinerie')
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Rattachement produits <-> tags (alimente les carrousels de la page d'accueil)
-- -----------------------------------------------------------------------------
INSERT INTO product_tag_assignments (product_id, tag_id)
SELECT p.id, t.id FROM products p, product_tags t WHERE (p.sku, t.name) IN (
  ('ART-VAS-001','Nouveauté'),        ('ART-PAN-002','Nouveauté'),        ('ART-LAM-011','Nouveauté'),
  ('ART-COU-012','Nouveauté'),        ('ART-BOU-014','Nouveauté'),
  ('ART-TAB-003','Populaire'),        ('ART-COL-006','Populaire'),        ('ART-SAC-008','Populaire'),
  ('ART-STA-013','Populaire'),        ('ART-CHE-004','Populaire'),
  ('ART-BRA-007','Pour Vous'),        ('ART-BOL-009','Pour Vous'),        ('ART-PLA-010','Pour Vous'),
  ('ART-PAG-005','Pour Vous'),        ('ART-CEI-015','Pour Vous'),
  ('ART-SAC-008','Meilleures Ventes'),('ART-BRA-007','Meilleures Ventes'),('ART-VAS-001','Meilleures Ventes'),
  ('ART-COL-006','Meilleures Ventes'),('ART-BOL-009','Meilleures Ventes'),
  ('ART-CHE-004','Promotion'),        ('ART-COU-012','Promotion'),        ('ART-PLA-010','Promotion'),
  ('ART-LAM-011','Promotion'),        ('ART-CEI-015','Promotion')
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Quelques avis, pour que la fiche produit ne soit pas vide
-- -----------------------------------------------------------------------------
INSERT INTO avis (user_id, product_id, etoiles, commentaire)
SELECT u.id, p.id, v.note, v.texte
FROM users u, products p, (VALUES
  ('ART-VAS-001', 5, 'Superbe pièce, encore plus belle en vrai.'),
  ('ART-SAC-008', 4, 'Très bon cuir, livraison un peu lente.'),
  ('ART-COL-006', 5, 'Je le porte tous les jours, il ne bouge pas.')
) AS v(sku, note, texte)
WHERE u.email = 'client@artiva.local' AND p.sku = v.sku;

-- -----------------------------------------------------------------------------
-- Une notification de bienvenue pour le client de test
-- -----------------------------------------------------------------------------
INSERT INTO notifications (user_id, type, title, message)
SELECT id, 'system', 'Bienvenue sur Artiva', 'Votre compte de démonstration est prêt. Bonne visite !'
FROM users WHERE email = 'client@artiva.local';
