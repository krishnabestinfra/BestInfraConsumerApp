/**
 * Optimized Image Component
 * 
 * Provides optimized image loading with loading states and error handling.
 * Simplified version focused on essential image optimization features.
 * 
 * Features:
 * - Loading states
 * - Error handling
 * - Placeholder support
 * - Performance optimization
 */

import React, { memo, useState, useCallback } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const OptimizedImage = memo(({
  source,
  style,
  placeholder,
  resizeMode = 'cover',
  onLoad,
  onError,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    if (onError) {
      onError();
    }
  }, [onError]);

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.secondaryColor} />
        </View>
      )}
      
      <Image
        source={source}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {error && placeholder && (
        <View style={styles.placeholderContainer}>
          {placeholder}
        </View>
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default OptimizedImage;