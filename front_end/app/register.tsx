// ARTIVA/front_end/app/register.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  useColorScheme,
  Dimensions,
  Linking,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { normalizeColorScheme } from "../constants/ColorScheme";
import { useAuth } from "../context/AuthContext";
import LoadingArtiva from "./product/LoadingArtiva";
import { API_BASE_URL } from "../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";
const { height } = Dimensions.get("window");

export default function RegisterScreen() {
  const router = useRouter();
  const { signInWithGoogle, isLoading: isAuthLoading, effectiveAppColorScheme } = useAuth();
  
  const colorScheme = normalizeColorScheme(useColorScheme());
  const colors = Colors[colorScheme];

  // ÉTAPE 1 : Informations personnelles
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // ✅ Validation Étape 1
  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};
    const { name, email, phone, address } = formData;

    if (!name.trim()) newErrors.name = "Nom complet requis";
    if (!email.trim()) {
      newErrors.email = "Email requis";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email invalide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Validation Étape 2
  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {};
    const { password, confirmPassword } = formData;

    if (!password) {
      newErrors.password = "Mot de passe requis";
    } else if (password.length < 8) {
      newErrors.password = "8 caractères minimum";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    if (!acceptedTerms) {
      newErrors.terms = "Acceptez les conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Navigation vers Étape 2
  const goToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  // ✅ Navigation vers Étape 1
  const goToStep1 = () => {
    setStep(1);
  };

  // ✅ Inscription finale
  const handleRegister = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          address: formData.address || null,
          phone: formData.phone || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Erreur serveur (${response.status})`);
      }

      Alert.alert(
        "🎉 Inscription réussie !",
        "Votre compte a été créé avec succès.",
        [{ text: "Se connecter", onPress: () => router.push("/login") }]
      );

    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      Alert.alert("❌ Erreur", error.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Connexion Google
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Erreur Google login:", error);
      Alert.alert("❌ Erreur", "Impossible de se connecter avec Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ✅ Ouvrir les liens des conditions
  const openTerms = () => {
    Linking.openURL("https://whilfred.github.io/privacy.artiva/").catch(() =>
      Alert.alert("Erreur", "Impossible d'ouvrir la page des conditions.")
    );
  };

  const openPrivacy = () => {
    Linking.openURL("https://whilfred.github.io/privacy.artiva/").catch(() =>
      Alert.alert("Erreur", "Impossible d'ouvrir la page de confidentialité.")
    );
  };

  // ✅ Si l'authentification est en cours, afficher le chargement personnalisé
  if (isAuthLoading) {
    return <LoadingArtiva theme={effectiveAppColorScheme || 'light'} />;
  }

  // ✅ Rendu des indicateurs d'étape
  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      <View style={styles.stepIndicator}>
        <View style={[
          styles.stepCircle,
          step >= 1 && { backgroundColor: colors.primary }
        ]}>
          <Text style={[styles.stepCircleText, step >= 1 && { color: '#fff' }]}>
            {step === 1 ? '1' : '✓'}
          </Text>
        </View>
        <View style={[
          styles.stepLine,
          step > 1 && { backgroundColor: colors.primary }
        ]} />
        <View style={[
          styles.stepCircle,
          step >= 2 && { backgroundColor: colors.primary }
        ]}>
          <Text style={[styles.stepCircleText, step >= 2 && { color: '#fff' }]}>
            {step === 2 ? '2' : step > 2 ? '✓' : '2'}
          </Text>
        </View>
      </View>
      <View style={styles.stepLabels}>
        <Text style={[styles.stepLabel, { color: step >= 1 ? colors.primary : colors.subtleText }]}>
          Informations
        </Text>
        <Text style={[styles.stepLabel, { color: step >= 2 ? colors.primary : colors.subtleText }]}>
          Sécurité
        </Text>
      </View>
    </View>
  );

  // ✅ Rendu Étape 1
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="person-outline" size={36} color={colors.primary} />
      </View>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Qui êtes-vous ?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.subtleText }]}>
        Remplissez vos informations personnelles
      </Text>

      <View style={styles.inputGroup}>
        <View style={[styles.inputIconContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
          <Ionicons name="person-outline" size={20} color={colors.subtleText} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Nom complet *"
            placeholderTextColor={colors.subtleText}
            value={formData.name}
            onChangeText={(text) => handleInputChange("name", text)}
          />
        </View>
        {errors.name && <Text style={[styles.errorText, { color: colors.errorText }]}>{errors.name}</Text>}

        <View style={[styles.inputIconContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
          <MaterialIcons name="mail-outline" size={20} color={colors.subtleText} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Adresse e-mail *"
            placeholderTextColor={colors.subtleText}
            value={formData.email}
            onChangeText={(text) => handleInputChange("email", text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email && <Text style={[styles.errorText, { color: colors.errorText }]}>{errors.email}</Text>}

        <View style={[styles.inputIconContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
          <Ionicons name="call-outline" size={20} color={colors.subtleText} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Numéro de téléphone"
            placeholderTextColor={colors.subtleText}
            value={formData.phone}
            onChangeText={(text) => handleInputChange("phone", text)}
            keyboardType="phone-pad"
          />
        </View>

        <View style={[styles.inputIconContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
          <Ionicons name="location-outline" size={20} color={colors.subtleText} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Adresse complète"
            placeholderTextColor={colors.subtleText}
            value={formData.address}
            onChangeText={(text) => handleInputChange("address", text)}
          />
        </View>
      </View>

      {/* ✅ Google Button - Étape 1 */}
      <TouchableOpacity
        style={[styles.googleButton, { borderColor: colors.cardBorder || colors.inputBorder }]}
        onPress={handleGoogleLogin}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <ActivityIndicator color="#DB4437" />
        ) : (
          <>
            <FontAwesome name="google" size={20} color="#DB4437" />
            <Text style={[styles.googleButtonText, { color: colors.text }]}>
              Continuer avec Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.step1Separator}>
        <View style={[styles.separatorLine, { backgroundColor: colors.cardBorder || '#ccc' }]} />
        <Text style={[styles.separatorText, { color: colors.subtleText }]}>ou</Text>
        <View style={[styles.separatorLine, { backgroundColor: colors.cardBorder || '#ccc' }]} />
      </View>

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        onPress={goToStep2}
      >
        <Text style={styles.nextButtonText}>Continuer avec email</Text>
      </TouchableOpacity>
    </View>
  );

  // ✅ Rendu Étape 2
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
      </View>

      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Sécurisez votre compte
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.subtleText }]}>
        Créez un mot de passe fort
      </Text>

      <View style={styles.inputGroup}>
        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.subtleText} />
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="Mot de passe * (8 caractères min)"
            placeholderTextColor={colors.subtleText}
            value={formData.password}
            onChangeText={(text) => handleInputChange("password", text)}
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
        {errors.password && <Text style={[styles.errorText, { color: colors.errorText }]}>{errors.password}</Text>}

        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder || colors.cardBorder }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.subtleText} />
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="Confirmer le mot de passe *"
            placeholderTextColor={colors.subtleText}
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange("confirmPassword", text)}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={colors.subtleText}
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={[styles.errorText, { color: colors.errorText }]}>{errors.confirmPassword}</Text>}

        {/* ✅ Checkbox avec liens cliquables */}
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            {acceptedTerms ? (
              <Ionicons name="checkbox" size={24} color={colors.primary} />
            ) : (
              <Ionicons name="square-outline" size={24} color={colors.subtleText} />
            )}
          </TouchableOpacity>
          <Text style={[styles.termsText, { color: colors.text }]}>
            J'accepte les
            <TouchableOpacity onPress={openTerms}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                conditions d'utilisation
              </Text>
            </TouchableOpacity>
            {' '}et la
            <TouchableOpacity onPress={openPrivacy}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                politique de confidentialité
              </Text>
            </TouchableOpacity>
          </Text>
        </View>
        {errors.terms && <Text style={[styles.errorText, { color: colors.errorText }]}>{errors.terms}</Text>}
      </View>

      <View style={styles.step2Buttons}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.cardBorder || colors.inputBorder }]}
          onPress={goToStep1}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>Retour</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.registerButton,
            { 
              backgroundColor: acceptedTerms ? colors.primary : colors.subtleText,
              opacity: acceptedTerms ? 1 : 0.5
            }
          ]}
          onPress={handleRegister}
          disabled={isLoading || !acceptedTerms}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.registerButtonText}>S'inscrire</Text>
              <Ionicons name="checkmark" size={22} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ✅ Google Button - Étape 2 */}
      <View style={styles.separatorContainer}>
        <View style={[styles.separatorLine, { backgroundColor: colors.cardBorder || '#ccc' }]} />
        <Text style={[styles.separatorText, { color: colors.subtleText }]}>ou</Text>
        <View style={[styles.separatorLine, { backgroundColor: colors.cardBorder || '#ccc' }]} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, { borderColor: colors.cardBorder || colors.inputBorder }]}
        onPress={handleGoogleLogin}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <ActivityIndicator color="#DB4437" />
        ) : (
          <>
            <FontAwesome name="google" size={20} color="#DB4437" />
            <Text style={[styles.googleButtonText, { color: colors.text }]}>
              Continuer avec Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.subtleText }]}>
          Déjà un compte ?
        </Text>
        <Link href="/login" asChild>
          <TouchableOpacity>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Se connecter
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.container}>
            {/* Logo - plus compact */}
            <Text style={[styles.logo, { color: colors.primary }]}>Artiva</Text>
            
            {/* Indicateur d'étape */}
            {renderStepIndicator()}

            {/* Contenu */}
            {step === 1 ? renderStep1() : renderStep2()}
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
    paddingVertical: 16,
  },
  container: {
    flex: 1,
    paddingTop: 30,
  },
  logo: {
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  // ✅ Indicateurs d'étape
  stepIndicatorContainer: {
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#999',
  },
  stepLine: {
    width: 55,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  // ✅ Conteneur d'étape
  stepContainer: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 22,
  },
  inputGroup: {
    gap: 4,
  },
  // ✅ Inputs - PLUS GRANDS
  inputIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
  },
  // ✅ Checkbox avec liens
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    flexWrap: 'wrap',
  },
  checkbox: {
    marginRight: 12,
  },
  termsText: {
    fontSize: 14,
    flex: 1,
  },
  // ✅ Boutons - PLUS GRANDS
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  step1Separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  step2Buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  // ✅ Séparateur
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 12,
    fontSize: 14,
  },
  // ✅ Google Button - PLUS GRAND
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // ✅ Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 4,
  },
});