/**
 * UltraFastScreen Component
 * 
 * Ultra-fast screen rendering with:
 * - Instant data display
 * - Sub-500ms loading times
 * - Aggressive optimizations
 * - Parallel data loading
 */

import React, { memo, useMemo, useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useUltraFastData } from '../hooks/useUltraFastData';
import { COLORS } from '../constants/colors';

const UltraFastScreen = memo(({ 
  children, 
  dataType = 'consumerData',
  showLoader = true,
  loaderText = 'Loading...',
  maxLoadingTime = 500,
  style = {},
  onDataLoaded = null
}) => {
  const { data, isLoading, isInitialLoad, error, refresh } = useUltraFastData(dataType, {
    maxLoadingTime,
    autoRefresh: true
  });

  const [showMinimalLoader, setShowMinimalLoader] = useState(false);

  // Optimize loading display
  useEffect(() => {
    if (isLoading && isInitialLoad) {
      // Show loader immediately for initial load
      setShowMinimalLoader(true);
      
      // Hide loader after max loading time
      const timer = setTimeout(() => {
        setShowMinimalLoader(false);
      }, maxLoadingTime);
      
      return () => clearTimeout(timer);
    } else {
      setShowMinimalLoader(false);
    }
  }, [isLoading, isInitialLoad, maxLoadingTime]);

  // Call onDataLoaded when data is available
  useEffect(() => {
    if (data && onDataLoaded) {
      onDataLoaded(data);
    }
  }, [data, onDataLoaded]);

  // Memoized loader component
  const renderLoader = useCallback(() => {
    if (!showLoader || !showMinimalLoader) return null;

    return (
      <View style={styles.loaderOverlay}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator 
            size="small" 
            color={COLORS.secondaryColor} 
          />
          {loaderText && (
            <Text style={styles.loaderText}>{loaderText}</Text>
          )}
        </View>
      </View>
    );
  }, [showLoader, showMinimalLoader, loaderText]);

  // Memoized error display
  const renderError = useCallback(() => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Text style={styles.retryText} onPress={refresh}>
          Tap to retry
        </Text>
      </View>
    );
  }, [error, refresh]);

  // Memoized content
  const renderContent = useMemo(() => {
    return (
      <View style={[styles.container, style]}>
        {children}
        {renderError()}
        {renderLoader()}
      </View>
    );
  }, [children, style, renderError, renderLoader]);

  return renderContent;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-Medium',
  },
  errorContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    zIndex: 999,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    fontFamily: 'Manrope-Medium',
  },
  retryText: {
    fontSize: 12,
    color: COLORS.secondaryColor,
    fontFamily: 'Manrope-Bold',
    marginTop: 5,
    textDecorationLine: 'underline',
  },
});

export default UltraFastScreen;
