CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Ajouter les colonnes pour Google Auth
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS picture TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Créer un index sur google_id pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Créer un index sur email (déjà existant avec UNIQUE, mais au cas où)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users 
ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE users ALTER COLUMN google_id TYPE TEXT;

-- Création de la table login_codes
CREATE TABLE IF NOT EXISTS login_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE
);

-- Index primaire (créé automatiquement avec SERIAL PRIMARY KEY)
-- Foreign key user_id vers users(id) avec cascade delete déjà inclus

-- Et n'oublie pas le trigger si tu l'as créé :
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE admin (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =============================================================================
-- FICHIER DE MIGRATION POUR LA BASE DE DONNÉES ARTIVA
-- ATTENTION: Ce script supprime et recrée plusieurs tables.
-- FAITES UNE SAUVEGARDE DE VOTRE BASE DE DONNÉES AVANT EXÉCUTION
-- si elle contient des données importantes dans les tables concernées.
-- Les tables 'users' et 'admin' NE SONT PAS modifiées par ce script.
-- =============================================================================

-- =============================================================================
-- Fonction Trigger pour mettre à jour automatiquement 'updated_at'
-- À créer une seule fois dans la base de données.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Suppression des tables existantes (DANS LE BON ORDRE POUR LES CLÉS ÉTRANGÈRES)
-- Les tables 'users' et 'admin' sont conservées.
-- =============================================================================

-- Tables de liaison et tables dépendantes en premier
DROP TABLE IF EXISTS product_tag_assignments CASCADE;
DROP TABLE IF EXISTS product_tags CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE; -- Si elle dépend de 'users' et que 'users' n'est pas supprimée, OK
DROP TABLE IF EXISTS addresses CASCADE;   -- Si elle dépend de 'users' et que 'users' n'est pas supprimée, OK

-- Tables principales après les tables dépendantes
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;


-- =============================================================================
-- Recréation des tables avec la structure améliorée
-- (Les tables 'users' et 'admin' sont supposées exister avec leur structure actuelle)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: categories
-- Stocke les différentes catégories de produits.
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,                          -- Identifiant unique de la catégorie
    name VARCHAR(100) UNIQUE NOT NULL,              -- Nom de la catégorie (ex: "Électronique")
    description TEXT,                               -- Description détaillée de la catégorie (optionnel)
    image_url TEXT,                                 -- URL d'une image pour la catégorie (optionnel)
    slug VARCHAR(120) UNIQUE,                       -- Version du nom optimisée pour les URL (ex: "electronique")
    parent_id INTEGER REFERENCES categories(id)     -- ID de la catégorie parente pour créer une hiérarchie
        ON DELETE SET NULL,                         -- Si la parente est supprimée, cette catégorie devient de niveau racine
    display_order INTEGER DEFAULT 0,                -- Ordre d'affichage des catégories
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Date de création
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  -- Date de dernière mise à jour
);


COMMENT ON TABLE categories IS 'Stocke les catégories de produits, avec support pour la hiérarchie.';
COMMENT ON COLUMN categories.name IS 'Nom unique et visible de la catégorie.';
COMMENT ON COLUMN categories.slug IS 'Identifiant textuel unique pour les URL (SEO-friendly).';
COMMENT ON COLUMN categories.parent_id IS 'Référence à une autre catégorie pour les sous-catégories.';

CREATE TRIGGER trigger_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: products
-- Stocke les informations sur les produits en vente.
-- -----------------------------------------------------------------------------
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                     -- Nom du produit
    description TEXT,                               -- Description détaillée du produit
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0), -- Prix du produit, doit être positif ou nul
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), -- Quantité en stock, positive ou nulle
    sku VARCHAR(100) UNIQUE,   
    image_url TEXT,                      -- Stock Keeping Unit (identifiant unique interne)
    is_published BOOLEAN DEFAULT FALSE NOT NULL,    -- Indique si le produit est visible par les clients
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- Le champ 'image_url' de ta structure initiale pour une image principale simple
    -- a été omis ici en faveur de la table 'product_images' pour plus de flexibilité.
    -- Si tu veux garder une image principale simple ici, rajoute:
    -- main_image_url TEXT,
);

