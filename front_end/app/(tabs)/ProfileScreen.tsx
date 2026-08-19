// // ARTIVA/front_end/app/(tabs)/ProfileScreen.tsx
// import React, { useEffect, useState, useCallback } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Pressable,
//   Image,
//   ScrollView,
//   Modal,
//   Button,
//   ActivityIndicator,
//   Alert,
//   Platform, // Ajout de Platform pour les styles
// } from "react-native";
// import {
//   Settings,
//   ShoppingBag,
//   Heart,
//   CreditCard,
//   Bell,
//   LogOut as LogOutIcon, // Renommé pour éviter conflit si LogOut est utilisé ailleurs
//   ChevronRight,
//   ChevronDown,
//   ChevronUp,
// } from "lucide-react-native";
// import { useRouter, Href, Stack, useFocusEffect } from "expo-router";
// import { useAuth, User } from "../../context/AuthContext"; // Assure-toi que User est exporté depuis AuthContext
// import Colors from "../../constants/Colors";
// import { useColorScheme } from "../../components/useColorScheme";
// import { FontAwesome } from "@expo/vector-icons";

// // Définition des types pour les données
// interface UserDetails {
//   // User est importé de AuthContext
//   profileImage?: string;
//   full_name?: string; // Si différent de user.name de AuthContext
//   city?: string;
//   email?: string;
// }

// // Type pour un article DANS UNE COMMANDE (order_item)
// interface OrderItem {
//   itemId?: string | number; // Vient de oi.id as "itemId"
//   product_id?: string | number; // Vient de oi.product_id
//   product_name: string;
//   sku?: string;
//   quantity: number;
//   unit_price: string | number;
//   subtotal: string | number;
//   productImageUrl?: string; // Image du produit dans la commande
// }

// interface Order {
//   orderId: string | number;
//   order_number?: string; // Rendu optionnel si l'API ne le renvoie pas toujours
//   status: string;
//   total: string | number;
//   currency: string;
//   createdAt: string;
//   updatedAt?: string;
//   products: OrderItem[]; // Tableau d'OrderItem
// }

// // Menu Items
// const menuItemsBaseConfig: {
//   // Renommé en menuItemsBaseConfig pour clarté
//   id: string;
//   icon: React.ElementType;
//   title: string;
//   subtitleBase: string; // Sous-titre de base
//   route?: Href;
//   action?: "toggleOrdersModal"; // Pour les actions qui ne sont pas des navigations directes
// }[] = [
//   {
//     id: "orders",
//     icon: ShoppingBag,
//     title: "Mes commandes",
//     subtitleBase: "Voir l'historique",
//     action: "toggleOrdersModal",
//   },
//   {
//     id: "wishlist",
//     icon: Heart,
//     title: "Liste de souhaits",
//     subtitleBase: "Vos produits favoris",
//     route: "/(tabs)/WishlistScreen" as Href,
//   },
//   // { id: 'payment', icon: CreditCard, title: "Paiement", subtitleBase: "Gérer les moyens", route: "/(tabs)/payment-methods" as Href },
//   {
//     id: "notifications",
//     icon: Bell,
//     title: "Notifications",
//     subtitleBase: "Vos alertes récentes",
//     route: "/notifications" as Href,
//   }, // Route directe
//   {
//     id: "settings",
//     icon: Settings,
//     title: "Paramètres",
//     subtitleBase: "Modifier le profil",
//     route: "/settings" as Href,
//   },
// ];

// const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api"; // TON IP

// export default function TabProfileScreen() {
//   const {
//     user,
//     userToken,
//     signOut,
//     isLoading: isAuthLoading,
//     unreadNotificationCount,
//     fetchUnreadNotificationCount,
//     effectiveAppColorScheme,
//   } = useAuth();
//   const router = useRouter();
//   //const colorScheme = useColorScheme();
//   //const tintColor = Colors[colorScheme ?? "light"].tint;
//   //const textColor = Colors[colorScheme ?? "light"].text;
//   //const cardColor = Colors[colorScheme ?? "light"].card;
//   //const subtleTextColor = Colors[colorScheme ?? "light"].tabIconDefault;
//   //const backgroundColor = Colors[colorScheme ?? "light"].background;

