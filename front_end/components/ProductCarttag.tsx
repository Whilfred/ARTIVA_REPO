// front_end/components/ProductCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ScrollSection from './ScrollSection';
import { useWishlist } from '../context/WishlistContext'; // Importer le hook
import { Product as ProductType } from './ProductCard'; // S'assurer que ProductType est bien exporté
import { useAuth } from '../context/AuthContext'; // <<< AJOUTER
import Colors from '../constants/Colors';

// Type pour les props d'une carte de produit
export interface Product { // Exporté pour l'écran d'accueil
  id: string;
  name: string;
  imageUrl: string;
  price: string; // Ou number si tu préfères, puis formater en string
  category_ids?: (string | number)[]; // Optionnel, ajouté par l'API list
  categories_names?: string[];        // Ajouté par l'API list
  tag_ids?: (string | number)[];      // Optionnel, ajouté par l'API list
  tags_names?: string[];              // Ajouté par l'API list
  // Ajoute d'autres champs de base que GET /api/products renvoie
  sku?: string;
  is_published?: boolean;
  description?: string; // Description peut aussi être dans le type de base
  stock?: number;
}

interface ProductCardProps {
  item: Product;
  onPress: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ item, onPress }) => {
  const { effectiveAppColorScheme } = useAuth(); // <<< OBTENIR LE THÈME
  const cardBackgroundColor = Colors[effectiveAppColorScheme].card;
  const nameTextColor = Colors[effectiveAppColorScheme].text;
  const priceTextColor = Colors[effectiveAppColorScheme].tint_price; // Ou une autre couleur de 'Colors'
  const iconColor = Colors[effectiveAppColorScheme].tabIconDefaultwhist;
  const iconActiveColor = Colors[effectiveAppColorScheme].tint;

  const { addToWishlist, removeFromWishlist, isProductInWishlist } = useWishlist();
  const isInWishlist = isProductInWishlist(item.id);

  const handleWishlistToggle = () => {
    if (isInWishlist) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item); // Passe l'objet produit entier
    }
  };
  return (
    <TouchableOpacity onPress={() => onPress(item.id)} style={[styles.container, {backgroundColor: cardBackgroundColor}]}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <TouchableOpacity onPress={handleWishlistToggle} style={styles.wishlistIconContainer}>
        <FontAwesome 
          name={isInWishlist ? "heart" : "heart-o"} 
          size={25} 
          color={isInWishlist ? iconActiveColor : iconColor} 
        />
      </TouchableOpacity>
      <View style={styles.infoContainer}>
        <Text style={[styles.nameText, {color: nameTextColor}]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.priceText, {color: priceTextColor}]}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );
};


const styles = StyleSheet.create({
  container: {
    
    width: '100%', // Largeur de la carte produit
    marginRight: 8,
    // backgroundColor: 'white', // Fond blanc pour la carte
    borderRadius: 8,
    elevation: 2, // Ombre pour Android
    shadowColor: '#000', // Ombre pour iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    //overflow: 'hidden', // Pour que l'ombre ne soit pas coupée par l'image si elle a un borderRadius
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 200, // Hauteur de l'image produit
    backgroundColor: '#e0e0e0', // Placeholder
    borderTopLeftRadius: 8, 
    borderTopRightRadius: 8,
    resizeMode: 'cover', // Ajuste l'image pour couvrir l'espace sans déformation

  },
  wishlistIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 5,
    borderRadius: 15,
  },
  infoContainer: {
    padding: 8, // Padding pour les infos du produit
    paddingTop: 5,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    minHeight: 36,
  },
  priceText: {
    fontSize: 15,
    fontWeight: 'bold',
    //color: 'green', // Ou ta couleur de prix
  },
});

export default ProductCard;