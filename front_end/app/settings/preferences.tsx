// // ARTIVA/front_end/app/settings/preferences.tsx
// import React from 'react';
// import { Appearance, View, Text, StyleSheet, Platform, useColorScheme, TouchableOpacity } from 'react-native';
// import { Stack } from 'expo-router';
// import { useTranslation } from 'react-i18next'; // Pour traduire le titre
// import Colors from '../../constants/Colors';
// import { useColorScheme as useDeviceColorScheme } from 'react-native'; // Pour afficher le thème système
// import { useAuth, AppColorSchemePreference } from '../../context/AuthContext'; // Pour changer le thème de l'app
// import { FontAwesome } from '@expo/vector-icons';

// type ThemeOption = 'light' | 'dark' | 'system';

// export default function PreferencesScreen() {


  
//   const { t } = useTranslation();
//   const { appColorSchemePreference, setColorSchemePreference, effectiveAppColorScheme } = useAuth();  
//   const deviceCurrentScheme = useDeviceColorScheme(); // Thème actuel du système

//   const themeOptions: { value: ThemeOption, label: string }[] = [
//     { value: 'light', label: 'Clair' },
//     { value: 'dark', label: 'Sombre' },
//     { value: 'system', label: `Système (${deviceCurrentScheme === 'dark' ? 'Sombre' : 'Clair'})` },
//   ];


//   // Pour utiliser les couleurs dynamiques dans CET écran
//   const effectiveColorScheme = appColorScheme === 'system' || !appColorScheme ? deviceCurrentScheme : appColorScheme;
//   const textColor = Colors[effectiveColorScheme ?? 'light'].text;
//   const cardColor = Colors[effectiveColorScheme ?? 'light'].card;
//   const tintColor = Colors[effectiveColorScheme ?? 'light'].tint;
//   const subtleTextColor = Colors[effectiveColorScheme ?? 'light'].tabIconDefault;
//   const backgroundColor = Colors[effectiveColorScheme ?? 'light'].background;
//   const colorScheme = useColorScheme();


//   // Déterminer la préférence actuellement sélectionnée
//   const currentPreference = appColorScheme === 'light' || appColorScheme === 'dark' ? appColorScheme : 'system';

//   const handleChangeTheme = (scheme: AppColorSchemePreference) => {
//     setColorSchemePreference(scheme);
//   };

//   // Logique pour changer de thème (à implémenter plus tard avec un contexte de thème)
//   const toggleTheme = () => {
//     // Exemple: setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
//     alert("Changement de thème à implémenter !");
//   };

//   return (
//     <View style={[styles.container, {backgroundColor}]}>
//       <Stack.Screen options={{ title: t('settingsScreen.preferences', 'Préférences d\'Affichage') }} />
      
//       <Text style={[styles.sectionTitle, {color: textColor}]}>Thème de l'application</Text>
//       <View style={[styles.optionsContainer, {backgroundColor: cardColor}]}>
//         {themeOptions.map((option) => {
//           const isSelected = option.value === currentPreference;
//           return (
//             <TouchableOpacity
//               key={option.value}
//               style={[styles.optionItem, {borderBottomColor: subtleTextColor}, isSelected && {backgroundColor: tintColor + '20'}]}
//               onPress={() => handleChangeTheme(option.value)}
//             >
//               <Text style={[styles.optionText, {color: isSelected ? tintColor : textColor}]}>
//                 {option.label}
//               </Text>
//               {isSelected && (
//                 <FontAwesome name="check-circle" size={22} color={tintColor} />
//               )}
//             </TouchableOpacity>
//           );
//         })}
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
//     marginBottom: 15,
//     marginTop: 10,
//     textAlign: 'center',
//   },
//   optionsContainer: { borderRadius: 8, overflow: 'hidden', elevation: 1, shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 1, },
//   optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth, },
//   optionText: { fontSize: 16, },
//   optionButton: {
//     paddingVertical: 18,
//     paddingHorizontal: 15,
//     borderRadius: 8,
//     // backgroundColor: // géré par cardColor dans la version précédente, adapte si besoin
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#ccc' // Exemple
//   },
// });



