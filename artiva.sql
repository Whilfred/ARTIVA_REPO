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

-- Fin du script