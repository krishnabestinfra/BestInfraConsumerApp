/**
 * Lazy Screen Component
 * 
 * Provides lazy loading for screens to improve initial app load time.
 * Simplified version that focuses on essential lazy loading functionality.
 * 
 * Features:
 * - Screen-level lazy loading
 * - Loading fallback
 * - Preloading support
 */

import React, { Suspense, lazy, memo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

// Simple loading component
const LoadingSpinner = memo(() => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.secondaryColor} />
  </View>
));

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Lazy screen wrapper with fallback
 */
const LazyScreen = ({ children, fallback }) => {
  return (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      {children}
    </Suspense>
  );
};

/**
 * Higher-order component for lazy loading screens
 */
export const withLazyLoading = (Component) => {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  return memo((props) => (
    <LazyScreen>
      <LazyComponent {...props} />
    </LazyScreen>
  ));
};

/**
 * Preload screen for better performance
 */
export const preloadScreen = (importFunction) => {
  return importFunction().then(module => module.default);
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryFontColor,
  },
});

export default LazyScreen;