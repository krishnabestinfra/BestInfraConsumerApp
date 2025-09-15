/**
 * Simplified App Context
 * 
 * Provides global state management for user data and app state.
 * Streamlined to focus on essential state without redundancy.
 * 
 * Features:
 * - User authentication state
 * - Consumer data management
 * - Loading states
 * - Error handling
 * - Optimized re-renders
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { getUser } from '../utils/storage';
import { getCachedConsumerData, backgroundSyncConsumerData } from '../utils/cacheManager';

// Simplified initial state
const initialState = {
  user: null,
  consumerData: null,
  isLoading: false,
  error: null,
  lastSyncTime: null
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_CONSUMER_DATA: 'SET_CONSUMER_DATA',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LAST_SYNC: 'SET_LAST_SYNC',
  RESET_STATE: 'RESET_STATE'
};

// Simplified reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload };
    case ActionTypes.SET_CONSUMER_DATA:
      return { ...state, consumerData: action.payload };
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    case ActionTypes.SET_LAST_SYNC:
      return { ...state, lastSyncTime: action.payload };
    case ActionTypes.RESET_STATE:
      return initialState;
    default:
      return state;
  }
};

// Context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoized actions
  const actions = useMemo(() => ({
    setLoading: (loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
    setUser: (user) => dispatch({ type: ActionTypes.SET_USER, payload: user }),
    setConsumerData: (data) => dispatch({ type: ActionTypes.SET_CONSUMER_DATA, payload: data }),
    setError: (error) => dispatch({ type: ActionTypes.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: ActionTypes.CLEAR_ERROR }),
    setLastSync: (time) => dispatch({ type: ActionTypes.SET_LAST_SYNC, payload: time }),
    resetState: () => dispatch({ type: ActionTypes.RESET_STATE })
  }), []);

  // Load user data with caching
  const loadUserData = useCallback(async () => {
    try {
      actions.setLoading(true);
      actions.clearError();
      
      const user = await getUser();
      if (user) {
        actions.setUser(user);
        
        if (user.identifier) {
          // Try to get cached data first for instant display
          const cachedResult = await getCachedConsumerData(user.identifier);
          if (cachedResult.success) {
            actions.setConsumerData(cachedResult.data);
            actions.setLoading(false);
          }
          
          // Background sync for fresh data
          backgroundSyncConsumerData(user.identifier).then((result) => {
            if (result.success) {
              actions.setConsumerData(result.data);
              actions.setLastSync(Date.now());
            }
          }).catch(error => {
            console.error('Background sync failed:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      actions.setError(error.message);
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  // Get consumer display name
  const getConsumerDisplayName = useCallback(() => {
    if (state.isLoading) {
      return "Loading...";
    }
    
    return state.consumerData?.name || 
           state.consumerData?.consumerName || 
           state.user?.name || 
           "Consumer";
  }, [state.consumerData, state.user?.name, state.isLoading]);

  // Get outstanding amount
  const getOutstandingAmount = useCallback(() => {
    if (state.isLoading) {
      return "Loading...";
    }
    
    if (state.consumerData?.totalOutstanding !== undefined) {
      return state.consumerData.totalOutstanding.toLocaleString('en-IN', {
        maximumFractionDigits: 2
      });
    }
    
    return "NA";
  }, [state.consumerData, state.isLoading]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    ...state,
    actions,
    loadUserData,
    getConsumerDisplayName,
    getOutstandingAmount
  }), [state, actions, loadUserData, getConsumerDisplayName, getOutstandingAmount]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;