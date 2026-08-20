// ARTIVA/front_end/app/category-products/[categoryId].tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Button,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, Href } from "expo-router";
import ProductCard, {
  Product as ProductType,
} from "../../components/ProductCartcate";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier
import LoadingArtiva from "../product/LoadingArtiva"; // ✅ AJOUT DE L'IMPORT

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

export default function CategoryProductsScreen() {
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName?: string;
  }>();
  const router = useRouter();

  const { effectiveAppColorScheme } = useAuth();
  const currentScheme = effectiveAppColorScheme ?? "light";

  const colors = {
    background: Colors[currentScheme].background,
    text: Colors[currentScheme].text,
    tint: Colors[currentScheme].tint,
    errorText: Colors[currentScheme].errorText,
  };

  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState(
    categoryName || `Catégorie ${categoryId}`
  );

  const fetchProductsByCategory = useCallback(async () => {
    if (!categoryId) {
      setError("ID de catégorie manquant.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/products?category_id=${categoryId}&limit=10000000`
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Erreur HTTP ${response.status}` }));
        throw new Error(
          errorData.message || `Erreur chargement produits (${response.status})`
        );
      }

      const dataWrapper = await response.json();
      if (!dataWrapper || !Array.isArray(dataWrapper.products)) {
        throw new Error("Format de données produits inattendu.");
      }
      const productsData = dataWrapper.products;

      const adaptedProducts = productsData.map((prod: any) => {
        const productName = prod.name || "Produit Inconnu";
        const productPrice =
          prod.price !== undefined && prod.price !== null
            ? String(prod.price)
            : "N/A";
        return {
          id: String(prod.id),
          name: productName,
          price: `${parseFloat(productPrice).toFixed(2)} FCFA`,
          imageUrl:
            prod.image_url ||
            `https://via.placeholder.com/150x150/?text=${encodeURIComponent(
              productName.substring(0, 10)
            )}`,
          stock: prod.stock,
          description: prod.description,
          category_ids: (prod.category_ids || []).map(String),
          categories_names: prod.categories_names || [],
          tags_names: prod.tags_names || [],
          is_published: prod.is_published,
        };
      });
      setProducts(adaptedProducts);
    } catch (err: any) {
      console.error(
        "CategoryProductsScreen: Erreur fetchProductsByCategory:",
        err
      );
      setError(err.message || "Impossible de charger les produits.");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, categoryName]);

  useEffect(() => {
    fetchProductsByCategory();
  }, [fetchProductsByCategory]);

  const handleProductPress = (productId: string | number) => {
    const path = `/product/${String(productId)}` as Href;
    router.push(path);
  };

  // ✅ REMPLACEMENT DU LOADER PAR LoadingArtiva
  if (isLoading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text
          style={{
            color: colors.errorText,
            marginBottom: 15,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
        <Button
          title="Réessayer"
          onPress={fetchProductsByCategory}
          color={colors.tint}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.screenContainer, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ title: pageTitle }} />
      {products.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.text, fontSize: 16 }}>
            Aucun produit trouvé dans cette catégorie.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <ProductCard item={item} onPress={handleProductPress} />
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 20,
  },
});
