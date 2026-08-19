// // ARTIVA/front_end/app/settings/edit-profile.tsx
// import React, { useState, useEffect, useCallback } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   Platform,
//   KeyboardAvoidingView,
// } from "react-native";
// import { Stack, useRouter } from "expo-router";
// import { FontAwesome } from "@expo/vector-icons";
// import Colors from "../../constants/Colors";
// import { useAuth, User } from "../../context/AuthContext";

// interface ProfileFormData {
//   name: string;
//   address: string;
//   phone: string;
// }

// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api"; // **METS TON IP**

// export default function EditProfileScreen() {
//   const { user, userToken, updateUserInContext, effectiveAppColorScheme } =
//     useAuth(); // fetchUnreadNotificationCount supprimé car pas utilisé
//   const router = useRouter();

//   // CHANGEMENT: Utilisation directe de l'objet de couleurs basé sur le thème
//   const currentScheme = effectiveAppColorScheme ?? "light";
//   const colors = Colors[currentScheme]; // Simplification
//   const tintColor = colors.tint;
//   const textColor = colors.text;
//   const cardColor = colors.card;
//   const subtleTextColor = colors.subtleText;
//   const backgroundColor = colors.background;
//   const errorTextColor = colors.errorText; // Ajout pour les erreurs

//   const [formData, setFormData] = useState<ProfileFormData>({
//     name: "",
//     address: "",
//     phone: "",
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const [message, setMessage] = useState<string | null>(null); // Message de succès en UI
//   const [error, setError] = useState<string | null>(null); // Message d'erreur en UI

//   // Pré-remplir le formulaire avec les données utilisateur actuelles
//   useEffect(() => {
//     if (user) {
//       setFormData({
//         name: user.name || "",
//         address: (user as any).address || "", // Caster si 'address' n'est pas dans le type User de base
//         phone: (user as any).phone || "", // Caster si 'phone' n'est pas dans le type User de base
//       });
//     }
//   }, [user]);

//   const handleInputChange = (
//     field: keyof ProfileFormData,
//     value: string
//   ) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//     setError(null); // Réinitialiser les messages lors de la saisie
//     setMessage(null);
//   };

//   const handleUpdateProfile = async () => {
//     if (!userToken) {
//       setError("Vous n'êtes pas connecté.");
//       setTimeout(() => setError(null), 3000);
//       return;
//     }
//     if (!formData.name.trim()) {
//       setError("Le nom ne peut pas être vide.");
//       setTimeout(() => setError(null), 3000);
//       return;
//     }

//     setIsLoading(true);
//     setError(null); // Effacer les anciens messages
//     setMessage(null); // Effacer les anciens messages

//     const payload: Partial<ProfileFormData> = {};
//     // Envoyer seulement les champs qui ont été modifiés ou qui ont une valeur
//     if (formData.name.trim() !== (user?.name || ""))
//       payload.name = formData.name.trim();
//     // Pour address et phone, envoyer même si vide pour permettre de les effacer,
//     // ou ajouter une logique pour ne les envoyer que s'ils sont différents et non vides.
//     // Ici, on les envoie s'ils sont différents de l'état initial de l'utilisateur.
//     if (formData.address.trim() !== ((user as any)?.address || ""))
//       payload.address = formData.address.trim();
//     if (formData.phone.trim() !== ((user as any)?.phone || ""))
//       payload.phone = formData.phone.trim();

//     if (Object.keys(payload).length === 0) {
//       setMessage("Aucune modification détectée.");
//       setTimeout(() => setMessage(null), 3000);
//       setIsLoading(false);
//       return;
//     }

//     try {
//       console.log("Frontend: Tentative de mise à jour du profil...");
//       const response = await fetch(`${API_BASE_URL}/users/me`, {
//         // API pour mettre à jour son propre profil
//         method: "PUT",
//         headers: {
//           Authorization: `Bearer ${userToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         console.error(
//           "Frontend: Erreur API mise à jour profil:",
//           response.status,
//           data
//         );
//           setError(data.message || "Erreur lors de la mise à jour du profil.");
//         setTimeout(() => setError(null), 3000);
//         throw new Error(data.message || `Erreur ${response.status}`);
//       }

