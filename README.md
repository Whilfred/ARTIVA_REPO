
## Technologies Utilisées

*   **Frontend Mobile (`front_end`)**:
    *   React Native
    *   Expo (avec Expo Router pour la navigation)
    *   TypeScript
    *   React Context API (pour la gestion d'état globale comme l'authentification, le panier, la wishlist)
    *   Axios ou Fetch API (pour les appels HTTP)
    *   Expo Secure Store (pour le stockage sécurisé du token)
    *   AsyncStorage (pour la persistance simple du panier/wishlist en mode déconnecté)

*   **Backend (`back_end`)**:
    *   Node.js
    *   Express.js
    *   PostgreSQL (avec la librairie `pg`)
    *   JWT (JSON Web Tokens) pour l'authentification
    *   bcryptjs pour le hachage des mots de passe
    *   dotenv pour la gestion des variables d'environnement
    *   CORS

*   **Panel Admin (`admin_panel`)**:
    *   React
    *   React Router DOM pour la navigation
    *   Axios ou Fetch API pour les appels HTTP
    *   CSS (ou un framework/librairie CSS comme Tailwind CSS, Material-UI - à décider)

## Fonctionnalités Implémentées (à date)

### Backend API
*   **Authentification :**
    *   Inscription des clients et des administrateurs (tables séparées).
    *   Connexion unifiée pour clients et admins, retournant un token JWT et le rôle.
*   **Utilisateurs (gestion Admin) :** CRUD complet pour les utilisateurs clients.
*   **Catégories (gestion Admin & lecture Publique) :** CRUD complet.
*   **Tags de Produits (gestion Admin & lecture Publique) :** CRUD complet.
*   **Produits (gestion Admin & lecture Publique) :**
    *   CRUD complet.
    *   Liaison aux catégories et aux tags lors de la création/modification.
    *   API de listage avec filtres (catégorie, tag, recherche), pagination, et tri aléatoire.
    *   API de détail produit incluant les images, catégories et tags associés.
*   **Liste de Souhaits (Wishlist) :**
    *   Ajout, suppression, et récupération de la wishlist pour un utilisateur connecté.
