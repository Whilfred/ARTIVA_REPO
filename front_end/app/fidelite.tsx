// ARTIVA/front_end/app/fidelite.tsx
//
// Programme de fidélité, côté client.
//
// Le client accumule des points à chaque achat (1 point = 1 FCFA de produits).
// Au seuil, un bon nominatif lui est attribué automatiquement et son solde
// repart de zéro. Cet écran répond à trois questions : où j'en suis, ce que je
// vais gagner, et quels bons je peux utiliser maintenant.
//
// C'est la destination du lien porté par la notification d'attribution.

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { FontAwesome } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../constants/Api";

type Bon = {
  code: string;
  valeur: number;
  expire_le: string;
  etat: "disponible" | "utilise" | "expire";
};

type LigneJournal = {
  delta: number;
  reason: "earned" | "converted" | "revoked" | "manual";
  balance_after: number;
  created_at: string;
};

type Statut = {
  actif: boolean;
  solde: number;
  seuil: number;
  restant: number;
  valeur_estimee: number;
  validite_jours: number;
  bons: Bon[];
  historique: LigneJournal[];
};

const fcfa = (v: number) => `${Number(v).toLocaleString("fr-FR")} FCFA`;
const nombre = (v: number) => Number(v).toLocaleString("fr-FR");

const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// Libellés du journal. Le client ne doit jamais lire « earned » ou « revoked ».
const LIBELLES: Record<LigneJournal["reason"], string> = {
  earned: "Points gagnés sur une commande",
  converted: "Points convertis en bon",
  revoked: "Points repris (commande annulée)",
  manual: "Ajustement",
};