//       console.log("Frontend: Réponse API mise à jour profil:", data);
//       setMessage("Profil mis à jour avec succès !");
//         setTimeout(() => setMessage(null), 3000);
//       if (data.user) {
//         updateUserInContext(data.user); // <<<< APPELLE CETTE FONCTION
//       }
//     } catch (err: any) {
//       console.error("ChangePasswordScreen: Erreur:", err);
//         setError(err.message || "Une erreur est survenue.");
//         setTimeout(() => setError(null), 3000);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//       style={[styles.screenContainer, { flex: 1, backgroundColor }]}
//     >
//       <ScrollView contentContainerStyle={styles.scrollContainer}>
//         <Stack.Screen options={{ title: "Modifier le mot de passe" }} />
//         {/* Affichage des messages */}
//           {error && <Text style={[styles.message, {backgroundColor: Colors[currentScheme].errorBackground , color: Colors[currentScheme].errorText}]}>{error}</Text>}
//           {message && <Text style={[styles.message, {backgroundColor: Colors[currentScheme].successBackground , color: Colors[currentScheme].successText}]}>{message}</Text>}
//         <View style={[styles.container, { backgroundColor: cardColor }]}>
//           <Text style={[styles.title, { color: textColor }]}>
//             Modifier votre profil
//           </Text>

//           <View
//             style={[
//               styles.inputContainer,
//               {
//                 backgroundColor: cardColor,
//                 borderColor: subtleTextColor,
//               },
//             ]}
//           >
//             <TextInput
//               style={[styles.input, { color: textColor }]}
//               placeholder="Votre nom et prénom"
//               placeholderTextColor={subtleTextColor}
//               value={formData.name}
//               onChangeText={(val) => handleInputChange("name", val)}
//               textContentType="name"
//             />
//           </View>

//           <View
//             style={[
//               styles.inputContainer,
//               {
//                 backgroundColor: cardColor,
//                 borderColor: subtleTextColor,
//               },
//             ]}
//           >
//             <TextInput
//               style={[styles.input, { color: textColor }]}
//               placeholder="Votre adresse de livraison principale"
//               placeholderTextColor={subtleTextColor}
//               value={formData.address}
//               onChangeText={(val) => handleInputChange("address", val)}
//               multiline
//               numberOfLines={3}
//             />
//           </View>

//           <View
//             style={[
//               styles.inputContainer,
//               {
//                 backgroundColor: cardColor,
//                 borderColor: subtleTextColor,
//               },
//             ]}
//           >
//             <TextInput
//               style={[styles.input, { color: textColor }]}
//               placeholder="Votre numéro de téléphone"
//               placeholderTextColor={subtleTextColor}
//               value={formData.phone}
//               onChangeText={(val) => handleInputChange("phone", val)}
//               keyboardType="phone-pad"
//             />
//           </View>

//           <TouchableOpacity
//             style={[
//               styles.button,
//               { backgroundColor: tintColor },
//               isLoading && styles.buttonDisabled,
//             ]}
//             onPress={handleUpdateProfile}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <ActivityIndicator color="white" />
//             ) : (
//               <Text style={styles.buttonText}>
//                 Mettre à jour le profil
//               </Text>
//             )}
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   screenContainer: { flex: 1 },
//   scrollContainer: {
//     flexGrow: 1,
//     justifyContent: "center",
//   },
//   container: {
//     flex: 1, // Important pour KeyboardAvoidingView + ScrollView
//     justifyContent: "center",
//     paddingHorizontal: 24,
//     paddingVertical: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     textAlign: "center",
//     marginBottom: 30,
//   },
//   inputContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderRadius: 8,
//     borderWidth: 1,
//     marginBottom: 20,
//     paddingHorizontal: 10, // Padding intérieur pour l'input et l'icône
//   },
//   input: {
//     flex: 1, // Pour que l'input prenne l'espace
//     paddingVertical: Platform.OS === "ios" ? 15 : 12, // Ajustement pour iOS
//     fontSize: 16,
//   },
//   eyeIcon: {
//     padding: 10, // Zone de clic pour l'icône
//   },
//   button: {
//     paddingVertical: 15,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     marginTop: 10,
//     minHeight: 50,
//   },
//   buttonDisabled: {
//     opacity: 0.7,
//   },
//   buttonText: {
//     color: "white",
//     fontSize: 18,
//     fontWeight: "600",
//   },
//     message: {
//     padding: 10,
//     borderRadius: 5,
//     textAlign: 'center',
//     fontWeight: 'bold',
//     marginVertical: 15,
//     fontSize: 15,
//   },
//   errorMessage: {
//     color: "red", // Retire car colors.errorText sera utilisé
//     textAlign: "center",
//     marginBottom: 15,
//     fontSize: 15,
//   },
//   successMessage: {
//     color: "green", // Retire car colors.successText sera utilisé
//     marginTop: 10,
//     marginBottom: 10,
//     textAlign: "center",
//   },
// });

// ARTIVA/front_end/app/settings/edit-profile.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { useAuth, User } from "../../context/AuthContext";

interface ProfileFormData {
  name: string;
  address: string;
  phone: string;
}

const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

