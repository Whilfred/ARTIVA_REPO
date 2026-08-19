// ARTIVA/front_end/app/forgot-password.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import LoadingArtiva from './product/LoadingArtiva';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { effectiveAppColorScheme } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request'); // étape actuelle
  const [isLoading, setIsLoading] = useState(false);

  const currentScheme = effectiveAppColorScheme ?? 'light';
  const colors = {
    text: currentScheme === 'dark' ? '#fff' : '#333',
    background: currentScheme === 'dark' ? '#121212' : '#fff',
    inputBackground: currentScheme === 'dark' ? '#2a2a2a' : '#F0F0F0',
    inputText: currentScheme === 'dark' ? '#fff' : '#333',
    primary: '#FF6600',
    primaryDisabled: '#FFC0CB',
  };

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert('E-mail requis', 'Veuillez entrer votre adresse e-mail.');
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('https://back-end-purple-log-1280.fly.dev/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Erreur lors de l’envoi du code.');

      Alert.alert(
        'Code envoyé',
        'Si un compte existe avec cet email, vous recevrez un code pour réinitialiser votre mot de passe.'
      );

      setStep('reset');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir le code et le nouveau mot de passe.');
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('https://back-end-purple-log-1280.fly.dev/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Erreur lors de la réinitialisation.');

      Alert.alert('Succès', 'Mot de passe réinitialisé !', [
        { text: 'OK', onPress: () => router.push('/login') },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Si le chargement est en cours, afficher le composant personnalisé
  if (isLoading) {
    return <LoadingArtiva theme={currentScheme} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Mot de passe oublié' }} />
      <Text style={[styles.title, { color: colors.text }]}>Réinitialiser le mot de passe</Text>

      {step === 'request' ? (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText }]}
            placeholder="Adresse e-mail"
            placeholderTextColor={currentScheme === 'dark' ? '#888' : '#999'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendResetLink}
            disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Envoyer le code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText }]}
            placeholder="Code reçu par email"
            placeholderTextColor={currentScheme === 'dark' ? '#888' : '#999'}
            value={code}
            onChangeText={setCode}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText }]}
            placeholder="Nouveau mot de passe"
            placeholderTextColor={currentScheme === 'dark' ? '#888' : '#999'}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Réinitialiser</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#FF6600',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#FFC0CB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
