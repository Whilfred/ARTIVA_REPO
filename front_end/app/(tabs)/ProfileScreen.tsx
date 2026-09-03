// ARTIVA/front_end/app/(tabs)/ProfileScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { Alert } from "../../constants/Alerte";
import {
  Settings,
  ShoppingBag,
  Heart,
  Bell,
  LogOut,
  User,
  Star,
  ChevronRight,
  Share2,
  Shield,
  BookOpen,
} from "lucide-react-native";
import { useRouter, Href, Stack, useFocusEffect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import Colors from "../../constants/Colors";
import { FontAwesome5, MaterialIcons, Entypo } from "@expo/vector-icons";
import { API_BASE_URL } from "../../constants/Api";

// Interfaces
interface UserDetails {
  profileImage?: string;
  full_name?: string;
  city?: string;
  email?: string;
}

interface OrderItem {
  itemId?: string | number;
  product_id?: string | number;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
  productImageUrl?: string;
}

interface Order {
  orderId: string | number;
  order_number?: string;
  status: string;
  total: string | number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  products: OrderItem[];
}

// Menu avec Fidélité & Récompenses
const menuItemsBaseConfig: {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitleBase: string;
  route?: Href;
  action?: "toggleOrdersModal";
}[] = [
  {
    id: "orders",
    icon: ShoppingBag,
    title: "Mes commandes",
    subtitleBase: "Voir l'historique",
    route: "/OrdersScreen",
  },
  {
    id: "wishlist",
    icon: Heart,
    title: "Liste de souhaits",
    subtitleBase: "Vos produits favoris",
    route: "/(tabs)/WishlistScreen" as Href,
  },
  {
    id: "loyalty",
    icon: Star,
    title: "Fidélité & Récompenses",
    subtitleBase: "Vos points et bons de réduction",
    route: "/(tabs)/LoyaltyScreen" as Href,
  },
{
  id: "social",
  icon: Share2,
  title: "Nos réseaux sociaux",
  subtitleBase: "Suivez-nous sur les réseaux",
  route: "/(tabs)/SocialLinksScreen" as Href,
},
{
  id: "privacy",
  icon: Shield,
  title: "Politique de confidentialité",
  subtitleBase: "Comment nous protégeons vos données",
  route: "/(tabs)/PrivacyPolicyScreen" as Href,
},
{
  id: "guide",
  icon: BookOpen,
  title: "Guide d'achat",
  subtitleBase: "Comment commander sur Artiva",
  route: "/(tabs)/ShoppingGuideScreen" as Href,
},
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    subtitleBase: "Vos alertes récentes",
    route: "/notifications" as Href,
  },
  {
    id: "settings",
    icon: Settings,
    title: "Paramètres",
    subtitleBase: "Modifier le profil",
    route: "/settings" as Href,
  },
];