// ARTIVA/front_end/app/settings/preferences.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native'; // Retiré useColorScheme d'ici, on utilise celui de useAuth
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Colors from '../../constants/Colors';
import { useColorScheme as useDeviceColorScheme } from 'react-native'; // Pour afficher le thème système actuel
import { useAuth, AppColorSchemePreference } from '../../context/AuthContext'; // Importer AppColorSchemePreference
import { FontAwesome } from '@expo/vector-icons';

// type ThemeOption = 'light' | 'dark' | 'system'; // AppColorSchemePreference est déjà défini dans AuthContext

export default function PreferencesScreen() {
  const { t } = useTranslation();
  // Utiliser les états et fonctions de AuthContext
  const { 
    appColorSchemePreference, // C'est la *préférence* stockée ('light', 'dark', ou 'system')
    setColorSchemePreference, // La fonction pour changer la préférence
    effectiveAppColorScheme   // C'est le thème *réellement appliqué* ('light' ou 'dark')
  } = useAuth();
  
  const deviceCurrentSystemScheme = useDeviceColorScheme(); // Thème actuel du système d'exploitation ('light' ou 'dark')

  // Définir les options de thème pour l'affichage
  const themeOptions: { value: AppColorSchemePreference, label: string }[] = [
    { value: 'light', label: t('preferences.theme.light', 'Clair') }, // Clés de traduction
    { value: 'dark', label: t('preferences.theme.dark', 'Sombre') },
    { 
      value: 'system', 
      label: `${t('preferences.theme.system', 'Système')} (${deviceCurrentSystemScheme === 'dark' ? t('preferences.theme.darkLower', 'sombre') : t('preferences.theme.lightLower', 'clair')})` 
    },
  ];

  // Utiliser effectiveAppColorScheme pour styler CET écran
  const currentAppliedTheme = effectiveAppColorScheme ?? 'light'; // S'assurer qu'on a 'light' ou 'dark'
  const textColor = Colors[currentAppliedTheme].text;
  const cardColor = Colors[currentAppliedTheme].card;
  const tintColor = Colors[currentAppliedTheme].tint;
  const subtleTextColor = Colors[currentAppliedTheme].tabIconDefault;
  const backgroundColor = Colors[currentAppliedTheme].background;

  const handleChangeTheme = (scheme: AppColorSchemePreference) => {
    setColorSchemePreference(scheme); // Appelle la fonction du contexte
  };

  return (
    <View style={[styles.container, {backgroundColor}]}>
      <Stack.Screen options={{ title: t('settingsScreen.preferences', 'Préférences d\'Affichage') }} />
      
      <Text style={[styles.sectionTitle, {color: textColor}]}>{t('preferences.themeTitle', 'Thème de l\'application')}</Text>
      <View style={[styles.optionsContainer, {backgroundColor: cardColor, borderColor: subtleTextColor /* Ajout bordure pour visibilité */}]}>
        {themeOptions.map((option) => {
          // L'option sélectionnée est celle qui correspond à la préférence stockée
          const isSelected = option.value === appColorSchemePreference; 
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                  styles.optionItem,
                  {borderBottomColor: subtleTextColor},
                  // Appliquer le style conditionnel pour l'arrière-plan
                  isSelected && { backgroundColor: Platform.OS === 'ios' ? tintColor + '15' : tintColor + '25' } // Fond léger avec transparence
              ]}
              onPress={() => handleChangeTheme(option.value)}
            >
              <Text style={[
                  styles.optionText, 
                  // Changer la couleur du texte si sélectionné
                  {color: isSelected ? tintColor : textColor}
              ]}>
                {option.label}
              </Text>
              {isSelected && (
                <FontAwesome name="check-circle" size={22} color={tintColor} />
              )}
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  optionsContainer: {
    borderRadius: 10, // Arrondi un peu plus
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, // Bordure subtile autour du groupe
    // Les styles d'ombre sont souvent spécifiques à la plateforme ou gérés par `elevation` sur Android
    // Si tu veux une ombre plus prononcée :
    // elevation: 2, 
    // shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, // Séparateur entre les items
  },
  // Pas besoin de languageOptionSelected, le style est appliqué en ligne
  optionText: {
    fontSize: 16,
  },
  optionButton: {
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderRadius: 8,
    // backgroundColor: // géré par cardColor dans la version précédente, adapte si besoin
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc' // Exemple
  },
});