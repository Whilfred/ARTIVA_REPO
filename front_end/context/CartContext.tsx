import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Interface pour un produit de base, tel qu'il vient d'une liste ou d'une page de détail.
// Il n'a pas de notion de "quantité dans le panier".
export interface BaseProductType {
  id: string;
  name: string;
  price: string; // Gardé en string car il est déjà formaté (ex: "1500.00 FCFA")
  imageUrl: string;
  stock?: number;
}

// Interface pour un article DANS le panier. Il étend le produit de base et y AJOUTE la quantité.
export interface CartItem extends BaseProductType {
  quantity: number;
}

// Interface définissant toutes les valeurs et fonctions fournies par notre contexte.
interface CartContextProps {
  cartItems: CartItem[];
  addToCart: (item: BaseProductType, quantity: number) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  removeFromCart: (itemId:string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  isLoadingCart: boolean;
}

// Création du contexte avec une valeur par défaut.
// Cela évite les erreurs si on essaie d'utiliser le contexte sans son Provider.
const CartContext = createContext<CartContextProps>({
  cartItems: [],
  addToCart: () => console.warn("addToCart function called outside of CartProvider"),
  updateQuantity: () => console.warn("updateQuantity function called outside of CartProvider"),
  removeFromCart: () => console.warn("removeFromCart function called outside of CartProvider"),
  clearCart: () => console.warn("clearCart function called outside of CartProvider"),
  getTotalPrice: () => 0,
  getTotalItems: () => 0,
  isLoadingCart: true, // On considère qu'on charge au début.
});


// Le composant Provider qui va englober notre application.
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  // Effet pour charger le panier depuis la mémoire du téléphone au lancement de l'app.
  useEffect(() => {
    const loadCartFromStorage = async () => {
      setIsLoadingCart(true);
      try {
        const storedCart = await AsyncStorage.getItem("cart");
        if (storedCart) {
          setCartItems(JSON.parse(storedCart));
        }
      } catch (error) {
        console.error("Erreur lors du chargement du panier depuis AsyncStorage:", error);
      } finally {
        setIsLoadingCart(false);
      }
    };
    loadCartFromStorage();
  }, []);

  // Effet pour sauvegarder le panier dans la mémoire à chaque fois qu'il est modifié.
  useEffect(() => {
    // On ne sauvegarde pas lors du chargement initial pour éviter d'écraser des données.
    if (!isLoadingCart) {
        const saveCartToStorage = async () => {
            try {
                await AsyncStorage.setItem("cart", JSON.stringify(cartItems));
            } catch (error) {
                console.error("Erreur lors de la sauvegarde du panier dans AsyncStorage:", error);
            }
        };
        saveCartToStorage();
    }
  }, [cartItems, isLoadingCart]);


  /**
   * Ajoute un produit au panier.
   * Si le produit existe déjà, sa quantité est incrémentée.
   * Sinon, le produit est ajouté comme un nouvel article.
   */
  const addToCart = useCallback((itemToAdd: BaseProductType, quantity: number) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === itemToAdd.id);

      if (existingItem) {
        // Le produit existe déjà, on met à jour la quantité
        return prevItems.map((item) =>
          item.id === itemToAdd.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Le produit est nouveau, on l'ajoute à la liste avec sa quantité
        return [...prevItems, { ...itemToAdd, quantity }];
      }
    });
  }, []);

  /**
   * Met à jour la quantité d'un article spécifique dans le panier.
   * Si la nouvelle quantité est 0 ou moins, l'article est supprimé.
   */
  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    setCartItems((prevItems) => {
      if (newQuantity <= 0) {
        // Si la quantité est 0 ou moins, on retire l'article du panier
        return prevItems.filter((item) => item.id !== itemId);
      }
      // Sinon, on met à jour la quantité de l'article concerné
      return prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
    });
  }, []);

  /**
   * Supprime complètement un article du panier, quelle que soit sa quantité.
   */
  const removeFromCart = useCallback((itemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Vide entièrement le panier.
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  /**
   * Calcule et retourne le prix total de tous les articles dans le panier.
   */
  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((total, item) => {
      // Nettoie la chaîne de prix pour ne garder que les chiffres et le point décimal.
      const priceString = String(item.price).replace(/[^\d.]/g, "");
      const priceNumber = parseFloat(priceString);
      
      if (isNaN(priceNumber)) {
        return total; // Ignore les prix invalides
      }
      return total + priceNumber * item.quantity;
    }, 0);
  }, [cartItems]);

  /**
   * Calcule et retourne le nombre total d'unités de produits dans le panier.
   */
  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  // L'objet `value` contient tout ce que le contexte va fournir à ses enfants.
  const value = {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getTotalItems,
    isLoadingCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Le hook personnalisé pour utiliser facilement le contexte dans d'autres composants.
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};