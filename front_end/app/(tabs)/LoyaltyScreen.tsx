// ARTIVA/front_end/app/(tabs)/LoyaltyScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import Colors from "../../constants/Colors";
import { API_BASE_URL } from "../../constants/Api";
import { Alert } from "../../constants/Alerte";
import { FontAwesome5, MaterialIcons, Entypo } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// ===================== INTERFACES =====================
interface Voucher {
  id: string;
  code: string;
  value: number;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  isWelcomeBonus?: boolean;
}

interface LoyaltyData {
  totalSpent: number;
  loyaltyPoints: number;
  availableVouchers: Voucher[];
  usedVouchers: Voucher[];
  nextRewardThreshold: number;
  welcomeBonusUsed: boolean;
  welcomeBonusValue: number;
}

// ===================== COMPOSANT PRINCIPAL =====================
export default function LoyaltyScreen() {
  const { user, userToken, effectiveAppColorScheme, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  const currentScheme = effectiveAppColorScheme ?? "light";
  const colors = Colors[currentScheme];
  
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===================== RÉCUPÉRATION DES DONNÉES DEPUIS L'API =====================
// ===================== RÉCUPÉRATION DES DONNÉES =====================
const fetchLoyaltyData = useCallback(async () => {
  if (!userToken) {
    setIsLoading(false);
    return;
  }
  
  try {
    setError(null);
    
    console.log('🔍 Appel à l\'API:', `${API_BASE_URL}/fidelite`);
    console.log('🔑 Token présent:', userToken ? 'Oui' : 'Non');
    
    const response = await fetch(`${API_BASE_URL}/status`, {
      headers: { 
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Status:', response.status);
    console.log('📡 Headers Content-Type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      if (response.status === 401) {
        await signOut();
        router.push("/login");
        return;
      }
      throw new Error(`Erreur ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Données reçues COMPLÈTES:', JSON.stringify(data, null, 2));
    
    // 🔍 LOGS DÉTAILLÉS
    console.log('📊 === DÉTAIL DES DONNÉES ===');
    console.log('📊 actif:', data.actif);
    console.log('📊 solde (points):', data.solde);
    console.log('📊 total_spent (backend):', data.total_spent);
    console.log('📊 seuil:', data.seuil);
    console.log('📊 restant:', data.restant);
    console.log('📊 valeur_estimee:', data.valeur_estimee);
    console.log('📊 validite_jours:', data.validite_jours);
    console.log('📊 nombre de bons:', data.bons?.length || 0);
    console.log('📊 historique:', data.historique?.length || 0);
    
    // 🔥 Récupérer les données depuis le backend
    const totalSpent = data.total_spent || 0;
    const loyaltyPoints = data.solde || 0;
    const seuil = data.seuil || 30000;
    
    console.log('💰💰💰 Total dépensé récupéré du backend:', totalSpent, 'FCFA');
    console.log('⭐ Points récupérés:', loyaltyPoints);
    
    // ===== BONS DISPONIBLES =====
    const availableVouchers: Voucher[] = [];
    const usedVouchers: Voucher[] = [];
    
    if (data.bons && Array.isArray(data.bons)) {
      console.log(`📦 Traitement de ${data.bons.length} bons...`);
      
      data.bons.forEach((b: any, index: number) => {
        console.log(`  Bon #${index + 1}: code=${b.code}, valeur=${b.valeur}, etat=${b.etat}`);
        
        const voucher: Voucher = {
          id: b.code,
          code: b.code,
          value: b.valeur || 0,
          createdAt: new Date().toISOString(),
          expiresAt: b.expire_le || new Date().toISOString(),
          isUsed: b.etat === 'utilise',
          isWelcomeBonus: false,
        };
        
        if (b.etat === 'utilise') {
          usedVouchers.push(voucher);
        } else if (b.etat === 'disponible') {
          availableVouchers.push(voucher);
        }
      });
    }
    
    console.log(`✅ Bons disponibles: ${availableVouchers.length}`);
    console.log(`✅ Bons utilisés: ${usedVouchers.length}`);
    
    // ===== BONUS DE BIENVENUE =====
    const welcomeBonusValue = 2000;
    let welcomeBonusUsed = false;
    
    try {
      const ordersResponse = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json();
        welcomeBonusUsed = orders.length > 0;
        console.log(`📦 Nombre de commandes: ${orders.length}, welcomeBonusUsed: ${welcomeBonusUsed}`);
      }
    } catch (e) {
      console.log('⚠️ Erreur récupération commandes:', e);
      welcomeBonusUsed = false;
    }
    
    if (!welcomeBonusUsed) {
      console.log('🎁 Ajout du bonus de bienvenue (2000 FCFA)');
      const welcomeVoucher: Voucher = {
        id: `welcome-${Date.now()}`,
        code: `BIENVENUE${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        value: welcomeBonusValue,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        isUsed: false,
        isWelcomeBonus: true,
      };
      availableVouchers.unshift(welcomeVoucher);
    }
    
    // 🔥 LOG FINAL AVANT setLoyaltyData
    console.log('🚀 === SET LOYALTY DATA ===');
    console.log('🚀 totalSpent:', totalSpent);
    console.log('🚀 loyaltyPoints:', loyaltyPoints);
    console.log('🚀 availableVouchers:', availableVouchers.length);
    console.log('🚀 usedVouchers:', usedVouchers.length);
    console.log('🚀 nextRewardThreshold:', seuil);
    console.log('🚀 welcomeBonusUsed:', welcomeBonusUsed);
    console.log('🚀 welcomeBonusValue:', welcomeBonusValue);
    
    setLoyaltyData({
      totalSpent: totalSpent,
      loyaltyPoints: loyaltyPoints,
      availableVouchers,
      usedVouchers,
      nextRewardThreshold: seuil,
      welcomeBonusUsed,
      welcomeBonusValue,
    });
    
    console.log('✅ LoyaltyData mis à jour avec succès !');
    
  } catch (err: any) {
    console.error('❌ Erreur fetch fidelite:', err);
    console.error('❌ Stack:', err.stack);
    setError(err.message || "Erreur lors du chargement des données");
    
    setLoyaltyData({
      totalSpent: 0,
      loyaltyPoints: 0,
      availableVouchers: [],
      usedVouchers: [],
      nextRewardThreshold: 30000,
      welcomeBonusUsed: false,
      welcomeBonusValue: 2000,
    });
  } finally {
    setIsLoading(false);
    setRefreshing(false);
  }
}, [userToken, signOut, router]);


  useEffect(() => {
    fetchLoyaltyData();
  }, [fetchLoyaltyData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLoyaltyData();
  }, [fetchLoyaltyData]);

  // ===================== ACTION : COPIER =====================
  const handleCopyCode = (code: string) => {
    Alert.alert(
      t('loyaltyScreen.actions.copyCode.title', 'Code copié !'),
      t('loyaltyScreen.actions.copyCode.message', 'Votre code: {{code}}', { code })
    );
  };

  // ===================== AFFICHAGE =====================
  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 10, color: colors.text, fontSize: 14 }}>
          {t('loyaltyScreen.loading', 'Chargement de vos récompenses...')}
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 20 }]}>
        <FontAwesome5 name="crown" size={60} color={colors.tint} style={{ marginBottom: 20 }} />
        <Text style={[styles.authTitle, { color: colors.text }]}>
          {t('loyaltyScreen.notConnected.title', 'Connectez-vous pour voir vos récompenses')}
        </Text>
        <Text style={[styles.authSubtitle, { color: colors.subtleText }]}>
          {t('loyaltyScreen.notConnected.subtitle', 'Gagnez des points, débloquez des bons et profitez d\'avantages exclusifs')}
        </Text>
        <Pressable
          style={[styles.authButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.authButtonText}>
            {t('loyaltyScreen.notConnected.login', 'Se connecter')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.authButtonSecondary, { borderColor: colors.tint }]}
          onPress={() => router.push("/register")}
        >
          <Text style={[styles.authButtonTextSecondary, { color: colors.tint }]}>
            {t('loyaltyScreen.notConnected.register', 'Créer un compte')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.tint]}
          tintColor={colors.tint}
        />
      }
    >
      <Stack.Screen 
        options={{ 
          title: t('loyaltyScreen.title', 'Fidélité & Récompenses'),
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: "600" },
          headerTintColor: colors.tint,
          headerBackTitle: t('common.back', 'Retour'),
        }} 
      />

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          <MaterialIcons name="error-outline" size={40} color={colors.errorText} />
          <Text style={[styles.errorText, { color: colors.errorText }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchLoyaltyData}
          >
            <Text style={styles.retryButtonText}>
              {t('common.retry', 'Réessayer')}
            </Text>
          </Pressable>
        </View>
      )}

      {loyaltyData && (
        <>
          {/* ===== BONUS DE BIENVENUE ===== */}
          {!loyaltyData.welcomeBonusUsed && loyaltyData.availableVouchers.some(v => v.isWelcomeBonus) && (
            <View style={[styles.welcomeBonusCard, { 
              backgroundColor: colors.tint + '10',
              borderColor: colors.tint,
            }]}>
              <View style={styles.welcomeBonusHeader}>
                <FontAwesome5 name="gift" size={28} color={colors.tint} />
                <Text style={[styles.welcomeBonusTitle, { color: colors.tint }]}>
                  {t('loyaltyScreen.welcomeBonus.title', '🎉 Bonus de Bienvenue !')}
                </Text>
              </View>
              <Text style={[styles.welcomeBonusText, { color: colors.text }]}>
                {t('loyaltyScreen.welcomeBonus.description', 'Profitez de votre bon d\'achat de {{value}} FCFA offert à votre inscription !', {
                  value: loyaltyData.welcomeBonusValue
                })}
              </Text>
              <Text style={[styles.welcomeBonusExpiry, { color: colors.subtleText }]}>
                {t('loyaltyScreen.welcomeBonus.expiry', '⏰ Valable 120 jours')}
              </Text>
            </View>
          )}

          {/* ===== RÉSUMÉ ===== */}
          <View style={styles.summaryContainer}>
            <View style={[styles.pointsCard, { backgroundColor: colors.card }]}>
              <FontAwesome5 name="star" size={28} color="#FFD700" />
              <Text style={[styles.pointsNumber, { color: colors.tint }]}>
                {loyaltyData.loyaltyPoints}
              </Text>
              <Text style={[styles.pointsLabel, { color: colors.subtleText }]}>
                {t('loyaltyScreen.points.label', 'Points de fidélité')}
              </Text>
            </View>

            <View style={[styles.spentCard, { backgroundColor: colors.card }]}>
              <FontAwesome5 name="shopping-bag" size={28} color="#4CAF50" />
              <Text style={[styles.spentAmount, { color: colors.text }]}>
                {loyaltyData.totalSpent.toLocaleString()} FCFA
              </Text>
              <Text style={[styles.spentLabel, { color: colors.subtleText }]}>
                {t('loyaltyScreen.points.totalSpent', 'Total dépensé')}
              </Text>
            </View>
          </View>

          {/* ===== PROGRESSION ===== */}
          <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.progressLabel, { color: colors.text }]}>
              {t('loyaltyScreen.points.nextReward', 'Prochaine récompense')}
            </Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min((loyaltyData.loyaltyPoints / loyaltyData.nextRewardThreshold) * 100, 100)}%`,
                    backgroundColor: colors.tint 
                  }
                ]} 
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressText, { color: colors.subtleText }]}>
                {t('loyaltyScreen.points.progress', '{{current}} / {{total}} points', {
                  current: loyaltyData.loyaltyPoints,
                  total: loyaltyData.nextRewardThreshold
                })}
              </Text>
              <Text style={[styles.progressHint, { color: colors.tint }]}>
                {t('loyaltyScreen.points.remaining', '{{points}} points restants', {
                  points: Math.max(0, loyaltyData.nextRewardThreshold - loyaltyData.loyaltyPoints)
                })}
              </Text>
            </View>
          </View>

          {/* ===== BONS DISPONIBLES ===== */}
          <View style={styles.vouchersContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('loyaltyScreen.vouchers.available', '🎁 Bons disponibles ({{count}})', {
                count: loyaltyData.availableVouchers.length
              })}
            </Text>

            {loyaltyData.availableVouchers.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Entypo name="box" size={50} color={colors.subtleText} />
                <Text style={[styles.emptyStateText, { color: colors.text }]}>
                  {t('loyaltyScreen.vouchers.empty', 'Aucun bon disponible')}
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.subtleText }]}>
                  {t('loyaltyScreen.vouchers.emptySubtext', 'Continuez vos achats pour débloquer des récompenses !')}
                </Text>
              </View>
            ) : (
              loyaltyData.availableVouchers.map((voucher) => (
                <View
                  key={voucher.id}
                  style={[
                    styles.voucherCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: voucher.isWelcomeBonus ? colors.tint : colors.cardBorder,
                      borderWidth: voucher.isWelcomeBonus ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.voucherInfo}>
                    <View style={styles.voucherHeader}>
                      <Text style={[styles.voucherValue, { color: colors.tint }]}>
                        {voucher.value} FCFA
                      </Text>
                      {voucher.isWelcomeBonus && (
                        <View style={[styles.welcomeBadge, { backgroundColor: colors.tint }]}>
                          <Text style={styles.welcomeBadgeText}>🎁 {t('common.welcome', 'Bienvenue')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.voucherCode, { color: colors.text }]}>
                      {t('loyaltyScreen.vouchers.code', 'Code: {{code}}', { code: voucher.code })}
                    </Text>
                    <Text style={[styles.voucherExpiry, { color: colors.subtleText }]}>
                      {t('loyaltyScreen.vouchers.expires', '⏰ Expire le: {{date}}', {
                        date: new Date(voucher.expiresAt).toLocaleDateString('fr-FR')
                      })}
                    </Text>
                  </View>
                  
                  {/* ===== SEULEMENT BOUTON COPIER (pas de "Utiliser") ===== */}
                  <View style={styles.voucherActions}>
                    <Pressable
                      style={[styles.copyButton, { borderColor: colors.tint }]}
                      onPress={() => handleCopyCode(voucher.code)}
                    >
                      <Text style={[styles.copyButtonText, { color: colors.tint }]}>
                        {t('loyaltyScreen.vouchers.copy', 'Copier')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ===== HISTORIQUE : BONS UTILISÉS ===== */}
          {loyaltyData.usedVouchers.length > 0 && (
            <View style={styles.usedVouchersContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('loyaltyScreen.vouchers.used', '📜 Historique ({{count}})', {
                  count: loyaltyData.usedVouchers.length
                })}
              </Text>
              {loyaltyData.usedVouchers.map((voucher) => (
                <View
                  key={voucher.id}
                  style={[styles.usedVoucherCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.voucherInfo}>
                    <Text style={[styles.voucherValueUsed, { color: colors.subtleText }]}>
                      {voucher.value} FCFA
                    </Text>
                    <Text style={[styles.voucherCodeUsed, { color: colors.subtleText }]}>
                      {t('loyaltyScreen.vouchers.code', 'Code: {{code}}', { code: voucher.code })}
                    </Text>
                    {voucher.usedAt && (
                      <Text style={[styles.voucherUsedDate, { color: colors.subtleText }]}>
                        {t('loyaltyScreen.vouchers.usedLabel', 'Utilisé le: {{date}}', {
                          date: new Date(voucher.usedAt).toLocaleDateString('fr-FR')
                        })}
                      </Text>
                    )}
                  </View>
                  <FontAwesome5 name="check-circle" size={24} color="#4CAF50" />
                </View>
              ))}
            </View>
          )}

          {/* ===== RÈGLES ===== */}
          <View style={[styles.rulesContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.rulesTitle, { color: colors.text }]}>
              {t('loyaltyScreen.rules.title', '📖 Comment ça marche ?')}
            </Text>
            <View style={styles.ruleItem}>
              <MaterialIcons name="stars" size={20} color="#FFD700" />
              <Text style={[styles.ruleText, { color: colors.subtleText }]}>
                {t('loyaltyScreen.rules.earnPoints', 'Gagnez des points à chaque achat (1 FCFA = 1 point)')}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <MaterialIcons name="local-offer" size={20} color="#4CAF50" />
              <Text style={[styles.ruleText, { color: colors.subtleText }]}>
                {t('loyaltyScreen.rules.reward750', '30 000 points = 750 FCFA de réduction')}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <MaterialIcons name="local-offer" size={20} color="#4CAF50" />
              <Text style={[styles.ruleText, { color: colors.subtleText }]}>
                {t('loyaltyScreen.rules.reward1000', '40 000 points = 1 000 FCFA de réduction')}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <MaterialIcons name="card-giftcard" size={20} color="#FF6B6B" />
              <Text style={[styles.ruleText, { color: colors.subtleText }]}>
                {t('loyaltyScreen.rules.welcomeBonus', '2 000 FCFA offerts à l\'inscription')}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <MaterialIcons name="timer" size={20} color="#FFA500" />
              <Text style={[styles.ruleText, { color: colors.subtleText }]}>
                {t('loyaltyScreen.rules.validity', 'Les bons sont valables 90 jours')}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  authButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  authButtonSecondary: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  authButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 12,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  welcomeBonusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  welcomeBonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  welcomeBonusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeBonusText: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  welcomeBonusExpiry: {
    fontSize: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pointsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  pointsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  pointsLabel: {
    fontSize: 14,
  },
  spentCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  spentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  spentLabel: {
    fontSize: 14,
  },
  progressContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
  },
  progressHint: {
    fontSize: 14,
    fontWeight: '600',
  },
  vouchersContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  voucherCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  voucherInfo: {
    marginBottom: 12,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  welcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  welcomeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  voucherCode: {
    fontSize: 16,
    marginTop: 4,
  },
  voucherExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  voucherActions: {
    flexDirection: 'row',
    gap: 10,
  },
  copyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  copyButtonText: {
    fontWeight: '600',
  },
  useButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  usedVouchersContainer: {
    marginBottom: 16,
  },
  usedVoucherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
  voucherValueUsed: {
    fontSize: 18,
    fontWeight: '600',
  },
  voucherCodeUsed: {
    fontSize: 14,
    marginTop: 2,
  },
  voucherUsedDate: {
    fontSize: 12,
    marginTop: 2,
  },
  rulesContainer: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    flex: 1,
  },
});
