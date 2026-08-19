// ARTIVA/front_end/app/orders/[orderId].tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Button,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, Href } from "expo-router";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import LoadingArtiva from "../product/LoadingArtiva";

const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

interface OrderItem {
  itemId: number | string;
  product_id?: number | string | null;
  product_name: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
}

interface OrderDetailsType {
  orderId: number | string;
  order_number?: string;
  status: string;
  total: string | number;
  currency: string;
  createdAt: string;
  shipping_address: any;
  billing_address?: any;
  notes?: string;
  items: OrderItem[];
  userName?: string;
  userEmail?: string;
  shipping_method?: string;
  shipping_cost?: string | number;
}

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { userToken, effectiveAppColorScheme } = useAuth();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];

  const [order, setOrder] = useState<OrderDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState(
    orderId ? `Commande #${orderId}` : "Détails Commande"
  );

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId || !userToken) {
      setError(!orderId ? "ID de commande manquant." : "Connexion requise.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(
          errorData.message || "Erreur chargement détails commande"
        );
      }
      const data: OrderDetailsType = await response.json();
      setOrder(data);
      if (data.order_number) {
        setPageTitle(`Commande #${data.order_number}`);
      }
    } catch (err: any) {
      setError(err.message);
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, userToken]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "Date non disponible";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Date invalide"
      : date.toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }) +
          " " +
          date.toLocaleTimeString("fr-FR");
  };

  const renderAddress = (addressData: any) => {
    if (!addressData)
      return (
        <Text style={[styles.addressText, { color: colors.subtleText }]}>
          Non spécifiée
        </Text>
      );
    const addressObj =
      typeof addressData === "string" ? JSON.parse(addressData) : addressData;

    return (
      <>
        {addressObj.name && (
          <Text style={[styles.addressText, { color: colors.text }]}>
            {addressObj.name}
          </Text>
        )}
        {addressObj.line1 && (
          <Text style={[styles.addressText, { color: colors.text }]}>
            {addressObj.line1}
          </Text>
        )}
        {addressObj.line2 && (
          <Text style={[styles.addressText, { color: colors.text }]}>
            {addressObj.line2}
          </Text>
        )}
        {(addressObj.city || addressObj.postal_code) && (
          <Text style={[styles.addressText, { color: colors.text }]}>
            {addressObj.city}
            {addressObj.postal_code && `, ${addressObj.postal_code}`}
          </Text>
        )}
        {addressObj.country && (
          <Text style={[styles.addressText, { color: colors.text }]}>
            {addressObj.country}
          </Text>
        )}
        {addressObj.phone && (
          <Text style={[styles.addressText, { color: colors.text }]}>
            Tél: {addressObj.phone}
          </Text>
        )}
      </>
    );
  };

  // ✅ Si le chargement est en cours, afficher le composant personnalisé
  if (isLoading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.errorText }}>{error}</Text>
        <Button
          title="Réessayer"
          onPress={fetchOrderDetails}
          color={colors.tint}
        />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>
          Détails de la commande non trouvés.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screenContainer, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ title: pageTitle }} />

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Récapitulatif Commande
        </Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Numéro :{" "}
          <Text style={[styles.value, { color: colors.text }]}>
            {order.order_number}
          </Text>
        </Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Date :{" "}
          <Text style={[styles.value, { color: colors.text }]}>
            {formatDate(order.createdAt)}
          </Text>
        </Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Statut :{" "}
          <Text
            style={[styles.value, { color: colors.tint, fontWeight: "bold" }]}
          >
            {order.status}
          </Text>
        </Text>
        <Text style={[styles.text, { color: colors.text }]}>
          Total :{" "}
          <Text
            style={[styles.value, styles.totalValue, { color: colors.tint }]}
          >
            {order.total} {order.currency}
          </Text>
        </Text>
      </View>

      {(order.userName || order.userEmail) && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Client
          </Text>
          {order.userName && (
            <Text style={[styles.text, { color: colors.text }]}>
              Nom :{" "}
              <Text style={[styles.value, { color: colors.text }]}>
                {order.userName}
              </Text>
            </Text>
          )}
          {order.userEmail && (
            <Text style={[styles.text, { color: colors.text }]}>
              Email :{" "}
              <Text style={[styles.value, { color: colors.text }]}>
                {order.userEmail}
              </Text>
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Adresse de Livraison
        </Text>
        {renderAddress(order.shipping_address)}
      </View>

      {order.billing_address &&
        Object.keys(order.billing_address).length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Adresse de Facturation
            </Text>
            {renderAddress(order.billing_address)}
          </View>
        )}

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Articles ({order.items?.length || 0})
        </Text>
        {order.items &&
          order.items.map((item) => (
            <View
              key={item.itemId}
              style={[styles.item, { borderBottomColor: colors.cardBorder }]}
            >
              <Text style={[styles.itemName, { color: colors.text }]}>
                {item.product_name} (x{item.quantity})
              </Text>
              <Text style={[styles.itemPrice, { color: colors.subtleText }]}>
                {parseFloat(String(item.unit_price)).toFixed(2)}{" "}
                {order.currency} x {item.quantity} ={" "}
                {parseFloat(String(item.subtotal)).toFixed(2)} {order.currency}
              </Text>
            </View>
          ))}
        {(!order.items || order.items.length === 0) && (
          <Text style={[styles.itemPrice, { color: colors.subtleText }]}>
            Aucun article dans cette commande.
          </Text>
        )}
      </View>

      {(order.shipping_method || order.shipping_cost !== undefined) && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Livraison
          </Text>
          {order.shipping_method && (
            <Text style={[styles.text, { color: colors.text }]}>
              Méthode :{" "}
              <Text style={[styles.value, { color: colors.text }]}>
                {order.shipping_method}
              </Text>
            </Text>
          )}
          {order.shipping_cost !== undefined && (
            <Text style={[styles.text, { color: colors.text }]}>
              Coût :{" "}
              <Text style={[styles.value, { color: colors.text }]}>
                {parseFloat(String(order.shipping_cost)).toFixed(2)}{" "}
                {order.currency}
              </Text>
            </Text>
          )}
        </View>
      )}

      {order.notes && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Vos Notes
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            {order.notes}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  section: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 15,
    marginBottom: 6,
    lineHeight: 22,
  },
  value: {
    fontWeight: "500",
  },
  totalValue: {
    fontWeight: "bold",
    fontSize: 16,
  },
  item: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 3,
  },
  itemPrice: {
    fontSize: 14,
  },
  addressText: {
    fontSize: 15,
    marginBottom: 4,
    lineHeight: 22,
  },
});
