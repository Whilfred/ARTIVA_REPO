// // ARTIVA/front_end/app/settings/preferences.tsx
// import React from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
// import { Stack } from 'expo-router';
// import { useTranslation } from 'react-i18next';
// import Colors from '../../constants/Colors';
// import { useColorScheme } from '../../components/useColorScheme';
// import { FontAwesome } from '@expo/vector-icons';

// export default function PreferencesScreen() {
//   const { t, i18n } = useTranslation();
//   const colorScheme = useColorScheme();
//   const textColor = Colors[colorScheme ?? 'light'].text;
//   const cardColor = Colors[colorScheme ?? 'light'].card;
//   const tintColor = Colors[colorScheme ?? 'light'].tint;
//   const subtleTextColor = Colors[colorScheme ?? 'light'].tabIconDefault;
//   const backgroundColor = Colors[colorScheme ?? 'light'].background;

//   const languages = [
//     { code: 'fr', name: 'Français' },
//     { code: 'en', name: 'English' },
//   ];

//   const changeLanguage = (langCode: string) => {
//     i18n.changeLanguage(langCode);
//   };

//   return (
//     <View style={[styles.container, { backgroundColor }]}>      
//       <Text style={[styles.sectionTitle, { color: textColor }]}>{t('settingsScreen.language', 'Langue')}</Text>
//       <View style={[styles.optionsContainer, { backgroundColor: cardColor }]}>
//         {languages.map((lang) => {
//           const isSelected = lang.code === i18n.language;
//           return (
//             <TouchableOpacity
//               key={lang.code}
//               style={[
//                   styles.optionItem, 
//                   { borderBottomColor: subtleTextColor },
//                   // Appliquer le style conditionnel directement ici
//                   isSelected && { backgroundColor: tintColor + '20' } // Exemple: fond légèrement teinté si sélectionné
//               ]}
//               onPress={() => changeLanguage(lang.code)}
//             >
//               <Text style={[
//                   styles.optionText, 
//                   // Changer la couleur du texte si sélectionné
//                   { color: isSelected ? tintColor : textColor } 
//               ]}>
//                 {lang.name}
//               </Text>
//               {isSelected && (
//                 <FontAwesome name="check-circle" size={22} color={tintColor} />
//               )}
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       <Text style={[styles.sectionTitle, { color: textColor, marginTop: 30 }]}>Thème (Bientôt)</Text>
//       <View style={[styles.optionsContainer, { backgroundColor: cardColor }]}>
//          <Text style={{padding: 15, color: subtleTextColor, fontStyle: 'italic'}}>Options de thème à venir...</Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 10,
//     marginTop: 10,
//   },
//   optionsContainer: { // Renommé de languageOptionsContainer pour être plus générique
//     borderRadius: 8,
//     overflow: 'hidden',
//     elevation: 1,
//     // Pour iOS, tu pourrais ajouter des styles d'ombre ici si backgroundColor n'est pas suffisant
//     // shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
//   },
//   optionItem: { // Renommé de languageOption
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 18,
//     paddingHorizontal: 15,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   // languageOptionSelected n'est plus défini ici car appliqué en ligne
//   optionText: { // Renommé de languageText
//     fontSize: 16,
//   },
// });



// ARTIVA/front_end/app/settings/preferences.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext'; // Utilisation de useAuth
import { FontAwesome } from '@expo/vector-icons';

export default function PreferencesScreen() {
  const { t, i18n } = useTranslation();
  const {effectiveAppColorScheme } = useAuth(); // Ajout de effectiveAppColorScheme de useAuth
  const currentScheme = effectiveAppColorScheme ?? 'light'; // Meilleure gestion du thème
  const colors = Colors[currentScheme];

  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
  ];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('settingsScreen.preferences', 'Préférences') }} />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settingsScreen.language', 'Langue')}</Text>
      <View style={[styles.optionsContainer, { backgroundColor: colors.card }]}>
        {languages.map((lang) => {
          const isSelected = lang.code === i18n.language;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.optionItem,
                { borderBottomColor: colors.subtleText },
                isSelected && styles.optionItemSelected, // Style sélectionné dans StyleSheet
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? colors.tint : colors.text },
                ]}
              >
                {lang.name}
              </Text>
              {isSelected && (
                <FontAwesome name="check-circle" size={22} color={colors.tint} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 30 }]}>Thème (Bientôt)</Text>
      <View style={[styles.optionsContainer, { backgroundColor: colors.card }]}>
         <Text style={[styles.noOptionsText, {color: colors.subtleText}]}>Options de thème à venir...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  optionsContainer: { // Renommé de languageOptionsContainer pour être plus générique
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  optionItem: { // Renommé de languageOption
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // Une teinte claire du bleu
  },
  optionText: { // Renommé de languageText
    fontSize: 16,
  },
    noOptionsText: {
    padding: 15,
    fontStyle: 'italic',
  },
});