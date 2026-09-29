// front_end/app/(tabs)/PrivacyPolicyScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import { FontAwesome5 } from '@expo/vector-icons';

type TabKey = 'privacy' | 'terms';

export default function PrivacyPolicyScreen() {
  const { effectiveAppColorScheme } = useAuth();
  const currentScheme = effectiveAppColorScheme ?? 'light';
  const colors = Colors[currentScheme];

  const [activeTab, setActiveTab] = useState<TabKey>('privacy');
  const scrollRef = useRef<ScrollView>(null);

  // Animation du soulignement des onglets
  const screenWidth = Dimensions.get('window').width;
  const tabWidth = (screenWidth - 32) / 2;
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeTab === 'privacy' ? 0 : tabWidth,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [activeTab, tabWidth, indicatorAnim]);

  // Remonter en haut quand on change d'onglet
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeTab]);

  const handleEmailPress = () => {
    Linking.openURL('mailto:artiva.app@gmail.com');
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      stickyHeaderIndices={[0]}
    >
      <Stack.Screen
        options={{
          title: 'Confidentialité & CGU',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: '600' },
          headerTintColor: colors.tint,
          headerBackTitle: 'Retour',
        }}
      />

      {/* ============================================================ */}
      {/* ONGLETS (sticky)                                             */}
      {/* ============================================================ */}
      <View style={[styles.tabsWrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
          <Pressable
            style={styles.tab}
            onPress={() => setActiveTab('privacy')}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'privacy' ? colors.tint : colors.subtleText },
                activeTab === 'privacy' && styles.tabLabelActive,
              ]}
            >
              🛡️ Confidentialité
            </Text>
          </Pressable>

          <Pressable
            style={styles.tab}
            onPress={() => setActiveTab('terms')}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'terms' ? colors.tint : colors.subtleText },
                activeTab === 'terms' && styles.tabLabelActive,
              ]}
            >
              📋 CGU
            </Text>
          </Pressable>

          <Animated.View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: colors.tint,
                width: tabWidth - 20,
                transform: [{ translateX: indicatorAnim }],
              },
            ]}
          />
        </View>
      </View>

      {/* ============================================================ */}
      {/* ONGLET CONFIDENTIALITÉ                                       */}
      {/* ============================================================ */}
      {activeTab === 'privacy' && (
        <View>
          {/* En-tête */}
          <View style={[styles.header, { backgroundColor: colors.card }]}>
            <FontAwesome5 name="shield-alt" size={50} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Politique de confidentialité
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtleText }]}>
              Dernière mise à jour : 29 septembre 2026
            </Text>
          </View>

          {/* 1. Introduction */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              1. Introduction
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Bienvenue sur Artiva. Nous accordons une importance capitale à la protection de votre vie privée et de vos données personnelles.
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              Cette politique vous informe sur les données que nous collectons, comment nous les utilisons, combien de temps nous les conservons et vos droits.
            </Text>
          </View>

          {/* 2. Qui sommes-nous */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              2. Qui sommes-nous ?
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Artiva est une plateforme de vente en ligne permettant de commander des produits artisanaux et de se les faire livrer au Bénin, au Burkina Faso et en Côte d'Ivoire.
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Contact :</Text> artiva.app@gmail.com
            </Text>
          </View>

          {/* 3. Données collectées */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              3. Données que nous collectons
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Nous ne collectons que les informations strictement nécessaires au bon fonctionnement de l'application.
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 12 }]}>
              a) Données d'identification
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Nom et prénom</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Adresse email</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Numéro de téléphone</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 12 }]}>
              b) Données de livraison
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Adresse complète (rue, ville, pays)</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 12 }]}>
              c) Données de commande
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Produits commandés et montants</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Historique des commandes</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 12 }]}>
              d) Données d'utilisation
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Préférences de navigation</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Appareil utilisé (type, système)</Text>
          </View>

          {/* 4. Galerie */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              4. Accès à la galerie photo
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              L'application peut demander l'accès à votre galerie uniquement pour :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Enregistrer les QR codes générés par vos commandes
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Sauvegarder certains éléments visuels de l'application
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              Nous n'accédons jamais à vos photos personnelles sans votre consentement explicite.
            </Text>
          </View>

          {/* 5. Utilisation */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              5. Utilisation de vos données
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • <Text style={{ fontWeight: 'bold' }}>Gestion des commandes :</Text> traiter, préparer et livrer vos achats
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • <Text style={{ fontWeight: 'bold' }}>Compte client :</Text> gérer votre compte et sécuriser vos connexions
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • <Text style={{ fontWeight: 'bold' }}>Communication :</Text> vous informer du statut de vos commandes
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • <Text style={{ fontWeight: 'bold' }}>Amélioration du service :</Text> comprendre l'usage et améliorer l'app
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • <Text style={{ fontWeight: 'bold' }}>Marketing :</Text> vous envoyer des offres (avec possibilité de refus)
            </Text>
          </View>

          {/* 6. Cookies */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              6. Cookies et technologies similaires
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Nous n'utilisons <Text style={{ fontWeight: 'bold' }}>aucun cookie publicitaire</Text> ni de <Text style={{ fontWeight: 'bold' }}>pistage tiers</Text>.
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              Les seules données conservées <Text style={{ fontWeight: 'bold' }}>localement sur votre appareil</Text> sont :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Votre token de connexion (pour rester connecté)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Vos préférences d'affichage (thème clair/sombre)
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              Vos <Text style={{ fontWeight: 'bold' }}>paniers</Text> et <Text style={{ fontWeight: 'bold' }}>wishlists</Text> sont stockés de manière sécurisée dans <Text style={{ fontWeight: 'bold' }}>notre base de données</Text>, et non sur votre appareil.
            </Text>
          </View>

          {/* 7. Partage */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              7. Partage de vos données
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Nous ne vendons <Text style={{ fontWeight: 'bold' }}>jamais</Text> vos données personnelles.
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              Nous les partageons uniquement dans les cas suivants :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Prestataires de livraison (nom, adresse, téléphone)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Prestataires techniques (hébergement, emails, push)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Obligations légales (si la loi l'exige)
            </Text>
          </View>

          {/* 8. Durée de conservation */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              8. Durée de conservation
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Compte actif : tant que le compte existe
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Historique commandes : 5 ans (obligations comptables)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Compte inactif : suppression après 3 ans
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Après suppression : anonymisation immédiate
            </Text>
          </View>

          {/* 9. Sécurité */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              9. Sécurité de vos données
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              🔒 Chiffrement des mots de passe
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              🔒 Connexion sécurisée (HTTPS / SSL)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              🔒 Authentification à deux facteurs (code email)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              🔒 Accès restreint aux administrateurs
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              🔒 Sauvegardes régulières
            </Text>
          </View>

          {/* 10. Vos droits */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              10. Vos droits
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              ✅ <Text style={{ fontWeight: 'bold' }}>Droit d'accès</Text> — Consulter vos données
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              ✅ <Text style={{ fontWeight: 'bold' }}>Droit de rectification</Text> — Corriger vos données
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              ✅ <Text style={{ fontWeight: 'bold' }}>Droit à l'effacement</Text> — Supprimer votre compte
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              ✅ <Text style={{ fontWeight: 'bold' }}>Droit d'opposition</Text> — Refuser le marketing
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              ✅ <Text style={{ fontWeight: 'bold' }}>Droit à la portabilité</Text> — Recevoir vos données
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              Pour exercer ces droits : artiva.app@gmail.com
            </Text>
          </View>

          {/* 11. Paiements */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              11. Paiements et commandes
            </Text>
            <Text style={[styles.subTitle, { color: colors.text, marginBottom: 6 }]}>
              a) Paiement à la livraison (COD)
            </Text>
            <View style={[styles.noteBox, { backgroundColor: colors.tint + '15', borderLeftColor: colors.tint }]}>
              <Text style={[styles.noteText, { color: colors.subtleText }]}>
                Les commandes jusqu'à <Text style={{ fontWeight: 'bold', color: colors.text }}>15 000 FCFA</Text> peuvent être payées à la livraison.
              </Text>
              <Text style={[styles.noteText, { color: colors.subtleText, marginTop: 4 }]}>
                Pour toute commande supérieure à 15 000 FCFA, seul le <Text style={{ fontWeight: 'bold' }}>surplus au-delà de 15 000 FCFA</Text> doit être payé à l'avance avant la livraison.
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              En cas de commandes répétées non payées ou non retirées de la part d'un même client, Artiva se réserve le droit d'exiger un paiement intégral obligatoire à l'avance pour toute commande future de ce client.
            </Text>
          </View>

          {/* 12. Contact & Suppression */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              12. Contact et suppression de compte
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Pour toute question concernant cette politique :
            </Text>
            <Pressable onPress={handleEmailPress}>
              <Text style={[styles.contactInfo, { color: colors.tint }]}>
                📧 artiva.app@gmail.com
              </Text>
            </Pressable>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 12 }]}>
              Pour demander la suppression de votre compte et de vos données :
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
              © 2026 Artiva — Dernière mise à jour : 29 septembre 2026
            </Text>
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* ONGLET CGU                                                   */}
      {/* ============================================================ */}
      {activeTab === 'terms' && (
        <View>
          {/* En-tête */}
          <View style={[styles.header, { backgroundColor: colors.card }]}>
            <FontAwesome5 name="file-contract" size={50} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Conditions Générales d'Utilisation
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtleText }]}>
              Dernière mise à jour : 29 septembre 2026
            </Text>
          </View>

          {/* 1. Objet */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              1. Objet
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application Artiva et des services associés.
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              En créant un compte ou en utilisant Artiva, vous acceptez sans réserve les présentes CGU.
            </Text>
          </View>

          {/* 2. Accès au service */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              2. Accès au service
            </Text>
            <Text style={[styles.subTitle, { color: colors.text }]}>a) Conditions d'accès</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Avoir au moins 18 ans (ou autorisation parentale)</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Disposer d'un appareil compatible</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Avoir une connexion Internet</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>b) Création de compte</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Informations exactes et à jour</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Un seul compte par personne</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Interdiction de créer un compte au nom d'un tiers</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>c) Sécurité</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Vous êtes responsable de vos identifiants</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Toute activité sur votre compte vous est imputable</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • En cas de perte de mot de passe, utilisez le bouton « Mot de passe oublié » dans l'application
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Pour toute difficulté, contactez : artiva.app@gmail.com
            </Text>
          </View>

          {/* 3. Commandes */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              3. Commandes
            </Text>
            <Text style={[styles.subTitle, { color: colors.text }]}>a) Passation de commande</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• La commande est ferme et définitive après validation</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Un email de confirmation vous est envoyé</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Artiva se réserve le droit de refuser une commande</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>b) Disponibilité</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Les produits sont proposés dans la limite des stocks disponibles
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • En cas de rupture, remboursement ou avoir vous sera proposé
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>c) Prix</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Les prix sont indiqués en FCFA (XOF)</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Le prix applicable est celui affiché au moment de la commande
            </Text>
          </View>

          {/* 4. Paiement */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              4. Paiement
            </Text>
            <Text style={[styles.subTitle, { color: colors.text }]}>a) Modes de paiement acceptés</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Paiement à la livraison (COD) dans la limite de 15 000 FCFA
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Paiement en ligne (Mobile Money / carte bancaire)
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>b) Commandes importantes</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Au-delà de 15 000 FCFA : acompte obligatoire du surplus
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • En cas de non-paiement répété : paiement intégral exigé
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>c) Sécurité</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Artiva ne stocke jamais vos informations bancaires
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Toutes les transactions sont chiffrées
            </Text>
          </View>

          {/* 5. Livraison */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              5. Livraison
            </Text>
            <Text style={[styles.subTitle, { color: colors.text }]}>a) Zones desservies</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Bénin (Sud et Nord)</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Burkina Faso</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Côte d'Ivoire</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>b) Délais</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Les délais sont indicatifs et varient selon la zone
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>c) Frais de livraison</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Les frais sont calculés selon la zone de destination
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Livraison gratuite dès 100 000 FCFA d'achats cumulés sur 7 jours
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>d) Réception de la commande</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Vérifiez le contenu à la livraison
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Toute anomalie doit être signalée immédiatement au livreur
            </Text>
          </View>

          {/* 6. Retours */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              6. Retours et remboursements
            </Text>
            <Text style={[styles.subTitle, { color: colors.text }]}>a) Droit de rétractation</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Vous disposez de 7 jours après réception pour signaler un problème
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Le produit doit être non utilisé et dans son emballage d'origine
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>b) Produits non retournables</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Produits périssables</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Produits personnalisés</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Produits d'hygiène ouverts</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>c) Remboursement</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Effectué sous 14 jours après validation du retour
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Par le même moyen de paiement utilisé
            </Text>
          </View>

          {/* 7. Comportement */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              7. Comportement de l'utilisateur
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Vous vous engagez à :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>✅ Ne pas utiliser Artiva à des fins illégales</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>✅ Ne pas porter atteinte aux autres utilisateurs</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>✅ Ne pas pirater ou perturber le service</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>✅ Ne pas publier de faux avis</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>✅ Fournir des informations exactes</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 12 }]}>
              Sont strictement interdits :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>❌ Fausses commandes répétées</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>❌ Usurpation d'identité</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>❌ Spam ou publicité non autorisée</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>❌ Extraction massive de données (scraping)</Text>
          </View>

          {/* 8. Responsabilité */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              8. Responsabilité d'Artiva
            </Text>
            <Text style={[styles.subTitle, { color: colors.text }]}>a) Ce qu'Artiva garantit</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Fournir un service fonctionnel et sécurisé</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Protéger vos données personnelles</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Traiter vos commandes avec sérieux</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>
              b) Ce qu'Artiva ne garantit pas
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • L'absence totale d'interruption (maintenance, panne)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • La disponibilité permanente des produits (rupture possible)
            </Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>
              c) Limitation de responsabilité
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              La responsabilité d'Artiva ne saurait être engagée pour :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Les dommages indirects</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Les pertes de données liées à un cas de force majeure
            </Text>
          </View>

          {/* 9. Suspension */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              9. Suspension et résiliation
            </Text>
            <Text style={[styles.subTitle, { color: colors.text }]}>a) Par Artiva</Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Artiva peut suspendre ou supprimer un compte sans préavis en cas de :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Violation grave des CGU</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Comportement frauduleux</Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>• Commandes non payées répétées</Text>

            <Text style={[styles.subTitle, { color: colors.text, marginTop: 10 }]}>b) Par l'utilisateur</Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Vous pouvez supprimer votre compte à tout moment via :
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • L'application (bouton « Supprimer mon compte »)
            </Text>
            <Text style={[styles.bulletItem, { color: colors.subtleText }]}>
              • Email à artiva.app@gmail.com
            </Text>
          </View>

          {/* 10. Propriété intellectuelle */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              10. Propriété intellectuelle
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Tous les contenus d'Artiva (logo, textes, images, code) sont protégés par le droit d'auteur. Toute reproduction sans autorisation écrite est interdite.
            </Text>
          </View>

          {/* 11. Modification */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              11. Modifications des CGU
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Artiva se réserve le droit de modifier les CGU à tout moment. Les utilisateurs seront informés par notification dans l'application ou par email.
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              L'utilisation continue d'Artiva après modification vaut acceptation des nouvelles CGU.
            </Text>
          </View>

          {/* 12. Droit applicable */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              12. Droit applicable
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Les présentes CGU sont régies par le droit béninois.
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText, marginTop: 8 }]}>
              Tout litige sera soumis aux tribunaux compétents de Cotonou, Bénin.
            </Text>
          </View>

          {/* 13. Contact */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              13. Contact
            </Text>
            <Text style={[styles.sectionText, { color: colors.subtleText }]}>
              Pour toute question :
            </Text>
            <Pressable onPress={handleEmailPress}>
              <Text style={[styles.contactInfo, { color: colors.tint }]}>
                📧 artiva.app@gmail.com
              </Text>
            </Pressable>
          </View>

          <View style={[styles.footer, { backgroundColor: colors.card }]}>
            <Text style={[styles.footerText, { color: colors.subtleText }]}>
              © 2026 Artiva — Dernière mise à jour : 29 septembre 2026
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  tabsWrapper: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 10,
    height: 3,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 21,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 22,
    paddingLeft: 4,
    marginTop: 2,
  },
  noteBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginTop: 8,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
  },
  contactInfo: {
    fontSize: 15,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
