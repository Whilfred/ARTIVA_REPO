// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Pressable,
//   ScrollView,
//   Alert,
//   Platform,
// } from "react-native";
// import { useRouter, Href, Stack } from "expo-router";
// import {
//   ChevronRight,
//   UserCog,
//   Lock,
//   Palette,
//   Languages,
//   UserX,
// } from "lucide-react-native"; // Icônes
// import Colors from "../../constants/Colors";
// import { useColorScheme } from "../../components/useColorScheme";
// import { useAuth } from "../../context/AuthContext";
// import { useTranslation } from "react-i18next"; // Pour traduire les textes des liens

// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api"; // **METS TON IP**

// interface SettingsItemProps {
//   icon: React.ElementType;
//   title: string;
//   onPress: () => void;
//   color: string;
//   textColor: string;
// }

// const SettingsItem: React.FC<SettingsItemProps> = ({
//   icon: Icon,
//   title,
//   onPress,
//   color,
//   textColor,
// }) => (
//   <Pressable
//     style={[
//       styles.itemContainer,
//       { borderBottomColor: Colors[useColorScheme() ?? "light"].tabIconDefault },
//     ]}
//     onPress={onPress}
//   >
//     <View style={styles.iconContainer}>
//       <Icon size={22} color={color} strokeWidth={1.75} />
//     </View>
//     <Text style={[styles.itemText, { color: textColor }]}>{title}</Text>
//     <ChevronRight
//       size={20}
//       color={Colors[useColorScheme() ?? "light"].tabIconDefault}
//     />
//   </Pressable>
// );

// export default function SettingsMainScreen() {
//   const router = useRouter();
//   const { userToken, signOut } = useAuth(); // signOut pour la désactivation
//   const colorScheme = useColorScheme();
//   const { t } = useTranslation();
//   const tintColor = Colors[colorScheme ?? "light"].tint;
//   const textColor = Colors[colorScheme ?? "light"].text;
//   const cardBackgroundColor = Colors[colorScheme ?? "light"].card;
//   const backgroundColor = Colors[colorScheme ?? "light"].background;
//   const subtleTextColor = Colors[colorScheme ?? "light"].tabIconDefault;

//   const [isLoadingDeactivate, setIsLoadingDeactivate] = useState(false);

//   const handleDeactivateAccount = () => {
//     // Traduction des messages (exemple, adapte tes clés)
//     const confirmTitle =
//       /* t('settings.deactivate.confirmTitle', */ "Désactiver le compte"; /*)*/
//     const confirmMessage =
//       /* t('settings.deactivate.confirmMessage', */ "Êtes-vous sûr ? Après désactivation, vous devrez contacter le support pour réactiver votre compte. Vous serez déconnecté."; /*)*/
//     const cancelButton = /* t('common.cancel', */ "Annuler"; /*)*/
//     const deactivateButtonText =
//       /* t('common.deactivate', */ "Désactiver"; /*)*/
//     const successTitle =
//       /* t('settings.deactivate.successTitle', */ "Compte désactivé"; /*)*/
//     const errorTitle = /* t('common.error', */ "Erreur"; /*)*/
//     const genericErrorMessage =
//       /* t('settings.deactivate.genericError', */ "Impossible de désactiver le compte."; /*)*/

//     Alert.alert(confirmTitle, confirmMessage, [
//       { text: cancelButton, style: "cancel" },
//       {
//         text: deactivateButtonText,
//         style: "destructive",
//         onPress: async () => {
//           if (!userToken) {
//             // Sécurité supplémentaire
//             Alert.alert(errorTitle, "Vous n'êtes pas connecté.");
//             return;
//           }
//           setIsLoadingDeactivate(true); // Active le loader du bouton
//           try {
//             console.log("Frontend: Tentative de désactivation du compte...");
//             const response = await fetch(
//               `${API_BASE_URL}/users/me/deactivate`,
//               {
//                 method: "PUT",
//                 headers: {
//                   Authorization: `Bearer ${userToken}`,
//                   "Content-Type": "application/json", // Même si pas de corps, c'est une bonne pratique
//                 },
//               }
//             );

//             const data = await response.json(); // Toujours essayer de parser la réponse

//             if (!response.ok) {
//               console.error(
//                 "Frontend: Erreur API désactivation:",
//                 response.status,
//                 data
//               );
//               throw new Error(
//                 data.message || `Erreur serveur (${response.status})`
//               );
//             }

