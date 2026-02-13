/**
 * Notifications Context
 * 
 * Provides global state management for notifications across the app.
 * Features:
 * - Consumer-specific notification isolation
 * - Dynamic fetching based on consumer UID
 * - Unread count management
 * - Mark as read functionality
 * - Caching and performance optimization
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/apiService';
import { getUser } from '../utils/storage';
import { isDemoUser, getDemoNotifications } from '../constants/demoData';

// Action Types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  SET_ERROR: 'SET_ERROR',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  SET_CONSUMER_UID: 'SET_CONSUMER_UID',
  SWITCH_CONSUMER: 'SWITCH_CONSUMER',
  CLEAR_CONSUMER_DATA: 'CLEAR_CONSUMER_DATA',
  REFRESH_NOTIFICATIONS: 'REFRESH_NOTIFICATIONS'
};

// Initial State
const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  lastFetchTime: null,
  consumerUid: null,
  consumerNotifications: {} // Store notifications per consumer UID
};

// Reducer
const notificationsReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
        error: null
      };

    case ActionTypes.SET_NOTIFICATIONS:
      const notifications = action.payload || [];
      const unreadCount = notifications.filter(n => !n.is_read).length;
      const consumerUid = action.consumerUid || state.consumerUid;
      
      return {
        ...state,
        notifications,
        unreadCount,
        isLoading: false,
        error: null,
        lastFetchTime: Date.now(),
        consumerNotifications: {
          ...state.consumerNotifications,
          [consumerUid]: {
            notifications,
            unreadCount,
            lastFetchTime: Date.now()
          }
        }
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case ActionTypes.MARK_AS_READ:
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, is_read: true }
          : notification
      );
      
      const updatedUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
      
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedUnreadCount,
        consumerNotifications: {
          ...state.consumerNotifications,
          [state.consumerUid]: {
            ...state.consumerNotifications[state.consumerUid],
            notifications: updatedNotifications,
            unreadCount: updatedUnreadCount
          }
        }
      };

    case ActionTypes.MARK_ALL_AS_READ:
      const allReadNotifications = state.notifications.map(notification => ({
        ...notification,
        is_read: true
      }));
      
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0,
        consumerNotifications: {
          ...state.consumerNotifications,
          [state.consumerUid]: {
            ...state.consumerNotifications[state.consumerUid],
            notifications: allReadNotifications,
            unreadCount: 0
          }
        }
      };

    case ActionTypes.SET_CONSUMER_UID:
      const newUid = action.payload;
      const existingData = state.consumerNotifications[newUid];
      
      return {
        ...state,
        consumerUid: newUid,
        notifications: existingData?.notifications || [],
        unreadCount: existingData?.unreadCount || 0,
        error: null
      };

    case ActionTypes.SWITCH_CONSUMER:
      const switchUid = action.payload;
      const switchData = state.consumerNotifications[switchUid];
      
      return {
        ...state,
        consumerUid: switchUid,
        notifications: switchData?.notifications || [],
        unreadCount: switchData?.unreadCount || 0,
        error: null,
        isLoading: false
      };

    case ActionTypes.CLEAR_CONSUMER_DATA:
      const uidToClear = action.payload;
      const updatedConsumerNotifications = { ...state.consumerNotifications };
      delete updatedConsumerNotifications[uidToClear];
      
      return {
        ...state,
        consumerNotifications: updatedConsumerNotifications,
        notifications: [],
        unreadCount: 0,
        error: null
      };

    case ActionTypes.REFRESH_NOTIFICATIONS:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    default:
      return state;
  }
};

// Context
const NotificationsContext = createContext();

// Provider Component
export const NotificationsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);

  // Fetch notifications for a specific consumer
  const fetchNotificationsData = useCallback(async (uid, forceRefresh = false) => {
    if (!uid) {
      return;
    }

    // DEMO MODE: If demo user, use demo notifications immediately (skip API)
    if (isDemoUser(uid)) {
      const existingData = state.consumerNotifications[uid];
      const isStale = existingData && (Date.now() - existingData.lastFetchTime > 300000); // 5 minutes

      if (!forceRefresh && existingData && !isStale) {
        dispatch({ type: ActionTypes.SWITCH_CONSUMER, payload: uid });
        return;
      }

      // For demo users, load instantly without loading state or async overhead
      // Use setTimeout(0) to ensure it happens synchronously in the next tick
      const demoNotifications = getDemoNotifications(uid);
      // Dispatch immediately without loading state for instant display
      dispatch({ 
        type: ActionTypes.SET_NOTIFICATIONS, 
        payload: demoNotifications,
        consumerUid: uid
      });
      return;
    }

    // REAL USER: Check if we have recent data (less than 5 minutes old)
    const existingData = state.consumerNotifications[uid];
    const isStale = existingData && (Date.now() - existingData.lastFetchTime > 300000); // 5 minutes

    if (!forceRefresh && existingData && !isStale) {
      dispatch({ type: ActionTypes.SWITCH_CONSUMER, payload: uid });
      return;
    }

    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      // Fetch notifications with pagination (page 1, limit 10 for initial load)
      const result = await fetchNotifications(uid, 1, 10);
      
      if (result.success) {
        const notifications = result.data?.notifications || [];
        
        // Log successful fetches
        if (notifications.length > 0) {
          console.log(`✅ Fetched ${notifications.length} notifications for consumer: ${uid}`);
          console.log(`   Total available: ${result.data?.pagination?.total || notifications.length}`);
        } else {
          console.log(`ℹ️ No notifications found for consumer: ${uid}`);
        }
        
        dispatch({ 
          type: ActionTypes.SET_NOTIFICATIONS, 
          payload: notifications,
          consumerUid: uid
        });
      } else {
        console.error(`❌ Failed to fetch notifications for ${uid}:`, result.message);
        dispatch({ 
          type: ActionTypes.SET_NOTIFICATIONS, 
          payload: [],
          consumerUid: uid
        });
      }
    } catch (error) {
      // Silently handle errors by setting empty notifications
      dispatch({ 
        type: ActionTypes.SET_NOTIFICATIONS, 
        payload: [],
        consumerUid: uid
      });
    }
  }, [state.consumerNotifications]);

  // Set consumer UID and fetch notifications
  const setConsumerUid = useCallback((uid) => {
    if (!uid) {
      return;
    }

    const existingData = state.consumerNotifications[uid];
    
    if (existingData) {
      dispatch({ type: ActionTypes.SWITCH_CONSUMER, payload: uid });
      
      const isStale = Date.now() - existingData.lastFetchTime > 300000; // 5 minutes
      if (isStale) {
        fetchNotificationsData(uid, true);
      }
    } else {
      dispatch({ type: ActionTypes.SET_CONSUMER_UID, payload: uid });
      fetchNotificationsData(uid);
    }
  }, [state.consumerNotifications, fetchNotificationsData]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // DEMO MODE: For demo users, update local state only (no API call)
      if (isDemoUser(state.consumerUid)) {
        dispatch({ type: ActionTypes.MARK_AS_READ, payload: notificationId });
        return { success: true };
      }
      
      // REAL USER: Call API
      const result = await markNotificationAsRead(notificationId);
      
      if (result.success) {
        dispatch({ type: ActionTypes.MARK_AS_READ, payload: notificationId });
      }
      
      return result;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, message: error.message };
    }
  }, [state.consumerUid]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!state.consumerUid) {
      console.warn('No consumer UID available for marking all as read');
      return { success: false, message: 'No consumer UID available' };
    }

    try {
      // DEMO MODE: For demo users, update local state only (no API call)
      if (isDemoUser(state.consumerUid)) {
        dispatch({ type: ActionTypes.MARK_ALL_AS_READ });
        return { success: true };
      }
      
      // REAL USER: Call API
      const result = await markAllNotificationsAsRead(state.consumerUid);
      
      if (result.success) {
        dispatch({ type: ActionTypes.MARK_ALL_AS_READ });
      }
      
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, message: error.message };
    }
  }, [state.consumerUid]);

  // Refresh notifications
  const refreshNotifications = useCallback(() => {
    if (state.consumerUid) {
      fetchNotificationsData(state.consumerUid, true);
    }
  }, [state.consumerUid, fetchNotificationsData]);

  // Clear consumer data
  const clearConsumerData = useCallback((uid) => {
    console.log(`🗑️ Clearing notification data for consumer: ${uid}`);
    dispatch({ type: ActionTypes.CLEAR_CONSUMER_DATA, payload: uid });
  }, []);

  // Auto-refresh notifications every 2 minutes (reduced frequency)
  useEffect(() => {
    if (!state.consumerUid) return;

    const interval = setInterval(() => {
      // Silent auto-refresh - no console logs
      fetchNotificationsData(state.consumerUid, true);
    }, 120000); // 2 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [state.consumerUid, fetchNotificationsData]);

  // Initialize with current user (consumerNumber or identifier - auth may store either)
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const user = await getUser();
        const consumerId = user?.consumerNumber || user?.identifier || user?.uid;

        if (consumerId) {
          setConsumerUid(consumerId);
        }
      } catch (error) {
        // Silently handle initialization errors
      }
    };

    initializeNotifications();
  }, [setConsumerUid]);

  // Context value
  const contextValue = {
    ...state,
    fetchNotifications: fetchNotificationsData,
    setConsumerUid,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    clearConsumerData
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

// Custom hook to use notifications context
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  
  return context;
};

export default NotificationsContext;
