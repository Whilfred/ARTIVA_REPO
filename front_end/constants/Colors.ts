// ARTIVA/front_end/constants/Colors.ts

// Couleurs de base (nommées d'après le thème Alibaba pour plus de clarté)
const alibabaOrange = '#FF6A00';   // Couleur principale (Orange Alibaba)
const lightGreen = '#2ECC71';      // Vert clair pour promotions (commun aux deux thèmes)

// === Thème Clair ===
const lightTheme = {
    primary: alibabaOrange,       // Couleur principale
    titleText: '#1F1F1F',        // Titres
    descriptionText: '#333333',  // Description produit
    secondaryText: '#666666',    // Détails moins importants
    price: '#E53900',           // Couleur du prix
    promotion: lightGreen,       // Couleur promo ou réduction (vert clair)
    addToCartButton: alibabaOrange, // Ajouter au panier
    addToCartButtonHover: '#E65C00', // Survol bouton panier
    buyNowButton: '#D72600',        // Acheter maintenant
    screenBackground: '#FFFFFF',  // Arrière-plan principal
    cardBackground: '#FAFAFA',    // Fond des fiches produit
    success: '#27AE60',           // Message de validation
    error: '#C0392B',             // Message d’erreur
    border: '#E0E0E0',            // Lignes et séparateurs
};

// === Thème Sombre ===
const darkTheme = {
    primary: alibabaOrange,       // Couleur principale (Orange Alibaba)
    titleText: '#FFFFFF',        // Titres
    descriptionText: '#DDDDDD',  // Description produit
    secondaryText: '#AAAAAA',    // Détails moins importants
    price: '#FF7043',           // Couleur du prix
    promotion: lightGreen,       // Couleur promo ou réduction (vert clair)
    addToCartButton: alibabaOrange, // Ajouter au panier
    addToCartButtonHover: '#FFA347', // Survol bouton panier
    buyNowButton: '#FF4D3D',        // Acheter maintenant
    screenBackground: '#121212',  // Arrière-plan principal
    cardBackground: '#1E1E1E',    // Fond des fiches produit
    success: '#34D399',           // Message de validation
    error: '#EF4444',             // Message d’erreur
    border: '#2C2C2C',            // Lignes et séparateurs
};

export default {
  light: {
    text: lightTheme.titleText,           // TEXTE_TITRE
    background: lightTheme.screenBackground,    // FOND_ECRAN
    tint: lightTheme.primary,           // COULEUR_PRINCIPALE (tint = accent)
    tint_price: lightTheme.price,         // PRIX
    tabIconDefault: '#A0AEC0',        // (Inactif - Gardé pour compatibilité)
    tabIconDefaultwhist: lightTheme.primary, //COULEUR_PRINCIPALE
    tabIconSelected: lightTheme.primary,      // COULEUR_PRINCIPALE
    card: lightTheme.cardBackground,        // FOND_CARTE
    cardBorder: lightTheme.border,          // BORDURE
    subtleText: lightTheme.secondaryText,    // TEXTE_SECONDAIRE
    inputBackground: '#F7FAFC',         // Gardé par défaut
    inputBorder: '#CBD5E0',             // Gardé par défaut
    errorText: lightTheme.error,           // ERREUR
    errorBackground: '#FED7D7',         // Gardé par défaut
    successText: lightTheme.success,         // SUCCÈS
    successBackground: '#C6F6D5',         // Gardé par défaut
    warningText: '#DD6B20',            // Gardé par défaut
    warningBackground: '#FEEBC8',         // Gardé par défaut
    primary: lightTheme.primary,           // COULEUR_PRINCIPALE
    primaryDarker: '#C53030',            // (Adaptation - Pour :hover, etc.)
  },
  dark: {
    text: darkTheme.titleText,            // TEXTE_TITRE
    background: darkTheme.screenBackground,     // FOND_ECRAN
    tint: lightTheme.primary,           // COULEUR_PRINCIPALE
    tint_price: darkTheme.price,         // PRIX
    tabIconDefault: '#718096',         // (Inactif - Gardé pour compatibilité)
    tabIconDefaultwhist: lightTheme.primary,
    tabIconSelected: lightTheme.primary,      // COULEUR_PRINCIPALE
    card: darkTheme.cardBackground,         // FOND_CARTE
    cardBorder: darkTheme.border,           // BORDURE
    subtleText: darkTheme.secondaryText,     // TEXTE_SECONDAIRE
    inputBackground: '#2D3748',         // Gardé par défaut
    inputBorder: '#4A5568',             // Gardé par défaut
    errorText: darkTheme.error,           // ERREUR
    errorBackground: '#4A2424',         // Gardé par défaut
    successText: darkTheme.success,         // SUCCÈS
    successBackground: '#2F855A40',         // Gardé par défaut
    warningText: '#FABD05',            // Gardé par défaut
    warningBackground: '#4A3B24',         // Gardé par défaut
    primary: lightTheme.primary,           // COULEUR_PRINCIPALE
    primaryDarker: '#C53030',            // (Adaptation - Pour :hover, etc.)
  },
};