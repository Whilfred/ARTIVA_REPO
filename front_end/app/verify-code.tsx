// ARTIVA/front_end/app/verify-code.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import Colors from "../constants/Colors";

const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

export default function VerifyCode() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = typeof params.email === "string" ? params.email : "";

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyCodeAPI = async (email: string, code: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Code invalide");
    return data;
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert("❌ Erreur", "Veuillez saisir un code à 6 chiffres valide");
      return;
    }

    setLoading(true);
    try {
      const data = await verifyCodeAPI(email, code);
      await signIn(data.token, data.user);
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("❌ Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      // Appel API pour renvoyer le code
      const res = await fetch(`${API_BASE_URL}/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (res.ok) {
        Alert.alert("✅ Succès", "Un nouveau code vous a été envoyé par email");
      } else {
        Alert.alert("❌ Erreur", "Impossible de renvoyer le code");
      }
    } catch (error) {
      Alert.alert("❌ Erreur", "Une erreur est survenue");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ 
        title: "Vérification",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Logo */}
            <Text style={[styles.logo, { color: colors.primary }]}>Artiva</Text>

            {/* Icône et titre */}
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={56} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Vérifiez votre email
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtleText }]}>
              Nous avons envoyé un code à
            </Text>
            <Text style={[styles.emailText, { color: colors.primary }]}>
              {email}
            </Text>

            {/* Code input */}
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { borderColor: colors.cardBorder || colors.inputBorder }]}>
                <Ionicons name="key-outline" size={22} color={colors.subtleText} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Code à 6 chiffres"
                  placeholderTextColor={colors.subtleText}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            {/* Bouton Valider */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Vérifier</Text>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Renvoyer le code */}
            <View style={styles.resendContainer}>
              <Text style={[styles.resendText, { color: colors.subtleText }]}>
                Vous n'avez pas reçu le code ?
              </Text>
              <TouchableOpacity onPress={handleResendCode}>
                <Text style={[styles.resendLink, { color: colors.primary }]}>
                  Renvoyer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Retour à la connexion */}
            <TouchableOpacity
              style={styles.backContainer}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={18} color={colors.subtleText} />
              <Text style={[styles.backText, { color: colors.subtleText }]}>
                Retour à la connexion
              </Text>
            </TouchableOpacity>
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
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  logo: {
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 2,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 28,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
    letterSpacing: 2,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 4,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "700",
  },
  backContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 6,
  },
  backText: {
    fontSize: 14,
  },
});