*   **Commandes :**
    *   Création de commande pour un client authentifié (avec gestion de stock).
    *   Listage des commandes pour l'admin (avec filtres et pagination).
    *   Récupération des détails d'une commande pour l'admin.
    *   Mise à jour du statut d'une commande par l'admin (avec envoi de notification à l'utilisateur).
    *   Listage des commandes pour l'utilisateur client connecté.
*   **Sécurité :**
    *   Middleware pour vérifier le token JWT.
    *   Middleware pour vérifier le rôle administrateur.

### Frontend Mobile (Expo)
*   **Navigation :**
    *   Layout racine avec gestion de l'état d'authentification (redirection auto login/accueil).
    *   Navigation par onglets en bas : Accueil, Boutique, Liste de Souhaits, Panier, Profil.
*   **Authentification :**
    *   Écrans de Connexion et d'Inscription client fonctionnels, connectés aux API backend.
    *   Persistance de la session utilisateur avec `AuthContext` et `expo-secure-store`.
*   **Page d'Accueil :**
    *   Affiche les catégories principales (scroll horizontal).
    *   Affiche des sections de produits par tag (ex: "Nouveauté", "Populaire") avec scroll horizontal, alimentées par l'API.
*   **Page Boutique :**
    *   Layout à deux volets : catégories principales à gauche, sous-catégories/produits à droite.
    *   Filtrage des produits par catégorie/sous-catégorie.
    *   Barre de recherche pour filtrer les produits.
*   **Page Détail Produit :**
    *   Affichage des informations du produit.
    *   Carrousel d'images pour les produits ayant plusieurs images.
    *   Sélecteur de quantité.
    *   Bouton "Ajouter au Panier" (devient sélecteur de quantité si déjà au panier).
*   **Panier :**
    *   Affichage des articles, modification des quantités, suppression d'articles.
    *   Calcul du total.
    *   Bouton "Valider la commande" (prépare la navigation vers le checkout).
    *   Persistance locale simple avec `CartContext` et `AsyncStorage`.
    *   En-tête personnalisé.
*   **Liste de Souhaits :**
    *   Onglet et écran dédiés.
    *   Logique d'ajout/retrait depuis les cartes produits et la page de détail.
    *   Synchronisation avec le backend pour les utilisateurs connectés.
*   **Profil Utilisateur :**
    *   Affiche les informations de base de l'utilisateur.
    *   Bouton de déconnexion fonctionnel.
    *   Logique pour afficher l'historique des commandes (API backend prête).

### Panel Admin (Web React)
*   **Layout de base :** Sidebar de navigation et zone de contenu principale.
*   **Authentification :** Page de connexion admin fonctionnelle, stockage du token dans `localStorage`. Routes protégées.
*   **Gestion des Produits :**
    *   Page listant tous les produits (publiés ou non) avec recherche.
    *   Formulaire d'ajout/modification de produit dans un modal, permettant de définir nom, description, prix, stock, SKU, statut de publication, image principale, galerie d'images, catégories et tags.
    *   Changement rapide du statut publié/masqué depuis la liste.
*   **Gestion des Catégories :** CRUD complet via une page dédiée et un modal de formulaire.
*   **Gestion des Tags de Produits :** CRUD complet via une page dédiée et un modal de formulaire.
*   **Gestion des Utilisateurs :** Listage des utilisateurs clients, modification (rôle, etc.) via modal, suppression.
*   **Gestion des Commandes :**
    *   Listage de toutes les commandes avec filtres (statut, utilisateur, date).
    *   Changement de statut d'une commande en ligne.
    *   Affichage des détails d'une commande (y compris les articles) dans un modal.
    *   Bouton "Imprimer Facture" (placeholder).
*   **Rapports & Finance :** Page placeholder.

## Installation et Lancement (Instructions de base)

### Prérequis
*   Node.js (v18+ recommandé)
*   npm ou yarn
*   PostgreSQL
*   Expo CLI (pour le frontend mobile)
*   Un navigateur web (pour le panel admin)
*   Un appareil mobile ou émulateur (pour l'application Expo)

### Backend
1.  Naviguer vers le dossier `back_end`.
2.  Installer les dépendances : `npm install`
3.  Créer un fichier `.env` basé sur `.env.example` (si fourni) et configurer les variables (BDD, JWT_SECRET).
4.  S'assurer que PostgreSQL est lancé et que la base de données et les tables sont créées (exécuter les scripts SQL fournis).
5.  Lancer le serveur : `npm run dev` (tournera sur `http://192.168.11.103:3001` par défaut).

### Frontend Mobile (Expo)
1.  Naviguer vers le dossier `front_end`.
2.  Installer les dépendances : `npm install` (ou `yarn install`)
3.  Mettre à jour la variable `API_BASE_URL` dans les fichiers concernés (ex: `index.tsx`, `ShopScreen.tsx`, `product/[id].tsx`, `context/CartContext.tsx`, `context/WishlistContext.tsx`) avec votre adresse IP locale si vous testez sur un appareil physique.
4.  Lancer le serveur de développement : `npx expo start`
5.  Scanner le QR code avec l'application Expo Go sur votre appareil mobile.

### Panel Admin (Web React)
1.  Naviguer vers le dossier `admin_panel`.
2.  Installer les dépendances : `npm install`
3.  Mettre à jour la variable `API_BASE_URL` dans les fichiers de page (ex: `LoginPage.js`, `ProductManagementPage.js`, etc.).
4.  Lancer le serveur de développement : `npm start` (tournera sur `http://192.168.11.103:3001` par défaut).
5.  Ouvrir un navigateur à cette adresse.

## Prochaines Étapes Prévues (non exhaustif)
*   Finalisation de l'UI/UX pour l'application mobile et le panel admin.
*   Implémentation complète du processus de checkout (adresses, méthodes de paiement réelles).
*   Synchronisation du panier et de la wishlist avec le backend pour les utilisateurs connectés.
*   Gestion des images (upload serveur au lieu d'URLs externes).
*   Fonctionnalités de recherche avancée.
*   Système d'avis et de notation des produits.
*   Notifications push.
*   Tests (unitaires, intégration, e2e).
*   Déploiement.

---
