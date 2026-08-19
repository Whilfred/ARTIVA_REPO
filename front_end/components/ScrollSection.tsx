// // front_end/components/ScrollSection.tsx
// import React from 'react';
// import { View, Text, FlatList, StyleSheet, TouchableOpacity, ListRenderItem } from 'react-native';

// // Définition des types pour les props du composant
// interface ScrollSectionProps<T> {
//   title: string; // Titre de la section
//   data: T[]; // Données à afficher (un tableau d'objets de type T)
//   renderItem: ListRenderItem<T>; // Fonction pour rendre chaque élément de la liste
//   keyExtractor: (item: T, index: number) => string; // Fonction pour extraire une clé unique pour chaque élément
//   onSeeAllPress?: () => void; // Fonction optionnelle pour un bouton "Voir tout"
//   horizontal?: boolean; // Pour spécifier si le scroll est horizontal (par défaut true ici)
//   // Tu peux ajouter d'autres props pour la personnalisation si besoin (ex: style du conteneur, etc.)
// }

// // Le composant fonctionnel générique ScrollSection
// // Utilise <T extends unknown> pour rendre le composant générique par rapport au type des données
// function ScrollSection<T extends unknown>({
//   title,
//   data,
//   renderItem,
//   keyExtractor,
//   onSeeAllPress,
//   horizontal = true, // Par défaut, le scroll est horizontal
// }: ScrollSectionProps<T>) {
//   return (
//     <View style={styles.container}>
//       {/* En-tête de la section avec le titre et le bouton "Voir tout" (si fourni) */}
//       <View style={styles.header}>
//         <Text style={styles.titleText}>{title}</Text>
//         {onSeeAllPress && ( // Affiche le bouton seulement si onSeeAllPress est défini
//           <TouchableOpacity onPress={onSeeAllPress}>
//             <Text style={styles.seeAllText}>Voir tout →</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Liste scrollable horizontalement */}
//       <FlatList
//         data={data}
//         renderItem={renderItem}
//         keyExtractor={keyExtractor}
//         horizontal={horizontal}
//         showsHorizontalScrollIndicator={false} // Masque la barre de scroll horizontale
//         contentContainerStyle={styles.listContentContainer} // Style pour le conteneur de la liste
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     marginVertical: 15, // Marge verticale pour espacer les sections
//   },
//   header: {
//     flexDirection: 'row', // Aligne le titre et "Voir tout" sur la même ligne
//     justifyContent: 'space-between', // Espace entre le titre et "Voir tout"
//     alignItems: 'center', // Centre verticalement les éléments de l'en-tête
//     paddingHorizontal: 16, // Marge horizontale pour l'en-tête
//     marginBottom: 10, // Marge en bas de l'en-tête
//   },
//   titleText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     // color: '#333', // Tu peux définir une couleur
//   },
//   seeAllText: {
//     fontSize: 14,
//     color: 'tomato', // Couleur du lien "Voir tout" (à adapter à ton thème)
//     fontWeight: '600',
//   },
//   listContentContainer: {
//     paddingLeft: 16, // Marge à gauche pour le premier élément de la liste
//     paddingRight: 6, // Petite marge à droite pour que le dernier élément ne soit pas collé au bord
//   },
// });

// export default ScrollSection;





// front_end/components/ScrollSection.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ListRenderItem } from 'react-native';
import { useAuth } from '../context/AuthContext'; // Import pour le thème
import Colors from '../constants/Colors';          // Import des couleurs

// Définition des types pour les props du composant
interface ScrollSectionProps<T> {
  title: string; // Titre de la section
  data: T[]; // Données à afficher (un tableau d'objets de type T)
  renderItem: ListRenderItem<T>; // Fonction pour rendre chaque élément de la liste
  keyExtractor: (item: T, index: number) => string; // Fonction pour extraire une clé unique pour chaque élément
  onSeeAllPress?: () => void; // Fonction optionnelle pour un bouton "Voir tout"
  horizontal?: boolean; // Pour spécifier si le scroll est horizontal (par défaut true ici)
  // Tu peux ajouter d'autres props pour la personnalisation si besoin (ex: style du conteneur, etc.)
}

// Le composant fonctionnel générique ScrollSection
// Utilise <T extends unknown> pour rendre le composant générique par rapport au type des données
function ScrollSection<T extends unknown>({
  title,
  data,
  renderItem,
  keyExtractor,
  onSeeAllPress,
  horizontal = true, // Par défaut, le scroll est horizontal
}: ScrollSectionProps<T>) {
  const { effectiveAppColorScheme } = useAuth(); // Accès au thème
  const colors = Colors[effectiveAppColorScheme ?? 'light']; // Couleurs du thème

  return (
    <View style={styles.container}>
      {/* En-tête de la section avec le titre et le bouton "Voir tout" (si fourni) */}
      <View style={styles.header}>
        <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
        {onSeeAllPress && ( // Affiche le bouton seulement si onSeeAllPress est défini
          <TouchableOpacity onPress={onSeeAllPress}>
            <Text style={[styles.seeAllText, { color: colors.tint }]}>Voir tout →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste scrollable horizontalement */}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false} // Masque la barre de scroll horizontale
        contentContainerStyle={styles.listContentContainer} // Style pour le conteneur de la liste
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15, // Marge verticale pour espacer les sections
  },
  header: {
    flexDirection: 'row', // Aligne le titre et "Voir tout" sur la même ligne
    justifyContent: 'space-between', // Espace entre le titre et "Voir tout"
    alignItems: 'center', // Centre verticalement les éléments de l'en-tête
    paddingHorizontal: 16, // Marge horizontale pour l'en-tête
    marginBottom: 10, // Marge en bas de l'en-tête
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    // color: '#333', // Tu peux définir une couleur - Maintenant géré par le thème
  },
  seeAllText: {
    fontSize: 14,
    // color: 'tomato', // Couleur du lien "Voir tout" (à adapter à ton thème) - Maintenant géré par le thème
    fontWeight: '600',
  },
  listContentContainer: {
    paddingLeft: 16, // Marge à gauche pour le premier élément de la liste
    paddingRight: 6, // Petite marge à droite pour que le dernier élément ne soit pas collé au bord
  },
});

export default ScrollSection;