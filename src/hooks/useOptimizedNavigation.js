/**
 * useOptimizedNavigation Hook
 * 
 * Provides optimized navigation with smooth transitions and loading state management
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../context/NavigationContext';

export const useOptimizedNavigation = () => {
  const navigation = useNavigation();
  const { navigateSmoothly, isNavigating } = useNavigationContext();

  // Optimized navigate function
  const navigate = useCallback((screenName, params = {}) => {
    navigateSmoothly(screenName, params);
    navigation.navigate(screenName, params);
  }, [navigation, navigateSmoothly]);

  // Optimized replace function
  const replace = useCallback((screenName, params = {}) => {
    navigateSmoothly(screenName, params);
    navigation.replace(screenName, params);
  }, [navigation, navigateSmoothly]);

  // Optimized push function
  const push = useCallback((screenName, params = {}) => {
    navigateSmoothly(screenName, params);
    navigation.push(screenName, params);
  }, [navigation, navigateSmoothly]);

  // Optimized goBack function
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigateSmoothly('back');
      navigation.goBack();
    }
  }, [navigation, navigateSmoothly]);

  // Optimized reset function
  const reset = useCallback((state) => {
    navigateSmoothly('reset');
    navigation.reset(state);
  }, [navigation, navigateSmoothly]);

  return {
    navigate,
    replace,
    push,
    goBack,
    reset,
    isNavigating,
    canGoBack: navigation.canGoBack,
    getState: navigation.getState,
    dispatch: navigation.dispatch
  };
};
