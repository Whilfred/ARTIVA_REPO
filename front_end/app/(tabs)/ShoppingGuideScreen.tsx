// front_end/app/(tabs)/ShoppingGuideScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

const STEPS = [
  {
    id: 1,
    icon: 'search',
    title: '1. Parcourez notre catalogue',
    description: 'Explorez notre large gamme de produits. Utilisez les filtres pour affiner votre recherche par catégorie, prix ou marque.',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
  },
  {
    id: 2,
    icon: 'shopping-bag',
    title: '2. Ajoutez au panier',
    description: 'Sélectionnez la quantité souhaitée et ajoutez l\'article à votre panier. Vous pouvez continuer vos achats ou passer à la caisse.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
  },
  {
    id: 3,
    icon: 'credit-card',
    title: '3. Paiement sécurisé',
    description: 'Choisissez votre moyen de paiement : carte bancaire, Mobile Money ou paiement à la livraison. Tous nos paiements sont sécurisés.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
  },
  {
    id: 4,
    icon: 'truck',
    title: '4. Livraison rapide',
    description: 'Nous livrons dans tout le Togo sous 24-48h. Suivez votre commande en temps réel depuis votre espace client.',
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=400',
  },
];

export default function ShoppingGuideScreen() {
  const { effectiveAppColorScheme } = useAuth();
  const currentScheme = effectiveAppColorScheme ?? 'light';
  const colors = Colors[currentScheme];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Stack.Screen
        options={{
          title: 'Guide d\'achat',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: '600' },
          headerTintColor: colors.tint,
          headerBackTitle: 'Retour',
        }}
      />

      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <FontAwesome5 name="shopping-bag" size={50} color={colors.tint} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Comment acheter sur Artiva
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtleText }]}>
          Suivez ce guide pour une expérience d'achat simplifiée
        </Text>
      </View>

      {STEPS.map((step) => (
        <View key={step.id} style={[styles.stepCard, { backgroundColor: colors.card }]}>
          <View style={[styles.stepNumber, { backgroundColor: colors.tint }]}>
            <Text style={styles.stepNumberText}>{step.id}</Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <FontAwesome5 name={step.icon} size={24} color={colors.tint} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                {step.title}
              </Text>
            </View>
            <Text style={[styles.stepDescription, { color: colors.subtleText }]}>
              {step.description}
            </Text>
            <Image
              source={{ uri: step.image }}
              style={styles.stepImage}
              resizeMode="cover"
            />
          </View>
        </View>
      ))}

      <View style={[styles.tipsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.tipsTitle, { color: colors.text }]}>
          💡 Conseils utiles
        </Text>
        <View style={styles.tipItem}>
          <MaterialIcons name="check-circle" size={20} color="#22C55E" />
          <Text style={[styles.tipText, { color: colors.subtleText }]}>
            Créez un compte pour suivre vos commandes
          </Text>
        </View>
        <View style={styles.tipItem}>
          <MaterialIcons name="check-circle" size={20} color="#22C55E" />
          <Text style={[styles.tipText, { color: colors.subtleText }]}>
            Profitez de nos promotions et codes promo
          </Text>
        </View>
        <View style={styles.tipItem}>
          <MaterialIcons name="check-circle" size={20} color="#22C55E" />
          <Text style={[styles.tipText, { color: colors.subtleText }]}>
            Contactez-nous pour toute question
          </Text>
        </View>
        <View style={styles.tipItem}>
          <MaterialIcons name="check-circle" size={20} color="#22C55E" />
          <Text style={[styles.tipText, { color: colors.subtleText }]}>
            Utilisez le code promo de bienvenue pour votre première commande
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  stepCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  stepImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  tipsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
  },
});
