# Lancer ARTIVA en local

Guide de démarrage. Tout est déjà configuré et installé : les dépendances sont
posées, la base et la boîte mail tournent dans Docker, et les trois applications
pointent vers le serveur local (les adresses de production sont conservées **en
commentaire** dans le code, prêtes à être réactivées).

---

## 1. Démarrage rapide

Trois terminaux, dans cet ordre.

```bash
# Terminal 0 — base de données + boîte mail (une seule fois, elles restent en fond)
cd ~/Project/ARTIVA_REPO
docker compose up -d

# Terminal 1 — le backend (API)
cd ~/Project/ARTIVA_REPO/back_end
npm run dev                 # http://localhost:3001

# Terminal 2 — le panel admin (web)
cd ~/Project/ARTIVA_REPO/admin_panel
npm start                   # http://localhost:3000

# Terminal 3 — l'app mobile
cd ~/Project/ARTIVA_REPO/front_end
npx expo start              # scanner le QR code avec Expo Go
```

### Ce qui tourne où

| Service | Adresse | Démarrage |
|---|---|---|
| PostgreSQL | `localhost:5433` | `docker compose up -d` |
| **Mailpit** (boîte mail de dev) | **http://localhost:8025** | idem |
| Adminer (explorateur de base) | http://localhost:8090 | idem |
| Backend API | http://localhost:3001/api | `npm run dev` dans `back_end/` |
| Panel admin | http://localhost:3000 | `npm start` dans `admin_panel/` |
| App mobile (Metro) | http://localhost:8081 | `npx expo start` dans `front_end/` |

Choix de ports volontaires : PostgreSQL sur **5433** (et non 5432) pour ne pas
heurter un Postgres déjà installé, et Adminer sur **8090** (et non 8081) qui est
le port par défaut de Metro/Expo.

---

## 2. Comptes de test

| Usage | Email | Mot de passe |
|---|---|---|
| Panel admin | `admin@artiva.local` | `admin123` |
| App mobile (client) | `client@artiva.local` | `client123` |

---

## 3. Les emails : Mailpit

L'app envoie de vrais emails à plusieurs moments : code de connexion à 6
chiffres, réinitialisation de mot de passe, confirmation de commande (au client
et à la boutique). En production ils partent par le relais SMTP Brevo.

En local, **Mailpit** joue le rôle de faux serveur SMTP : il accepte tous les
messages et n'en transmet aucun. On les lit dans une interface web, avec le
rendu HTML exact que recevrait le client.

> **Boîte de réception : http://localhost:8025**

C'est aussi le garde-fou qui évite d'écrire à de vrais clients pendant les tests :
rien ne peut sortir de la machine.

### Se connecter à l'app mobile

1. Saisir `client@artiva.local` / `client123` dans l'app.
2. Ouvrir **http://localhost:8025** → l'email « 🔐 Votre code de connexion
   Artiva » vient d'arriver.
3. Recopier le code à 6 chiffres dans l'app.

Le terminal du backend confirme chaque envoi :

```
[2FA] Email capturé par Mailpit pour client@artiva.local — à lire sur http://localhost:8025
```

### Changer de mode d'envoi

Réglé par `MAIL_TRANSPORT` dans `back_end/.env` :

| Valeur | Effet |
|---|---|
| `mailpit` *(défaut)* | Les emails arrivent dans Mailpit. **Mode recommandé.** |
| `console` | Aucun envoi : le contenu de l'email est écrit dans le terminal du backend. Pratique si on ne veut pas lancer Docker. |
| `brevo` | **Production** : envoi réel. Nécessite `BREVO_SMTP_USER` et `BREVO_SMTP_PASS` ; sans eux, repli automatique sur `console`. |

Mailpit garde les 500 derniers messages, en mémoire seulement : `docker compose
restart mailpit` vide la boîte.

---

## 4. Montage sur plusieurs machines

C'est le montage visé : le serveur ici, le panel admin consulté depuis le PC qui
partage la connexion, l'app sur le téléphone.

```
   PC qui partage la connexion            Cette machine                Téléphone
        192.168.137.1                    192.168.137.190
   ┌───────────────────────┐         ┌──────────────────────┐      ┌───────────┐
   │  Navigateur           │  ─────► │  Backend      :3001  │ ◄─── │  Expo Go  │
   │  → panel admin :3000  │         │  PostgreSQL   :5433  │      │           │
   │  → Mailpit     :8025  │         │  Mailpit      :8025  │      └───────────┘
   └───────────────────────┘         │  Metro/Expo   :8081  │
                                     │  Panel admin  :3000  │
                                     └──────────────────────┘
```

