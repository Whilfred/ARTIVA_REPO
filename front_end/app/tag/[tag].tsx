// ARTIVA/front_end/app/tag/[tag].tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Button,
  Dimensions,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, Href } from "expo-router";
import ProductCard, {
  Product as ProductType,
} from "../../components/ProductCard";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import LoadingArtiva from '../product/LoadingArtiva';
import { API_BASE_URL } from "../../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

// --- Layout de la grille : source unique de vérité pour l'espacement ---
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDE_PADDING = 12; // padding gauche/droite de la liste
const GAP = 10; // espace entre les 2 colonnes
const CARD_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - GAP) / 2;

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

      // 🔍 FILTRAGE AVEC SCORES - PRIORITÉ AU NOM
      const scoredProducts = adaptedProducts.map((p: any) => {
        let score = 0;
        const normalizedName = normalize(p.name);
        const normalizedDescription = normalize(p.description || "");
        const normalizedCategories = normalize((p.categories_names || []).join(" "));
        const normalizedTags = normalize((p.tags_names || []).join(" "));

        // 🏆 PRIORITÉ 1 : Match exact du tag dans les tags (on garde cette règle)
        const matchesExactTag = (p.tags_names || []).some(
          (tName: string) => normalize(tName) === normalizedTag
        );
        if (matchesExactTag) {
          score += 1000;
        }

        // 🥇 PRIORITÉ ABSOLUE : Le mot recherché est dans le NOM
        let nameMatchCount = 0;
        tagWords.forEach(word => {
          if (normalizedName.includes(word)) {
            nameMatchCount++;
            // Bonus si le mot est exactement le nom
            if (normalizedName === word) {
              score += 500;
            }
          }
        });
        
        // Si au moins un mot est trouvé dans le nom, score élevé
        if (nameMatchCount > 0) {
          score += 500 + (nameMatchCount * 100);
        }

        // 🥈 PRIORITÉ 2 : Le mot est dans la DESCRIPTION (seulement si pas trouvé dans le nom)
        if (nameMatchCount === 0) {
          tagWords.forEach(word => {
            if (normalizedDescription.includes(word)) {
              score += 50;
            }
          });
        }

        // 🥉 PRIORITÉ 3 : Le mot est dans les CATÉGORIES ou TAGS (seulement si pas trouvé dans le nom)
        if (nameMatchCount === 0) {
          tagWords.forEach(word => {
            if (normalizedCategories.includes(word) || normalizedTags.includes(word)) {
              score += 20;
            }
          });
        }

        // 4️⃣ RECHERCHE PAR PRIX (toujours en bonus)
        if (isPriceSearch) {
          const priceNumber = parseFloat(tagWords.find(w => isNumeric(w)) || "0");
          if (p.rawPrice !== null && p.rawPrice !== undefined) {
            const diff = Math.abs(p.rawPrice - priceNumber);
            if (diff < 100) score += 80;
            else if (diff < 500) score += 40;
            else if (diff < 1000) score += 20;
          }
        }

        // 5️⃣ MATCH GLOBAL (fallback)
        const haystackFull = `${normalizedName} ${normalizedDescription} ${normalizedCategories} ${normalizedTags}`;
        tagWords.forEach(word => {
          if (haystackFull.includes(word) && nameMatchCount === 0) {
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
      console.log(`📊 Scores:`, scoredProducts.filter(p => p.score > 0).map(p => ({ name: p.name, score: p.score })).slice(0, 5));
      
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
            <ProductCard
              item={item}
              onPress={handleProductPress}
              cardWidth={CARD_WIDTH}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
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
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 10,
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
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