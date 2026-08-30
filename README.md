
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
*   **Codes promotionnels :**
    *   Validation d'un code avant paiement (montant minimum, fenêtre de validité, quotas globaux et par client), avec un motif de refus explicite.
    *   Remise recalculée côté serveur au moment de la commande : le montant annoncé par l'application n'est jamais repris.
    *   Journal des utilisations : qui a utilisé quel code, sur quelle commande, pour quel montant.
    *   CRUD complet côté admin. Un code déjà utilisé est désactivé plutôt que supprimé, pour ne pas perdre l'historique.
*   **Frais et zones de livraison :**
    *   Grille tarifaire en base : zones, villes desservies, tarif, avec un tarif par défaut par pays et une zone de repli pour les destinations non reconnues.
    *   Frais recalculés par le serveur à partir de la destination réelle — envoyer `shipping_cost: 0` ne suffit plus à se faire livrer gratuitement.
    *   CRUD des zones côté admin, appliqué dès la commande suivante.
*   **Livraison gratuite méritée :**
    *   Livraison offerte au client dont les achats atteignent un seuil sur une fenêtre glissante (par défaut 100 000 FCFA sur 7 jours).
    *   L'avantage se gagne à un moment et se consomme à un autre : il est tracé, valable un temps limité, et utilisable une seule fois.
    *   Seuil, fenêtre et durée de validité réglables depuis le panel, sans nouvelle version de l'application.
*   **Programme de fidélité :**
    *   Le client gagne 1 point par FCFA de produits (hors livraison). À 30 000 points, un bon lui est attribué automatiquement à la validation de sa commande, et son solde repart de zéro.
    *   La valeur du bon est le cumul divisé par 40, borné entre 750 et 1 000 FCFA — ce qui explique la fourchette annoncée aux clients.
    *   Le bon est un code promo nominatif : il réutilise la validation des codes promo (dates, quotas, recalcul serveur de la remise). Présenté par un autre client, il est refusé avec le message d'un code inconnu, pour ne pas confirmer son existence.
    *   Une commande annulée ou remboursée reprend ses points ; le bon déjà émis reste acquis. Un journal permet de justifier tout solde ligne à ligne.
    *   Seuil, diviseur, bornes du bon et durée de validité sont réglables depuis le panel.
*   **Campagnes email :**
    *   Composition d'une campagne, ciblage (tous les clients, liste manuelle, ou filtre : jamais commandé, inactif depuis N jours, panier abandonné depuis N heures), envoi immédiat ou programmé.
    *   Un planificateur `node-cron` déclenche les campagnes arrivées à échéance. Les destinataires sont figés au moment de l'envoi, pas à la création.
*   **Sécurité :**
    *   Middleware pour vérifier le token JWT.
    *   Middleware pour vérifier le rôle administrateur.
    *   Montants sensibles (frais de livraison, remises, total) systématiquement recalculés côté serveur.

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
*   **Paiement (checkout) :**
    *   Saisie de l'adresse avec sélecteurs pays et ville alimentés par la grille de livraison du serveur.
    *   Saisie d'un code promo, avec message de refus explicite et revalidation silencieuse quand le panier change.
    *   Progression vers la livraison gratuite, et frais barrés lorsque l'avantage s'applique.
*   **Ma fidélité :**
    *   Solde de points, progression vers le prochain bon et montant estimé de celui-ci.
    *   Bons utilisables, avec leur date d'expiration et un bouton pour copier le code.
    *   Historique des points en français (gagnés, convertis, repris).
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
*   **Codes Promo :** Création, modification, activation et suppression des codes ; statut calculé (actif, expiré, à venir, épuisé) et compteur d'utilisations. Le code utilisé et la remise apparaissent dans la liste des commandes et dans leur détail.
*   **Zones de Livraison :** Gestion des zones, de leurs villes desservies et de leurs tarifs, avec tarif par défaut par pays et zone de repli.
*   **Livraison Gratuite :** Réglage du seuil, de la fenêtre glissante et de la durée de validité ; suivi des avantages gagnés et consommés.
*   **Fidélité :** Réglage du seuil, du diviseur, des bornes du bon et de sa durée de validité, avec un récapitulatif en clair de l'effet obtenu. Compteurs (points en circulation, bons émis, utilisés, expirés) et classement des clients par points.
*   **Rapports & Finance :** Page placeholder.

## Installation et Lancement

> **Pour démarrer le projet en local, suis [LANCEMENT_LOCAL.md](LANCEMENT_LOCAL.md).**
> Ce guide couvre la base de données Docker, les comptes de test, les données de
> démonstration et le dépannage.

En résumé :

```bash
docker compose up -d                      # PostgreSQL (5433) + Mailpit (8025) + Adminer (8090)
cd back_end     && npm install && npm run dev   # API         -> http://localhost:3001
cd admin_panel  && npm install && npm start     # Panel admin -> http://localhost:3000
cd front_end    && npm install && npx expo start # App mobile -> QR code Expo Go
```

Prérequis : Node.js 18+, npm, Docker (avec le plugin `compose`), et l'app
Expo Go sur un téléphone (ou un émulateur Android).

Comptes de démonstration : `admin@artiva.local` / `admin123` pour le panel,
`client@artiva.local` / `client123` pour l'app mobile.

### Base de données

`artiva.sql` contient **l'intégralité du schéma** — c'est le seul fichier à
exécuter pour monter une base à partir de rien, production comprise. Les tables
des codes promo, des zones de livraison et de la livraison gratuite y figurent,
avec la grille tarifaire et les réglages par défaut sans lesquels aucune
commande ne peut aboutir.

Les fichiers de `db/init/` ne portent que le complément : la fonction utilisée
par les triggers (`01`), deux tables historiquement absentes du schéma (`03`),
et des **données de démonstration** (`04`, `06`) qui n'ont pas leur place en
production. Ils ne s'exécutent qu'à la création d'une base vierge, jamais sur
une base existante.

En local, aucun email ne part vers l'extérieur : ils sont tous capturés par
**Mailpit**, consultable sur **http://localhost:8025**. C'est là qu'on récupère
le code à 6 chiffres demandé à la connexion client.

## Prochaines Étapes Prévues (non exhaustif)
*   Finalisation de l'UI/UX pour l'application mobile et le panel admin.
*   Méthodes de paiement réelles (le checkout et les adresses sont en place).
*   Synchronisation du panier et de la wishlist avec le backend pour les utilisateurs connectés.
*   Gestion des images (upload serveur au lieu d'URLs externes).
*   Fonctionnalités de recherche avancée.
*   Système d'avis et de notation des produits.
*   Notifications push (les notifications in-app et les campagnes email sont en place).
*   Tests (unitaires, intégration, e2e).
*   Déploiement.

---