Tous les services écoutent déjà sur toutes les interfaces réseau (`0.0.0.0`) :
il n'y a rien à activer.

### Le panel admin depuis l'autre PC

**Le plus simple : ne rien installer sur l'autre PC.** On laisse `npm start`
tourner ici et on ouvre simplement, depuis le navigateur de l'autre PC :

```
http://192.168.137.190:3000
```

Aucune configuration : `admin_panel/src/config.js` déduit l'adresse de l'API de
celle par laquelle le panel est consulté. Ouvert en `localhost` il appelle
`localhost:3001` ; ouvert via l'IP réseau il appelle `192.168.137.190:3001`.

**Si tu veux vraiment faire tourner le serveur de dev sur l'autre PC** (il faut y
copier le dépôt et y installer Node), la déduction automatique ne suffit plus :
le navigateur serait alors sur `localhost:3000` d'une machine sans backend. Il
faut désigner le serveur explicitement dans `admin_panel/.env` :

```bash
REACT_APP_API_URL=http://192.168.137.190:3001/api
```

puis relancer `npm start` (Create React App ne relit ce fichier qu'au démarrage).

### L'app sur le téléphone

Rien à saisir : `front_end/constants/Api.ts` déduit l'adresse de cette machine à
partir de celle du serveur Metro. Ça continue de fonctionner si l'IP change.

Une seule condition : **le téléphone doit être sur le même réseau Wi-Fi**, donc
connecté au partage de connexion du PC.

Au démarrage, Metro indique dans ses logs sur quel serveur l'app est branchée :

```
[API] Backend utilisé : http://192.168.137.190:3001/api
```

Sur émulateur Android, `10.0.2.2` est utilisé automatiquement en repli ; sur
`npx expo start --web`, c'est `localhost`.

### Si le Wi-Fi ne passe pas : le câble USB

Symptôme : Expo Go affiche l'écran de chargement puis échoue en erreur réseau,
et aucune connexion n'atteint l'ordinateur. Le partage de connexion laisse
passer Internet mais bloque les échanges entre appareils connectés.

Plutôt que de se battre avec le réseau, on fait passer les deux ports par le
câble USB :

```bash
./scripts/telephone-usb.sh
```

Le script vérifie que le téléphone est détecté, redirige les ports 8081 (Metro)
et 3001 (l'API) via `adb reverse`, puis lance Expo en mode localhost. Le
téléphone croit alors que tout tourne sur lui-même, alors qu'il parle en réalité
à l'ordinateur. Dans Expo Go, ouvrir `exp://127.0.0.1:8081` — ou simplement
appuyer sur **a** dans le terminal pour que l'app se lance toute seule.

L'API fonctionne sans réglage supplémentaire : `constants/Api.ts` déduit
`localhost:3001`, qui repasse par le câble grâce à la seconde redirection.

À préparer une fois sur le téléphone Android :

1. Réglages → À propos du téléphone → taper **7 fois** sur « Numéro de build ».
2. Réglages → Options de développement → activer **Débogage USB**.
3. Brancher le câble et accepter la demande d'autorisation qui s'affiche.

Le câble doit être en mode transfert de données, pas seulement en recharge.

### Pare-feu

`ufw` est **inactif** sur cette machine : rien à faire. S'il venait à être
activé, il faudrait ouvrir les ports utilisés :

```bash
sudo ufw allow 3000/tcp   # panel admin
sudo ufw allow 3001/tcp   # API
sudo ufw allow 8081/tcp   # Metro / Expo
sudo ufw allow 8025/tcp   # Mailpit
```

Côté PC Windows qui partage la connexion, c'est son pare-feu à lui qui peut
bloquer — mais seulement s'il héberge un service, ce qui n'est pas le cas dans le
montage recommandé ci-dessus.

### Trouver l'adresse IP de cette machine

```bash
hostname -I | awk '{print $1}'
```

Actuellement : **192.168.137.190** (passerelle `192.168.137.1`, l'IP typique d'un
partage de connexion Windows). Elle peut changer à chaque reconnexion — d'où la
déduction automatique côté app mobile et panel admin.

---

## 5. Données de démonstration

La base est initialisée avec : 5 catégories racines + 7 sous-catégories, 5 tags,
15 produits publiés (+ 1 masqué, pour tester le filtre), une galerie de 2 à 3
images par produit, des avis, des notifications et des commandes d'exemple.

Les noms des tags (`Nouveauté`, `Populaire`, `Pour Vous`, `Meilleures Ventes`,
`Promotion`) correspondent exactement à ceux attendus par la page d'accueil de
l'app — les modifier viderait les carrousels.

### Repartir d'une base propre

```bash
docker compose down -v     # supprime le volume, donc toutes les données
docker compose up -d       # recrée et re-remplit la base
```

Les scripts d'initialisation (`db/init/`) ne s'exécutent qu'à la **création** du
volume. Modifier un `.sql` sans faire `down -v` n'a donc aucun effet.

---

## 6. Repasser en production

Les adresses de production n'ont pas été supprimées, seulement commentées.

| Où | Quoi faire |
|---|---|
| App mobile | `front_end/constants/Api.ts` — décommenter la ligne `export const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api"` et commenter le bloc « DÉVELOPPEMENT LOCAL » |
| Panel admin | `admin_panel/.env` — décommenter la ligne `REACT_APP_API_URL` pointant vers Fly, **ou** décommenter la ligne dans `admin_panel/src/config.js`. Relancer `npm start` |
| Backend — base | `back_end/.env` — décommenter le bloc « PRODUCTION (base distante) » et mettre `DB_SSL=true` |
| Backend — emails | `back_end/.env` — `MAIL_TRANSPORT=brevo` + renseigner `BREVO_SMTP_USER` / `BREVO_SMTP_PASS` |

Chaque page conserve aussi, juste sous son import, l'ancienne déclaration codée
en dur, commentée et signalée par `--- PRODUCTION (désactivé en local) ---`.

---

## 7. Corrections apportées pour que ça démarre

Le projet ne pouvait pas tourner en local en l'état. Plusieurs de ces bugs
affectent **aussi la production**.

| Problème | Détail | Correction |
|---|---|---|
| `back_end/utils/sendEmail.js` en ESM | Le fichier utilisait `import`/`export` alors que tout le backend est en CommonJS et que `package.json` ne déclare pas `"type": "module"`. Ça ne passe que sur Node ≥ 22 (l'image Docker de prod est en Node 24) ; sur Node 20 le serveur refusait de démarrer. | Converti en CommonJS (compatible avec les deux). |
| `artiva.sql` échouait sur base vierge | Ligne 45 : un trigger utilise `update_updated_at_column()`, définie seulement ligne 68. Ligne 398 : un index sur une table `address` qui n'existe nulle part. | La fonction est créée en amont (`db/init/01_functions.sql`) ; l'index mort est commenté. |
| Tables absentes du schéma | `password_reset_codes` et `avis` sont utilisées par le code mais n'ont jamais été reportées dans `artiva.sql` (créées à la main en prod). | Ajoutées dans `db/init/03_tables_manquantes.sql`. |
| Colonne `products.video_url` absente | Utilisée par `productController.js`, le lecteur vidéo de la fiche produit et le formulaire admin. Sans elle, **toutes** les routes produits renvoyaient une erreur 500. | Ajoutée dans le même fichier. |
| Le panel admin ne compilait pas du tout | `pages/ReportsPage.js` importe `../services/reportService` et `../styles/ReportsPage.css`, qui n'ont jamais été écrits. Comme `App.js` importe cette page statiquement, **l'ensemble du panel** échouait avec « Module not found ». | Les deux fichiers ont été écrits. Le service calcule les statistiques à partir des API existantes, le backend n'ayant pas d'endpoint dédié. |
| Route `/api/health` inexistante | `front_end/context/AuthContext.tsx` l'interroge pour tester la connectivité. | Ajoutée dans `back_end/app.js`. |
| Un `super_admin` ne pouvait pas se connecter au panel | `pages/LoginPage.js` testait `admin.role === 'admin'`, alors que `back_end/middlewares/adminMiddleware.js` accepte explicitement `admin` **et** `super_admin`. Le rôle le plus élevé était donc le seul incapable d'entrer, avec le message « Accès refusé. Vous devez être administrateur. » — alors que l'API lui accordait tout. | Le test accepte désormais les deux rôles. |
| Aucun moyen de lire les emails en local | Le code n'envoyait que via Brevo ; sans identifiants, toute connexion client échouait. | Mailpit ajouté à `docker-compose.yml`, transport rendu configurable. |

### Points laissés en l'état

- **`back_end/routes/dashboardRoutes.js`** est du code Mongoose/MongoDB
  (`Order.countDocuments()`, `require('../models/User')`) alors que le projet
  tourne sur PostgreSQL et n'a pas de dossier `models/`. Il n'est **pas** monté
  dans `app.js` — l'importer ferait planter le serveur. Le fichier peut être
  supprimé.
- **Dossiers morts** : le `package.json` à la racine (template Expo « E_Artiva »
  vide), `ArtivaNew/` (projet Expo neuf jamais touché), `android/` à la racine,
  et `Artiva/E_Artiva/front_end/tsconfig.json`. Le vrai code est uniquement dans
  `back_end/`, `front_end/` et `admin_panel/`.
- **`back_end/package.json`** liste ~80 dépendances dont la plupart sont des
  sous-dépendances d'Express remontées par erreur (`ee-first`, `dunder-proto`,
  `side-channel`…), plus `sequelize` et `bcrypt` qui ne sont pas utilisés (le
  code utilise `pg` et `bcryptjs`).
- **3 erreurs TypeScript préexistantes** dans l'app mobile : `signInWithGoogle`
  est appelé par `login.tsx` et `register.tsx` mais a été commenté dans
  `AuthContext.tsx`. Sans effet au runtime (Metro ne vérifie pas les types), mais
  `npx tsc --noEmit` les signale.
- **Le Dockerfile** déclare `EXPOSE 3000` alors que `fly.toml` route vers
  `internal_port = 3001`. Sans conséquence (Fly ignore `EXPOSE`), mais incohérent.

---

## 8. Dépannage

**« Connexion à PostgreSQL » échoue au démarrage du backend**
La base n'est pas lancée : `docker compose up -d`, puis `docker compose ps`
(la colonne STATUS doit indiquer `healthy`).

**Un port est déjà pris**
`ss -ltn | grep :3001` pour voir ce qui écoute, `docker ps` pour repérer un
conteneur oublié. Le port de la base se change dans `docker-compose.yml` **et**
dans `back_end/.env` (les deux doivent concorder).

**Le panel admin affiche une page blanche ou des erreurs réseau**
Ouvrir la console du navigateur : la ligne `[API] Backend utilisé : …` indique
sur quel serveur il est branché. Vérifier que cette adresse répond.

**Expo Go affiche « Something went wrong » sur fond bleu**

Le plus souvent, ce n'est pas une panne : le bundle met trop longtemps à se
construire et Expo Go abandonne avant la fin. Sur cette machine, la première
compilation après un `expo start -c` prend environ **90 secondes** (3 179
modules, 12,8 Mo) — largement de quoi dépasser la patience d'Expo Go.

La parade : construire le bundle **avant** de scanner, depuis l'ordinateur.

```bash
./scripts/prechauffer-bundle.sh
```

Une fois le bundle en cache, il est servi en moins d'une seconde et Expo Go
charge sans broncher. Ce cache reste valide tant qu'on ne relance pas Expo avec
`-c`.

D'ailleurs : **ne pas utiliser `expo start -c` par réflexe.** Cette option vide
le cache et impose de tout recompiler. Elle ne sert que lorsqu'un changement
n'est pas pris en compte. Au quotidien, `npx expo start` suffit.

**L'app mobile reste vide sur le téléphone**
Voir la section 4 : même Wi-Fi, et ports ouverts si un pare-feu est actif.
Vérifier la ligne `[API] Backend utilisé : …` dans les logs Metro.

**Aucun email n'arrive dans Mailpit**
Vérifier que le conteneur tourne (`docker compose ps`), que `MAIL_TRANSPORT=mailpit`
dans `back_end/.env`, et **relancer le backend** après toute modification du
`.env`. Au démarrage il affiche `[MAIL] Mode MAILPIT : …`.

**Inspecter la base à la main**

```bash
docker exec -it artiva_db psql -U artiva -d artiva
```

ou via Adminer : http://localhost:8090
(Système `PostgreSQL`, Serveur `db`, Utilisateur `artiva`, Mot de passe `artiva`,
Base `artiva`).
