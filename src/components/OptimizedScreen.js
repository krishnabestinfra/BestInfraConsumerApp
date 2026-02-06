/**
 * OptimizedScreen Component
 * 
 * A wrapper component that provides optimized rendering and data loading
 * to prevent unnecessary reloads on navigation.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigationContext } from '../context/NavigationContext';
import { COLORS } from '../constants/colors';

const OptimizedScreen = memo(({ 
  children, 
  dataType = 'consumerData',
  showLoader = true,
  loaderText = 'Loading...',
  style = {}
}) => {
  const { getScaledFontSize } = useTheme();
  const s14 = getScaledFontSize(14);
  const { getDataLoading, isDataLoaded } = useData();
  const { isNavigating } = useNavigationContext();

  const isLoading = getDataLoading(dataType);
  const shouldShowLoader = showLoader && (isLoading || isNavigating);

  const renderContent = useCallback(() => {
    if (shouldShowLoader) {
      return (
        <View style={[styles.loaderContainer, style]}>
          <ActivityIndicator size="large" color={COLORS.secondaryColor} />
          {loaderText && (
            <Text style={[styles.loaderText, { fontSize: s14 }]}>{loaderText}</Text>
          )}
        </View>
      );
    }

    return children;
  }, [shouldShowLoader, children, loaderText, style]);

  return (
    <View style={[styles.container, style]}>
      {renderContent()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-Medium',
  },
});

export default OptimizedScreen;
