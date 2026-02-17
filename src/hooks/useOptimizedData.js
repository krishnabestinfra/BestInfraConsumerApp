/**
 * useOptimizedData Hook
 * 
 * Custom hook that provides optimized data loading with caching
 * and prevents unnecessary API calls on navigation.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useNavigationContext } from '../context/NavigationContext';

export const useOptimizedData = (dataType = 'consumerData', options = {}) => {
  const {
    consumerData,
    user,
    isDataLoaded,
    getDataLoading,
    setDataLoading,
    refreshDataIfNeeded,
    updateConsumerData,
    isDataStale
  } = useData();

  const { isNavigating, isRapidNavigation } = useNavigationContext();

  const {
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutes
    forceRefreshOnFocus = false
  } = options;


  const isLoading = getDataLoading(dataType);

  // Memoized data with fallbacks
  const data = useMemo(() => {
    switch (dataType) {
      case 'consumerData':
        return consumerData;
      default:
        return null;
    }
  }, [dataType, consumerData]);

  // Optimized refresh function
  const refresh = useCallback(async (force = false) => {
 
    if (isRapidNavigation && !force) {
      return;
    }


    if (isLoading) {
      return;
    }

    try {
      setDataLoading(dataType, true);
      await refreshDataIfNeeded(force);
    } catch (error) {
      console.error(`Error refreshing ${dataType}:`, error);
    } finally {
      setDataLoading(dataType, false);
    }
  }, [dataType, isLoading, isRapidNavigation, setDataLoading, refreshDataIfNeeded]);

  useEffect(() => {
    if (dataType !== 'consumerData') return;
    if (user?.identifier && data == null && !isLoading) {
      refresh(true);
    }
  }, [dataType, user?.identifier, data, isLoading, refresh]);

  useEffect(() => {
    if (!autoRefresh || !isDataLoaded) return;

    const interval = setInterval(() => {
      if (!isNavigating && !isRapidNavigation) {
        refresh();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isDataLoaded, isNavigating, isRapidNavigation, refresh, refreshInterval]);

  
  return {
    data,
    isLoading,
    isDataLoaded,
    isDataStale: isDataStale(),
    refresh: (force = false) => refresh(force),
    updateData: updateConsumerData
  };
};
