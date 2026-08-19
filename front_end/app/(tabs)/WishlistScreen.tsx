// ARTIVA/front_end/app/(tabs)/WishlistScreen.tsx

import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Button,
  RefreshControl,
} from "react-native";
import { Stack, useRouter, Href } from "expo-router";
import { useWishlist, WishlistItem } from "../../context/WishlistContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import LoadingArtiva from "../product/LoadingArtiva";

export default function TabWishlistScreen() {
  const { wishlistItems, removeFromWishlist, isLoadingWishlist, fetchWishlist } =
    useWishlist();
  const { userToken, isLoading: isAuthLoading, effectiveAppColorScheme } =
    useAuth();
  const router = useRouter();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];

  const tintColor = colors.tint;
  const textColor = colors.text;
  const backgroundColor = colors.background;
  const cardColor = colors.card;
  const subtleTextColor = colors.subtleText;
  const borderColor = colors.cardBorder;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && userToken) {
      fetchWishlist();
    }
  }, [userToken, isAuthLoading, fetchWishlist]);

  const handleProductPress = (productId: string | number) => {
    router.push(`/product/${String(productId)}` as Href);
  };

  const onRefresh = useCallback(() => {
    if (userToken) fetchWishlist();
  }, [userToken, fetchWishlist]);

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        { backgroundColor: cardColor, borderColor: borderColor },
      ]}
      onPress={() => handleProductPress(item.id)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />

      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, { color: textColor }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.itemPrice, { color: tintColor }]}>
          {item.price}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => removeFromWishlist(item.id)}
        style={styles.removeItemButton}
      >
        <FontAwesome name="trash-o" size={22} color={colors.errorText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ✅ Si l'authentification est en cours, afficher le chargement personnalisé
  if (isAuthLoading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  // ❌ Si l'utilisateur n'est pas connecté
  if (!userToken) {
    return (
      <View style={[styles.screenContainer, { backgroundColor }]}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.customHeader, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
          <Text style={[styles.customHeaderTitle, { color: textColor }]}>
            Ma Liste de Souhaits
          </Text>
        </View>

        <View style={styles.emptyContainer}>
          <FontAwesome name="lock" size={64} color={subtleTextColor} />
          <Text style={[styles.emptyText, { color: textColor }]}>
            Connectez-vous pour voir votre liste
          </Text>
          <Text style={[styles.emptySubText, { color: subtleTextColor }]}>
            Sauvegardez les produits que vous aimez ❤️
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/login" as Href)}
            style={[styles.actionButton, { backgroundColor: tintColor }]}
          >
            <Text style={styles.actionButtonText}>
              Se connecter / S'inscrire
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 📋 Affichage principal
  return (
    <View style={[styles.screenContainer, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={[styles.customHeader, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
        {router.canGoBack() && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={26} color={textColor} />
          </TouchableOpacity>
        )}

        <Text style={[styles.customHeaderTitle, { color: textColor }]}>
          Ma Liste de Souhaits ({wishlistItems.length})
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="heart-o" size={80} color={subtleTextColor} />
          <Text style={[styles.emptyText, { color: textColor }]}>
            Votre liste est vide
          </Text>
          <Text style={[styles.emptySubText, { color: subtleTextColor }]}>
            Ajoutez des produits en cliquant sur ❤️
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/" as Href)}
            style={[styles.shopButton, { backgroundColor: tintColor }]}
          >
            <Text style={styles.shopButtonText}>Explorer les produits</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => `wishlist-${item.id}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingWishlist}
              onRefresh={onRefresh}
              tintColor={tintColor}
            />
          }
        />
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },

  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: Platform.OS === "android" ? 45 : 20,
    borderBottomWidth: 1,
  },

  backButton: {
    padding: 6,
  },

  customHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },

  emptySubText: {
    fontSize: 15,
    marginBottom: 30,
    textAlign: "center",
  },

  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },

  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  shopButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },

  shopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  listContainer: {
    padding: 12,
  },

  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  itemImage: {
    width: 78,
    height: 78,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: "#E5E7EB",
  },

  itemDetails: {
    flex: 1,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
  },

  removeItemButton: {
    padding: 8,
  },
});