//             console.log("Frontend: Réponse API désactivation:", data);
//             Alert.alert(
//               successTitle,
//               data.message ||
//                 "Votre compte a été désactivé. Vous allez être déconnecté."
//             );
//             await signOut(); // Déconnecte l'utilisateur du frontend (efface token local, etc.)
//             router.replace("/login"); // Redirige vers login (utilise replace pour vider l'historique)
//           } catch (e: any) {
//             console.error("Frontend: Erreur dans handleDeactivateAccount:", e);
//             Alert.alert(errorTitle, e.message || genericErrorMessage);
//           } finally {
//             setIsLoadingDeactivate(false); // Désactive le loader du bouton
//           }
//         },
//       },
//     ]);
//   };

//   const settingsOptions = [
//     {
//       id: "edit-profile",
//       icon: UserCog,
//       title: "Modifier le Profil",
//       onPress: () => router.push("/settings/edit-profile" as Href),
//     },
//     {
//       id: "change-password",
//       icon: Lock,
//       title: "Changer le Mot de Passe",
//       onPress: () => router.push("/settings/change-password" as Href),
//     },
//     {
//       id: "preferences",
//       icon: Palette,
//       title: "Préférences d'Affichage",
//       onPress: () => router.push("/settings/preferences" as Href),
//     },
//     {
//       id: "language",
//       icon: Languages,
//       title: "Langue",
//       onPress: () => router.push("/settings/language" as Href),
//     },
//     {
//       id: "deactivate",
//       icon: UserX,
//       title: "Supprimer mon compte",
//       onPress: handleDeactivateAccount,
//       isDestructive: true,
//     },
//   ];

//   return (
//     <ScrollView
//       style={[
//         styles.screen,
//         { backgroundColor: Colors[colorScheme ?? "light"].background },
//       ]}
//     >
//       <View style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
//         {settingsOptions.map((opt) => (
//           <SettingsItem
//             key={opt.id}
//             icon={opt.icon}
//             title={opt.title}
//             onPress={opt.onPress}
//             color={opt.isDestructive ? Colors.light.errorBackground : tintColor} // Couleur différente pour désactiver
//             textColor={
//               opt.isDestructive ? Colors.light.errorBackground : textColor
//             }
//           />
//         ))}
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   screen: { flex: 1 },
//   section: {
//     marginTop: 20,
//     marginHorizontal: 10,
//     borderRadius: 8,
//     overflow: "hidden",
//   },
//   itemContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 18,
//     paddingHorizontal: 15,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   iconContainer: {
//     width: 30, // Espace pour l'icône
//     alignItems: "center",
//     marginRight: 15,
//   },
//   itemText: {
//     flex: 1,
//     fontSize: 16,
//     fontWeight: "500",
//   },
//   // Tu peux ajouter d'autres styles au besoin
//   centered: { flex: 1, justifyContent: "center", alignItems: "center" }, // Utile pour les sous-pages
//   input: {
//     /* ... */
//   }, // Styles pour les inputs dans les sous-pages
//   button: {
//     /* ... */
//   },
// });

// ARTIVA/front_end/app/settings/index.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity, // Utiliser TouchableOpacity au lieu de Button pour plus de contrôle sur le style
  Platform,
  Alert,
} from "react-native";
import { useRouter, Href, Stack } from "expo-router";
import {
  ChevronRight,
  UserCog,
  Lock,
  Palette,
  Languages,
  UserX,
} from "lucide-react-native"; // Icônes
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next"; // Pour traduire les textes des liens
import { FontAwesome } from "@expo/vector-icons"; // à importer

interface SettingsItemProps {
  icon: React.ElementType;
  title: string;
  onPress: () => void;
  color: string;
  textColor: string;
}

