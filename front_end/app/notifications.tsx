// ARTIVA/front_end/app/notifications.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  Platform,
  RefreshControl,
} from "react-native";
import { Stack, useRouter, Href } from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { useAuth } from "../context/AuthContext";
import LoadingArtiva from "./product/LoadingArtiva";
import { API_BASE_URL } from "../constants/Api"; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans constants/Api.ts ---
// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

interface NotificationItem {
  id: string | number;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

export default function NotificationsPage() {
  const { userToken, fetchUnreadNotificationCount, effectiveAppColorScheme } =
    useAuth();
  const router = useRouter();

  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];
  const tintColor = colors.tint;
  const textColor = colors.text;
  const backgroundColor = colors.background;
  const subtleTextColor = colors.subtleText;
  const card = colors.card;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchNotifications = useCallback(
    async (page = 1, isRefreshing = false) => {
      if (!userToken) {
        if (!isRefreshing) setIsLoading(true);
        setError("Veuillez vous connecter pour voir vos notifications.");
        setSuccessMessage(null);
        if (!isRefreshing) setIsLoading(false);
        setRefreshing(false);
        return;
      }

      console.log(
        `NotificationsScreen: Fetching notifications, page: ${page}, isAction: ${isRefreshing}`
      );
      if (page === 1 && !isRefreshing) setIsLoading(true);
      if (
        (page === 1 && !notifications.length && !error) ||
        page > 1 ||
        isRefreshing
      ) {
        if (page > 1) setIsLoadingMore(true);
        else setIsLoading(true);
      }
      if (page === 1 && !isRefreshing) setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/notifications?page=${page}&limit=15`,
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        if (!response.ok) {
          const errData = await response
            .json()
            .catch(() => ({ message: `HTTP ${response.status}` }));
          throw new Error(errData.message || "Erreur chargement notifications");
        }
        const data = await response.json();

        const newNotifications = data.notifications.map((n: any) => ({
          ...n,
          id: String(n.id),
        }));

        setNotifications((prev) =>
          page === 1 ? newNotifications : [...prev, ...newNotifications]
        );
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
      } catch (err: any) {
        console.error("NotificationsScreen: Erreur fetchNotifications:", err);
        setError(err.message || "Impossible de charger les notifications.");
        setSuccessMessage(null);
        if (page === 1) setNotifications([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        if (isRefreshing) setRefreshing(false);
      }
    },
    [userToken, notifications.length, error]
  );

  useEffect(() => {
    if (userToken) {
      console.log(
        "NotificationsScreen: useEffect [userToken, fetchNotifications] - Appel fetchNotifications"
      );
      fetchNotifications(1, false);
    } else {
      setNotifications([]);
      setIsLoading(false);
    }
  }, [userToken]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const loadMoreNotifications = () => {
    if (!isLoadingMore && currentPage < totalPages) {
      console.log("Chargement page suivante de notifications...");
      fetchNotifications(currentPage + 1);
    }
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    console.log(
      "Notification cliquée:",
      notification.id,
      "Lien:",
      notification.link_url,
      "Déjà lue:",
      notification.is_read
    );

    if (!notification.is_read && userToken) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );

      try {
        console.log(
          `Marquage de la notification ${notification.id} comme lue...`
        );
        const response = await fetch(
          `${API_BASE_URL}/notifications/${notification.id}/read`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );
        if (response.ok && !notification.is_read) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
          fetchUnreadNotificationCount();
          setSuccessMessage("Notification marquée comme lue !");
          setTimeout(() => setSuccessMessage(null), 3000);
        }
        if (!response.ok) {
          setNotifications(
            (prev) =>
              prev.map((n) =>
                n.id === notification.id ? { ...n, is_read: false } : n
              )
          );
          const errorData = await response
            .json()
            .catch(() => ({ message: `HTTP ${response.status}` }));
          console.warn(
            `Échec du marquage de la notification ${notification.id} comme lue: ${errorData.message}`
          );
          setError(
            errorData.message ||
              "Impossible de marquer la notification comme lue."
          );
          setTimeout(() => setError(null), 3000);
        } else {
          console.log(
            `Notification ${notification.id} marquée comme lue avec succès.`
          );
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
        }
      } catch (e) {
        console.error("Erreur API marquage notif comme lue:", e);
        setError("Erreur lors de la communication avec le serveur.");
        setTimeout(() => setError(null), 3000);
      }
    }

    if (
      notification.link_url &&
      typeof notification.link_url === "string" &&
      notification.link_url.trim() !== ""
    ) {
      try {
        const path = notification.link_url as Href;
        console.log(
          `Tentative de navigation vers le lien de la notification: ${path}`
        );
        router.push(path);
      } catch (e) {
        console.error("Erreur de navigation depuis la notification:", e);
        setError("Le lien de cette notification semble invalide.");
        setTimeout(() => setError(null), 3000);
      }
    } else {
      console.log(
        "Aucun link_url valide pour cette notification ou navigation non nécessaire."
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    if (!userToken || unreadNotifications.length === 0) {
      console.log(
        "handleMarkAllAsRead: Pas de token ou aucune notification non lue."
      );
      return;
    }

    const previousNotificationsState = [...notifications];

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    console.log("handleMarkAllAsRead: Mise à jour optimiste UI effectuée.");

    try {
      console.log(
        "handleMarkAllAsRead: Appel API vers /notifications/read-all"
      );
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        fetchUnreadNotificationCount();
        setSuccessMessage(
          "Toutes les notifications ont été marquées comme lues."
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      }

      if (!response.ok) {
        setNotifications(previousNotificationsState);
        const errorData = await response.json().catch(() => ({
          message: `Erreur HTTP ${response.status} lors de la tentative de marquer tout comme lu.`,
        }));
        console.error(
          "handleMarkAllAsRead: Échec API Tout Lu - Erreur:",
          errorData.message || `Statut ${response.status}`
        );
        setError(
          errorData.message ||
            "Impossible de marquer toutes les notifications comme lues."
        );
        setTimeout(() => setError(null), 3000);
        throw new Error(errorData.message || "Échec API Tout Lu");
      }

      const data = await response.json();
      console.log("handleMarkAllAsRead: Réponse API 'Tout lu':", data);
    } catch (e: any) {
      console.error(
        "handleMarkAllAsRead: Erreur dans le bloc try/catch API:",
        e.message
      );
      setNotifications(previousNotificationsState);
      setError(e.message || "Une erreur s'est produite.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: item.is_read
            ? colors.card
            : Colors[currentScheme].tint + "20",
        },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIconArea}>
        <FontAwesome
          name={item.type === "order_status_update" ? "truck" : "bell"}
          size={24}
          color={item.is_read ? subtleTextColor : tintColor}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text
          style={[
            styles.notificationTitle,
            { color: textColor },
            !item.is_read && styles.unreadText,
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.notificationMessage,
            { color: subtleTextColor },
            !item.is_read && styles.unreadTextLight,
          ]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
        <Text style={[styles.notificationDate, { color: subtleTextColor }]}>
          {new Date(item.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          })}{" "}
          à{" "}
          {new Date(item.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  // ✅ Si le chargement est en cours, afficher le composant personnalisé
  if (isLoading && notifications.length === 0 && !refreshing) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  // Si l'utilisateur n'est pas connecté
  if (!isLoading && !userToken) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <Text
          style={{
            color: textColor,
            fontSize: 16,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Veuillez vous connecter pour voir vos notifications.
        </Text>
        <Button
          title="Se connecter"
          onPress={() => router.push("/login")}
          color={tintColor}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor }]}>
      <Stack.Screen
        options={{ title: " Mes Notifications", headerBackTitle: "Retour" }}
      />

      {error && (
        <Text
          style={[
            styles.message,
            {
              color: colors.errorText,
              backgroundColor: currentScheme === "dark" ? "#3d1a1a" : "#fde8e8",
            },
          ]}
        >
          {error}
        </Text>
      )}
      {successMessage && (
        <Text
          style={[
            styles.message,
            {
              color: currentScheme === "dark" ? "#4caf50" : "#2e7d32",
              backgroundColor: currentScheme === "dark" ? "#1a3d1a" : "#e8f5e9",
            },
          ]}
        >
          {successMessage}
        </Text>
      )}

      <View
        style={[{ borderBottomColor: subtleTextColor, backgroundColor: card }]}
      >
        {notifications.some((n) => !n.is_read) && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllReadButton}
          >
            <Text style={{ color: tintColor, fontSize: 14 }}>Tout lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && notifications.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.errorText, textAlign: "center" }}>
            {error}
          </Text>
          <Button
            title="Réessayer"
            onPress={() => fetchNotifications(1, true)}
            color={tintColor}
          />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="bell-slash-o" size={60} color={subtleTextColor} />
          <Text style={[styles.emptyText, { color: textColor }]}>
            Aucune notification pour le moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tintColor}
            />
          }
          onEndReached={loadMoreNotifications}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 20 }}
                color={tintColor}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? 40 : 15,
    borderBottomWidth: 1,
  },
  customHeaderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    color: "#212121",
  },
  markAllReadButton: { paddingVertical: 5, paddingHorizontal: 10 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 30,
    textAlign: "center",
  },
  listContainer: { padding: 10 },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1.5,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
    borderColor: "transparent",
  },
  notificationIconArea: {
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
    width: 30,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 3,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  notificationDate: {
    fontSize: 12,
  },
  unreadText: {
    fontWeight: "bold",
  },
  unreadTextLight: {},
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "tomato",
    alignSelf: "center",
    marginLeft: 10,
  },
  message: {
    padding: 10,
    borderRadius: 5,
    textAlign: "center",
    fontWeight: "bold",
    marginVertical: 15,
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
});