//   // CHANGEMENT: Utilisation des couleurs dynamiques du thème partout
//   const currentScheme = effectiveAppColorScheme ?? "light";
//   const colors = Colors[currentScheme];
//   const tintColor = Colors[currentScheme].tint;
//   const textColor = Colors[currentScheme].text;
//   const backgroundColor = Colors[currentScheme].background;
//   const subtleTextColor = Colors[currentScheme].subtleText;
//   const successTextColor = Colors[currentScheme].successText;
//   const cardColor = Colors[currentScheme].card; // Couleur de fond des cartes

//   const [orders, setOrders] = useState<Order[]>([]);
//   const [isOrdersModalVisible, setIsOrdersModalVisible] = useState(false);
//   const [isLoadingData, setIsLoadingData] = useState(false); // Pour fetchUserOrders
//   const [error, setError] = useState<string | null>(null);
//   const [userDetails, setUserDetails] = useState<UserDetails | null>(null); // Pour les détails supplémentaires du profil

//   useFocusEffect(
//     useCallback(() => {
//       if (userToken) {
//         console.log(
//           "ProfileScreen a le focus, mise à jour du compte des notifications."
//         );
//         fetchUnreadNotificationCount();
//       }
//     }, [userToken, fetchUnreadNotificationCount])
//   );

//   const fetchUserOrders = useCallback(async () => {
//     if (!userToken) return;
//     console.log("ProfileScreen: Appel de fetchUserOrders");
//     setIsLoadingData(true); // Utiliser cet état pour le chargement des commandes
//     setError(null);
//     try {
//       const response = await fetch(`${API_BASE_URL}/orders`, {
//         headers: { Authorization: `Bearer ${userToken}` },
//       });
//       if (!response.ok) {
//         const errorData = await response
//           .json()
//           .catch(() => ({ message: `Erreur HTTP ${response.status}` }));
//         throw new Error(
//           errorData.message ||
//             `Erreur lors de la récupération des commandes (${response.status})`
//         );
//       }
//       const ordersData: Order[] = await response.json();
//       setOrders(ordersData);
//     } catch (err: any) {
//       console.error("fetchUserOrders error:", err);
//       setError(
//         err.message || "Impossible de charger l'historique des commandes."
//       );
//       setOrders([]);
//     } finally {
//       setIsLoadingData(false);
//     }
//   }, [userToken]);

//   // Charger les commandes une fois au montage si l'utilisateur est connecté
//   useEffect(() => {
//     if (user && userToken) {
//       // fetchUserOrders(); // Déplacé dans toggleOrdersModal pour ne charger qu'à l'ouverture
//     }
//   }, [user, userToken]);

//   const handleLogout = async () => {
//     Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
//       { text: "Annuler", style: "cancel" },
//       {
//         text: "Oui",
//         onPress: async () => {
//           await signOut(); /* La redirection est gérée par AuthContext/app/index.tsx */
//         },
//       },
//     ]);
//   };

//   const toggleOrdersModal = () => {
//     if (!isOrdersModalVisible && user && userToken) {
//       // Charger les commandes seulement si on ouvre le modal et qu'on est connecté
//       fetchUserOrders();
//     }
//     setIsOrdersModalVisible(!isOrdersModalVisible);
//   };

//   const formatDate = (dateString: string | undefined): string => {
//     if (!dateString) return "Date non disponible";
//     const date = new Date(dateString);
//     return isNaN(date.getTime())
//       ? "Date invalide"
//       : date.toLocaleDateString("fr-FR", {
//           year: "numeric",
//           month: "long",
//           day: "numeric",
//         }) +
//           " " +
//           date.toLocaleTimeString("fr-FR");
//   };

