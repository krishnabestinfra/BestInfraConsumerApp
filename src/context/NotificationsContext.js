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

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/apiService';
import { getUser } from '../utils/storage';
import { isDemoUser, getDemoNotifications } from '../constants/demoData';

const MIN_FETCH_INTERVAL_MS = 15000; // Don't start a new fetch if last one was < 15s ago (stops call storms)

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
  const stateRef = useRef(state);
  const lastFetchTimeRef = useRef(0);

  stateRef.current = state;

  // Stable fetch: read state from ref so callback identity doesn't change on every state update.
  // That stops consumers' useEffects from re-running and calling refresh in a loop.
  const fetchNotificationsData = useCallback(async (uid, forceRefresh = false) => {
    if (!uid) return;

    const currentState = stateRef.current;

    if (isDemoUser(uid)) {
      const existingData = currentState.consumerNotifications[uid];
      const isStale = existingData && (Date.now() - existingData.lastFetchTime > 300000);
      if (!forceRefresh && existingData && !isStale) {
        dispatch({ type: ActionTypes.SWITCH_CONSUMER, payload: uid });
        return;
      }
      const demoNotifications = getDemoNotifications(uid);
      dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: demoNotifications, consumerUid: uid });
      return;
    }

    const existingData = currentState.consumerNotifications[uid];
    const isStale = existingData && (Date.now() - existingData.lastFetchTime > 300000);
    if (!forceRefresh && existingData && !isStale) {
      dispatch({ type: ActionTypes.SWITCH_CONSUMER, payload: uid });
      return;
    }

    // Throttle: avoid call storms when many components request refresh
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL_MS) {
      return;
    }
    lastFetchTimeRef.current = now;

    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      const result = await fetchNotifications(uid, 1, 10);
      const hasExistingList = stateRef.current.notifications.length > 0;

      if (result.success) {
        const notifications = result.data?.notifications || [];
        if (notifications.length > 0) {
          if (__DEV__) {
            console.log(`✅ Fetched ${notifications.length} notifications for consumer: ${uid}`);
          }
          dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: notifications, consumerUid: uid });
        } else {
          if (forceRefresh && hasExistingList) {
            dispatch({ type: ActionTypes.SET_ERROR, payload: result.message || 'Could not refresh notifications.' });
          } else {
            dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: [], consumerUid: uid });
          }
        }
      } else {
        if (forceRefresh && hasExistingList) {
          dispatch({ type: ActionTypes.SET_ERROR, payload: result.message || 'Could not refresh notifications.' });
        } else {
          dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: [], consumerUid: uid });
        }
      }
    } catch (error) {
      if (stateRef.current.notifications.length > 0) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error?.message || 'Could not refresh notifications.' });
      } else {
        dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: [], consumerUid: uid });
      }
    }
  }, []);

  const setConsumerUid = useCallback((uid) => {
    if (!uid) return;
    const currentState = stateRef.current;
    const existingData = currentState.consumerNotifications[uid];
    if (existingData) {
      dispatch({ type: ActionTypes.SWITCH_CONSUMER, payload: uid });
      const isStale = Date.now() - existingData.lastFetchTime > 300000;
      if (isStale) setTimeout(() => fetchNotificationsData(uid, true), 0);
    } else {
      dispatch({ type: ActionTypes.SET_CONSUMER_UID, payload: uid });
      setTimeout(() => fetchNotificationsData(uid), 0);
    }
  }, [fetchNotificationsData]);

  const markAsRead = useCallback(async (notificationId) => {
    const consumerUid = stateRef.current.consumerUid;
    try {
      if (isDemoUser(consumerUid)) {
        dispatch({ type: ActionTypes.MARK_AS_READ, payload: notificationId });
        return { success: true };
      }
      const result = await markNotificationAsRead(notificationId);
      if (result.success) dispatch({ type: ActionTypes.MARK_AS_READ, payload: notificationId });
      return result;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, message: error.message };
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const consumerUid = stateRef.current.consumerUid;
    if (!consumerUid) return { success: false, message: 'No consumer UID' };
    try {
      if (isDemoUser(consumerUid)) {
        dispatch({ type: ActionTypes.MARK_ALL_AS_READ });
        return { success: true };
      }
      const result = await markAllNotificationsAsRead(consumerUid);
      if (result.success) dispatch({ type: ActionTypes.MARK_ALL_AS_READ });
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, message: error.message };
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    const uid = stateRef.current.consumerUid;
    if (uid) fetchNotificationsData(uid, true);
  }, [fetchNotificationsData]);

  const clearConsumerData = useCallback((uid) => {
    if (__DEV__) console.log(`🗑️ Clearing notification data for consumer: ${uid}`);
    dispatch({ type: ActionTypes.CLEAR_CONSUMER_DATA, payload: uid });
  }, []);

  useEffect(() => {
    if (!state.consumerUid) return;
    const interval = setInterval(() => fetchNotificationsData(state.consumerUid, true), 120000);
    return () => clearInterval(interval);
  }, [state.consumerUid, fetchNotificationsData]);

  // Initialize once on mount so setConsumerUid isn't re-triggered by dependency churn
  const initRanRef = useRef(false);
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;
    let mounted = true;
    getUser()
      .then((user) => {
        if (!mounted) return;
        const consumerId = user?.consumerNumber || user?.identifier || user?.uid;
        if (consumerId) setConsumerUid(consumerId);
      })
      .catch(() => {});
    return () => { mounted = false; };
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
