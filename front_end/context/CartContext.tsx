// ARTIVA/front_end/context/CartContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/Api";
import * as SecureStore from "../constants/SecureStorage";
import { useAuth } from "./AuthContext";

// Clé du token dans SecureStore (doit correspondre à AuthContext)
const TOKEN_KEY = "artiva-auth-token";

// Interface pour un produit de base, tel qu'il vient d'une liste ou d'une page de détail.
export interface BaseProductType {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  stock?: number;
}

// Interface pour un article DANS le panier.
export interface CartItem extends BaseProductType {
  quantity: number;
  cartItemId?: string; // ID du cart_item côté backend (si synchronisé)
}

// Interface définissant toutes les valeurs et fonctions fournies par notre contexte.
interface CartContextProps {
  cartItems: CartItem[];
  addToCart: (item: BaseProductType, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  isLoadingCart: boolean;
  isCartSynced: boolean; // true si le panier est synchronisé avec le backend
}

const CartContext = createContext<CartContextProps>({
  cartItems: [],
  addToCart: async () => console.warn("addToCart called outside CartProvider"),
  updateQuantity: async () => console.warn("updateQuantity called outside CartProvider"),
  removeFromCart: async () => console.warn("removeFromCart called outside CartProvider"),
  clearCart: async () => console.warn("clearCart called outside CartProvider"),
  getTotalPrice: () => 0,
  getTotalItems: () => 0,
  isLoadingCart: true,
  isCartSynced: false,
});

// Le composant Provider
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [isCartSynced, setIsCartSynced] = useState(false);
  const { userToken } = useAuth();
  const isMountedRef = useRef(true);

  // Helper : récupérer le token JWT
  const getAuthToken = async (): Promise<string | null> => {
    // On préfère userToken du context (déjà chargé)
    if (userToken) return userToken;
    // Fallback sur SecureStore
    return await SecureStore.getItemAsync(TOKEN_KEY);
  };