COMMENT ON TABLE products IS 'Informations détaillées sur chaque produit offert.';
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit, référence unique pour la gestion dinventaire.';
COMMENT ON COLUMN products.is_published IS 'Contrôle la visibilité du produit sur le site client.';

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: product_images
-- Permet d'associer plusieurs images à un produit.
-- -----------------------------------------------------------------------------
CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, -- Clé étrangère vers le produit
    image_url TEXT NOT NULL,                        -- URL de l'image
    alt_text VARCHAR(255),                          -- Texte alternatif pour l'image (accessibilité/SEO)
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,      -- Indique si c'est l'image principale à afficher par défaut
    display_order INTEGER DEFAULT 0 NOT NULL        -- Ordre d'affichage des images pour un produit
);

COMMENT ON TABLE product_images IS 'Stocke les URLs des images associées aux produits, avec des métadonnées.';
COMMENT ON COLUMN product_images.is_primary IS 'Marque une image comme étant la principale pour un produit.'; 

-- -----------------------------------------------------------------------------
-- Table: product_categories
-- Table de liaison pour la relation Many-to-Many entre produits et catégories.
-- -----------------------------------------------------------------------------
CREATE TABLE product_categories (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)           -- Un produit ne peut être qu'une fois dans une catégorie donnée
);

COMMENT ON TABLE product_categories IS 'Associe les produits à une ou plusieurs catégories.';

-- -----------------------------------------------------------------------------
-- Table: product_tags (Pour les badges comme "nouveau", "pour vous")
-- -----------------------------------------------------------------------------
CREATE TABLE product_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL -- Nom du tag (ex: 'nouveau', 'pour_vous', 'en_promotion')
);

COMMENT ON TABLE product_tags IS 'Définit les tags/badges applicables aux produits (ex: Nouveau, Populaire).';

ALTER TABLE product_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE product_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE TRIGGER trigger_product_tags_updated_at BEFORE UPDATE ON product_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- -----------------------------------------------------------------------------
-- Table: product_tag_assignments (Liaison Many-to-Many produits et tags)
-- -----------------------------------------------------------------------------
CREATE TABLE product_tag_assignments (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

COMMENT ON TABLE product_tag_assignments IS 'Associe les produits à un ou plusieurs tags.';

-- -----------------------------------------------------------------------------
-- Table: carts
-- Stocke les paniers d'achat, qu'ils soient pour des utilisateurs connectés ou invités.
-- -----------------------------------------------------------------------------
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Optionnel, pour les utilisateurs connectés
    guest_token TEXT UNIQUE,                        -- Optionnel, pour les utilisateurs invités (doit être unique si présent)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Un panier doit être soit pour un utilisateur, soit pour un invité (identifié par guest_token)
    CONSTRAINT user_or_guest_cart_check CHECK (
        (user_id IS NOT NULL AND guest_token IS NULL) OR
        (user_id IS NULL AND guest_token IS NOT NULL) OR
        (user_id IS NULL AND guest_token IS NULL) -- Permet un panier "anonyme" temporaire si besoin avant affectation
    )
);

COMMENT ON TABLE carts IS 'Représente les paniers d''achat des utilisateurs (connectés ou invités).';
COMMENT ON COLUMN carts.guest_token IS 'Identifiant unique pour un panier d''invité (non authentifié).';

CREATE TRIGGER trigger_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: cart_items
-- Stocke les articles (produits et quantités) présents dans un panier.
-- -----------------------------------------------------------------------------
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0), -- La quantité doit être au moins 1
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cart_id, product_id) -- Un produit ne peut être ajouté qu'une fois par panier (sa quantité est mise à jour)
);

COMMENT ON TABLE cart_items IS 'Détaille les produits et leurs quantités dans chaque panier.';

