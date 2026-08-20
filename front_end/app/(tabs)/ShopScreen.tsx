// ARTIVA/front_end/app/(tabs)/ShopScreen.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Image,
  Button,
  Platform,
  RefreshControl,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import Colors from "../../constants/Colors";
import { Product as BaseProductType } from "../../components/ProductCard";
import { useAuth } from "../../context/AuthContext";
import LoadingArtiva from "../product/LoadingArtiva";
import { API_BASE_URL } from "../../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

interface Category {
  id: string | number;
  name: string;
  parent_id: string | number | null;
  image_url?: string;
  display_order?: number;
}

interface ShopProduct extends BaseProductType {}

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

export default function TabShopScreen() {
  const router = useRouter();
  const { effectiveAppColorScheme } = useAuth();
  const currentAppliedTheme = effectiveAppColorScheme || "light";
  const colors = Colors[currentAppliedTheme];

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string | number | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | number | null>(null);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (!response.ok) throw new Error("Erreur de chargement des catégories.");
      const data = await response.json();
      setAllCategories(
        data.map((c: any) => ({
          id: String(c.id),
          name: c.name || "Catégorie",
          parent_id: c.parent_id ? String(c.parent_id) : null,
          image_url: c.image_url,
          display_order: c.display_order,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCategoriesLoading(false);
      setInitialLoad(false);
    }
  }, []);
  
  const fetchProducts = useCallback(async () => {
    const categoryToFetch = selectedSubCategoryId || selectedMainCategoryId;
    if (!categoryToFetch && !searchTerm) {
      setProducts([]);
      return;
    }
    setIsProductsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryToFetch) params.append("category_id", String(categoryToFetch));
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur de chargement des produits.");
      const data = await response.json();
      if (!data || !Array.isArray(data.products)) throw new Error("Format de données produits inattendu.");

      setProducts(
        data.products.map((p: any) => ({
          id: String(p.id),
          name: p.name || "Produit",
          price: `${parseFloat(String(p.price)).toFixed(2)} FCFA`,
          imageUrl: p.image_url || `https://via.placeholder.com/150`,
          stock: p.stock,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProductsLoading(false);
    }
  }, [selectedMainCategoryId, selectedSubCategoryId, searchTerm]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { if (!initialLoad) fetchProducts(); }, [selectedMainCategoryId, selectedSubCategoryId, searchTerm, initialLoad, fetchProducts]);

  const onRefresh = useCallback(async () => {
    await fetchCategories();
    await fetchProducts();
  }, [fetchCategories, fetchProducts]);

  const mainCategories = useMemo(() =>
    allCategories.filter(c => c.parent_id === null).sort((a,b) => (a.display_order||0)-(b.display_order||0)), 
  [allCategories]);

  // ---- Auto-sélection ----
  useEffect(() => {
    if (!selectedMainCategoryId && mainCategories.length > 0) {
      setSelectedMainCategoryId(mainCategories[0].id);
    }
  }, [mainCategories, selectedMainCategoryId]);

  const subCategories = useMemo(() =>
    selectedMainCategoryId ? allCategories.filter(c => String(c.parent_id) === String(selectedMainCategoryId)).sort((a,b) => (a.display_order||0)-(b.display_order||0)) : [], 
  [allCategories, selectedMainCategoryId]);

  const handleSelectMainCategory = (categoryId: string | number | null) => {
    setProducts([]);
    setSelectedMainCategoryId(categoryId);
    setSelectedSubCategoryId(null);
    setSearchTerm("");
  };

  const handleSelectSubCategory = (subCategoryId: string | number | null) => {
    setProducts([]);
    setSelectedSubCategoryId(subCategoryId);
    setSearchTerm("");
  };

  const handleProductPress = (productId: string | number) => { router.push(`/product/${String(productId)}`); };

  useFocusEffect(useCallback(() => () => {
    setSelectedMainCategoryId(null);
    setSelectedSubCategoryId(null);
    setSearchTerm("");
    setProducts([]);
  }, []));

  // ✅ Si le chargement initial est en cours, afficher le composant personnalisé
  if (isCategoriesLoading && initialLoad) {
    return <LoadingArtiva theme={currentAppliedTheme} />;
  }

  if (error && allCategories.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.errorText, marginBottom: 10, textAlign: "center" }}>{error}</Text>
        <Button title="Réessayer" onPress={fetchCategories} color={colors.tint} />
      </View>
    );
  }

  const renderRightPaneContent = () => {
    const categoryIsSelected = selectedMainCategoryId || selectedSubCategoryId;

    if (isProductsLoading && categoryIsSelected) return (
      <View style={styles.placeholderContainer}><ActivityIndicator size="large" color={colors.tint} /></View>
    );

    if (selectedSubCategoryId || (selectedMainCategoryId && subCategories.length === 0)) {
      if (products.length > 0) {
        return (
          <FlatList
            data={products}
            numColumns={2}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.productItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => handleProductPress(item.id)}>
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.productPrice, { color: colors.tint }]}>{item.price}</Text>
              </TouchableOpacity>
            )}
            refreshControl={<RefreshControl refreshing={isProductsLoading} onRefresh={onRefresh} tintColor={colors.tint} />}
          />
        );
      }
      return <View style={styles.placeholderContainer}><Text style={[styles.noProductsText, { color: colors.text }]}>Aucun produit dans cette sélection.</Text></View>;
    }

    if (selectedMainCategoryId && subCategories.length > 0) {
      return (
        <FlatList
          data={subCategories}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={<Text style={[styles.sectionTitle, { color: colors.text }]}>Sous-catégories</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.subCategoryItem, 
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                item.id === selectedSubCategoryId && { backgroundColor: colors.tint + "20", borderColor: colors.tint }
              ]}
              onPress={() => handleSelectSubCategory(item.id)}
            >
              {item.image_url && <Image source={{ uri: item.image_url }} style={styles.subCategoryImage} resizeMode="contain" />}
              <Text style={[
                styles.subCategoryText, 
                { color: colors.text },
                item.id === selectedSubCategoryId && { color: colors.tint, fontWeight: "700" }
              ]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      );
    }

    return (
      <View style={styles.placeholderContainer}>
        <Text style={[styles.placeholderText, { color: colors.subtleText }]}>Sélectionnez une catégorie.</Text>
      </View>
    );
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Boutique", headerShown: false }} />
      <TextInput
        style={[styles.searchBar, { backgroundColor: colors.card, color: colors.text, borderColor: colors.cardBorder }]}
        placeholder="Rechercher des produits..."
        placeholderTextColor={colors.subtleText}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <View style={styles.contentContainer}>
        <View style={[styles.leftPane, { backgroundColor: colors.card, borderRightColor: colors.cardBorder }]}>
          {isCategoriesLoading && initialLoad ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.tint} />
          ) : mainCategories.length > 0 ? (
            <FlatList
              data={mainCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.mainCategoryItem, 
                    { backgroundColor: colors.card },
                    item.id === selectedMainCategoryId && { backgroundColor: colors.tint + "15" }
                  ]}
                  onPress={() => handleSelectMainCategory(item.id)}
                >
                  <Text style={[
                    styles.mainCategoryText, 
                    { color: colors.text },
                    item.id === selectedMainCategoryId && { color: colors.tint, fontWeight: "700" }
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isCategoriesLoading} onRefresh={onRefresh} tintColor={colors.tint} />}
            />
          ) : (
            <Text style={[styles.noDataText, { color: colors.text }]}>Aucune catégorie.</Text>
          )}
        </View>
        <View style={styles.rightPane}>{renderRightPaneContent()}</View>
      </View>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  screenContainer: { flex: 1, paddingTop: Platform.OS === "android" ? 25 : 0 },
  searchBar: { height: 45, paddingHorizontal: 20, marginHorizontal: 10, marginTop: 10, marginBottom: 5, borderRadius: 25, borderWidth: 1, fontSize: 16 },
  contentContainer: { flex: 1, flexDirection: "row" },
  leftPane: { width: 110, borderRightWidth: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },

  mainCategoryItem: { paddingVertical: 18, paddingHorizontal: 10, alignItems: "center" },
  mainCategoryText: { fontSize: 13, fontWeight: "500", textAlign: "center" },
  mainCategoryItemSelected: { backgroundColor: "#fff" },
  mainCategoryTextSelected: { color: "#FF8C00" },

  rightPane: { flex: 1, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginVertical: 10, paddingHorizontal: 10 },

  subCategoryItem: { flex: 1, margin: 4, padding: 8, borderRadius: 8, alignItems: "center", justifyContent: "center", minHeight: 80, borderWidth: 1 },
  subCategoryText: { fontSize: 11, textAlign: "center", fontWeight: "500", marginTop: 4 },
  subCategoryItemSelected: { backgroundColor: "#fffafa" },
  subCategoryTextSelected: { color: "#FF8C00" },

  subCategoryImage: { width: 35, height: 35, borderRadius: 4 },
  productList: { paddingHorizontal: 5 },
  productItem: { flex: 0.5, margin: 4, padding: 8, borderRadius: 8, borderWidth: 0.5 },
  productImage: { width: "100%", aspectRatio: 1, borderRadius: 6, marginBottom: 8, backgroundColor: "#f0f0f09a" },
  productName: { fontSize: 13, fontWeight: "600", textAlign: "left", marginBottom: 4, height: 36 },
  productPrice: { fontSize: 14, fontWeight: "bold", textAlign: "left" },
  noProductsText: { textAlign: "center", marginTop: 30, fontSize: 16 },
  placeholderContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  noDataText: { textAlign: "center", marginVertical: 20, fontSize: 15, fontStyle: "italic" },
  placeholderText: { textAlign: "center", marginTop: 50, fontSize: 16 },
});
