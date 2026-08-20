// =============================================================================
// admin_panel/src/config.js
// Point UNIQUE de configuration de l'adresse du backend.
// =============================================================================
// Avant, chaque page redéclarait sa propre constante `API_BASE_URL` codée en dur
// (10 fichiers). Tout passe désormais par ici.
// =============================================================================

// -----------------------------------------------------------------------------
// PRODUCTION (désactivé pour le développement local)
// -----------------------------------------------------------------------------
// Pour rebrancher le panel sur le serveur déployé sur Fly.io, deux possibilités :
//   - décommenter la ligne ci-dessous et commenter le bloc "LOCAL" ;
//   - ou, sans toucher au code, renseigner REACT_APP_API_URL dans admin_panel/.env
//     (Create React App ne lit les variables qu'au démarrage : il faut relancer
//      `npm start` après modification).
//
// export const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api';
//
// Ancienne adresse Render, conservée pour mémoire :
// export const API_BASE_URL = 'https://e-artiva-htaw.onrender.com/api';

// -----------------------------------------------------------------------------
// DÉVELOPPEMENT LOCAL — backend lancé par `npm run dev` dans back_end/
// -----------------------------------------------------------------------------
// Le port du backend (voir back_end/.env : PORT=3001).
const LOCAL_API_PORT = 3001;

/**
 * Déduit l'adresse de l'API de celle par laquelle le panel est consulté.
 *
 * Le piège : une adresse « localhost » codée en dur ne marche que si le
 * navigateur tourne sur la machine du backend. Dès qu'on ouvre le panel depuis
 * un autre PC du réseau (http://192.168.137.190:3000), « localhost » désigne cet
 * autre PC — et plus rien ne répond.
 *
 * En repartant de `window.location.hostname`, le panel interroge toujours le
 * bon serveur : ouvert en localhost il appelle localhost, ouvert par l'IP réseau
 * il appelle cette même IP. Rien à reconfigurer selon la machine.
 *
 * Cas particulier : si le panel et le backend tournent sur deux machines
 * DIFFÉRENTES, cette déduction ne suffit plus — il faut alors renseigner
 * explicitement REACT_APP_API_URL dans admin_panel/.env.
 */
function resolveApiBaseUrl() {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${LOCAL_API_PORT}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

// Visible dans la console du navigateur : permet de vérifier d'un coup d'œil
// sur quel serveur le panel est branché.
console.log(`[API] Backend utilisé : ${API_BASE_URL}`);

export default API_BASE_URL;