export default function FidelitePage() {
  const { userToken, effectiveAppColorScheme } = useAuth();
  const colors = Colors[effectiveAppColorScheme ?? "light"];

  const [statut, setStatut] = useState<Statut | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [codeCopie, setCodeCopie] = useState<string | null>(null);

  const charger = useCallback(
    async (estRafraichissement = false) => {
      if (!userToken) {
        setErreur("Connectez-vous pour voir vos points de fidélité.");
        setChargement(false);
        return;
      }
      if (!estRafraichissement) setChargement(true);
      try {
        const reponse = await fetch(`${API_BASE_URL}/fidelite`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (!reponse.ok) throw new Error("Réponse inattendue du serveur.");
        setStatut(await reponse.json());
        setErreur(null);
      } catch {
        setErreur("Impossible de charger vos points pour le moment.");
      } finally {
        setChargement(false);
        setRafraichissement(false);
      }
    },
    [userToken]
  );

  // useFocusEffect et non useEffect : en revenant d'une commande, le solde a
  // changé. Un écran qui afficherait encore l'ancien chiffre serait pris pour
  // une erreur de comptage.
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const copier = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCodeCopie(code);
    setTimeout(() => setCodeCopie(null), 2000);
  };

  if (chargement) {
    return (
      <View style={[styles.centre, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Ma fidélité" }} />
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (erreur || !statut) {
    return (
      <View style={[styles.centre, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Ma fidélité" }} />
        <FontAwesome name="exclamation-circle" size={40} color={colors.subtleText} />
        <Text style={[styles.messageErreur, { color: colors.subtleText }]}>{erreur}</Text>
        <TouchableOpacity
          style={[styles.boutonReessayer, { backgroundColor: colors.tint }]}
          onPress={() => charger()}
        >
          <Text style={styles.boutonReessayerTexte}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pourcentage = Math.min(100, Math.round((statut.solde / statut.seuil) * 100));
  const bonsDisponibles = statut.bons.filter((b) => b.etat === "disponible");
  const bonsPasses = statut.bons.filter((b) => b.etat !== "disponible");

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.contenu}
      refreshControl={
        <RefreshControl
          refreshing={rafraichissement}
          onRefresh={() => {
            setRafraichissement(true);
            charger(true);
          }}
          tintColor={colors.tint}
        />
      }
    >
      <Stack.Screen options={{ title: "Ma fidélité" }} />

      {!statut.actif && (
        <View style={[styles.bandeau, { backgroundColor: colors.subtleText + "20" }]}>
          <Text style={{ color: colors.subtleText, fontSize: 13 }}>
            Le programme de fidélité est actuellement suspendu. Vos points et vos
            bons restent valables.
          </Text>
        </View>
      )}

      {/* --- Solde et progression ---------------------------------------- */}
      <View style={[styles.carte, { backgroundColor: colors.card }]}>
        <Text style={[styles.libelle, { color: colors.subtleText }]}>Mes points</Text>
        <Text style={[styles.solde, { color: colors.tint }]}>{nombre(statut.solde)}</Text>

        <View style={[styles.barre, { backgroundColor: colors.tint + "22" }]}>
          <View style={[styles.barreRemplie, { width: `${pourcentage}%`, backgroundColor: colors.tint }]} />
        </View>

        {statut.restant > 0 ? (
          <Text style={[styles.progression, { color: colors.text }]}>
            Encore <Text style={{ fontWeight: "700" }}>{nombre(statut.restant)} points</Text> pour
            obtenir un bon d'environ {fcfa(statut.valeur_estimee)}.
          </Text>
        ) : (
          <Text style={[styles.progression, { color: "#1e7e34", fontWeight: "600" }]}>
            🎁 Votre bon arrive à votre prochaine commande.
          </Text>
        )}

        <Text style={[styles.explication, { color: colors.subtleText }]}>
          Vous gagnez 1 point par FCFA d'achat, hors frais de livraison. À{" "}
          {nombre(statut.seuil)} points, un bon vous est attribué automatiquement
          et votre compteur repart de zéro.
        </Text>
      </View>

      {/* --- Bons utilisables --------------------------------------------- */}
      <Text style={[styles.titreSection, { color: colors.text }]}>
        Mes bons {bonsDisponibles.length > 0 ? `(${bonsDisponibles.length})` : ""}
      </Text>

      {bonsDisponibles.length === 0 ? (
        <View style={[styles.carte, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.subtleText, fontSize: 14, textAlign: "center" }}>
            Aucun bon disponible pour l'instant. Continuez vos achats !
          </Text>
        </View>
      ) : (
        bonsDisponibles.map((bon) => (
          <View key={bon.code} style={[styles.bon, { backgroundColor: colors.card, borderColor: colors.tint }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bonValeur, { color: colors.tint }]}>{fcfa(bon.valeur)}</Text>
              <Text style={[styles.bonCode, { color: colors.text }]}>{bon.code}</Text>
              <Text style={[styles.bonExpiration, { color: colors.subtleText }]}>
                Valable jusqu'au {dateCourte(bon.expire_le)}
              </Text>
            </View>
            {/* Copier plutôt que recopier à la main : le code contient six
                caractères qu'on se trompe facilement à retranscrire. */}
            <TouchableOpacity
              style={[styles.boutonCopier, { borderColor: colors.tint }]}
              onPress={() => copier(bon.code)}
            >
              <FontAwesome
                name={codeCopie === bon.code ? "check" : "copy"}
                size={16}
                color={colors.tint}
              />
              <Text style={{ color: colors.tint, fontSize: 12, marginLeft: 6 }}>
                {codeCopie === bon.code ? "Copié" : "Copier"}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {bonsDisponibles.length > 0 && (
        <Text style={[styles.note, { color: colors.subtleText }]}>
          Saisissez ce code au moment du paiement. Chaque bon est personnel et
          utilisable une seule fois — il ne se cumule pas avec un code promo.
        </Text>
      )}

      {/* --- Bons passés --------------------------------------------------- */}
      {bonsPasses.length > 0 && (
        <>
          <Text style={[styles.titreSection, { color: colors.text }]}>Bons passés</Text>
          {bonsPasses.map((bon) => (
            <View key={bon.code} style={[styles.bonPasse, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.subtleText, fontSize: 14 }}>
                {fcfa(bon.valeur)} — {bon.code}
              </Text>
              <Text style={{ color: colors.subtleText, fontSize: 12 }}>
                {bon.etat === "utilise" ? "Utilisé" : "Expiré"}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* --- Journal ------------------------------------------------------- */}
      {statut.historique.length > 0 && (
        <>
          <Text style={[styles.titreSection, { color: colors.text }]}>Historique</Text>
          <View style={[styles.carte, { backgroundColor: colors.card }]}>
            {statut.historique.map((ligne, i) => (
              <View
                key={i}
                style={[
                  styles.ligneJournal,
                  i < statut.historique.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.subtleText + "33",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13.5 }}>
                    {LIBELLES[ligne.reason]}
                  </Text>
                  <Text style={{ color: colors.subtleText, fontSize: 11.5, marginTop: 2 }}>
                    {dateCourte(ligne.created_at)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: ligne.delta > 0 ? "#1e7e34" : colors.subtleText,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {ligne.delta > 0 ? "+" : ""}
                  {nombre(ligne.delta)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16 },
  centre: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  messageErreur: { marginTop: 12, fontSize: 15, textAlign: "center" },
  boutonReessayer: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  boutonReessayerTexte: { color: "#fff", fontWeight: "600" },

  bandeau: { padding: 12, borderRadius: 8, marginBottom: 14 },

  carte: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
      default: { elevation: 2 },
    }),
  },

  libelle: { fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  solde: { fontSize: 40, fontWeight: "800", marginTop: 4 },

  barre: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 14 },
  barreRemplie: { height: "100%", borderRadius: 4 },

  progression: { fontSize: 14.5, marginTop: 12, lineHeight: 21 },
  explication: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },

  titreSection: { fontSize: 17, fontWeight: "700", marginBottom: 10, marginTop: 6 },

  bon: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 16,
    marginBottom: 10,
  },
  bonValeur: { fontSize: 22, fontWeight: "800" },
  bonCode: { fontSize: 15, fontWeight: "600", letterSpacing: 1, marginTop: 3 },
  bonExpiration: { fontSize: 12, marginTop: 4 },

  boutonCopier: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  bonPasse: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    opacity: 0.65,
  },

  note: { fontSize: 12, lineHeight: 18, marginBottom: 18, marginTop: 2 },

  ligneJournal: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
});
