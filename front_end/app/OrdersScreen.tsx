// ARTIVA/front_end/app/orders.tsx (ou CommandesScreen.tsx selon le nom du fichier)

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import LoadingArtiva from "./product/LoadingArtiva";

interface OrderItem {
  itemId?: string | number;
  item_name: string;
  quantity: number;
  unit_price: string | number;
  productImageUrl?: string;
}

interface Order {
  orderId: string | number;
  order_number?: string;
  status: string;
  total: string | number;
  currency: string;
  createdAt: string;
  products: OrderItem[];
}

const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

export default function CommandesScreen() {
  const { userToken, effectiveAppColorScheme } = useAuth();
  const router = useRouter();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = {
    background: currentScheme === "dark" ? "#121212" : "#f9f9f9",
    card: currentScheme === "dark" ? "#1e1e1e" : "#fff",
    text: currentScheme === "dark" ? "#fff" : "#111",
    subtleText: currentScheme === "dark" ? "#aaa" : "#666",
    primary: currentScheme === "dark" ? "#FF8C00" : "#000",
    border: currentScheme === "dark" ? "#333" : "#e0e0e0",
    successText: "#28a745",
    errorText: "#dc3545",
    tint_price: currentScheme === "dark" ? "#FF8C00" : "#000",
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!userToken) {
      setError("Token utilisateur manquant, veuillez vous reconnecter");
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || `Erreur HTTP ${response.status}`);
      }
      setOrders(data);
    } catch (err: any) {
      console.log("Erreur API commandes:", err);
      setError(err.message || "Impossible de charger les commandes.");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatDate = (dateString: string) => {
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

  // ✅ Si le chargement est en cours, afficher le composant personnalisé
  if (loading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: "Commandes",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: "600" },
          headerTintColor: colors.primary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 18 }}>←</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {error ? (
          <Text style={[styles.messageText, { color: colors.errorText }]}>{error}</Text>
        ) : orders.length === 0 ? (
          <Text style={[styles.messageText, { color: colors.subtleText }]}>
            Vous n'avez aucune commande pour le moment.
          </Text>
        ) : (
          orders.map((order) => (
            <View key={order.orderId} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Header */}
              <View style={styles.orderHeader}>
                <Text style={[styles.orderNumber, { color: colors.primary }]}>
                  CDE #{order.order_number || order.orderId}
                </Text>
              </View>
              <Text style={[styles.orderDate, { color: colors.subtleText }]}>{formatDate(order.createdAt)}</Text>

              {/* Produits */}
              <View style={styles.productsList}>
                {order.products.map((item, idx) => (
                  <View key={item.itemId || idx} style={styles.productRow}>
                    {item.productImageUrl ? (
                      <Image source={{ uri: item.productImageUrl }} style={styles.productImage} />
                    ) : (
                      <View style={[styles.productImage, { backgroundColor: currentScheme === "dark" ? "#333" : "#eee" }]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productName, { color: colors.text }]}>{item.item_name}</Text>
                      <Text style={[styles.productDetails, { color: colors.subtleText }]}>
                        Qté {item.quantity} • {item.unit_price} {order.currency}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.orderFooter}>
                <Text style={[styles.totalText, { color: colors.tint_price }]}>
                  Total : {order.total} {order.currency}
                </Text>
                <Text style={[styles.statusText, { color: colors.successText }]}>{order.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 16, paddingBottom: Platform.OS === "ios" ? 30 : 20 },

  orderCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },

  orderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  orderNumber: { fontWeight: "bold", fontSize: 16 },
  orderDate: { fontSize: 13, marginBottom: 8 },

  productsList: { marginTop: 8 },
  productRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  productImage: { width: 48, height: 48, borderRadius: 6, marginRight: 12 },
  productName: { fontSize: 15, fontWeight: "600" },
  productDetails: { fontSize: 13, marginTop: 2 },

  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  totalText: { fontSize: 16, fontWeight: "bold" },
  statusText: { fontSize: 14, fontWeight: "600" },

  messageText: { textAlign: "center", fontSize: 16, marginTop: 50 },
});
