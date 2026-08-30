// ARTIVA/front_end/app/(tabs)/index.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Text as DefaultText,
  RefreshControl,
  Platform,
  Linking,
  Image,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Alert } from "../../constants/Alerte"; // Alert.alert est inopérant sur le web — voir ce fichier
import ScrollSection from "../../components/ScrollSection";
import CategoryCard, {
  Category as CategoryType,
} from "../../components/CategoryCard";
import ProductCard, {
  Product as ProductType,
} from "../../components/ProductCard";
import Colors from "../../constants/Colors";
import { useRouter, Href, Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Feather, Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";
const { width } = Dimensions.get("window");

// --- Largeur des ProductCard dans les carrousels horizontaux de l'accueil ---
// (contexte différent de la grille 2 colonnes de [tag].tsx : ici on veut
// une carte de taille fixe, assez large pour un scroll horizontal confortable)
const HOME_PRODUCT_CARD_WIDTH = width * 0.42;

interface TaggedProductsStore {
  tagId: string | number;
  tagName: string;
  products: ProductType[];
}

export default function TabAccueilScreen() {
  const router = useRouter();

  const { effectiveAppColorScheme, user, isLoading, unreadNotificationCount, fetchUnreadNotificationCount } = useAuth();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const pageBackgroundColor = Colors[currentScheme].background;
  const siteNameColor = Colors[currentScheme].text;
  const textColor = Colors[currentScheme].text;
  const cardBorderColor = Colors[currentScheme].cardBorder;

  const [mainCategories, setMainCategories] = useState<CategoryType[]>([]);
  const [featuredProductSections, setFeaturedProductSections] = useState<
    TaggedProductsStore[]
  >([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Récupérer le nombre de notifications non lues
  useEffect(() => {
    if (user) {
      fetchUnreadNotificationCount();
    }
  }, [user]);

  /* 🔥 CARROUSEL */
  const carouselRef = useRef<ScrollView>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselImages = [
    "https://i.pinimg.com/1200x/c5/20/51/c52051b79281ee5b9c9c6f4701cd852f.jpg",
    "https://i.pinimg.com/736x/ca/6e/82/ca6e826d10df23c7b65dc7f124353559.jpg",
    "https://i.pinimg.com/736x/dc/73/2a/dc732ae5b28015fe0790ce89085a8b3b.jpg",
    "https://i.pinimg.com/1200x/10/ea/52/10ea52e63e998beee7a5626b2080d503.jpg",
    "https://i.pinimg.com/1200x/e9/7d/12/e97d12fb1f68210b03d2ed6a3b4a80d4.jpg",
    "https://i.pinimg.com/736x/8a/78/b3/8a78b375f17fb3b1a11acecfd4b98b6d.jpg",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (carouselIndex + 1) % carouselImages.length;
      carouselRef.current?.scrollTo({ x: next * width, animated: true });
      setCarouselIndex(next);
    }, 3500);
    return () => clearInterval(interval);
  }, [carouselIndex]);

  const FEATURED_TAG_NAMES = [
    "Nouveauté",
    "Populaire",
    "Pour Vous",
    "Meilleures Ventes",
    "Promotion",
  ];

  const PRODUCTS_PER_TAG_SECTION = 5;

  const fetchData = useCallback(async () => {
    try {
      const catRes = await fetch(`${API_BASE_URL}/categories`);
      const catData = await catRes.json();

      setMainCategories(
        catData
          .filter((c: any) => c.parent_id === null)
          .map((c: any) => ({
            id: String(c.id),
            name: c.name,
            imageUrl: c.image_url,
          }))
      );

      const sections = await Promise.all(
        FEATURED_TAG_NAMES.map(async (tagName) => {
          const res = await fetch(
            `${API_BASE_URL}/products?tag_name=${encodeURIComponent(
              tagName
            )}&limit=${PRODUCTS_PER_TAG_SECTION}&random=true`
          );
          if (!res.ok) return null;

          const data = await res.json();
          const rawProducts = Array.isArray(data) ? data : data.products || [];

          const adaptedProducts: ProductType[] = rawProducts.map((p: any) => ({
            id: String(p.id),
            name: p.name || "Produit",
            price:
              p.price !== undefined && p.price !== null
                ? `${p.price} FCFA`
                : "N/A",
            imageUrl: p.image_url,
            stock: p.stock,
            description: p.description,
          }));

          return adaptedProducts.length > 0
            ? { tagId: tagName, tagName, products: adaptedProducts }
            : null;
        })
      );

      setFeaturedProductSections(
        sections.filter(Boolean) as TaggedProductsStore[]
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCategoryPress = (id: string, name?: string) => {
    router.push(`/category-products/${id}?categoryName=${name}` as Href);
  };

  const handleProductPress = (id: string | number) => {
    router.push(`/product/${id}` as Href);
  };

  const handleSeeAllTagProducts = (tagName: string) => {
    router.push(`/tag/${encodeURIComponent(tagName)}` as Href);
  };

  const handleNotificationPress = () => {
    router.push("/notifications" as Href);
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push(`/tag/${encodeURIComponent(searchText.trim())}` as Href);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL("https://wa.me/2290149326514").catch(() =>
      Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp.")
    );
  };

  /*** ✅ ANIMATION 👋 ***/
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [waveAnim]);

  const waveStyle = {
    transform: [
      {
        rotate: waveAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "20deg"],
        }),
      },
    ],
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 6) return "Bonsoir";
    return "Bonjour";
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: pageBackgroundColor }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Stack.Screen options={{ title: "Accueil" }} />

        {/* 🔹 HEADER AVEC NOTIFICATION ET BADGE */}
        <View
          style={[
            styles.headerContainer,
            { borderBottomColor: cardBorderColor },
          ]}
        >
          <View style={styles.headerRow}>
            <DefaultText style={[styles.siteName, { color: siteNameColor }]}>
              Artiva
            </DefaultText>

            {/* 🔔 Icône notification avec badge */}
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={styles.notificationIcon}
            >
              <View>
                <Ionicons name="notifications-outline" size={28} color={siteNameColor} />
                {unreadNotificationCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <DefaultText style={styles.badgeText}>
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </DefaultText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Message de bienvenue avec nom */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
            <DefaultText style={{ color: textColor, fontSize: 16 }}>
              {isLoading
                ? `${getGreeting()}`
                : `${getGreeting()} ${user?.name ?? ""}`}
            </DefaultText>
            <Animated.Text style={[{ fontSize: 18, marginLeft: 6 }, waveStyle]}>
              👋
            </Animated.Text>
          </View>
        </View>

        {/* 🔍 BARRE DE RECHERCHE */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchWrapper, { borderColor: cardBorderColor }]}>
            <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Rechercher un produit..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollSection<CategoryType>
          title="Catégories"
          data={mainCategories}
          renderItem={({ item }) => (
            <CategoryCard
              item={item}
              onPress={() => handleCategoryPress(item.id, item.name)}
            />
          )}
          keyExtractor={(item) => item.id}
        />

        {/* 🎠 CARROUSEL avec points de pagination */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / width
              );
              setCarouselIndex(newIndex);
            }}
          >
            {carouselImages.map((img, i) => (
              <View key={i} style={styles.carouselSlide}>
                <Image source={{ uri: img }} style={styles.carouselImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>

          {/* 🔘 Points de pagination */}
          <View style={styles.dotsContainer}>
            {carouselImages.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === carouselIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {featuredProductSections.map((section) => (
          <ScrollSection<ProductType>
            key={section.tagId.toString()}
            title={section.tagName}
            data={section.products}
            renderItem={({ item }) => (
              <View style={styles.productCardSpacing}>
                <ProductCard
                  item={item}
                  onPress={handleProductPress}
                  cardWidth={HOME_PRODUCT_CARD_WIDTH}
                />
              </View>
            )}
            keyExtractor={(item) => item.id}
            onSeeAllPress={() => handleSeeAllTagProducts(section.tagName)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 🔸 BOUTON WHATSAPP */}
      <View style={styles.fabContainer}>
        <Feather
          name="headphones"
          size={32}
          color="#fff"
          onPress={openWhatsApp}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Espacement entre les ProductCard dans les carrousels horizontaux
  // (ProductCard n'a plus de marge interne, elle est gérée ici)
  productCardSpacing: {
    marginRight: 10,
  },
  headerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "android" ? 55 : 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  siteName: {
    fontSize: 26,
    fontWeight: "700",
  },
  notificationIcon: {
    padding: 4,
  },

  // 🔔 Badge de notification
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  // 🔍 Barre de recherche
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },

  // 🎠 Carrousel
  carouselContainer: {
    marginVertical: 15,
  },
  carousel: {
    // taille gérée par carouselSlide / carouselImage
  },
  carouselSlide: {
    width,
    paddingHorizontal: 16,
  },
  carouselImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  dotActive: {
    width: 18,
    backgroundColor: "#FF6A00",
  },

  fabContainer: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#FF6A00",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});