  // Charger le panier depuis le backend (si connecté) ou AsyncStorage (invité)
  const loadCart = useCallback(async () => {
    setIsLoadingCart(true);
    try {
      const token = await getAuthToken();

      if (token) {
        // Utilisateur connecté → charger depuis l'API
        try {
          const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            const items: CartItem[] = (data.items || []).map((item: any) => ({
              id: String(item.productId),
              name: item.name,
              price: item.price,
              imageUrl: item.imageUrl || "",
              stock: item.stock,
              quantity: item.quantity,
              cartItemId: item.cartItemId,
            }));
            if (isMountedRef.current) {
              setCartItems(items);
              setIsCartSynced(true);
            }
            console.log(`🛒 Panier chargé depuis l'API: ${items.length} article(s)`);
            return;
          }
        } catch (apiError) {
          console.warn("⚠️ Erreur API panier, fallback AsyncStorage:", apiError);
        }
      }

      // Fallback : charger depuis AsyncStorage
      const storedCart = await AsyncStorage.getItem("cart");
      if (storedCart && isMountedRef.current) {
        setCartItems(JSON.parse(storedCart));
        setIsCartSynced(false);
      }
    } catch (error) {
      console.error("Erreur chargement panier:", error);
    } finally {
      if (isMountedRef.current) setIsLoadingCart(false);
    }
  }, [userToken]);

  // Charger au démarrage + quand userToken change
  useEffect(() => {
    isMountedRef.current = true;
    loadCart();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadCart]);

  // Sauvegarder dans AsyncStorage (toujours, en backup local)
  useEffect(() => {
    if (!isLoadingCart) {
      AsyncStorage.setItem("cart", JSON.stringify(cartItems)).catch((err) =>
        console.error("Erreur sauvegarde AsyncStorage:", err)
      );
    }
  }, [cartItems, isLoadingCart]);

  // Ajouter un produit
  const addToCart = useCallback(
    async (itemToAdd: BaseProductType, quantity: number) => {
      // 1. Mise à jour locale immédiate (optimistic update)
      let newItems: CartItem[] = [];
      setCartItems((prevItems) => {
        const existing = prevItems.find((item) => item.id === itemToAdd.id);
        if (existing) {
          newItems = prevItems.map((item) =>
            item.id === itemToAdd.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newItems = [...prevItems, { ...itemToAdd, quantity }];
        }
        return newItems;
      });

      // 2. Sync backend si connecté
      const token = await getAuthToken();
      if (!token) return;

      try {
        await fetch(`${API_BASE_URL}/cart/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: parseInt(itemToAdd.id, 10),
            quantity,
          }),
        });
        console.log(`✅ Ajout panier backend: produit ${itemToAdd.id} x${quantity}`);
      } catch (error) {
        console.error("❌ Erreur sync panier (ajout):", error);
      }
    },
    [userToken]
  );

  // Mettre à jour la quantité
  const updateQuantity = useCallback(
    async (itemId: string, newQuantity: number) => {
      let updatedItem: CartItem | undefined;

      // 1. Mise à jour locale
      setCartItems((prevItems) => {
        if (newQuantity <= 0) {
          return prevItems.filter((item) => item.id !== itemId);
        }
        return prevItems.map((item) => {
          if (item.id === itemId) {
            updatedItem = { ...item, quantity: newQuantity };
            return updatedItem;
          }
          return item;
        });
      });

      // 2. Sync backend
      const token = await getAuthToken();
      if (!token) return;

      try {
        if (newQuantity <= 0) {
          // Suppression : utiliser l'endpoint DELETE
          // Mais il faut l'ID du cart_item, pas du product
          // Option : envoyer quantity=0 et le backend supprime
          // OU : récupérer cartItemId depuis l'item
          const item = cartItems.find((i) => i.id === itemId);
          if (item?.cartItemId) {
            await fetch(`${API_BASE_URL}/cart/items/${item.cartItemId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            console.log(`✅ Suppression panier backend: cartItem ${item.cartItemId}`);
          } else {
            // Fallback : envoyer quantity=0
            await fetch(`${API_BASE_URL}/cart/items`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ productId: parseInt(itemId, 10), quantity: 0 }),
            });
          }
        } else {
          // Mise à jour : envoyer la nouvelle quantité
          await fetch(`${API_BASE_URL}/cart/items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              productId: parseInt(itemId, 10),
              quantity: newQuantity,
            }),
          });
          console.log(`✅ MAJ panier backend: produit ${itemId} → ${newQuantity}`);
        }
      } catch (error) {
        console.error("❌ Erreur sync panier (update):", error);
      }
    },
    [userToken, cartItems]
  );

  // Supprimer un article
  const removeFromCart = useCallback(
    async (itemId: string) => {
      const item = cartItems.find((i) => i.id === itemId);

      // 1. Mise à jour locale
      setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));

      // 2. Sync backend
      const token = await getAuthToken();
      if (!token || !item?.cartItemId) {
        // Fallback : envoyer quantity=0
        if (token) {
          try {
            await fetch(`${API_BASE_URL}/cart/items`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ productId: parseInt(itemId, 10), quantity: 0 }),
            });
          } catch (err) {
            console.error("❌ Erreur sync panier (remove):", err);
          }
        }
        return;
      }

      try {
        await fetch(`${API_BASE_URL}/cart/items/${item.cartItemId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`✅ Suppression panier backend: cartItem ${item.cartItemId}`);
      } catch (error) {
        console.error("❌ Erreur sync panier (remove):", error);
      }
    },
    [userToken, cartItems]
  );

  // Vider le panier
  const clearCart = useCallback(async () => {
    setCartItems([]);

    const token = await getAuthToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/cart/clear`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✅ Panier vidé sur le backend");
    } catch (error) {
      console.error("❌ Erreur sync panier (clear):", error);
    }
  }, [userToken]);

  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const priceString = String(item.price).replace(/[^\d.]/g, "");
      const priceNumber = parseFloat(priceString);
      if (isNaN(priceNumber)) return total;
      return total + priceNumber * item.quantity;
    }, 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getTotalItems,
    isLoadingCart,
    isCartSynced,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
