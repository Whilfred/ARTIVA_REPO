// ARTIVA/front_end/app/checkout.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
// expo-media-library n'est PAS importe ici volontairement.
//
// Depuis le SDK 57, ce module s'appuie sur le module natif
// "ExpoMediaLibraryNext", qui n'a pas d'implementation web : un import en tete
// de fichier fait planter tout l'ecran de commande dans un navigateur, avant
// meme qu'il s'affiche. Il est donc charge a la demande, dans
// handleDownloadQrCode, et uniquement sur mobile.
import { Picker } from "@react-native-picker/picker";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import Colors from "../constants/Colors";
import LoadingArtiva from "./product/LoadingArtiva";
import { API_BASE_URL } from "../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

// ============================================================
// TARIFS DE LIVRAISON
// ============================================================

// Villes du Sud Bénin
const VILLES_SUD = [
  "Cotonou", "Porto-Novo", "Abomey-Calavi", "Sèmè-Kpodji",
  "Ouidah", "Allada", "Lokossa", "Dogbo", "Grand-Popo", "Sakété", "Kétou",
];

// Villes du Nord Bénin
const VILLES_NORD = [
  "Parakou", "Djougou", "Kandi", "Natitingou", "Bohicon",
  "Abomey", "Savalou", "Dassa-Zoumé", "Nikki", "Tanguiéta",
  "Malanville", "Banikoara",
];

// Villes du Burkina Faso
const VILLES_BURKINA = [
  "Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya",
  "Kaya", "Banfora", "Fada N'Gourma",
];

// Villes de Côte d'Ivoire
const VILLES_COTE_IVOIRE = [
  "Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro", "Korhogo", "Daloa",
];

// Pays disponibles
const PAYS_DISPONIBLES = ["Bénin", "Burkina Faso", "Côte d'Ivoire"];

// Calcul des frais de livraison selon le pays et la ville
const getShippingCost = (pays: string, ville: string): number => {
  if (pays === "Burkina Faso") return 5000;
  if (pays === "Côte d'Ivoire") return 7200;
  // Bénin
  if (VILLES_SUD.includes(ville)) return 1500;
  if (VILLES_NORD.includes(ville)) return 2000;
  return 2000; // défaut
};

// Obtenir la liste des villes selon le pays
const getVillesByPays = (pays: string): string[] => {
  if (pays === "Burkina Faso") return VILLES_BURKINA;
  if (pays === "Côte d'Ivoire") return VILLES_COTE_IVOIRE;
  return [...VILLES_SUD, ...VILLES_NORD];
};

// Obtenir le libellé de la zone
const getZoneLabel = (pays: string, ville: string): string => {
  if (pays === "Burkina Faso") return "🌍 International — Bénin ↔ Burkina Faso";
  if (pays === "Côte d'Ivoire") return "🌍 International — Bénin ↔ Côte d'Ivoire";
  if (VILLES_SUD.includes(ville)) return "📍 Zone Sud Bénin";
  if (VILLES_NORD.includes(ville)) return "📍 Zone Nord Bénin";
  return "📍 Bénin";
};

// Seuil de basculement paiement avant livraison
const SEUIL_PAIEMENT_AVANT_LIVRAISON = 10000; // 10 000 FCFA

// ============================================================
// TYPES
// ============================================================

interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  paymentMethod: "cod" | "mobile_money" | "card" | "manual_contact";
  notes?: string;
}