//   // Construire dynamiquement les items du menu pour inclure le compte des notifications dans le sous-titre
//   // ou simplement pour utiliser la variable unreadNotificationCount pour le badge
//   const menuItemsToDisplay = menuItemsBaseConfig.map((item) => {
//     if (item.id === "notifications") {
//       return {
//         ...item,
//         // Optionnel : Mettre à jour le sous-titre
//         // subtitle: unreadNotificationCount > 0
//         //   ? `${unreadNotificationCount} nouvelle(s)`
//         //   : item.subtitleBase,
//         subtitle: item.subtitleBase, // Garder le sous-titre de base, le badge visuel suffit
//       };
//     }
//     return item; // Retourner l'item original pour les autres
//   });

//   if (isAuthLoading || !user) {
//     // Attendre que AuthContext ait chargé l'utilisateur
//     return (
//       <View style={[styles.centered, { backgroundColor }]}>
//         <ActivityIndicator size="large" color={tintColor} />
//         {/*LoadingData is an indicator that the page is loading */}
//         <Text style={{ marginTop: 10, color: textColor }}>
//           Chargement du compte...
//         </Text>
//       </View>
//     );
//   }

//   const displayName =
//     userDetails?.full_name || user.name || "Utilisateur Artiva";
//   const displayEmail =
//     userDetails?.email || user.email || "Email non disponible";
//   // Utilise une image de placeholder ou une logique pour une vraie image de profil
//   const profileImageUrl =
//     userDetails?.profileImage ||
//     (user as any)?.profileImageFromAuthContext ||
//     `https://ui-avatars.com/api/?name=${encodeURIComponent(
//       displayName
//     )}&background=random&size=128`;

//   return (
//     <ScrollView
//       style={[styles.container, { backgroundColor }]}
//       contentContainerStyle={styles.contentContainerScrollView}
//     >
//       <Stack.Screen options={{ title: "Mon Profil", headerShown: false }} />

//       <View
//         style={[
//           styles.customHeader,
//           { borderBottomColor: subtleTextColor, backgroundColor: cardColor },
//         ]}
//       >
//         {/* Espace pour équilibrer si pas de bouton retour. Si tu veux un bouton retour: */}
//         {/* {router.canGoBack() && (
//           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={28} color={tintColor} />
//           </TouchableOpacity>
//         )} */}
//         <View style={{ width: 40 }} />
//         <Text style={[styles.customHeaderTitle, { color: textColor }]}>
//           Mon Profil
//         </Text>
//         <View style={{ width: 40 }} />
//       </View>
//       <View
//         style={[
//           styles.header,
//           { backgroundColor: cardColor, borderBottomColor: subtleTextColor },
//         ]}
//       >
//         <View style={styles.profileSection}>
//           <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
//           <View style={styles.profileInfo}>
//             <Text style={[styles.name, { color: textColor }]}>
//               {displayName}
//             </Text>
//             <Text style={[styles.email, { color: subtleTextColor }]}>
//               {displayEmail}
//             </Text>
//           </View>
//         </View>
//       </View>

//       {/* Section Menu */}
//       <View style={[styles.menuSection, { backgroundColor: cardColor }]}>
//         {menuItemsToDisplay.map((menuItem, index) => (
//           <Pressable
//             key={menuItem.id}
//             style={[
//               styles.menuItem,
//               index === menuItemsToDisplay.length - 1 && styles.menuItemLast,
//               { borderBottomColor: subtleTextColor },
//             ]}
//             onPress={() => {
//               if (menuItem.action === "toggleOrdersModal") {
//                 toggleOrdersModal();
//               } else if (menuItem.route) {
//                 router.push(menuItem.route);
//               }
//             }}
//           >
//             <View
//               style={[
//                 styles.menuItemIcon,
//                 {
//                   backgroundColor:
//                     backgroundColor === "#000000" ? "#374151" : "#EBF4FF",
//                 },
//               ]}
//             >
//               <menuItem.icon size={20} color={tintColor} strokeWidth={1.75} />
//             </View>
//             <View style={styles.menuItemContent}>
//               <Text style={[styles.menuItemTitle, { color: textColor }]}>
//                 {menuItem.title}
//               </Text>
//               <Text
//                 style={[styles.menuItemSubtitle, { color: subtleTextColor }]}
//               >
//                 {menuItem.subtitleBase}
//               </Text>
//             </View>

