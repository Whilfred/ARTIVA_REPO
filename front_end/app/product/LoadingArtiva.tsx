// app/product/LoadingArtiva.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '../../constants/Colors';

interface LoadingArtivaProps {
  theme?: 'light' | 'dark';
}

export default function LoadingArtiva({ theme = 'light' }: LoadingArtivaProps) {
  const colors = Colors[theme];
  const letters = ['A', 'r', 't', 'i', 'v', 'a'];
  const anims = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = letters.map((_, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(anims[index], {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(anims[index], {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    });

    animations.forEach(anim => anim.start());
    return () => animations.forEach(anim => anim.stop());
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.lettersContainer}>
        {letters.map((letter, index) => {
          const translateY = anims[index].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [-25, 25, -25],
          });

          const color = anims[index].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['#999999', colors.primary, '#999999'],
          });

          return (
            <Animated.Text
              key={index}
              style={[styles.letter, { transform: [{ translateY }], color }]}
            >
              {letter}
            </Animated.Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lettersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  letter: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
