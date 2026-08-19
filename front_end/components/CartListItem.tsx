// components/CartListItem.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { CartItem, useCart } from '../context/CartContext'; // Ajuste le chemin
import Colors from '../constants/Colors'; // Ajuste le chemin
import { useColorScheme } from './useColorScheme'; // Ajuste le chemin

interface CartListItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: string | number, newQuantity: number) => void;
  onRemoveItem: (productId: string | number) => void;
}

const CartListItem: React.FC<CartListItemProps> = React.memo(({ 
  item, 
  onUpdateQuantity, 
  onRemoveItem 
  // Récupère les couleurs du thème ici via useAuth si nécessaire, ou passe-les en props
}) => {
  const { updateQuantity, removeFromCart } = useCart();
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const textColor = Colors[colorScheme ?? 'light'].text;
  const cardColor = Colors[colorScheme ?? 'light'].card;

  console.log(`Rendering CartListItem: ${item.name}`); // Pour voir quand il se re-rend

  const getItemSubtotal = (cartItem: CartItem): number => {
    const priceString = String(cartItem.price).replace(/[^\d.-]/g, '');
    const priceNumber = parseFloat(priceString);
    return isNaN(priceNumber) ? 0 : priceNumber * cartItem.quantity;
  };

  return (
    <View style={[styles.itemContainer, {backgroundColor: cardColor}]}>
      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, {color: textColor}]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.itemPrice, {color: tintColor}]}>{item.price}</Text> 
        <View style={styles.quantityControls}>
          <TouchableOpacity 
            onPress={() => updateQuantity(item.id, item.quantity - 1)} 
            style={[styles.controlButton, item.quantity <= 1 && styles.controlButtonDisabled]}
            disabled={item.quantity <= 1}
          >
            <FontAwesome name="minus" size={16} color={item.quantity <= 1 ? '#ccc' : tintColor} />
          </TouchableOpacity>
          <Text style={[styles.itemQuantity, {color: textColor}]}>{item.quantity}</Text>
          <TouchableOpacity 
            onPress={() => updateQuantity(item.id, item.quantity + 1)} 
            style={styles.controlButton}
            disabled={item.quantity >= (item.stock || Infinity)}
          >
            <FontAwesome name="plus" size={16} color={item.quantity >= (item.stock || Infinity) ? '#ccc' : tintColor} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.itemSubtotalActions}>
        <Text style={[styles.itemSubtotal, {color: textColor}]}>
          {getItemSubtotal(item).toFixed(2)} FCFA
        </Text>
        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeItemButton}>
          <FontAwesome name="trash-o" size={24} color="#EF4444" /> 
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Styles pour CartListItem (copie ceux de CartScreen pour itemContainer, etc.)
const styles = StyleSheet.create({
  itemContainer: { flexDirection: 'row', padding: 10, marginBottom: 10, borderRadius: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, },
  itemImage: { width: 80, height: 80, borderRadius: 6, marginRight: 12, backgroundColor: '#e0e0e0' },
  itemDetails: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  itemPrice: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  quantityControls: { flexDirection: 'row', alignItems: 'center' },
  controlButton: { padding: 8, borderWidth:1, borderRadius: 4, marginHorizontal: 5, borderColor: '#eee' },
  controlButtonDisabled: { borderColor: '#e0e0e0' },
  itemQuantity: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 10, minWidth: 25, textAlign: 'center' },
  itemSubtotalActions: { justifyContent: 'space-between', alignItems: 'flex-end', paddingLeft: 10 },
  itemSubtotal: { fontSize: 14, fontWeight: '500', marginBottom: 10 },
  removeItemButton: { padding: 5 },
});

// Enveloppe avec React.memo
export default React.memo(CartListItem);