// ARTIVA/front_end/app/login.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  useColorScheme,
  Dimensions,
} from "react-native";
import { Alert } from "../constants/Alerte"; // Alert.alert est inopérant sur le web — voir ce fichier
import { useRouter, Link } from "expo-router";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { normalizeColorScheme } from "../constants/ColorScheme";
import { useAuth } from "../context/AuthContext";
import LoadingArtiva from "./product/LoadingArtiva";
import { API_BASE_URL } from "../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";
const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = normalizeColorScheme(useColorScheme());
  const colors = Colors[colorScheme];
  const { signInWithGoogle, userToken, isGoogleSigningIn, isLoading: isAuthLoading, effectiveAppColorScheme } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ REDIRECTION AUTOMATIQUE VERS HOME SI DÉJÀ CONNECTÉ
  useEffect(() => {
    if (userToken) {
      router.replace("/(tabs)");
    }
  }, [userToken, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("❌ Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Email ou mot de passe incorrect");

      router.push({ pathname: "/verify-code", params: { email } });
    } catch (err: any) {
      Alert.alert("❌ Erreur", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Connexion Google
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Erreur Google login:", error);
      Alert.alert("❌ Erreur", "Impossible de se connecter avec Google");
    }
  };

  // ✅ Si l'authentification est en cours, afficher le chargement personnalisé
  if (isAuthLoading) {
    return <LoadingArtiva theme={effectiveAppColorScheme || 'light'} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Logo et en-tête */}
            <View style={styles.headerContainer}>
              <Text style={[styles.logo, { color: colors.primary }]}>Artiva</Text>
              <Text style={[styles.welcomeText, { color: colors.text }]}>
                Bonjour 👋
              </Text>
              <Text style={[styles.subtitle, { color: colors.subtleText }]}>
                Connectez-vous à votre compte
              </Text>
            </View>

            {/* Formulaire */}
            <View style={styles.formContainer}>
              {/* Email */}
              <View style={styles.inputGroup}>
                <View style={[styles.inputIconContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
                  <MaterialIcons name="mail-outline" size={22} color={colors.subtleText} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Adresse e-mail"
                    placeholderTextColor={colors.subtleText}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Mot de passe */}
                <View style={[styles.passwordContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
                  <Ionicons name="lock-closed-outline" size={22} color={colors.subtleText} />
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    placeholder="Mot de passe"
                    placeholderTextColor={colors.subtleText}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.subtleText}
                    />
                  </TouchableOpacity>
                </View>

                {/* Mot de passe oublié */}
                <TouchableOpacity
                  onPress={() => router.push("/forgot-password")}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                    Mot de passe oublié ?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bouton connexion */}
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                    <Ionicons name="arrow-forward" size={22} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              {/* Séparateur */}
              <View style={styles.separatorContainer}>
                <View style={[styles.separatorLine, { backgroundColor: colors.cardBorder || '#ccc' }]} />
                <Text style={[styles.separatorText, { color: colors.subtleText }]}>ou</Text>
                <View style={[styles.separatorLine, { backgroundColor: colors.cardBorder || '#ccc' }]} />
              </View>

              {/* Bouton Google */}
              <TouchableOpacity
                style={[styles.googleButton, { borderColor: colors.cardBorder || '#ccc' }]}
                onPress={handleGoogleLogin}
                disabled={isSubmitting || isGoogleSigningIn}
              >
                {isGoogleSigningIn ? (
                  <ActivityIndicator color="#DB4437" size="small" />
                ) : (
                  <>
                    <FontAwesome name="google" size={20} color="#DB4437" />
                    <Text style={[styles.googleButtonText, { color: colors.text }]}>
                      Continuer avec Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Lien vers l'inscription */}
              <View style={styles.registerContainer}>
                <Text style={[styles.registerText, { color: colors.subtleText }]}>
                  Pas encore inscrit ?
                </Text>
                <Link href="/register" asChild>
                  <TouchableOpacity>
                    <Text style={[styles.registerLink, { color: colors.primary }]}>
                      Créer un compte
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  // ✅ En-tête
  headerContainer: {
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  // ✅ Formulaire
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    gap: 4,
    marginBottom: 8,
  },
  inputIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // ✅ Bouton connexion
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  // ✅ Séparateur
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 12,
    fontSize: 14,
  },
  // ✅ Google
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // ✅ Inscription
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
    gap: 4,
  },
  registerText: {
    fontSize: 15,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
