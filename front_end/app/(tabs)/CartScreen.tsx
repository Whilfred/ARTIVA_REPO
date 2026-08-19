// ARTIVA/front_end/app/(tabs)/CartScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Stack, useRouter, Href } from "expo-router";
import { useCart, CartItem } from "../../context/CartContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import LoadingArtiva from "../product/LoadingArtiva";

export default function TabCartScreen() {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, getTotalItems, isLoadingCart } =
    useCart();
  const { userToken, isLoading: isAuthLoading, effectiveAppColorScheme } = useAuth();
  const router = useRouter();

  const scheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[scheme];

  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const handleCheckout = () => {
    if (!userToken) {
      router.push("/login" as Href);
      return;
    }
    router.push("/checkout" as Href);
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const price = Number(String(item.price).replace(/[^\d]/g, ""));
    const subtotal = price * item.quantity;

    return (
      <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} />

        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.price, { color: colors.tint }]}>{item.price}</Text>

          <View style={styles.qtyRow}>
            <TouchableOpacity
              disabled={item.quantity <= 1}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
              style={styles.qtyBtn}
            >
              <FontAwesome name="minus" size={14} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.qty, { color: colors.text }]}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
              style={styles.qtyBtn}
            >
              <FontAwesome name="plus" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.subtotal, { color: colors.text }]}>
            {subtotal.toFixed(0)} FCFA
          </Text>
          <TouchableOpacity onPress={() => removeFromCart(item.id)}>
            <FontAwesome name="trash-o" size={22} color={colors.errorText} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ Si le panier est en cours de chargement OU l'authentification est en cours
  if (isLoadingCart || isAuthLoading) {
    return <LoadingArtiva theme={scheme} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Panier ({getTotalItems()})
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.center}>
          <FontAwesome name="shopping-basket" size={70} color={colors.subtleText} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Votre panier est vide
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12 }}
          />

          {/* SUMMARY */}
          <View style={[styles.summary, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.subtleText }]}>
                Sous-total ({getTotalItems()} article(s))
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>{getTotalPrice().toFixed(0)} FCFA</Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.subtleText }]}>Frais de livraison</Text>
              <Text style={[styles.value, { color: colors.subtleText }]}>À calculer</Text>
            </View>

            <View style={[styles.row, styles.totalRow, { borderTopColor: colors.cardBorder }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.tint }]}>
                {getTotalPrice().toFixed(0)} FCFA
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, { backgroundColor: colors.tint }]}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutText}>Valider la commande</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 42 : 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 0.6,
  },

  backBtn: { width: 40 },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },

  item: {
    flexDirection: "row",
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.6,
    borderRadius: 8,
  },

  image: { width: 75, height: 75, borderRadius: 6, marginRight: 12 },

  name: { fontSize: 15, fontWeight: "600" },

  price: { marginVertical: 4, fontWeight: "700" },

  qtyRow: { flexDirection: "row", alignItems: "center" },

  qtyBtn: {
    borderWidth: 0.6,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderColor: '#ccc',
  },

  qty: { marginHorizontal: 10, fontWeight: "700" },

  rightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 10,
  },

  subtotal: { fontWeight: "600" },

  summary: {
    padding: 16,
    borderTopWidth: 0.6,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  label: { fontSize: 15 },
  value: { fontSize: 15, fontWeight: "600" },

  totalRow: {
    borderTopWidth: 0.6,
    paddingTop: 10,
    marginTop: 6,
  },

  totalLabel: { fontSize: 17, fontWeight: "700" },
  totalValue: { fontSize: 18, fontWeight: "800" },

  checkoutBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  checkoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "600",
  },
});
