// front_end/app/(tabs)/PrivacyPolicyScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import { FontAwesome5 } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const { effectiveAppColorScheme } = useAuth();
  const currentScheme = effectiveAppColorScheme ?? 'light';
  const colors = Colors[currentScheme];

  const handleEmailPress = () => {
    Linking.openURL('mailto:artiva.app@gmail.com');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Stack.Screen
        options={{
          title: 'Politique de confidentialité',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: '600' },
          headerTintColor: colors.tint,
          headerBackTitle: 'Retour',
        }}
      />

      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <FontAwesome5 name="shield-alt" size={50} color={colors.tint} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Politique de confidentialité
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtleText }]}>
          Dernière mise à jour : 3 septembre 2026
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Bienvenue sur Artiva. Nous respectons votre vie privée et nous nous engageons à protéger vos informations personnelles. Cette politique explique quelles données nous collectons, comment nous les utilisons et vos droits concernant ces données.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          1. Collecte des informations
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Nous collectons uniquement les informations nécessaires au bon fonctionnement de l'application et à la livraison de vos commandes :
        </Text>
        <View style={styles.bulletList}>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Nom et prénom
          </Text>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Adresse de livraison
          </Text>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Numéro de téléphone
          </Text>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Informations liées à la commande (produits, paiement, livraison)
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          2. Utilisation de la galerie
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          L'application Artiva peut demander l'accès à votre galerie pour :
        </Text>
        <View style={styles.bulletList}>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Enregistrer et stocker les QR codes générés par vos commandes
          </Text>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Sauvegarder certains éléments de l'application, si nécessaire
          </Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
          Nous n'utilisons pas la galerie pour autre chose et aucune image n'est collectée sans votre consentement.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          3. Stockage et sécurité des données
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Toutes vos informations sont stockées de manière sécurisée et ne sont accessibles qu'au personnel autorisé. Nous utilisons des mesures de protection standard pour éviter tout accès non autorisé ou perte de données.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          4. Paiements et commandes
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Pour les commandes à la livraison (COD) :
        </Text>
        <View style={[styles.noteBox, { backgroundColor: colors.tint + '15', borderLeftColor: colors.tint }]}>
          <Text style={[styles.noteText, { color: colors.subtleText }]}>
            Les commandes jusqu'à <Text style={{ fontWeight: 'bold', color: colors.text }}>30 000 FCFA</Text> peuvent être payées à la livraison.
          </Text>
          <Text style={[styles.noteText, { color: colors.subtleText, marginTop: 4 }]}>
            Pour toute commande supérieure à 30 000 FCFA, seul le surplus au-delà de 30 000 FCFA doit être payé à l'avance avant la livraison.
          </Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
          En cas de commandes répétées non payées ou non retirées de la part d'un même client, Artiva se réserve le droit d'exiger un paiement intégral obligatoire à l'avance pour toute commande future de ce client.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          5. Cookies et technologies similaires
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Nous n'utilisons pas de cookies pour collecter des informations personnelles sur Artiva. Les données collectées sont uniquement celles nécessaires pour vos commandes et la gestion de l'application.
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          6. Partage des informations
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Nous ne partageons vos informations personnelles avec des tiers que :
        </Text>
        <View style={styles.bulletList}>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Pour la livraison de vos commandes (ex: services de transport)
          </Text>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Pour se conformer à la loi ou aux exigences légales
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          7. Vos droits
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Vous pouvez :
        </Text>
        <View style={styles.bulletList}>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Consulter vos informations personnelles
          </Text>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Demander la correction ou suppression de vos informations
          </Text>
          <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
            • Contacter notre support pour toute question relative à vos données
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          8. Contact et suppression de compte
        </Text>
        <Text style={[styles.sectionText, { color: colors.subtleText }]}>
          Pour toute question concernant la politique de confidentialité ou vos données personnelles, veuillez nous contacter à :
        </Text>
        <Pressable onPress={handleEmailPress}>
          <Text style={[styles.contactInfo, { color: colors.tint }]}>
            📧 artiva.app@gmail.com
          </Text>
        </Pressable>
        <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 12 }]}>
          Pour demander la suppression de votre compte et de vos données associées :
        </Text>
        <Pressable
          style={[styles.deleteButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            Linking.openURL('mailto:artiva.app@gmail.com?subject=Demande de suppression de compte&body=Bonjour, je souhaite supprimer mon compte Artiva.');
          }}
        >
          <Text style={styles.deleteButtonText}>🗑️ Supprimer mon compte</Text>
        </Pressable>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <Text style={[styles.footerText, { color: colors.subtleText }]}>
          Dernière mise à jour : 3 septembre 2026
        </Text>
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 24,
    paddingLeft: 8,
  },
  noteBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginTop: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactInfo: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 6,
  },
  deleteButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
});
