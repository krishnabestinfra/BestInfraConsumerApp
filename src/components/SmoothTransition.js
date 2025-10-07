/**
 * SmoothTransition Component
 * 
 * Provides smooth transitions between screens with optimized loading states
 */

import React, { memo, useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useNavigationContext } from '../context/NavigationContext';

const SmoothTransition = memo(({ children, duration = 200 }) => {
  const { isNavigating } = useNavigationContext();
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isNavigating) {
      // Fade out and scale down slightly during navigation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.95,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade back in and scale back to normal
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNavigating, fadeAnim, scaleAnim, duration]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SmoothTransition;