interface OrderConfirmationData {
  orderNumber: string;
  qrValue: string;
  isManualPayment: boolean;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function CheckoutScreen() {
  const router = useRouter();
  const { user, userToken, isLoading: isAuthLoading, effectiveAppColorScheme } = useAuth();
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const qrCodeRef = useRef<ViewShotRef>(null);

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = {
    tint: Colors[currentScheme].tint,
    text: Colors[currentScheme].text,
    background: Colors[currentScheme].background,
    subtleText: Colors[currentScheme].subtleText,
    card: Colors[currentScheme].card,
    border: Colors[currentScheme].cardBorder,
    errorText: Colors[currentScheme].errorText,
    successText: Colors[currentScheme].successText,
    disabled: "#BDBDBD",
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "Cotonou",
    country: "Bénin",
    paymentMethod: "cod",
    addressLine2: "",
    postalCode: "",
    notes: "",
  });
  // --- Code promotionnel ---------------------------------------------------
  // La remise n'est jamais calculée ici : elle est demandée au serveur, seul
  // habilité à dire si un code est valable et combien il vaut. L'écran ne fait
  // qu'afficher sa réponse.
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; reduction: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  const discount = appliedPromo ? appliedPromo.reduction : 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [orderConfirmationData, setOrderConfirmationData] = useState<OrderConfirmationData | null>(null);

  // Calcul des prix
  const subTotal = getTotalPrice();
  const shippingCost = getShippingCost(formData.country, formData.city);
  const total = subTotal - discount + shippingCost;
  const isPaiementAvantLivraison = total > SEUIL_PAIEMENT_AVANT_LIVRAISON;

  // ============================================================
  // EFFETS
  // ============================================================