// Composant SettingsItem (avec styles en ligne pour le thème)
const SettingsItem: React.FC<SettingsItemProps> = ({
  icon: Icon,
  title,
  onPress,
  color,
  textColor,
}) => {
  const { effectiveAppColorScheme } = useAuth();
  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];

  return (
    <Pressable
      style={[styles.itemContainer, { borderBottomColor: colors.subtleText }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Icon size={22} color={color} strokeWidth={1.75} />
      </View>
      <Text style={[styles.itemText, { color: textColor }]}>{title}</Text>
      <FontAwesome name="chevron-right" size={16} color={colors.subtleText} />
    </Pressable>
  );
};

const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api"; // **METS TON IP**

export default function SettingsMainScreen() {
  const router = useRouter();
  const { userToken, signOut, effectiveAppColorScheme } = useAuth(); // signOut pour la désactivation
  const { t } = useTranslation();
  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];
  const tintColor = colors.tint;
  const textColor = colors.text;
  const cardBackgroundColor = colors.card;
  const backgroundColor = colors.background;
  const subtleTextColor = colors.subtleText;
  const errorTextColor = colors.errorText;

  const [isLoadingDeactivate, setIsLoadingDeactivate] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // Pour les messages UI
  const [error, setError] = useState<string | null>(null); // << AJOUT DE CET ETAT

  const handleDeactivateAccount = async () => {
    const confirmTitle = "Désactiver le compte";
    const confirmMessage =
      "Êtes-vous sûr ? Après désactivation, vous devrez contacter le support pour réactiver votre compte. Vous serez déconnecté.";
    const cancelButton = "Annuler";
    const deactivateButtonText = "Désactiver";
    const successMessageText =
      "Votre compte a été désactivé. Vous allez être déconnecté.";
    const errorMessageText = "Impossible de désactiver le compte.";

    Alert.alert(
      // Utiliser Alert directement
      confirmTitle,
      confirmMessage,
      [
        { text: cancelButton, style: "cancel" },
        {
          text: deactivateButtonText,
          style: "destructive",
          onPress: async () => {
            if (!userToken) {
              setError("Vous n'êtes pas connecté.");
              setTimeout(() => setError(null), 3000);
              return;
            }
            setIsLoadingDeactivate(true);
            try {
              console.log("Tentative de désactivation du compte...");
              const response = await fetch(
                `${API_BASE_URL}/users/me/deactivate`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${userToken}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                console.error(
                  "Erreur API désactivation:",
                  response.status,
                  data
                );
                setError(errorMessageText);
                setTimeout(() => setError(null), 3000);
                throw new Error(
                  data.message || `Erreur serveur (${response.status})`
                );
              }

              console.log("Réponse API désactivation:", data);
              setMessage(successMessageText);
              setTimeout(() => setMessage(null), 3000);
              await signOut(); // Déconnecte l'utilisateur du frontend (efface token local, etc.)
              router.replace("/login"); // Redirige vers login (utilise replace pour vider l'historique)
            } catch (e: any) {
              console.error("Erreur dans handleDeactivateAccount:", e);
              setError(errorMessageText);
              setTimeout(() => setError(null), 3000);
            } finally {
              setIsLoadingDeactivate(false);
            }
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {
      id: "edit-profile",
      icon: UserCog,
      title: "Modifier le Profil",
      onPress: () => router.push("/settings/edit-profile" as Href),
    },
    {
      id: "change-password",
      icon: Lock,
      title: "Changer le Mot de Passe",
      onPress: () => router.push("/settings/change-password" as Href),
    },
    {
      id: "preferences",
      icon: Palette,
      title: "Préférences d'Affichage",
      onPress: () => router.push("/settings/preferences" as Href),
    },
    {
      id: "language",
      icon: Languages,
      title: "Langue",
      onPress: () => router.push("/settings/language" as Href),
    },
    {
      id: "deactivate",
      icon: UserX,
      title: "Supprimer mon compte",
      onPress: handleDeactivateAccount,
      isDestructive: true,
    },
  ];

  return (
    <ScrollView style={[styles.screen, { backgroundColor }]}>
      <Stack.Screen options={{ title: "Paramètres du compte" }} />
      {error && (
        <Text
          style={[
            styles.message,
            {
              backgroundColor: Colors[currentScheme].errorBackground,
              color: Colors[currentScheme].errorText,
            },
          ]}
        >
          {error}
        </Text>
      )}
      {message && (
        <Text
          style={[
            styles.message,
            {
              backgroundColor: Colors[currentScheme].successBackground,
              color: Colors[currentScheme].successText,
            },
          ]}
        >
          {message}
        </Text>
      )}
      <View style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        {settingsOptions.map((opt) => (
          <SettingsItem
            key={opt.id}
            icon={opt.icon}
            title={opt.title}
            onPress={opt.onPress}
            color={
              opt.isDestructive ? Colors[currentScheme].errorText : tintColor
            }
            textColor={
              opt.isDestructive ? Colors[currentScheme].errorText : textColor
            }
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: {
    marginTop: 20,
    marginHorizontal: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: Colors[useColorScheme() ?? "light"].tabIconDefault, // Sera fixé par le thème
  },
  iconContainer: {
    width: 30, // Espace pour l'icône
    alignItems: "center",
    marginRight: 15,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  // Styles pour les messages
  message: {
    padding: 10,
    borderRadius: 5,
    textAlign: "center",
    fontWeight: "bold",
    marginVertical: 15,
    fontSize: 15,
  },
  // Tu peux ajouter d'autres styles au besoin
  centered: { flex: 1, justifyContent: "center", alignItems: "center" }, // Utile pour les sous-pages
  input: {
    /* ... */
  }, // Styles pour les inputs dans les sous-pages
  button: {
    /* ... */
  },
});
