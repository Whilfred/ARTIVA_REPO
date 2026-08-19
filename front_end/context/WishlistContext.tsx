// ARTIVA/front_end/context/WishlistContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product as BaseProductType } from "../components/ProductCard"; // Type de base produit
import { useAuth } from "./AuthContext"; // Pour le token utilisateur
import { Alert } from "react-native";

// L'URL de base de ton API (assure-toi qu'elle est correcte)
const API_BASE_URL = "https://back-end-purple-log-1280.fly.dev/api"; // **METS TON IP ICI**

// Un item de la wishlist est essentiellement un produit
export interface WishlistItem extends BaseProductType {}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  addToWishlist: (product: BaseProductType) => Promise<void>;
  removeFromWishlist: (productId: string | number) => Promise<void>;
  isProductInWishlist: (productId: string | number) => boolean;
  isLoadingWishlist: boolean;
  fetchWishlist: () => Promise<void>; // Pour recharger la wishlist
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export function useWishlist(): WishlistContextType {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}

const WISHLIST_STORAGE_KEY = "artiva-wishlist-items";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(true);
  const { userToken } = useAuth(); // Pour les appels API authentifiés

  // Charger la wishlist depuis le backend si connecté, sinon depuis AsyncStorage
  const loadWishlist = useCallback(async () => {
    console.log("WishlistContext: Chargement de la wishlist...");
    setIsLoadingWishlist(true);
    try {
      if (userToken) {
        console.log(
          "WishlistContext: Utilisateur connecté, chargement depuis l'API."
        );
        const response = await fetch(`${API_BASE_URL}/wishlist`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (!response.ok) throw new Error("Erreur API chargement wishlist");
        const data: WishlistItem[] = await response.json();
        setWishlistItems(
          data.map((item) => ({ ...item, id: String(item.id) }))
        ); // S'assurer que l'id est string
        await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(data)); // Synchroniser avec local
        console.log(
          "WishlistContext: Wishlist chargée depuis API et synchronisée localement:",
          data.length
        );
      } else {
        console.log(
          "WishlistContext: Utilisateur non connecté, chargement depuis AsyncStorage."
        );
        const storedWishlist = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
        if (storedWishlist) {
          setWishlistItems(JSON.parse(storedWishlist));
        }
        console.log("WishlistContext: Wishlist chargée depuis AsyncStorage.");
      }
    } catch (e) {
      setWishlistItems([]);
    } finally {
      setIsLoadingWishlist(false);
    }
  }, [userToken]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]); // Se déclenche au montage et si userToken change

  const addToWishlistAPI = async (product: BaseProductType) => {
    if (!userToken) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour ajouter des articles à votre liste de souhaits."
      );
      return false; // Indiquer l'échec
    }
    try {
      const response = await fetch(`${API_BASE_URL}/wishlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!response.ok && response.status !== 200) {
        // 200 si déjà dedans
        const errorData = await response
          .json()
          .catch(() => ({ message: `Erreur HTTP ${response.status}` }));
        throw new Error(errorData.message || "Erreur ajout API wishlist");
      }
      return true; // Indiquer le succès
    } catch (e) {
      Alert.alert(
        "Erreur",
        "Impossible d'ajouter à la liste de souhaits pour le moment."
      );
      return false;
    }
  };

  const removeFromWishlistAPI = async (productId: string | number) => {
    if (!userToken) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour modifier votre liste de souhaits."
      );
      return false;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Erreur HTTP ${response.status}` }));
        throw new Error(errorData.message || "Erreur suppression API wishlist");
      }
      return true;
    } catch (e) {
      Alert.alert(
        "Erreur",
        "Impossible de retirer de la liste de souhaits pour le moment."
      );
      return false;
    }
  };

  const addToWishlist = async (product: BaseProductType) => {
    // Optimistic UI update
    const newItem = { ...product, id: String(product.id) }; // Assure-toi que les champs de Product sont compatibles
    setWishlistItems((prevItems) => {
      if (prevItems.find((item) => String(item.id) === String(product.id)))
        return prevItems; // Déjà dedans
      const updatedWishlist = [...prevItems, newItem];
      if (!userToken)
        AsyncStorage.setItem(
          WISHLIST_STORAGE_KEY,
          JSON.stringify(updatedWishlist)
        );
      return updatedWishlist;
    });

    if (userToken) {
      const success = await addToWishlistAPI(product);
      if (!success) {
        // Revert si l'API échoue
        setWishlistItems((prevItems) =>
          prevItems.filter((item) => String(item.id) !== String(product.id))
        );
        // Pas besoin de re-sauvegarder AsyncStorage ici car loadWishlist sera rappelé ou on peut forcer un fetch.
      }
    }
    console.log(`Produit ${product.name} ajouté à la wishlist (UI).`);
  };

  const removeFromWishlist = async (productId: string | number) => {
    const stringProductId = String(productId);
    // Optimistic UI update
    const previousItems = wishlistItems;
    setWishlistItems((prevItems) => {
      const updatedWishlist = prevItems.filter(
        (item) => String(item.id) !== stringProductId
      );
      if (!userToken)
        AsyncStorage.setItem(
          WISHLIST_STORAGE_KEY,
          JSON.stringify(updatedWishlist)
        );
      return updatedWishlist;
    });

    if (userToken) {
      const success = await removeFromWishlistAPI(stringProductId);
      if (!success) {
        // Revert si l'API échoue
        setWishlistItems(previousItems); // Revenir à l'état précédent
      }
    }
    console.log(`Produit ID ${stringProductId} retiré de la wishlist (UI).`);
  };

  const isProductInWishlist = (productId: string | number): boolean => {
    return wishlistItems.some((item) => String(item.id) === String(productId));
  };

  const value = {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    isProductInWishlist,
    isLoadingWishlist,
    fetchWishlist: loadWishlist, // Exposer pour un refresh manuel si besoin
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
