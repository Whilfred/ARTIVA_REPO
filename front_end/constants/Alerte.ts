// =============================================================================
// front_end/constants/Alerte.ts
// Remplaçant d'Alert qui fonctionne aussi dans un navigateur.
// =============================================================================
// `Alert.alert` de react-native-web est une fonction VIDE :
//
//     class Alert { static alert() {} }
//
// Conséquence : dans le navigateur, aucun message ne s'affiche, et surtout
// aucun `onPress` n'est exécuté. Le bouton de déconnexion du profil ne
// déconnectait donc personne — on cliquait, il ne se passait rien, et sans la
// moindre erreur pour l'expliquer. Même chose pour la désactivation de compte
// et le changement de mot de passe.
//
// Ce module expose la MÊME signature que celui de React Native, pour qu'il
// suffise de changer la ligne d'import. Sur mobile, tout est délégué à Alert
// tel quel : le comportement natif n'est pas modifié.
// =============================================================================

import { Alert as AlertNatif, Platform } from "react-native";

export type BoutonAlerte = {
  text?: string;
  onPress?: (valeur?: string) => void;
  style?: "default" | "cancel" | "destructive";
};

type Options = { cancelable?: boolean; onDismiss?: () => void };

function alerterSurWeb(
  titre: string,
  message?: string,
  boutons?: BoutonAlerte[]
): void {
  // Le titre et le message sont fondus en un seul texte : les boîtes natives du
  // navigateur n'ont pas de champ titre distinct.
  const texte = [titre, message].filter(Boolean).join("\n\n");

  if (!boutons || boutons.length === 0) {
    window.alert(texte);
    return;
  }

  if (boutons.length === 1) {
    window.alert(texte);
    boutons[0].onPress?.();
    return;
  }

  // Deux boutons ou plus : window.confirm ne sait en proposer que deux.
  // On considère comme « annuler » le bouton portant ce style — c'est la
  // convention suivie partout dans l'application — et comme action le premier
  // des autres.
  const annuler = boutons.find((b) => b.style === "cancel");
  const action = boutons.find((b) => b.style !== "cancel") ?? boutons[boutons.length - 1];

  if (window.confirm(texte)) {
    action.onPress?.();
  } else {
    annuler?.onPress?.();
  }
}

export const Alert = {
  alert(
    titre: string,
    message?: string,
    boutons?: BoutonAlerte[],
    options?: Options
  ): void {
    if (Platform.OS === "web") {
      // typeof window : en rendu côté serveur, window n'existe pas. Sans ce
      // garde-fou, la page entière planterait au lieu d'afficher une boîte.
      if (typeof window === "undefined") return;
      alerterSurWeb(titre, message, boutons);
      return;
    }
    AlertNatif.alert(titre, message, boutons, options);
  },
};

export default Alert;