export default function EditProfileScreen() {
  const { user, userToken, updateUserInContext, effectiveAppColorScheme } =
    useAuth();
  const router = useRouter();

  // CHANGEMENT: Utilisation directe de l'objet de couleurs basé sur le thème
  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];
  const tintColor = colors.tint;
  const textColor = colors.text;
  const backgroundColor = colors.background;
  const cardColor = colors.card;
  const subtleTextColor = colors.subtleText;
  const errorTextColor = colors.errorText;

  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    address: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplir le formulaire avec les données utilisateur actuelles
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        address: (user as any).address || "",
        phone: (user as any).phone || "",
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setMessage(null);
  };

  const handleUpdateProfile = async () => {
    if (!userToken) {
      setError("Vous n'êtes pas connecté.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!formData.name.trim()) {
      setError("Le nom ne peut pas être vide.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    const payload: Partial<ProfileFormData> = {};
    // Envoyer seulement les champs qui ont été modifiés ou qui ont une valeur
    if (formData.name.trim() !== (user?.name || ""))
      payload.name = formData.name.trim();
    // Pour address et phone, envoyer même si vide pour permettre de les effacer,
    // ou ajouter une logique pour ne les envoyer que s'ils sont différents et non vides.
    // Ici, on les envoie s'ils sont différents de l'état initial de l'utilisateur.
    if (formData.address.trim() !== ((user as any)?.address || ""))
      payload.address = formData.address.trim();
    if (formData.phone.trim() !== ((user as any)?.phone || ""))
      payload.phone = formData.phone.trim();

    if (Object.keys(payload).length === 0) {
      setMessage("Aucune modification détectée.");
      setTimeout(() => setMessage(null), 3000);
      setIsLoading(false);
      return;
    }

    try {
      console.log("Frontend: Tentative de mise à jour du profil...");
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        // API pour mettre à jour son propre profil
        method: "PUT",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Frontend: Erreur API mise à jour profil:",
          response.status,
          data
        );
        setError(data.message || "Erreur lors de la mise à jour du profil.");
        setTimeout(() => setError(null), 3000);
        throw new Error(data.message || `Erreur ${response.status}`);
      }

      console.log("Frontend: Réponse API mise à jour profil:", data);
      setMessage("Profil mis à jour avec succès !");
      setTimeout(() => setMessage(null), 3000);
      if (data.user) {
        updateUserInContext(data.user);
      }
    } catch (e: any) {
      console.error("ChangePasswordScreen: Erreur:", e);
      setError(e.message || "Une erreur est survenue.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.screenContainer,
        { flex: 1, backgroundColor: backgroundColor },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Stack.Screen options={{ title: "Modifier le profil" }} />
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
        <View style={[styles.container, { backgroundColor: cardColor }]}>
          <Text style={[styles.label, { color: textColor }]}>
            Nom complet :
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: textColor,
                borderColor: subtleTextColor,
                backgroundColor: cardColor,
              },
            ]}
            value={formData.name}
            onChangeText={(val) => handleInputChange("name", val)}
            placeholder="Votre nom et prénom"
            placeholderTextColor={subtleTextColor}
          />

          <Text style={[styles.label, { color: textColor }]}>Adresse :</Text>
          <TextInput
            style={[
              styles.input,
              styles.textAreaInput, // Utiliser un style spécifique pour le textArea
              {
                color: textColor,
                borderColor: subtleTextColor,
                backgroundColor: cardColor,
              },
            ]}
            value={formData.address}
            onChangeText={(val) => handleInputChange("address", val)}
            placeholder="Votre adresse de livraison principale"
            placeholderTextColor={subtleTextColor}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, { color: textColor }]}>
            Numéro de téléphone :
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: textColor,
                borderColor: subtleTextColor,
                backgroundColor: cardColor,
              },
            ]}
            value={formData.phone}
            onChangeText={(val) => handleInputChange("phone", val)}
            placeholder="Votre numéro de téléphone"
            placeholderTextColor={subtleTextColor}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: tintColor },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleUpdateProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Mettre à jour le profil</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1, // Important pour KeyboardAvoidingView + ScrollView
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "column", // Aligner le label au-dessus de l'input
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    // borderColor: subtleTextColor,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    // color: //couleur du theme
    margin: 15,
  },
  textAreaInput: {
    height: 100, // Hauteur pour multiline
    textAlignVertical: "top", // Pour Android
    paddingTop: 15,
  },
  eyeIcon: {
    padding: 10, // Zone de clic pour l'icône
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  message: {
    padding: 10,
    borderRadius: 5,
    textAlign: "center",
    fontWeight: "bold",
    marginVertical: 15,
    fontSize: 15,
  },
  errorMessage: {
    textAlign: "center",
    marginBottom: 15,
    fontSize: 15,
    color: "red", //Géré par le theme
  },
  successMessage: {
    marginTop: 10,
    marginBottom: 10,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "left", // Aligner le label à gauche
  },
});
