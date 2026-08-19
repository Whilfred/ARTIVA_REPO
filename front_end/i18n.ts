// ARTIVA/front_end/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Platform, NativeModules } from 'react-native';

// Importer tes fichiers de traduction
// Assure-toi que ces fichiers existent et sont des JSON valides
import frTranslation from './locales/fr/translation.json';
import enTranslation from './locales/en/translation.json';

// Définir un type pour les clés de langue supportées
type SupportedLanguage = 'en' | 'fr';

// Interface pour la structure de tes fichiers de traduction (translation.json)
// Adapte-la pour qu'elle corresponde exactement à tes clés
interface TranslationKeys {
  welcome: string;
  greeting: string;
  tabHeaders: {
    home: string;
    shop: string;
    wishlist: string;
    cart: string;
    profile: string;
    settings: string;
  };
  settingsScreen: {
    title: string;
    editProfile: string;
    changePassword: string;
    preferences: string;
    language: string;
    deactivateAccount: string;
  };
  productDetail: {
    addToCart: string;
    unavailable: string;
    quantity: string;
    stockAvailable: string;
  };
  // Ajoute d'autres clés de premier niveau ici si tu en as
}

// Structure des ressources attendue par i18next
// La clé externe est la langue (ex: 'en'), la clé interne est le namespace (ex: 'translation')
const resources: Record<SupportedLanguage, { translation: TranslationKeys }> = {
  en: {
    translation: enTranslation as TranslationKeys,
  },
  fr: {
    translation: frTranslation as TranslationKeys,
  },
};

const LANG_PERSISTENCE_KEY = 'artiva-user-language';

// Plugin de détection de langue personnalisé
const languageDetectorPlugin = {
  type: 'languageDetector' as const, // 'as const' aide TypeScript à inférer un type plus précis
  async: true,
  init: () => {}, // Fonction init vide, requise par l'interface i18next.Module
  detect: async (callback: (language: string) => void) => {
    try {
      const persistedLang = await AsyncStorage.getItem(LANG_PERSISTENCE_KEY);
      if (persistedLang && resources[persistedLang as SupportedLanguage]) {
        console.log('i18n: Langue trouvée dans AsyncStorage:', persistedLang);
        return callback(persistedLang);
      }

      // Utiliser Localization.getLocales() qui est plus robuste
      const phoneLocales = Localization.getLocales();
      if (phoneLocales && phoneLocales.length > 0) {
        const deviceLang = phoneLocales[0].languageCode as SupportedLanguage | undefined; // ex: 'en', 'fr'
        if (deviceLang && resources[deviceLang]) {
          console.log('i18n: Langue de l\'appareil détectée:', deviceLang);
          return callback(deviceLang);
        }
      }
      
      console.log('i18n: Utilisation de la langue par défaut (en).');
      return callback('en'); // Langue de fallback/par défaut
    } catch (error) {
      console.error('i18n: Erreur de détection de langue:', error);
      callback('en'); // Fallback en cas d'erreur
    }
  },
  cacheUserLanguage: async (language: string) => {
    try {
      if (resources[language as SupportedLanguage]) {
        await AsyncStorage.setItem(LANG_PERSISTENCE_KEY, language);
        console.log('i18n: Langue utilisateur sauvegardée:', language);
      } else {
        console.warn(`i18n: Tentative de sauvegarder une langue non supportée: ${language}`);
      }
    } catch (error) {
      console.error('i18n: Erreur de sauvegarde de la langue utilisateur:', error);
    }
  },
};

// Configuration d'initialisation pour i18next
const i18nOptions = {
  // compatibilityJSON: 'v3', // Souvent plus nécessaire, essaie sans d'abord. Si erreur, essaie 'v4'.
  resources: resources,
  fallbackLng: 'en',     
  interpolation: {
    escapeValue: false, // React gère déjà l'échappement
  },
  react: {
    useSuspense: false, // Mettre à true si tu utilises React Suspense pour le chargement
  },
  // Configuration explicite du détecteur de langue pour i18next
  // Si tu utilises ton plugin custom, cette section 'detection' est redondante
  // car le plugin est déjà ajouté via .use(languageDetectorPlugin).
  // Mais si tu voulais utiliser des détecteurs standards, ce serait ici.
  // detection: {
  //   order: ['asyncStorage', /* autres détecteurs comme 'expoLocalization' */],
  //   caches: ['asyncStorage'],
  //   // checkWhitelist: true, // S'assurer que la langue détectée est dans 'whitelist' (maintenant 'supportedLngs')
  // },
  // supportedLngs: ['en', 'fr'], // Optionnel: liste des langues supportées explicitement
  // defaultNS: 'translation', // Namespace par défaut (déjà le cas)
  // ns: ['translation'],      // Liste des namespaces (déjà le cas)
};

i18n
  .use(languageDetectorPlugin as any) // Caster le plugin en Module pour satisfaire i18next
  .use(initReactI18next)
  .init(i18nOptions); // Utiliser l'objet d'options typé

export default i18n;