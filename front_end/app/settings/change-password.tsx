// ARTIVA/front_end/app/change-password.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import LoadingArtiva from "../product/LoadingArtiva";
import { API_BASE_URL } from "../../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { userToken, signOut, effectiveAppColorScheme, isLoading: isAuthLoading } = useAuth();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];
  const tintColor = colors.tint;
  const textColor = colors.text;
  const backgroundColor = colors.background;
  const cardColor = colors.card;
  const subtleTextColor = colors.subtleText;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Si l'authentification est en cours, afficher le chargement personnalisé
  if (isAuthLoading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  // ✅ Si l'utilisateur n'est pas connecté, rediriger vers login
  if (!userToken) {
    router.replace("/login");
    return null;
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError("Veuillez remplir tous les champs.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      console.log("Frontend: Tentative de changement de mot de passe...");
      const response = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Frontend: Erreur API changement mot de passe:",
          response.status,
          data
        );
        setError(data.message || "Erreur lors du changement de mot de passe.");
        setTimeout(() => setError(null), 3000);
        throw new Error(data.message || `Erreur ${response.status}`);
      }

      console.log("Frontend: Réponse API changement mot de passe:", data);
      setMessage(
        data.message +
          ". Vous allez être déconnecté pour des raisons de sécurité."
      );
      setTimeout(async () => {
        await signOut();
        router.replace("/login");
      }, 3000);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e: any) {
      console.error("ChangePasswordScreen: Erreur:", e);
      setError(
        e.message ||
          "Une erreur est survenue lors du changement de mot de passe."
      );
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screenContainer, { flex: 1, backgroundColor }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Stack.Screen options={{ title: "Changer le mot de passe" }} />

        {error && (
          <Text
            style={[
              styles.message,
              {
                backgroundColor: currentScheme === "dark" ? "#3d1a1a" : "#fde8e8",
                color: colors.errorText,
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
                backgroundColor: currentScheme === "dark" ? "#1a3d1a" : "#e8f5e9",
                color: currentScheme === "dark" ? "#4caf50" : "#2e7d32",
              },
            ]}
          >
            {message}
          </Text>
        )}

        <View style={[styles.container, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Changer votre mot de passe
          </Text>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: cardColor,
                borderColor: subtleTextColor,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Mot de passe actuel"
              placeholderTextColor={subtleTextColor}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              textContentType="password"
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              style={styles.eyeIcon}
            >
              <FontAwesome
                name={showCurrentPassword ? "eye-slash" : "eye"}
                size={20}
                color={subtleTextColor}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: cardColor,
                borderColor: subtleTextColor,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Nouveau mot de passe"
              placeholderTextColor={subtleTextColor}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
            >
              <FontAwesome
                name={showNewPassword ? "eye-slash" : "eye"}
                size={20}
                color={subtleTextColor}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: cardColor,
                borderColor: subtleTextColor,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Confirmer le nouveau mot de passe"
              placeholderTextColor={subtleTextColor}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry={!showConfirmNewPassword}
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
              style={styles.eyeIcon}
            >
              <FontAwesome
                name={showConfirmNewPassword ? "eye-slash" : "eye"}
                size={20}
                color={subtleTextColor}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: tintColor },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                Mettre à jour le mot de passe
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
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
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 15 : 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
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
  errorMessage: {
    color: "red",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 15,
  },
  message: {
    padding: 10,
    borderRadius: 5,
    textAlign: "center",
    fontWeight: "bold",
    marginVertical: 15,
    fontSize: 15,
  },
  successMessage: {
    color: "green",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 15,
  },
});
