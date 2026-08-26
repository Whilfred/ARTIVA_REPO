// =============================================================================
// front_end/constants/Api.ts
// Point UNIQUE de configuration de l'adresse du backend.
// =============================================================================
// Avant, chaque écran redéclarait sa propre constante `API_BASE_URL` codée en
// dur (26 fichiers). Tout passe désormais par ici : une seule ligne à changer
// pour basculer entre le serveur local et celui de production.
// =============================================================================

import Constants from "expo-constants";
import { Platform } from "react-native";

// -----------------------------------------------------------------------------
// PRODUCTION (désactivé pour le développement local)
// -----------------------------------------------------------------------------
// Pour repasser sur le serveur déployé sur Fly.io, il suffit de décommenter la
// ligne suivante et de commenter le bloc "DÉVELOPPEMENT LOCAL" plus bas.
//
// export const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

// -----------------------------------------------------------------------------
// DÉVELOPPEMENT LOCAL
// -----------------------------------------------------------------------------
// Port sur lequel tourne `npm run dev` dans back_end/ (voir back_end/.env).
const LOCAL_API_PORT = 3001;

/**
 * Détermine l'adresse à laquelle joindre le backend local.
 *
 * Le piège classique en React Native : « localhost » désigne le téléphone
 * lui-même, pas l'ordinateur qui fait tourner le serveur. Il faut donc l'adresse
 * de l'ordinateur sur le réseau local (ex. 192.168.1.20).
 *
 * On la déduit automatiquement de l'adresse du serveur Metro : quand on lance
 * `npx expo start`, Expo expose `hostUri` (ex. "192.168.1.20:8081"), qui est
 * précisément l'IP de l'ordinateur telle que le téléphone la voit. Résultat :
 * rien à modifier quand on change de réseau ou que l'IP bouge.
 */
function resolveLocalHost(): string {
  // --- Web : l'adresse est sous nos yeux ------------------------------------
  // Expo ne transmet PAS `hostUri` au navigateur. Sans ce cas particulier, on
  // retombait sur « localhost » — qui, depuis un autre PC du réseau, désigne cet
  // autre PC et non le serveur. D'où l'obligation de figer l'IP dans .env, et
  // l'application cassée à chaque changement de réseau.
  //
  // `window.location.hostname` est l'adresse par laquelle le navigateur a
  // justement réussi à joindre Metro : elle est donc joignable par construction,
  // que la page soit ouverte en localhost ou par l'IP réseau. Le backend tourne
  // sur la même machine que Metro, au port 3001.
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Champs de repli selon la version d'Expo / le mode de lancement
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    "";

  const host = String(hostUri).split(":")[0];

  if (host) {
    // Cas du mode tunnel (`npx expo start --tunnel`) : Metro n'est plus joint
    // par une IP locale mais par un nom de domaine du type
    // « xxxx.anonymous.artiva.exp.direct ». Ce domaine ne mène qu'à Metro, pas
    // au backend : construire « http://xxxx.exp.direct:3001/api » donnerait une
    // adresse morte, et l'app afficherait des écrans vides sans explication.
    const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (!isIpAddress && host !== "localhost") {
      console.warn(
        `[API] Metro est joint via « ${host} » (mode tunnel). Le backend local ` +
          `n'est PAS accessible par ce domaine.\n` +
          `      Renseigne EXPO_PUBLIC_API_BASE_URL dans front_end/.env avec une ` +
          `adresse joignable depuis le téléphone, puis relance Expo.`
      );
    }
    return host;
  }

  // Repli si Metro n'a pas transmis l'info (build autonome, test unitaire...)
  if (Platform.OS === "android") return "10.0.2.2"; // alias de l'hôte sur l'émulateur Android
  return "localhost"; // simulateur iOS (le web est traité plus haut)
}

/**
 * Adresse de base de l'API, terminée SANS slash (ex. "http://192.168.1.20:3001/api").
 *
 * Peut être forcée sans toucher au code via la variable d'environnement
 * EXPO_PUBLIC_API_BASE_URL (dans front_end/.env), utile par exemple pour tester
 * l'app locale contre le serveur de production.
 */
// export const API_BASE_URL =
//   process.env.EXPO_PUBLIC_API_BASE_URL ??
//   `http://${resolveLocalHost()}:${LOCAL_API_PORT}/api`;
// -----------------------------------------------------------------------------
// PRODUCTION
// -----------------------------------------------------------------------------
export const API_BASE_URL = "https://artiva-service.onrender.com/api";

// Affiché au démarrage : permet de vérifier d'un coup d'œil, dans les logs Metro,
// sur quel serveur l'application est branchée.
console.log(`[API] Backend utilisé : ${API_BASE_URL}`);

export default API_BASE_URL;