-- -----------------------------------------------------------------------------
-- Table: orders
-- Enregistre les commandes finalisées par les utilisateurs.
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,       -- Numéro de commande unique, lisible par l'humain
    user_id INTEGER REFERENCES users(id)
        ON DELETE SET NULL,                         -- Client (si le compte utilisateur est supprimé, la commande reste mais user_id devient NULL)
    status VARCHAR(50) DEFAULT 'pending' NOT NULL
        CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed')),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0), -- Montant total de la commande
    currency VARCHAR(3) DEFAULT 'XOF' NOT NULL,     -- Devise (ex: XOF, EUR, USD)
    shipping_address JSONB NOT NULL,                -- Adresse de livraison (stockée en JSONB pour l'historique et flexibilité)
    billing_address JSONB,                          -- Adresse de facturation si différente (stockée en JSONB)
    shipping_method VARCHAR(100),                   -- Méthode de livraison (ex: "Standard", "Express")
    shipping_cost NUMERIC(10, 2) DEFAULT 0 CHECK (shipping_cost >=0), -- Coût de la livraison
    notes TEXT,                                     -- Notes additionnelles du client ou pour l'administration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE orders ALTER COLUMN currency TYPE VARCHAR(4); 

COMMENT ON TABLE orders IS 'Stocke les informations principales de chaque commande passée.';
COMMENT ON COLUMN orders.order_number IS 'Identifiant public et unique de la commande.';
COMMENT ON COLUMN orders.shipping_address IS 'Adresse de livraison au moment de la commande (format JSONB).';

CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: order_items
-- Détaille les produits spécifiques inclus dans chaque commande.
-- -----------------------------------------------------------------------------
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, -- Produit (SET NULL si le produit est supprimé de la BDD)
    product_name VARCHAR(255) NOT NULL,             -- Nom du produit au moment de la commande (pour l'historique)
    sku VARCHAR(100),                               -- SKU du produit au moment de la commande
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,             -- Prix unitaire du produit au moment de la commande
    subtotal NUMERIC(12, 2) NOT NULL                -- Calculé: quantity * unit_price (peut être redondant mais utile)
        CHECK (subtotal = quantity * unit_price)    -- Assure la cohérence si calculé
);

COMMENT ON TABLE order_items IS 'Liste des produits, quantités et prix pour chaque commande.';
COMMENT ON COLUMN order_items.product_name IS 'Nom du produit tel qu''il était au moment de la commande.';
COMMENT ON COLUMN order_items.unit_price IS 'Prix unitaire du produit au moment de la commande.';

-- -----------------------------------------------------------------------------
-- Table: payments
-- Enregistre les transactions de paiement associées aux commandes.
-- -----------------------------------------------------------------------------
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,            -- Ex: 'credit_card', 'paypal', 'stripe_intent', 'cash_on_delivery'
    transaction_id TEXT UNIQUE,                     -- ID de transaction unique de la passerelle de paiement (si applicable)
    amount NUMERIC(12, 2) NOT NULL,                 -- Montant payé
    currency VARCHAR(3) NOT NULL,                   -- Devise du paiement
    status VARCHAR(50) DEFAULT 'pending' NOT NULL
        CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'processing', 'authorized')),
    payment_gateway_response JSONB,                 -- Réponse brute de la passerelle de paiement (pour logs/debug)
    paid_at TIMESTAMP WITH TIME ZONE,               -- Date et heure du paiement effectif
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE payments ALTER COLUMN currency TYPE VARCHAR(4);
COMMENT ON TABLE payments IS 'Détails des transactions de paiement pour les commandes.';
COMMENT ON COLUMN payments.transaction_id IS 'Référence unique de la transaction fournie par la passerelle de paiement.';

CREATE TRIGGER trigger_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: notifications (Notifications pour les utilisateurs)
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,                      -- Type de notification (ex: 'order_update', 'promotion')
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,                                  -- URL optionnelle pour une action (ex: voir la commande)
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- updated_at n'est généralement pas nécessaire pour les notifications
);
ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

COMMENT ON TABLE notifications IS 'Stocke les notifications envoyées aux utilisateurs.';
COMMENT ON COLUMN notifications.link_url IS 'Lien cliquable associé à la notification (vers une page de l''app).';

CREATE TRIGGER trigger_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE wishlist_items (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id) -- Un utilisateur ne peut ajouter un produit qu'une fois à sa liste
);

COMMENT ON TABLE wishlist_items IS 'Stocke les produits ajoutés à la liste de souhaits des utilisateurs.';

-- =============================================================================
-- Ajout d'index pour améliorer les performances (exemples)
-- À ajouter après la création des tables.
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name); 
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id); 

