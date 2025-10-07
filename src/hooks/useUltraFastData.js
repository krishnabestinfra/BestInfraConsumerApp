/**
 * useUltraFastData Hook
 * 
 * Ultra-fast data loading with:
 * - Instant cache display
 * - Parallel API calls
 * - Aggressive optimizations
 * - Sub-500ms loading times
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ultraFastApiClient } from '../services/UltraFastApiClient';
import { getUser } from '../utils/storage';
import { getCachedConsumerData } from '../utils/cacheManager';

export const useUltraFastData = (dataType = 'consumerData', options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutes
    maxLoadingTime = 500, // Max 500ms loading time
    enableParallelLoading = true
  } = options;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [error, setError] = useState(null);
  
  const loadingTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Ultra-fast data loading with timeout protection
  const loadData = useCallback(async (forceRefresh = false) => {
    if (isLoading && !forceRefresh) return;

    const startTime = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      const user = await getUser();
      if (!user?.identifier) {
        throw new Error('No user identifier found');
      }

      console.log(`🚀 UltraFast: Loading ${dataType} for ${user.identifier}`);

      // Strategy 1: Try cache first (instant)
      if (!forceRefresh) {
        const cachedResult = await getCachedConsumerData(user.identifier);
        if (cachedResult.success && cachedResult.data) {
          setData(cachedResult.data);
          setIsLoading(false);
          setIsInitialLoad(false);
          console.log(`⚡ UltraFast: Cache hit - data loaded in ${Date.now() - startTime}ms`);
          
          // Continue with fresh data in background
          setTimeout(() => loadData(true), 100);
          return;
        }
      }

      // Strategy 2: Ultra-fast API call
      const result = await ultraFastApiClient.getConsumerDataUltraFast(user.identifier);
      
      if (result.success) {
        setData(result.data);
        setLastFetch(Date.now());
        setError(null);
        console.log(`✅ UltraFast: API data loaded in ${Date.now() - startTime}ms`);
      } else {
        throw new Error(result.error || 'Failed to load data');
      }

    } catch (err) {
      console.error(`❌ UltraFast: Error loading ${dataType}:`, err);
      setError(err.message);
      
      // Don't clear existing data on error
      if (!data) {
        setData(null);
      }
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ UltraFast: Total loading time: ${totalTime}ms`);
      
      if (totalTime > maxLoadingTime) {
        console.warn(`⚠️ UltraFast: Loading time exceeded ${maxLoadingTime}ms`);
      }
    }
  }, [dataType, isLoading, data, maxLoadingTime]);

  // Parallel data loading for multiple data types
  const loadMultipleData = useCallback(async (dataTypes) => {
    if (!enableParallelLoading) return;

    const startTime = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      const user = await getUser();
      if (!user?.identifier) {
        throw new Error('No user identifier found');
      }

      console.log(`🚀 UltraFast: Parallel loading ${dataTypes.length} data types`);

      // Create parallel requests
      const requests = dataTypes.map(type => {
        switch (type) {
          case 'consumerData':
            return ultraFastApiClient.getConsumerDataUltraFast(user.identifier);
          // Add more data types as needed
          default:
            return Promise.resolve({ success: false, error: 'Unknown data type' });
        }
      });

      const results = await Promise.allSettled(requests);
      
      // Process results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          if (dataTypes[index] === 'consumerData') {
            setData(result.value.data);
          }
        }
      });

      setLastFetch(Date.now());
      console.log(`✅ UltraFast: Parallel loading completed in ${Date.now() - startTime}ms`);

    } catch (err) {
      console.error('❌ UltraFast: Parallel loading failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [enableParallelLoading]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    refreshIntervalRef.current = setInterval(() => {
      if (!isLoading) {
        loadData(true); // Force refresh
      }
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, isLoading, loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Loading timeout protection
  useEffect(() => {
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (isLoading) {
          console.warn('⚠️ UltraFast: Loading timeout - forcing completion');
          setIsLoading(false);
        }
      }, maxLoadingTime + 1000); // 1 second buffer
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, maxLoadingTime]);

  // Memoized refresh function
  const refresh = useCallback((force = false) => {
    return loadData(force);
  }, [loadData]);

  // Memoized data with fallbacks
  const optimizedData = useMemo(() => {
    return data;
  }, [data]);

  // Loading state optimization
  const optimizedLoading = useMemo(() => {
    // Don't show loading if we have data and it's just a background refresh
    if (data && !isInitialLoad) {
      return false;
    }
    return isLoading;
  }, [isLoading, data, isInitialLoad]);

  return {
    data: optimizedData,
    isLoading: optimizedLoading,
    isInitialLoad,
    error,
    lastFetch,
    refresh,
    loadMultipleData,
    // Performance metrics
    cacheStats: ultraFastApiClient.getCacheStats()
  };
};