export default function TabProfileScreen() {
  const {
    user,
    userToken,
    signOut,
    isLoading: isAuthLoading,
    unreadNotificationCount,
    fetchUnreadNotificationCount,
    effectiveAppColorScheme,
  } = useAuth();
  const router = useRouter();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];

  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersModalVisible, setIsOrdersModalVisible] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userToken) {
        fetchUnreadNotificationCount();
      }
    }, [userToken, fetchUnreadNotificationCount])
  );

  const fetchUserOrders = useCallback(async () => {
    if (!userToken) return;
    setIsLoadingData(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Erreur HTTP ${response.status}` }));
        throw new Error(
          errorData.message ||
            `Erreur lors de la récupération des commandes (${response.status})`
        );
      }
      const ordersData: Order[] = await response.json();
      setOrders(ordersData);
    } catch (err: any) {
      setError(
        err.message || "Impossible de charger l'historique des commandes."
      );
      setOrders([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [userToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserOrders();
    setRefreshing(false);
  }, [fetchUserOrders]);

  const handleLogout = async () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Oui",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const toggleOrdersModal = () => {
    if (!isOrdersModalVisible && user && userToken) {
      fetchUserOrders();
    }
    setIsOrdersModalVisible(!isOrdersModalVisible);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "Date non disponible";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Date invalide"
      : date.toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  // 1. Gérer l'état de chargement initial
  if (isAuthLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 2. Gérer le cas où l'utilisateur n'est pas connecté
  if (!user) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingHorizontal: 20 },
        ]}
      >
        <View style={styles.emptyStateIcon}>
          <User size={60} color={colors.primary} strokeWidth={1.5} />
        </View>
        
        <Text style={[styles.authTitle, { color: colors.text }]}>
          Votre profil vous attend !
        </Text>
        <Text style={[styles.authSubtitle, { color: colors.subtleText }]}>
          Connectez-vous ou créez un compte pour accéder à vos commandes, listes
          de souhaits et plus encore.
        </Text>

        <View style={{ width: "100%", marginVertical: 25 }}>
          {[
            { icon: <MaterialIcons name="flash-on" size={18} color="#4CAF50" />, text: "Livraison rapide" },
            { icon: <FontAwesome5 name="truck" size={18} color="#4CAF50" />, text: "Livraison par Artiva Logistic" },
            { icon: <FontAwesome5 name="credit-card" size={18} color="#4CAF50" />, text: "Paiement sécurisé" },
            { icon: <Entypo name="box" size={18} color="#4CAF50" />, text: "Emballage soigné" },
            { icon: <FontAwesome5 name="star" size={18} color="#4CAF50" />, text: "Qualité garantie" },
          ].map((feature, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 5,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: colors.inputBackground,
                borderRadius: 12,
              }}
            >
              <View style={{ width: 35, alignItems: "center" }}>
                {feature.icon}
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "500",
                  color: colors.text,
                  marginLeft: 12,
                }}
              >
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={{
            paddingVertical: 16,
            borderRadius: 12,
            width: "100%",
            alignItems: "center",
            marginBottom: 12,
            backgroundColor: colors.primary,
          }}
          onPress={() => router.push("/login")}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
            Se connecter
          </Text>
        </Pressable>

        <Pressable
          style={{
            paddingVertical: 16,
            borderRadius: 12,
            width: "100%",
            alignItems: "center",
            marginBottom: 5,
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: colors.primary,
          }}
          onPress={() => router.push("/register")}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}>
            S'inscrire
          </Text>
        </Pressable>
      </View>
    );
  }

  const displayName =
    userDetails?.full_name || user.name || "Utilisateur Artiva";
  const displayEmail =
    userDetails?.email || user.email || "Email non disponible";
  const profileImageUrl =
    userDetails?.profileImage ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=random&size=128`;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.contentContainerScrollView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Stack.Screen options={{ title: "Mon Profil", headerShown: false }} />

      {/* Header Personnalisé */}
      <View
        style={[
          styles.customHeader,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <Text style={[styles.customHeaderTitle, { color: colors.text }]}>
          Mon Profil
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Section Infos Profil */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <View style={styles.profileSection}>
          <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.text }]}>
              {displayName}
            </Text>
            <Text style={[styles.email, { color: colors.subtleText }]}>
              {displayEmail}
            </Text>
            {userDetails?.city && (
              <Text style={[styles.city, { color: colors.subtleText }]}>
                {userDetails.city}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Section Menu */}
      <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
        {menuItemsBaseConfig.map((menuItem, index) => (
          <Pressable
            key={menuItem.id}
            style={[
              styles.menuItem,
              index === menuItemsBaseConfig.length - 1 && styles.menuItemLast,
              { borderBottomColor: colors.cardBorder },
            ]}
            onPress={() => {
              if (menuItem.route) {
                router.push(menuItem.route);
              }
            }}
          >
            <View
              style={[
                styles.menuItemIcon,
                { backgroundColor: colors.inputBackground },
              ]}
            >
              <menuItem.icon
                size={20}
                color={colors.primary}
                strokeWidth={1.75}
              />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                {menuItem.title}
              </Text>
              <Text
                style={[styles.menuItemSubtitle, { color: colors.subtleText }]}
              >
                {menuItem.subtitleBase}
              </Text>
            </View>
            {menuItem.id === "notifications" && unreadNotificationCount > 0 && (
              <View style={styles.notificationItemBadgeContainer}>
                <Text style={styles.notificationItemBadgeText}>
                  {unreadNotificationCount}
                </Text>
              </View>
            )}
            {menuItem.route ? (
              <ChevronRight size={16} color={colors.subtleText} strokeWidth={2} />
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* Bouton Déconnexion */}
      <Pressable
        style={[
          styles.logoutButton,
          {
            backgroundColor: colors.errorBackground,
            borderColor: colors.errorText,
          },
        ]}
        onPress={handleLogout}
      >
        <LogOut size={20} color={colors.errorText} strokeWidth={2} />
        <Text style={[styles.logoutText, { color: colors.errorText }]}>
          Se déconnecter
        </Text>
      </Pressable>

      {/* Modal des Commandes */}
      <Modal
        visible={isOrdersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleOrdersModal}
      >
        <Pressable style={styles.modalOverlay} onPress={toggleOrdersModal}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              Mes Commandes
            </Text>
            {isLoadingData && orders.length === 0 ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: 20 }}
              />
            ) : error && orders.length === 0 ? (
              <Text style={[styles.errorText, { color: colors.errorText }]}>
                {error}
              </Text>
            ) : orders.length === 0 ? (
              <View style={styles.emptyOrdersContainer}>
                <ShoppingBag size={50} color={colors.subtleText} strokeWidth={1.5} />
                <Text style={[styles.noOrdersText, { color: colors.subtleText }]}>
                  Vous n'avez aucune commande pour le moment.
                </Text>
                <Pressable
                  style={[styles.shopButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setIsOrdersModalVisible(false);
                    router.push("/(tabs)/ShopScreen");
                  }}
                >
                  <Text style={styles.shopButtonText}>Découvrir la boutique</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                style={styles.ordersContainer}
                nestedScrollEnabled={true}
              >
                {orders.map((order) => (
                  <View
                    key={order.orderId}
                    style={[
                      styles.orderItem,
                      { borderBottomColor: colors.cardBorder },
                    ]}
                  >
                    <View style={styles.orderHeader}>
                      <Text
                        style={[styles.orderNumber, { color: colors.primary }]}
                      >
                        CDE #{order.order_number || order.orderId}
                      </Text>
                      <Text
                        style={[styles.orderDate, { color: colors.subtleText }]}
                      >
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.orderProducts}>
                      <Text
                        style={[styles.productsTitle, { color: colors.text }]}
                      >
                        Produits :
                      </Text>
                      {order.products?.map((item, idx) => (
                        <View
                          key={item.itemId || idx}
                          style={styles.modalProductItem}
                        >
                          {item.productImageUrl && (
                            <Image
                              source={{ uri: item.productImageUrl }}
                              style={styles.modalProductImage}
                            />
                          )}
                          <View style={styles.modalProductInfo}>
                            <Text
                              style={[
                                styles.modalProductName,
                                { color: colors.text },
                              ]}
                            >
                              {item.product_name}
                            </Text>
                            <Text
                              style={[
                                styles.modalProductDetails,
                                { color: colors.subtleText },
                              ]}
                            >
                              Qté: {item.quantity} - Prix: {item.unit_price}{" "}
                              {order.currency}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    <View style={styles.orderFooter}>
                      <Text
                        style={[
                          styles.orderPrice,
                          { color: colors.tint_price },
                        ]}
                      >
                        Total: {order.total} {order.currency}
                      </Text>
                      <Text
                        style={[
                          styles.orderStatus,
                          { color: colors.successText },
                        ]}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <Pressable
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={toggleOrdersModal}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  contentContainerScrollView: { paddingBottom: 30 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? 45 : 20,
    borderBottomWidth: 1,
  },
  customHeaderTitle: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  profileSection: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 70, height: 70, borderRadius: 35, marginRight: 16 },
  profileInfo: { flex: 1 },
  name: { fontWeight: "bold", fontSize: 20 },
  email: { fontSize: 14, marginTop: 2 },
  city: { fontSize: 13, marginTop: 2 },
  menuSection: {
    marginTop: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontWeight: "600", fontSize: 15 },
  menuItemSubtitle: { fontSize: 13, marginTop: 2 },
  notificationItemBadgeContainer: {
    backgroundColor: "red",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: "auto",
    marginRight: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationItemBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 24,
    marginTop: 25,
    marginBottom: 32,
    padding: 15,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
  },
  logoutText: { fontWeight: "600", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    width: "100%",
    maxHeight: "75%",
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  ordersContainer: {},
  orderItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1 },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderNumber: { fontWeight: "bold", fontSize: 16 },
  orderDate: { fontSize: 13 },
  orderProducts: { marginLeft: 8, marginBottom: 8, marginTop: 5 },
  productsTitle: { fontWeight: "600", fontSize: 14, marginBottom: 6 },
  modalProductItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modalProductImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: "#e0e0e0",
  },
  modalProductInfo: { flex: 1 },
  modalProductName: { fontSize: 14, fontWeight: "500" },
  modalProductDetails: { fontSize: 12 },
  orderFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderPrice: { fontWeight: "bold", fontSize: 16 },
  orderStatus: { fontSize: 14, fontWeight: "500" },
  noOrdersText: { fontSize: 16, textAlign: "center", paddingVertical: 10 },
  emptyOrdersContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  shopButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 15,
  },
  shopButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  closeButtonText: { fontSize: 16, fontWeight: "bold", color: "white" },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateIcon: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