  useEffect(() => {
    if (!isAuthLoading && !userToken) {
      router.replace("/login");
    }
  }, [userToken, isAuthLoading]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
        phone: (user as any).phone || prev.phone,
        addressLine1: (user as any).address || prev.addressLine1,
      }));
    }
  }, [user]);

  // ============================================================
  // GESTIONNAIRES
  // ============================================================

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaysChange = (pays: string) => {
    const villes = getVillesByPays(pays);
    setFormData((prev) => ({
      ...prev,
      country: pays,
      city: villes[0],
    }));
  };

  const validateStep2 = () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.addressLine1 || !formData.city) {
      setSubmissionError("Veuillez remplir tous les champs obligatoires (*).");
      return false;
    }
    setSubmissionError(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => setCurrentStep((prev) => prev - 1);

const handleSubmitOrder = async () => {
  if (!validateStep2()) return;
  if (cartItems.length === 0) {
    setSubmissionError("Votre panier est vide.");
    return;
  }
  setIsSubmitting(true);
  setSubmissionError(null);

  // On garde juste l'info pour l'affichage UI
  const isManual = isPaiementAvantLivraison;

  const orderPayload = {
    cart_items: cartItems.map((item) => ({ 
      product_id: item.id, 
      quantity: item.quantity 
    })),
    shipping_address: {
      name: formData.fullName,
      line1: formData.addressLine1,
      line2: formData.addressLine2 || "",
      city: formData.city,
      postal_code: formData.postalCode || "",
      country: formData.country,
      phone: formData.phone,
      email: formData.email,
    },
    payment_method: "cash_on_delivery",
    notes: formData.notes || "",
    currency: "XOF",
    shipping_cost: shippingCost,
    shipping_method: getZoneLabel(formData.country, formData.city),
    total_amount: total,
    // Seul le code circule : le serveur recalcule la remise. Envoyer le montant
    // reviendrait à laisser l'application fixer son propre prix.
    promo_code: appliedPromo ? appliedPromo.code : null,
  };

  console.log("📦 Payload envoyé :", JSON.stringify(orderPayload, null, 2));

  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const responseData = await response.json();
    console.log("📦 Réponse backend :", responseData);

    if (!response.ok) {
      throw new Error(responseData.message || responseData.error || "Erreur lors de la création de la commande.");
    }

    clearCart();
    
    setOrderConfirmationData({
      orderNumber: responseData.order?.order_number || responseData.order?.id?.toString() || "N/A",
      qrValue: String(responseData.order?.id || Date.now()),
      isManualPayment: isManual,
    });
  } catch (err: any) {
    console.error("❌ Erreur:", err);
    setSubmissionError(err.message || "Une erreur est survenue.");
  } finally {
    setIsSubmitting(false);
  }
};

  // --- Code promotionnel ---------------------------------------------------

  const appliquerCodePromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoError("Saisissez un code.");
      return;
    }
    setIsCheckingPromo(true);
    setPromoError(null);
    try {
      const reponse = await fetch(`${API_BASE_URL}/promo/valider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          code,
          cart_items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        }),
      });
      const data = await reponse.json();

      // Un code refusé revient en 200 avec valide:false — ce n'est pas une
      // panne, mais une réponse à afficher telle quelle.
      if (!reponse.ok) {
        setPromoError(data.message || "Impossible de vérifier ce code.");
        return;
      }
      if (!data.valide) {
        setAppliedPromo(null);
        setPromoError(data.message);
        return;
      }

      setAppliedPromo({ code: data.code, reduction: data.reduction });
      setPromoInput("");
      setPromoError(null);
    } catch (err) {
      console.error("Erreur validation code promo:", err);
      setPromoError("Vérification impossible. Vérifiez votre connexion.");
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const retirerCodePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoInput("");
  };

  // Quand le panier change (article retiré, quantité modifiée), la remise
  // devient caduque — et pour un pourcentage, son montant change carrément.
  //
  // Plutôt que de retirer le code et d'obliger le client à le ressaisir, on le
  // revalide en silence : la remise se met à jour toute seule, et le code n'est
  // abandonné que s'il est réellement devenu inapplicable (montant minimum qui
  // n'est plus atteint, par exemple). Le message dit alors pourquoi.
  useEffect(() => {
    if (!appliedPromo) return;

    let annule = false;
    const codeEnCours = appliedPromo.code;

    (async () => {
      try {
        const reponse = await fetch(`${API_BASE_URL}/promo/valider`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
          body: JSON.stringify({
            code: codeEnCours,
            cart_items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          }),
        });
        const data = await reponse.json();
        if (annule) return;   // le panier a encore changé entre-temps

        if (reponse.ok && data.valide) {
          // Ne remplacer l'état que si le montant a bougé, sinon ce useEffect
          // se redéclencherait sans fin.
          setAppliedPromo((actuel) =>
            actuel && actuel.reduction !== data.reduction
              ? { code: data.code, reduction: data.reduction }
              : actuel
          );
        } else {
          setAppliedPromo(null);
          setPromoError(data.message || "Ce code n'est plus applicable à votre panier.");
        }
      } catch {
        // Hors ligne : on garde la remise affichée. Le serveur la revérifiera
        // de toute façon au moment de valider la commande.
      }
    })();

    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTotal]);

  const handleDownloadQrCode = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Non disponible",
        "L'enregistrement dans la galerie n'existe que sur l'application mobile. Faites une capture d'ecran pour conserver ce QR Code."
      );
      return;
    }
    try {
      const MediaLibrary = await import("expo-media-library");
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (permission.status !== "granted") {
        Alert.alert("Permission refusée", "Autorisez l'accès aux photos pour sauvegarder le QR Code.");
        return;
      }
      if (!qrCodeRef.current) {
        Alert.alert("Erreur", "QR Code introuvable.");
        return;
      }
      const uri = await qrCodeRef.current.capture();
      if (!uri) throw new Error("Capture du QR Code échouée");
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync("Commandes Artiva", asset, false);
      Alert.alert("Succès", "QR Code enregistré dans votre galerie (Album: Commandes Artiva)");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder le QR Code.");
    }
  };

  // ============================================================
  // STEPS INDICATOR
  // ============================================================

  const renderStepsIndicator = () => {
    if (orderConfirmationData) return null;
    const steps = [{ label: "Panier" }, { label: "Livraison" }, { label: "Paiement" }];
    return (
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;
          return (
            <React.Fragment key={index}>
              <View style={{ alignItems: "center" }}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isCompleted
                        ? "#4CAF50"
                        : isActive
                        ? colors.tint
                        : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>
                    {isCompleted ? "✓" : stepNumber}
                  </Text>
                </View>
                <Text style={{ marginTop: 4, fontSize: 11, color: isActive ? colors.tint : colors.subtleText, fontWeight: isActive ? "700" : "400" }}>
                  {step.label}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: currentStep > stepNumber ? "#4CAF50" : colors.border }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // ============================================================
  // STEP 1 : PANIER
  // ============================================================

  const renderStep1 = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 20, paddingBottom: 100 }} style={{ flex: 1, backgroundColor: colors.background }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Récapitulatif du Panier</Text>

      {cartItems.map((item) => (
        <View key={item.id} style={[styles.recapItem, { borderBottomColor: colors.border }]}>
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }} numberOfLines={2}>{item.name}</Text>
            <Text style={{ color: colors.subtleText, fontSize: 13, marginTop: 2 }}>Qté : {item.quantity}</Text>
          </View>
          <Text style={{ color: colors.tint, fontWeight: "700" }}>{item.price}</Text>
        </View>
      ))}

      <View style={[styles.totalSection, { backgroundColor: colors.card }]}>
        <View style={styles.totalRow}>
          <Text style={{ color: colors.subtleText, fontSize: 15 }}>Sous-total</Text>
          <Text style={{ color: colors.subtleText, fontSize: 15 }}>{subTotal.toFixed(2)} FCFA</Text>
        </View>
        {discount > 0 && appliedPromo && (
          <View style={styles.totalRow}>
            <Text style={{ color: colors.subtleText, fontSize: 15 }}>
              Réduction ({appliedPromo.code})
            </Text>
            <Text style={{ color: "#4CAF50", fontSize: 15 }}>- {discount.toFixed(2)} FCFA</Text>
          </View>
        )}

        {/* Code promotionnel */}
        <View style={[styles.promoSection, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 8, fontSize: 14 }}>
            🎟️ Code promo
          </Text>

          {appliedPromo ? (
            // Code appliqué : on montre ce qui a été obtenu, et comment le retirer.
            <View style={[styles.promoApplied, { borderColor: "#4CAF50" }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#4CAF50", fontWeight: "700", fontSize: 15 }}>
                  {appliedPromo.code}
                </Text>
                <Text style={{ color: colors.subtleText, fontSize: 13, marginTop: 2 }}>
                  {appliedPromo.reduction.toLocaleString("fr-FR")} FCFA de réduction
                </Text>
              </View>
              <TouchableOpacity onPress={retirerCodePromo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ color: "#E53935", fontSize: 14, fontWeight: "600" }}>Retirer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.promoInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="Saisir un code"
                placeholderTextColor={colors.subtleText}
                value={promoInput}
                onChangeText={(t) => { setPromoInput(t); setPromoError(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isCheckingPromo}
                onSubmitEditing={appliquerCodePromo}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.promoButton, { backgroundColor: colors.tint, opacity: isCheckingPromo || !promoInput.trim() ? 0.5 : 1 }]}
                onPress={appliquerCodePromo}
                disabled={isCheckingPromo || !promoInput.trim()}
              >
                {isCheckingPromo
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Appliquer</Text>}
              </TouchableOpacity>
            </View>
          )}

          {promoError && (
            <Text style={{ color: "#E53935", fontSize: 13, marginTop: 6 }}>{promoError}</Text>
          )}
        </View>

        {/* Sélection pays + ville pour estimer la livraison dès l'étape 1 */}
        <View style={[styles.shippingEstimate, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 8, fontSize: 14 }}>
            📦 Estimation livraison
          </Text>

          <Text style={{ color: colors.subtleText, fontSize: 13, marginBottom: 4 }}>Pays</Text>
          <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Picker
              selectedValue={formData.country}
              onValueChange={handlePaysChange}
              style={{ color: colors.text }}
              dropdownIconColor={colors.subtleText}
            >
              {PAYS_DISPONIBLES.map((p) => (
                <Picker.Item key={p} label={p} value={p} />
              ))}
            </Picker>
          </View>

          <Text style={{ color: colors.subtleText, fontSize: 13, marginBottom: 4, marginTop: 8 }}>Ville</Text>
          <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Picker
              selectedValue={formData.city}
              onValueChange={(val) => handleInputChange("city", val)}
              style={{ color: colors.text }}
              dropdownIconColor={colors.subtleText}
            >
              {getVillesByPays(formData.country).map((v) => (
                <Picker.Item key={v} label={v} value={v} />
              ))}
            </Picker>
          </View>

          <View style={[styles.shippingBadge, { backgroundColor: colors.tint + "20", borderColor: colors.tint }]}>
            <Text style={{ color: colors.tint, fontSize: 12, fontWeight: "600" }}>
              {getZoneLabel(formData.country, formData.city)}
            </Text>
            <Text style={{ color: colors.tint, fontSize: 16, fontWeight: "700", marginTop: 2 }}>
              {shippingCost.toLocaleString()} FCFA
            </Text>
          </View>
        </View>

        <View style={[styles.grandTotalRow, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Total estimé</Text>
          <Text style={{ color: colors.tint, fontSize: 18, fontWeight: "700" }}>{total.toFixed(2)} FCFA</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.tint, marginTop: 20 }]} onPress={handleNextStep}>
        <Text style={styles.submitButtonText}>Informations de Livraison →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ============================================================
  // STEP 2 : LIVRAISON
  // ============================================================

  const renderStep2 = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 20, paddingBottom: 100 }} style={{ flex: 1, backgroundColor: colors.background }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations de Livraison</Text>

      {[
        { field: "fullName", label: "Nom complet *", keyboard: "default" },
        { field: "email", label: "Email de contact *", keyboard: "email-address" },
        { field: "phone", label: "Téléphone *", keyboard: "phone-pad" },
        { field: "addressLine1", label: "Adresse (Ligne 1) *", keyboard: "default" },
        { field: "addressLine2", label: "Adresse (Ligne 2, optionnel)", keyboard: "default" },
      ].map(({ field, label, keyboard }) => (
        <TextInput
          key={field}
          style={[styles.inputLine, { color: colors.text, borderColor: colors.border }]}
          placeholder={label}
          placeholderTextColor={colors.subtleText}
          value={(formData as any)[field] || ""}
          onChangeText={(text) => handleInputChange(field as keyof CheckoutFormData, text)}
          keyboardType={keyboard as any}
          autoCapitalize={field === "email" ? "none" : "sentences"}
        />
      ))}

      {/* Pays */}
      <Text style={{ color: colors.subtleText, fontSize: 13, marginBottom: 4 }}>Pays *</Text>
      <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: colors.card, marginBottom: 15 }]}>
        <Picker
          selectedValue={formData.country}
          onValueChange={handlePaysChange}
          style={{ color: colors.text }}
          dropdownIconColor={colors.subtleText}
        >
          {PAYS_DISPONIBLES.map((p) => (
            <Picker.Item key={p} label={p} value={p} />
          ))}
        </Picker>
      </View>

      {/* Ville */}
      <Text style={{ color: colors.subtleText, fontSize: 13, marginBottom: 4 }}>Ville *</Text>
      <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: colors.card, marginBottom: 15 }]}>
        <Picker
          selectedValue={formData.city}
          onValueChange={(val) => handleInputChange("city", val)}
          style={{ color: colors.text }}
          dropdownIconColor={colors.subtleText}
        >
          {getVillesByPays(formData.country).map((v) => (
            <Picker.Item key={v} label={v} value={v} />
          ))}
        </Picker>
      </View>

      {/* Badge livraison */}
      <View style={[styles.shippingBadge, { backgroundColor: colors.tint + "15", borderColor: colors.tint, marginBottom: 15 }]}>
        <Text style={{ color: colors.tint, fontSize: 13, fontWeight: "600" }}>
          {getZoneLabel(formData.country, formData.city)}
        </Text>
        <Text style={{ color: colors.tint, fontSize: 16, fontWeight: "700", marginTop: 2 }}>
          Frais de livraison : {shippingCost.toLocaleString()} FCFA
        </Text>
      </View>

      <TextInput
        style={[styles.inputLine, { color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: "top" }]}
        placeholder="Notes (optionnel)"
        placeholderTextColor={colors.subtleText}
        value={formData.notes || ""}
        onChangeText={(text) => handleInputChange("notes", text)}
        multiline
      />

      {submissionError && (
        <Text style={[styles.errorText, { color: colors.errorText, marginBottom: 10 }]}>{submissionError}</Text>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.border, flex: 1 }]} onPress={handlePrevStep}>
          <Text style={[styles.submitButtonText, { color: colors.text }]}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.tint, flex: 2 }]} onPress={handleNextStep}>
          <Text style={styles.submitButtonText}>Suivant : Paiement →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ============================================================
  // STEP 3 : PAIEMENT
  // ============================================================

  const renderStep3 = () => (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 20, paddingBottom: 120 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Paiement et Confirmation</Text>

        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15, marginBottom: 10 }}>Méthode de paiement</Text>
        
{isPaiementAvantLivraison ? (
  <View style={[styles.manualPaymentInfo, { backgroundColor: colors.tint + "10", borderColor: colors.tint, borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 20 }]}>
    <FontAwesome name="info-circle" size={24} color={colors.tint} style={{ marginBottom: 8, alignSelf: "center" }} />
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", textAlign: "center", marginBottom: 8 }}>
      💳 Paiement avant livraison requis
    </Text>
    <Text style={{ color: colors.subtleText, fontSize: 13, textAlign: "center" }}>
      Le montant total ({total.toLocaleString()} FCFA) dépasse {SEUIL_PAIEMENT_AVANT_LIVRAISON.toLocaleString()} FCFA.
    </Text>
    <Text style={{ color: colors.text, fontSize: 13, textAlign: "center", marginTop: 8 }}>
      Nous vous contacterons après validation de votre commande afin d'organiser le paiement et l'expédition de votre colis.
    </Text>
  </View>
) : (
  <View style={[styles.paymentOption, { borderColor: colors.tint, backgroundColor: colors.card, marginBottom: 20 }]}>
    <FontAwesome name="check-circle" size={20} color={colors.tint} />
    <Text style={{ color: colors.text, fontSize: 16, marginLeft: 10 }}>Paiement à la livraison</Text>
  </View>
)}
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15, marginBottom: 10 }}>Récapitulatif Final</Text>
        <View style={[styles.finalRecap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 4 }}>Livraison à :</Text>
          <Text style={{ color: colors.subtleText, lineHeight: 22, marginBottom: 12 }}>
            {formData.fullName}{"\n"}
            {formData.addressLine1}, {formData.city}, {formData.country}{"\n"}
            Tél : {formData.phone}
          </Text>

          <View style={[{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.subtleText, fontSize: 14 }}>Sous-total</Text>
              <Text style={{ color: colors.subtleText, fontSize: 14 }}>{subTotal.toFixed(2)} FCFA</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.subtleText, fontSize: 14 }}>
                Livraison ({getZoneLabel(formData.country, formData.city)})
              </Text>
              <Text style={{ color: colors.subtleText, fontSize: 14 }}>{shippingCost.toLocaleString()} FCFA</Text>
            </View>
            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: "#4CAF50", fontSize: 14 }}>Réduction</Text>
                <Text style={{ color: "#4CAF50", fontSize: 14 }}>- {discount.toFixed(2)} FCFA</Text>
              </View>
            )}
            <View style={[styles.grandTotalRow, { borderTopColor: colors.border, marginTop: 8 }]}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Total à payer</Text>
              <Text style={{ color: colors.tint, fontSize: 18, fontWeight: "700" }}>{total.toFixed(2)} FCFA</Text>
            </View>
          </View>
        </View>

        {submissionError && (
          <Text style={[styles.errorText, { color: colors.errorText, marginTop: 10 }]}>{submissionError}</Text>
        )}

        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.border, marginTop: 15 }]} onPress={handlePrevStep}>
          <Text style={[styles.submitButtonText, { color: colors.text }]}>← Retour</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 20,
          left: 16,
          right: 16,
          backgroundColor: isSubmitting ? colors.disabled : colors.tint,
          borderRadius: 12,
          paddingVertical: 18,
          alignItems: "center",
        }}
        onPress={handleSubmitOrder}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>Traitement en cours...</Text>
          : <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
              {isPaiementAvantLivraison ? "Enregistrer ma commande" : "Confirmer la Commande ✓"}
            </Text>
        }
      </TouchableOpacity>
    </View>
  );

  // ============================================================
  // CONFIRMATION
  // ============================================================

  const renderOrderConfirmation = () => {
    const isManualPayment = orderConfirmationData?.isManualPayment;
    
    return (
      <ScrollView contentContainerStyle={[styles.centered, { backgroundColor: colors.background, padding: 20 }]}>
        <View style={{ alignItems: "center" }}>
          {isManualPayment ? (
            <>
              <FontAwesome name="clock-o" size={80} color={colors.tint} />
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center", marginVertical: 20, lineHeight: 30 }}>
                ⏳ Commande en attente de validation
              </Text>
              <Text style={{ color: colors.subtleText, textAlign: "center", marginBottom: 20, fontSize: 15 }}>
                Votre commande n°{orderConfirmationData?.orderNumber} a bien été enregistrée.
              </Text>
              <View style={{ backgroundColor: colors.tint + "20", padding: 15, borderRadius: 10, marginBottom: 20 }}>
                <Text style={{ color: colors.text, textAlign: "center", fontSize: 16, lineHeight: 24 }}>
                  📞 Un conseiller vous contactera dans les plus brefs délais pour finaliser le paiement et l'expédition de votre colis.
                </Text>
              </View>
            </>
          ) : (
            <>
              <FontAwesome name="check-circle" size={80} color="#4CAF50" />
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center", marginVertical: 20, lineHeight: 30 }}>
                🎉 Merci !{"\n"}Votre commande a été créée avec succès.
              </Text>
              <Text style={{ color: colors.subtleText, textAlign: "center", marginBottom: 20, fontSize: 15 }}>
                Numéro de commande : {orderConfirmationData?.orderNumber}
              </Text>
              {orderConfirmationData?.qrValue && (
                <ViewShot ref={qrCodeRef} options={{ format: "png", quality: 1 }} style={{ marginBottom: 20 }}>
                  <QRCode value={orderConfirmationData.qrValue} size={180} backgroundColor="white" />
                </ViewShot>
              )}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.tint, paddingHorizontal: 30, marginBottom: 15 }]}
                onPress={handleDownloadQrCode}
              >
                <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Télécharger le QR Code</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.card, paddingHorizontal: 30, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  // ✅ Si l'authentification est en cours, afficher le chargement personnalisé
  if (isAuthLoading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: orderConfirmationData ? (orderConfirmationData.isManualPayment ? "Commande en attente" : "Commande Confirmée") : "Passer la Commande",
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: "700" },
          headerTitleAlign: "center",
          headerTintColor: colors.tint,
          headerShadowVisible: false,
        }}
      />

      {renderStepsIndicator()}

      {orderConfirmationData
        ? renderOrderConfirmation()
        : currentStep === 1
        ? renderStep1()
        : currentStep === 2
        ? renderStep2()
        : renderStep3()}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  recapItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  totalSection: {
    marginTop: 20,
    borderRadius: 12,
    padding: 15,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  shippingEstimate: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  promoSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    // Les codes s'écrivent en majuscules : autant que la saisie le montre.
    letterSpacing: 1,
  },
  promoButton: {
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
  },
  promoApplied: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  shippingBadge: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    alignItems: "center",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  inputLine: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
  },
  finalRecap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
  },
  errorText: {
    fontSize: 14,
    marginTop: 5,
  },
  centered: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  manualPaymentInfo: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
});