CREATE INDEX IF NOT EXISTS idx_product_tag_assignments_tag_id ON product_tag_assignments(tag_id);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_guest_token ON carts(guest_token);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- DÉSACTIVÉ : la table `address` n'est créée nulle part (ni ici, ni dans le code
-- backend, qui n'y fait aucune référence — les adresses de commande sont
-- stockées en JSONB dans orders.shipping_address). Cette ligne faisait échouer
-- l'exécution du fichier sur une base vierge.
-- CREATE INDEX IF NOT EXISTS idx_address_user_id ON address(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- #############################################################################
-- #                                                                           #
-- #   CODES PROMOTIONNELS  ·  LIVRAISON GRATUITE  ·  ZONES DE LIVRAISON       #
-- #                                                                           #
-- #############################################################################
--
-- Ces tables étaient à l'origine dans des fichiers séparés (db/init/06 à 08),
-- exécutés après ce schéma. Elles sont reportées ici pour une raison précise :
-- db/init/ ne s'exécute QU'À la création d'une base vierge. Une installation
-- faite à partir de ce seul fichier — c'est ainsi que la production a été
-- montée — se serait retrouvée sans aucune de ces tables.
--
-- C'est exactement ce qui était arrivé à `password_reset_codes` et `avis`,
-- utilisées par le code mais jamais reportées ici, puis créées à la main en
-- production. On ne recommence pas.
--
-- Les données de démonstration, elles, restent dans db/init/ : elles n'ont
-- rien à faire dans une base de production.
-- #############################################################################

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


-- -----------------------------------------------------------------------------
-- Campagnes email
-- -----------------------------------------------------------------------------
-- Tables déduites des requêtes de back_end/controllers/campaignController.js et
-- back_end/utils/campaignScheduler.js, qui les utilisaient sans qu'elles soient
-- définies nulle part : ni ici, ni dans db/init/. La fonctionnalité ne pouvait
-- donc pas fonctionner sur une installation neuve.
--
-- Les destinataires sont figés au moment de l'ENVOI, pas à la création : une
-- campagne programmée dans trois jours doit toucher les clients tels qu'ils
-- seront alors. D'où la table de snapshot séparée.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_campaigns (
  id              SERIAL PRIMARY KEY,

  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,

  -- 'all'    : tous les comptes actifs
  -- 'manual' : une liste d'identifiants choisis à la main
  -- 'filter' : un ciblage calculé (jamais commandé, inactif depuis N jours,
  --            panier abandonné depuis N heures)
  target_type     VARCHAR(20) NOT NULL,

  -- JSONB et non TEXT : le contrôleur relit cette valeur comme un objet
  -- (filtre.never_ordered, filtre.inactive_days…). Stockée en texte, chaque
  -- clé vaudrait undefined et un ciblage filtré arroserait TOUS les clients.
  target_filter   JSONB,

  -- Tableau d'entiers et non JSONB : le contrôleur passe un tableau JavaScript
  -- en paramètre, que node-postgres sérialise en littéral de tableau Postgres.
  manual_user_ids INTEGER[],

  -- 'draft' → 'scheduled' → 'sending' → 'sent' | 'failed'
  -- Le planificateur s'appuie sur le passage 'scheduled' → 'sending' comme
  -- verrou : il évite qu'une même campagne parte deux fois.
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',

  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,

  -- Référence la table `admin`, pas `users` : le jeton d'un administrateur
  -- porte l'identifiant issu de `admin` (voir authController.js, loginAdmin).
  created_by      INTEGER REFERENCES admin(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT email_campaigns_target_check
    CHECK (target_type IN ('all', 'manual', 'filter')),
  CONSTRAINT email_campaigns_status_check
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  CONSTRAINT email_campaigns_subject_check
    CHECK (btrim(subject) <> ''),
  -- Une campagne programmée sans date ne serait jamais déclenchée : elle
  -- resterait indéfiniment en attente sans que rien ne le signale.
  CONSTRAINT email_campaigns_scheduled_check
    CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL)
);

-- Requête du planificateur, exécutée toutes les minutes : les campagnes
-- programmées dont l'heure est passée. Index partiel, car les campagnes déjà
-- envoyées n'ont aucune raison d'être parcourues.
CREATE INDEX IF NOT EXISTS idx_email_campaigns_a_envoyer
  ON email_campaigns (scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created
  ON email_campaigns (created_at DESC);

DROP TRIGGER IF EXISTS trigger_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER trigger_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------------------------------------
-- Destinataires figés d'une campagne
-- -----------------------------------------------------------------------------
-- L'email et le nom sont RECOPIÉS plutôt que lus dans `users` : on veut savoir
-- à quelle adresse le message est réellement parti, même si le client change
-- d'adresse ou supprime son compte ensuite.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id          SERIAL PRIMARY KEY,

  campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,

  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(255),

  -- La valeur par défaut est indispensable : le contrôleur insère SANS préciser
  -- le statut, puis sélectionne les lignes 'pending' pour envoyer. Sans ce
  -- défaut, la liste serait vide et aucun email ne partirait jamais.
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Message d'erreur du fournisseur, tronqué à 500 caractères par le code.
  error       TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT email_campaign_recipients_status_check
    CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campagne
  ON email_campaign_recipients (campaign_id);

-- Le passage d'envoi ne lit que les destinataires encore en attente.
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_en_attente
  ON email_campaign_recipients (campaign_id)
  WHERE status = 'pending';


-- Fin du script