// front_end/components/ProductCard.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Easing,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  images?: string[];
  price: string;
  oldPrice?: string;
  category_ids?: (string | number)[];
  categories_names?: string[];
  tag_ids?: (string | number)[];
  tags_names?: string[];
  sku?: string;
  is_published?: boolean;
  description?: string;
  stock?: number;
  isNew?: boolean;
  isPromo?: boolean;
  isVerified?: boolean;
  rating?: number;
  ratingCount?: number;
  moq?: number;
  shippingTime?: string;
  sellerInfo?: string;
  soldCount?: number;
}

interface ProductCardProps {
  item: Product;
  onPress: (productId: string) => void;
  cardWidth: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ item, onPress, cardWidth }) => {
  const { effectiveAppColorScheme } = useAuth();
  const theme = effectiveAppColorScheme ?? 'light';
  const colors = Colors[theme];

  const CARD_WIDTH = cardWidth;

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const images = item.images && item.images.length > 0 ? item.images : [item.imageUrl];

  // Génération aléatoire du nombre de vues (entre 100 et 9999)
  const [views] = useState(() => Math.floor(Math.random() * 9900) + 100);

  const [showViews, setShowViews] = useState(true);
  const tickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    const runCycle = () => {
      Animated.timing(tickerAnim, {
        toValue: showViews ? 1 : 0,
        duration: 550,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (!mounted) return;
        setShowViews((prev) => !prev);
      });
    };

    const interval = setInterval(runCycle, 2600);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [showViews]);

  const outgoingTranslateY = tickerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });
  const outgoingOpacity = tickerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  const incomingTranslateY = tickerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const incomingOpacity = tickerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const isUserInteracting = useRef(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      if (isUserInteracting.current) return;
      const nextIndex = (currentIndex + 1) % images.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [currentIndex, images.length]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onScrollBeginDrag = () => {
    isUserInteracting.current = true;
  };

  const onMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    setCurrentIndex(index);
    isUserInteracting.current = false;
  };

  const renderImage = ({ item: imageUrl }: { item: string }) => (
    <Image
      source={{ uri: imageUrl }}
      style={{ width: CARD_WIDTH, height: CARD_WIDTH, backgroundColor: '#f0f0f0' }}
      resizeMode="cover"
    />
  );

  const { addToWishlist, removeFromWishlist, isProductInWishlist } = useWishlist();
  const isInWishlist = isProductInWishlist(item.id);

  const handleWishlistToggle = () => {
    if (isInWishlist) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item);
    }
  };

  // ✅ FORMATAGE DU PRIX CORRIGÉ
  const formatPrice = (price: string | number) => {
    // Si c'est déjà un nombre, le convertir en string
    const priceStr = typeof price === 'number' ? price.toString() : price;
    
    // Nettoyer : garder uniquement les chiffres et le point
    const cleanPrice = priceStr.replace(/[^0-9.]/g, '');
    
    // Convertir en nombre
    const num = parseFloat(cleanPrice);
    
    // Si ce n'est pas un nombre valide, retourner le prix original
    if (isNaN(num)) return priceStr;
    
    // Formater avec séparateur de milliers
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  // Formatage du nombre de vues
  const formatViews = (views: number) => {
    return views.toLocaleString('fr-FR') + ' vues';
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(item.id)}
      style={[
        styles.container,
        { width: CARD_WIDTH, backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
      activeOpacity={0.9}
    >
      {/* Image avec carrousel */}
      <View style={[styles.imageContainer, { height: CARD_WIDTH }]}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `img-${index}`}
          renderItem={renderImage}
          onScroll={onScroll}
          onScrollBeginDrag={onScrollBeginDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH,
            offset: CARD_WIDTH * index,
            index,
          })}
        />

        {/* Points */}
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentIndex ? colors.tint : 'rgba(255,255,255,0.5)',
                    width: index === currentIndex ? 16 : 6,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Badge Promo */}
        {item.isPromo && (
          <View style={[styles.badge, styles.badgePromo]}>
            <Text style={styles.badgeText}>
              -{Math.round((parseFloat(String(item.oldPrice).replace(/[^0-9.]/g, '') || '0') - parseFloat(String(item.price).replace(/[^0-9.]/g, ''))) / (parseFloat(String(item.oldPrice).replace(/[^0-9.]/g, '') || '1') * 100))}%
            </Text>
          </View>
        )}

        {/* Badge Vérifié */}
        {item.isVerified && (
          <View style={[styles.badge, styles.badgeVerified]}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.badgeText}>Vérifié</Text>
          </View>
        )}

        {/* Wishlist */}
        <TouchableOpacity
          onPress={handleWishlistToggle}
          style={styles.wishlistIconContainer}
        >
          <FontAwesome
            name={isInWishlist ? 'heart' : 'heart-o'}
            size={18}
            color={isInWishlist ? colors.tint : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {/* Infos produit */}
      <View style={styles.infoContainer}>
        {/* Nom */}
        <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>

        {/* Prix */}
        <View style={styles.priceContainer}>
          <Text style={[styles.priceText, { color: colors.tint }]}>
            {formatPrice(item.price)}
          </Text>
          {item.oldPrice && (
            <Text style={[styles.oldPriceText, { color: colors.subtleText }]}>
              {formatPrice(item.oldPrice)}
            </Text>
          )}
        </View>

        {/* Ticker "vues" / "vérifié" */}
        <View style={styles.extraInfoContainer}>
          <Animated.View
            style={[
              styles.extraInfoItem,
              styles.extraInfoLayer,
              {
                transform: [{ translateY: outgoingTranslateY }],
                opacity: outgoingOpacity,
              },
            ]}
          >
            <Ionicons name="eye-outline" size={12} color={colors.subtleText} />
            <Text style={[styles.extraInfoText, { color: colors.subtleText }]}>
              {formatViews(views)}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.extraInfoItem,
              styles.extraInfoLayer,
              {
                transform: [{ translateY: incomingTranslateY }],
                opacity: incomingOpacity,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
            <Text style={[styles.extraInfoText, { color: '#22C55E', fontWeight: '600' }]}>
              Vérifié par Artiva
            </Text>
          </Animated.View>
        </View>

        {/* Note (étoiles) */}
        {item.rating && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <FontAwesome
                  key={i}
                  name={i <= Math.round(item.rating || 0) ? 'star' : 'star-o'}
                  size={12}
                  color="#FFD700"
                  style={{ marginRight: 2 }}
                />
              ))}
            </View>
            {item.ratingCount && (
              <Text style={[styles.ratingCount, { color: colors.subtleText }]}>
                ({item.ratingCount})
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 4,
  },
  dot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgePromo: {
    left: 8,
    backgroundColor: '#FF3B30',
  },
  badgeVerified: {
    left: 8,
    top: 34,
    backgroundColor: '#22C55E',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  wishlistIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  infoContainer: {
    padding: 10,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  oldPriceText: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  extraInfoContainer: {
    position: 'relative',
    marginTop: 4,
    marginBottom: 4,
    height: 16,
    overflow: 'hidden',
  },
  extraInfoLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  extraInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  extraInfoText: {
    fontSize: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingCount: {
    fontSize: 10,
  },
});

export default ProductCard;