//             {/* Badge de Notification */}
//             {menuItem.id === "notifications" && unreadNotificationCount > 0 && (
//               <View style={styles.notificationItemBadgeContainer}>
//                 <Text style={styles.notificationItemBadgeText}>
//                   {unreadNotificationCount}
//                 </Text>
//               </View>
//             )}

//             {/* Chevrons */}
//             {menuItem.action === "toggleOrdersModal" ? (
//               <FontAwesome
//                 name={isOrdersModalVisible ? "chevron-up" : "chevron-down"}
//                 size={16}
//                 color={subtleTextColor}
//               />
//             ) : menuItem.route ? (
//               <FontAwesome
//                 name="chevron-right"
//                 size={16}
//                 color={subtleTextColor}
//               />
//             ) : null}
//           </Pressable>
//         ))}
//       </View>

//       <Pressable style={styles.logoutButton} onPress={handleLogout}>
//         <LogOutIcon size={20} color="#EF4444" strokeWidth={2} />
//         <Text style={styles.logoutText}>Se déconnecter</Text>
//       </Pressable>

//       {/* Modal pour afficher les commandes */}
//       <Modal
//         visible={isOrdersModalVisible}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={toggleOrdersModal}
//       >
//         <Pressable style={styles.modalOverlay} onPress={toggleOrdersModal}>
//           <Pressable
//             style={[styles.modalContent, { backgroundColor: cardColor }]} //Le background modalContent est maintenant dynamique
//             onPress={(e) => e.stopPropagation()}
//           >
//             <Text style={[styles.modalTitle, { color: tintColor }]}>
//               Mes Commandes
//             </Text>
//             {isLoadingData && orders.length === 0 ? (
//               <ActivityIndicator
//                 size="large"
//                 color={tintColor}
//                 style={{ marginVertical: 20 }}
//               />
//             ) : error && orders.length === 0 ? (
//               <Text style={[styles.errorText, { color: subtleTextColor }]}>
//                 {error}
//               </Text>
//             ) : orders.length === 0 ? (
//               <Text style={[styles.noOrdersText, { color: subtleTextColor }]}>
//                 Vous n'avez aucune commande pour le moment.
//               </Text>
//             ) : (
//               <ScrollView
//                 style={styles.ordersContainer}
//                 nestedScrollEnabled={true}
//               >
//                 {orders.map((order) => (
//                   <View key={order.orderId} style={styles.orderItem}>
//                     <View style={styles.orderHeader}>
//                       <Text style={[styles.orderNumber, { color: textColor }]}>
//                         CDE #{order.order_number || order.orderId}
//                       </Text>
//                       <Text
//                         style={[styles.orderDate, { color: subtleTextColor }]}
//                       >
//                         {formatDate(order.createdAt)}
//                       </Text>
//                     </View>
//                     <View style={styles.orderProducts}>
//                       <Text
//                         style={[styles.productsTitle, { color: textColor }]}
//                       >
//                         Produits:
//                       </Text>
//                       {order.products && order.products.length > 0 ? (
//                         order.products.map((productItem, idx) => (
//                           <View
//                             key={
//                               productItem.itemId ||
//                               productItem.product_id ||
//                               idx
//                             }
//                             style={styles.modalProductItem}
//                           >
//                             {productItem.productImageUrl && (
//                               <Image
//                                 source={{ uri: productItem.productImageUrl }}
//                                 style={styles.modalProductImage}
//                               />
//                             )}
//                             <View style={styles.modalProductInfo}>
//                               <Text
//                                 style={[
//                                   styles.modalProductName,
//                                   { color: textColor },
//                                 ]}
//                               >
//                                 {productItem.product_name || "Produit"}
//                               </Text>
//                               <Text
//                                 style={[
//                                   styles.modalProductDetails,
//                                   { color: subtleTextColor },
//                                 ]}
//                               >
//                                 Qté: {productItem.quantity} - Prix Unit.:{" "}
//                                 {productItem.unit_price} {order.currency}
//                               </Text>
//                             </View>
//                           </View>
//                         ))
//                       ) : (
//                         <Text
//                           style={[
//                             styles.productItem,
//                             { color: subtleTextColor },
//                           ]}
//                         >
//                           Détails non disponibles.
//                         </Text>
//                       )}
//                     </View>
//                     <View style={styles.orderFooter}>
//                       <Text style={[styles.orderPrice, { color: tintColor }]}>
//                         Total: {order.total} {order.currency}
//                       </Text>
//                       <Text style={[styles.orderStatus, { color: tintColor }]}>
//                         Statut: {order.status}
//                       </Text>
//                     </View>
//                   </View>
//                 ))}
//               </ScrollView>
//             )}
//             <Pressable
//               style={[styles.closeButton, { backgroundColor: tintColor }]}
//               onPress={toggleOrdersModal}
//             >
//               <Text style={styles.closeButtonText}>Fermer</Text>
//             </Pressable>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </ScrollView>
//   );
// }

