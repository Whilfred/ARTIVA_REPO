// ARTIVA/front_end/app/tag/[tag].tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Button,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, Href } from "expo-router";
import ProductCard, {
  Product as ProductType,
} from "../components/ProductCard";
import Colors from "../constants/Colors";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import LoadingArtiva from './product/LoadingArtiva';
import { API_BASE_URL } from "../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

// --- Normalisation pour un matching tolérant ---
const normalize = (str: string): string =>
  (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// --- Vérifie si une chaîne est un nombre (prix) ---
const isNumeric = (str: string): boolean => {
  return /^\d+$/.test(str.trim());
};

export default function ProductsByTagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const router = useRouter();
  const { effectiveAppColorScheme } = useAuth();
  const { t } = useTranslation();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];

  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState(
    tag
      ? `${t("tagScreen.titlePrefix", "Produits :")} ${decodeURIComponent(tag)}`
      : t("tagScreen.defaultTitle", "Produits par Tag")
  );

  const fetchAndFilterByTag = useCallback(async () => {
    if (!tag) {
      setError(t("tagScreen.missingTag", "Nom du tag manquant."));
      setIsLoading(false);
      return;
    }
    const decodedTag = decodeURIComponent(tag);
    console.log(`ProductsByTagScreen: Recherche pour: ${decodedTag}`);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Erreur HTTP ${response.status}` }));
        throw new Error(
          errorData.message ||
            t("tagScreen.fetchError", "Erreur chargement produits")
        );
      }
      const dataWrapper = await response.json();
      if (!dataWrapper || !Array.isArray(dataWrapper.products)) {
        throw new Error(
          t("tagScreen.invalidData", "Format de données produits inattendu.")
        );
      }
      const productsData = dataWrapper.products;

      const adaptedProducts: ProductType[] = productsData.map((prod: any) => {
        const productName = prod.name || t("tagScreen.unknownProduct", "Produit Inconnu");
        const productPrice =
          prod.price !== undefined && prod.price !== null
            ? String(prod.price)
            : t("common.unavailable", "N/A");
        return {
          id: String(prod.id),
          name: productName,
          price: `${productPrice} FCFA`,
          imageUrl:
            prod.image_url ||
            `https://via.placeholder.com/150x150/BFDBFE/000?text=${encodeURIComponent(
              productName.substring(0, 10)
            )}`,
          stock: prod.stock,
          description: prod.description || "",
          category_ids: (prod.category_ids || []).map((id: any) => String(id)),
          categories_names: prod.categories_names || [],
          tags_names: prod.tags_names || [],
          is_published: prod.is_published,
          rawPrice: prod.price !== undefined && prod.price !== null ? parseFloat(prod.price) : null,
        };
      });

      const normalizedTag = normalize(decodedTag);
      const tagWords = normalizedTag.split(" ").filter(Boolean);
      const isPriceSearch = tagWords.some(word => isNumeric(word));

      // 🔍 FILTRAGE AVEC SCORES
      const scoredProducts = adaptedProducts.map((p: any) => {
        let score = 0;
        const normalizedName = normalize(p.name);
        const normalizedDescription = normalize(p.description || "");
        const normalizedCategories = normalize((p.categories_names || []).join(" "));
        const normalizedTags = normalize((p.tags_names || []).join(" "));
        const haystackFull = `${normalizedName} ${normalizedDescription} ${normalizedCategories} ${normalizedTags}`;

        // 1️⃣ PRIORITÉ MAX : Match exact du tag dans les tags
        const matchesExactTag = (p.tags_names || []).some(
          (tName: string) => normalize(tName) === normalizedTag
        );
        if (matchesExactTag) {
          score += 1000;
        }

        // 2️⃣ PRIORITÉ ÉLEVÉE : Le mot recherché est dans le NOM
        tagWords.forEach(word => {
          if (normalizedName.includes(word)) {
            score += 100;
          }
          if (normalizedName === word) {
            score += 200;
          }
        });

        // 3️⃣ PRIORITÉ MOYENNE : Le mot est dans la DESCRIPTION
        tagWords.forEach(word => {
          if (normalizedDescription.includes(word)) {
            score += 50;
          }
        });

        // 4️⃣ PRIORITÉ FAIBLE : Le mot est dans les CATÉGORIES ou TAGS
        tagWords.forEach(word => {
          if (normalizedCategories.includes(word) || normalizedTags.includes(word)) {
            score += 20;
          }
        });

        // 5️⃣ RECHERCHE PAR PRIX
        if (isPriceSearch) {
          const priceNumber = parseFloat(tagWords.find(w => isNumeric(w)) || "0");
          if (p.rawPrice !== null && p.rawPrice !== undefined) {
            const diff = Math.abs(p.rawPrice - priceNumber);
            if (diff < 100) score += 80;
            else if (diff < 500) score += 40;
            else if (diff < 1000) score += 20;
          }
        }

        // 6️⃣ MATCH GLOBAL
        tagWords.forEach(word => {
          if (haystackFull.includes(word)) {
            score += 5;
          }
        });

        return { ...p, score };
      });

      // 🔽 TRI PAR SCORE DÉCROISSANT
      const sortedProducts = scoredProducts
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...p }) => p);

      console.log(`🔍 ${sortedProducts.length} produit(s) trouvé(s) pour "${decodedTag}"`);
      setProducts(sortedProducts);
    } catch (err: any) {
      console.error("ProductsByTagScreen: Erreur:", err);
      setError(
        t(
          "tagScreen.fetchGenericError",
          "Impossible de charger les produits."
        )
      );
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [tag, t]);

  useEffect(() => {
    fetchAndFilterByTag();
  }, [fetchAndFilterByTag]);

  useEffect(() => {
    if (tag)
      setPageTitle(
        `${t("tagScreen.titlePrefix", "Produits :")} ${decodeURIComponent(tag)}`
      );
  }, [tag, t]);

  const handleProductPress = (productId: string | number) => {
    const path = `/product/${String(productId)}` as Href;
    router.push(path);
  };

  if (isLoading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.errorText }]}>
          {error}
        </Text>
        <Button
          title={t("common.retry", "Réessayer")}
          onPress={fetchAndFilterByTag}
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
          <Text style={[styles.noProductsText, { color: colors.text }]}>
            {t("tagScreen.noProducts", 'Aucun produit trouvé pour "{{tag}}"', {
              tag: decodeURIComponent(tag || ""),
            })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <View style={styles.productCardContainer}>
              <ProductCard 
                item={item} 
                onPress={handleProductPress}
                cardWidth={150} // ✅ AJOUT DE LA PROPRIÉTÉ MANQUANTE
              />
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
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
    paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 20,
  },
  productCardContainer: {
    width: "50%",
    paddingHorizontal: 5,
    marginBottom: 10,
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 10,
  },
  noProductsText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
    paddingHorizontal: 10,
  },
});