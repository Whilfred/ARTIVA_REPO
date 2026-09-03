// front_end/app/(tabs)/SocialLinksScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

const SOCIAL_LINKS = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    url: 'https://facebook.com/artiva',
    username: '@artiva',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    url: 'https://instagram.com/artiva',
    username: '@artiva',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    url: 'https://tiktok.com/@artiva',
    username: '@artiva',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    url: 'https://youtube.com/@artiva',
    username: 'Artiva',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    url: 'https://wa.me/22890000000',
    username: '+228 90 000 000',
  },
];

export default function SocialLinksScreen() {
  const { effectiveAppColorScheme } = useAuth();
  const currentScheme = effectiveAppColorScheme ?? 'light';
  const colors = Colors[currentScheme];

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Stack.Screen
        options={{
          title: 'Nos réseaux sociaux',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: '600' },
          headerTintColor: colors.tint,
          headerBackTitle: 'Retour',
        }}
      />

      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <FontAwesome5 name="share-alt" size={50} color={colors.tint} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Suivez-nous !
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtleText }]}>
          Restez connecté avec Artiva sur nos réseaux sociaux
        </Text>
      </View>

      {SOCIAL_LINKS.map((social) => (
        <Pressable
          key={social.id}
          style={[styles.socialCard, { backgroundColor: colors.card }]}
          onPress={() => openLink(social.url)}
        >
          <View style={[styles.iconContainer, { backgroundColor: social.color + '15' }]}>
            <FontAwesome5 name={social.icon} size={28} color={social.color} />
          </View>
          <View style={styles.socialInfo}>
            <Text style={[styles.socialName, { color: colors.text }]}>
              {social.name}
            </Text>
            <Text style={[styles.socialUsername, { color: colors.subtleText }]}>
              {social.username}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.subtleText} />
        </Pressable>
      ))}
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
  socialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  socialInfo: {
    flex: 1,
  },
  socialName: {
    fontSize: 16,
    fontWeight: '600',
  },
  socialUsername: {
    fontSize: 14,
    marginTop: 2,
  },
});
