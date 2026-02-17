/**
 * Data Context
 * 
 * Centralized data management to prevent unnecessary API calls
 * and ensure data persistence across navigation.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { getUser } from '../utils/storage';
import { getCachedConsumerData, backgroundSyncConsumerData } from '../utils/cacheManager';
import { apiClient } from '../services/apiClient';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // Global data state
  const [consumerData, setConsumerData] = useState(null);
  const [user, setUser] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const [dataLoadingStates, setDataLoadingStates] = useState({});

  // Initialize user and data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const userData = await getUser();
        if (userData) {
          setUser(userData);
          
          // Load cached data immediately
          if (userData.identifier) {
            const cachedResult = await getCachedConsumerData(userData.identifier);
            if (cachedResult.success && cachedResult.data) {
              setConsumerData(cachedResult.data);
              setIsDataLoaded(true);
            }
            
            // Background sync for fresh data
            backgroundSyncConsumerData(userData.identifier).then((result) => {
              if (result.success && result.data) {
                setConsumerData(result.data);
                setLastDataFetch(Date.now());
                setIsDataLoaded(true);
              }
            }).catch(error => {
              console.error('Background sync failed:', error);
              // Still mark loaded so UI can show empty/retry instead of loading forever
              setIsDataLoaded(true);
            });
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, []);


  const setDataLoading = useCallback((dataType, isLoading) => {
    setDataLoadingStates(prev => ({
      ...prev,
      [dataType]: isLoading
    }));
  }, []);


  const isDataStale = useCallback(() => {
    if (!lastDataFetch) return true;
    return (Date.now() - lastDataFetch) > 300000; 
  }, [lastDataFetch]);

  // Refresh data if needed
  const refreshDataIfNeeded = useCallback(async (forceRefresh = false) => {
    if (!user?.identifier) return;

    if (forceRefresh || isDataStale()) {
      try {
        setDataLoading('consumerData', true);
        const result = await apiClient.getConsumerData(user.identifier);
        if (result.success) {
          setConsumerData(result.data);
          setLastDataFetch(Date.now());
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        setDataLoading('consumerData', false);
      }
    }
  }, [user, isDataStale]);


  const getDataLoading = useCallback((dataType) => {
    return dataLoadingStates[dataType] || false;
  }, [dataLoadingStates]);


  const updateConsumerData = useCallback((newData) => {
    setConsumerData(newData);
    setLastDataFetch(Date.now());
  }, []);

  const contextValue = useMemo(() => ({
    // Data
    consumerData,
    user,
    isDataLoaded,
    lastDataFetch,
    
    // Loading states
    dataLoadingStates,
    setDataLoading,
    getDataLoading,
    
    // Actions
    refreshDataIfNeeded,
    updateConsumerData,
    isDataStale
  }), [
    consumerData,
    user,
    isDataLoaded,
    lastDataFetch,
    dataLoadingStates,
    setDataLoading,
    getDataLoading,
    refreshDataIfNeeded,
    updateConsumerData,
    isDataStale
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