// // Styles (Assure-toi d'avoir tous les styles nécessaires ici)
// const styles = StyleSheet.create({
//   contentContainerScrollView: { paddingBottom: 30 }, // Pour que le contenu ne soit pas caché par la barre d'onglet
//   centered: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     /* backgroundColor est appliqué dynamiquement */
//   },
//   container: { flex: 1 /* backgroundColor est appliqué dynamiquement */ },
//   customHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 15,
//     paddingVertical: 12,
//     paddingTop: Platform.OS === "android" ? 45 : 20,
//     borderBottomWidth: 1,
//     // borderBottomColor est appliqué dynamiquement
//   },
//   customHeaderTitle: {
//     fontSize: 20,
//     fontWeight: "600",
//     textAlign: "center", // color est appliqué dynamiquement
//   }, // flex:1 retiré pour un meilleur centrage avec boutons optionnels
//   header: {
//     paddingHorizontal: 24,
//     paddingTop: 20,
//     paddingBottom: 24,
//     borderBottomWidth: 1,
//     //borderBottomColor est appliqué dynamiquement
//   },
//   profileSection: { flexDirection: "row", alignItems: "center" },
//   avatar: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     marginRight: 16,
//     // backgroundColor: "#E5E7EB",
//   },
//   profileInfo: { flex: 1 },
//   name: {
//     fontWeight: "bold",
//     fontSize: 20, // color est appliqué dynamiquement
//   },
//   email: {
//     fontSize: 14,
//     marginTop: 2, // color est appliqué dynamiquement
//   },
//   menuSection: {
//     marginTop: 20,
//     borderRadius: 12,
//     marginHorizontal: 16,
//     overflow: "hidden",
//     elevation: 1,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 1,
//   },
//   menuItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 16,
//     paddingHorizontal: 15,
//     borderBottomWidth: 1,
//     //borderBottomColor est appliqué dynamiquement
//   },
//   menuItemLast: { borderBottomWidth: 0 },
//   menuItemIcon: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 15,
//     //backgroundColor:  backgroundColor === '#000000' ? '#374151' : '#EBF4FF',
//   },
//   menuItemContent: { flex: 1 },
//   menuItemTitle: {
//     fontWeight: "600",
//     fontSize: 15, // color est appliqué dynamiquement
//   },
//   menuItemSubtitle: {
//     fontSize: 13,
//     marginTop: 2, // color est appliqué dynamiquement
//   },
//   notificationItemBadgeContainer: {
//     backgroundColor: "red",
//     borderRadius: 10,
//     paddingHorizontal: 7,
//     paddingVertical: 2,
//     marginLeft: "auto",
//     marginRight: 10,
//     minWidth: 20,
//     height: 20,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   notificationItemBadgeText: {
//     color: "white",
//     fontSize: 10,
//     fontWeight: "bold",
//   },
//   logoutButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#FFF1F2",
//     marginHorizontal: 24,
//     marginTop: 25,
//     marginBottom: 32,
//     padding: 15,
//     borderRadius: 10,
//     gap: 8,
//     borderWidth: 1,
//     borderColor: "#FFCCD0",
//   },
//   logoutText: { fontWeight: "600", fontSize: 16, color: "#EF4444" },
//   modalOverlay: {
//     flex: 1,
//     justifyContent: "flex-end",
//     alignItems: "center",
//     backgroundColor: "rgba(0,0,0,0.5)",
//   },
//   modalContent: {
//     //backgroundColor: "white",
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingHorizontal: 20,
//     paddingTop: 20,
//     paddingBottom: Platform.OS === "ios" ? 30 : 20,
//     width: "100%",
//     maxHeight: "75%",
//     elevation: 5,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   modalTitle: {
//     fontWeight: "bold",
//     fontSize: 20,
//     marginBottom: 20,
//     textAlign: "center",
//     //color: "green",
//   },
//   ordersContainer: {
//     /* maxHeight: 'calc(100% - 80px)' si le bouton fermer est fixe en bas */
//   },
//   orderItem: {
//     marginBottom: 16,
//     paddingBottom: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   orderHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 8,
//   },
//   orderNumber: { fontWeight: "bold", fontSize: 16, color: "red" },
//   orderDate: { fontSize: 13 },
//   orderProducts: { marginLeft: 8, marginBottom: 8, marginTop: 5 },
//   productsTitle: {
//     fontWeight: "600",
//     fontSize: 14,
//     marginBottom: 6, // color est appliqué dynamiquement
//   },
//   modalProductItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   modalProductImage: {
//     width: 40,
//     height: 40,
//     borderRadius: 4,
//     marginRight: 10,
//     backgroundColor: "#e0e0e0",
//   },
//   modalProductInfo: { flex: 1 },
//   modalProductName: {
//     fontSize: 14,
//     fontWeight: "500", // color est appliqué dynamiquement
//   },
//   modalProductDetails: {
//     fontSize: 12, // color est appliqué dynamiquement
//   },
//   productItem: {
//     fontSize: 14, // color est appliqué dynamiquement
//   }, // style pour les items produits dans la liste
//   orderFooter: {
//     marginTop: 10,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   orderPrice: { fontWeight: "bold", fontSize: 16, color: "tintColor" },
//   orderStatus: { fontSize: 14, fontWeight: "500", color: "tintColor" },
//   noOrdersText: {
//     fontSize: 16,
//     textAlign: "center",
//     paddingVertical: 30, // color est appliqué dynamiquement
//   },
//   closeButton: {
//     paddingVertical: 14,
//     borderRadius: 8,
//     alignItems: "center",
//     marginTop: 20,
//     borderWidth: 1,
//     borderColor: "transparent",
//     //backgroundColor: tintColor,
//   },
//   closeButtonText: {
//     fontSize: 16,
//     fontWeight: "bold",
//     //color: cardColor === '#000000' || cardColor === '#121212' ? tintColor : 'white', // Adapte la couleur du texte au fond du bouton
//     color: "white",
//   },
//   errorText: {
//     fontSize: 15,
//     textAlign: "center",
//     marginVertical: 15,
//     paddingHorizontal: 10,
//     color: "red",
//   },
// });

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
  Alert,
  Platform,
} from "react-native";
import {
  Settings,
  ShoppingBag,
  Heart,
  Bell,
  LogOut as LogOutIcon,
} from "lucide-react-native";
import { useRouter, Href, Stack, useFocusEffect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import Colors from "../../constants/Colors"; // Ton fichier de couleurs
import { FontAwesome } from "@expo/vector-icons";
import { FontAwesome5, MaterialIcons, Entypo } from "@expo/vector-icons";

// (Les interfaces Order, OrderItem, UserDetails, etc. restent les mêmes)
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

const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api";

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

  // Utilisation des couleurs dynamiques du thème via ton fichier Colors.ts
  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];

  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersModalVisible, setIsOrdersModalVisible] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

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

  // if (isAuthLoading || !user) {
  //   return (
  //     <View style={[styles.centered, { backgroundColor: colors.background }]}>
  //       <ActivityIndicator size="large" color={colors.primary} />
  //       <Text style={{ marginTop: 10, color: colors.text }}>Chargement du compte...</Text>
  //     </View>
  //   );
  // }

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
      <Text style={[styles.authTitle, { color: colors.text }]}>
        Votre profil vous attend !
      </Text>
      <Text style={[styles.authSubtitle, { color: colors.subtleText }]}>
        Connectez-vous ou créez un compte pour accéder à vos commandes, listes
        de souhaits et plus encore.
      </Text>

      {/* Bloc fonctionnalités avec icônes vectorielles */}
      <View style={{ width: "100%", marginVertical: 25}}>
        {[
          { icon: <MaterialIcons name="flash-on" size={15} color="#4CAF50" />, text: "Livraison rapide" },
          { icon: <FontAwesome5 name="truck" size={15} color="#4CAF50" />, text: "Livraison par Artiva Logistic" },
          { icon: <FontAwesome5 name="credit-card" size={15} color="#4CAF50" />, text: "Paiement sécurisé" },
          { icon: <Entypo name="box" size={15} color="#4CAF50" />, text: "Emballage soigné" },
          { icon: <FontAwesome5 name="star" size={15} color="#4CAF50" />, text: "Qualité garantie" },
        ].map((feature, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 5,
              paddingVertical: 8,
              paddingHorizontal: 10,
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 12,
            }}
          >
            <View style={{ width: 30, alignItems: "center" }}>
              {feature.icon}
            </View>
            <Text
              style={{
                fontSize: 16,
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

      {/* Boutons */}
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
    >
      <Stack.Screen options={{ title: "Mon Profil", headerShown: false }} />

      {/* --- Header Personnalisé --- */}
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

      {/* --- Section Infos Profil --- */}
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
          </View>
        </View>
      </View>

      {/* --- Section Menu --- */}
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
            {menuItem.action === "toggleOrdersModal" ? (
              <FontAwesome
                name={isOrdersModalVisible ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.subtleText}
              />
            ) : menuItem.route ? (
              <FontAwesome
                name="chevron-right"
                size={16}
                color={colors.subtleText}
              />
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* --- Bouton Déconnexion --- */}
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
        <LogOutIcon size={20} color={colors.errorText} strokeWidth={2} />
        <Text style={[styles.logoutText, { color: colors.errorText }]}>
          Se déconnecter
        </Text>
      </Pressable>

      {/* --- Modal des Commandes --- */}
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
              <Text style={[styles.noOrdersText, { color: colors.subtleText }]}>
                Vous n'avez aucune commande pour le moment.
              </Text>
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

// --- Styles (maintenant sans couleurs fixes) ---
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
  menuSection: {
    marginTop: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
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
    shadowColor: "#000",
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
  noOrdersText: { fontSize: 16, textAlign: "center", paddingVertical: 30 },
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
  // Nouveaux styles pour la vue "non connecté"
  authTitle: {
    fontSize: 22,
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
  authButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
