// front_end/components/CategoryCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import ScrollSection from './ScrollSection';
import { useAuth } from '../context/AuthContext'; // Import du contexte d'authentification
import Colors from '../constants/Colors'; // Import du fichier de couleurs

// Type pour les props d'une carte de catégorie
export interface Category { // Exporté pour pouvoir êtr utilisé dans l'écran d'accueil
  id: string;
  name: string;
  imageUrl: string; // URL de l'image de la catégorie
}

interface CategoryCardProps {
  item: Category;
  onPress: (categoryId: string) => void; // Fonction à appeler lors du clic
}

const CategoryCard: React.FC<CategoryCardProps> = ({ item, onPress }) => {
  const { effectiveAppColorScheme } = useAuth(); // Hook pour obtenir le thème actuel
  const colors = Colors[effectiveAppColorScheme]; // Récupérer les couleurs du thème

  return (
    <TouchableOpacity onPress={() => onPress(item.id)} style={[styles.container]}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 90, // Largeur de la carte
    marginRight: 12, // Marge à droite pour espacer les cartes
    alignItems: 'center', // Centre les éléments horizontalement
    // backgroundColor: '#f9f9f9', // Couleur de fond légère (optionnel) - Géré par Colors
    // borderRadius: 8, // Bords arrondis (optionnel) - Géré par Colors
    // paddingVertical: 8, // Padding vertical (optionnel)
  },
  image: {
    width: 60, // Largeur de l'image
    height: 60, // Hauteur de l'image
    borderRadius: 30, // Pour une image ronde (rayon = moitié de la largeur/hauteur)
    marginBottom: 8, // Marge en bas de l'image
    // backgroundColor: '#e0e0e0', // Couleur de fond pendant le chargement de l'image - Peut être géré par Colors si tu as une couleur placeholder
  },
  nameText: {
    fontSize: 12,
    textAlign: 'center', // Centre le texte
    // color: '#555', // Couleur du texte - Géré par Colors
    // fontWeight: '500',
  },
});

export default CategoryCard;