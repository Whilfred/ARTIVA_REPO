// front_end/app/(tabs)/SocialLinksScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
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
    url: 'https://www.facebook.com/share/14bEWEWAoS8/',
    username: '@Artiva',
    disponible: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    url: 'https://www.tiktok.com/@artiva548?_r=1&_t=ZS-99Q6oAAyaIS',
    username: '@artiva548',
    disponible: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    url: '',
    username: '@artiva',
    disponible: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    url: '',
    username: 'Artiva',
    disponible: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    url: '',
    username: '+228 90 000 000',
    disponible: false,
  },
];

export default function SocialLinksScreen() {
  const { effectiveAppColorScheme } = useAuth();
  const currentScheme = effectiveAppColorScheme ?? 'light';
  const colors = Colors[currentScheme];

  const openLink = (url: string, disponible: boolean) => {
    if (!disponible) {
      Alert.alert(
        '🔜 Bientôt disponible',
        'Cette page sera disponible prochainement. Suivez-nous sur nos autres réseaux !'
      );
      return;
    }
    if (!url) {
      Alert.alert(
        '🔜 Bientôt disponible',
        'Cette page sera disponible prochainement. Suivez-nous sur nos autres réseaux !'
      );
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', "Impossible d'ouvrir le lien");
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
          style={[
            styles.socialCard,
            {
              backgroundColor: colors.card,
              opacity: social.disponible ? 1 : 0.6,
            }
          ]}
          onPress={() => openLink(social.url, social.disponible)}
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
          {social.disponible ? (
            <MaterialIcons name="chevron-right" size={24} color={colors.subtleText} />
          ) : (
            <View style={[styles.bientotBadge, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.bientotBadgeText, { color: colors.tint }]}>
                🔜 Bientôt
              </Text>
            </View>
          )}
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
  bientotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bientotBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
