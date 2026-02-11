/**
 * Push Notification Service
 * Complete service for push notification management
 * - Token registration
 * - Notification handling
 * - In-app notification display
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_ENDPOINTS } from '../constants/constants';
import { authService } from './authService';
import { getUser } from '../utils/storage';
import { isDemoUser } from '../constants/demoData';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification listeners
let notificationReceivedListener = null;
let notificationResponseListener = null;

/**
 * Get push notification token for this device
 * @returns {Promise<string|null>} Token or null if permission denied
 */
export const getPushToken = async () => {
  try {
    // Only works on real devices
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications only work on physical devices');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('⚠️ Push notification permission denied');
      return null;
    }

    // Get project ID from app.json or Constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                      Constants.expoConfig?.extra?.projectId;
    
    if (!projectId) {
      console.error('❌ Project ID not found in app.json');
      return null;
    }

    // Get token - handle different response formats
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    
    // Extract token - can be tokenData.data or tokenData directly
    const token = tokenData?.data || tokenData;
    
    if (!token || typeof token !== 'string') {
      console.error('❌ Invalid token format received:', tokenData);
      return null;
    }
    
    // Validate token format (should start with ExponentPushToken[)
    if (!token.startsWith('ExponentPushToken[')) {
      console.error('❌ Token does not match expected format:', token.substring(0, 50));
      return null;
    }
    
    // Log full token in development, truncated in production
    if (__DEV__) {
      console.log('✅ Push token obtained (full):', token);
    } else {
      console.log('✅ Push token obtained:', token.substring(0, 30) + '...');
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
};

/**
 * Register push token with backend API
 * @param {string} token - Expo push token
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const registerPushToken = async (token) => {
  try {
    if (!token) {
      return { success: false, message: 'No push token available' };
    }

    // Get user data to include consumer identifier
    const user = await getUser();
    if (!user || !user.identifier) {
      return { success: false, message: 'User not logged in' };
    }

    // For demo users, completely skip backend registration so that
    // no real API calls or 404 errors are triggered.
    if (isDemoUser(user.identifier)) {
      console.log('🟡 Demo user detected - skipping push token registration for', user.identifier);
      return { success: true, message: 'Demo user - push token registration skipped', demo: true };
    }

    // Get access token
    const accessToken = await authService.getValidAccessToken();
    if (!accessToken) {
      return { success: false, message: 'Authentication required' };
    }

    // Use the correct endpoint - /notifications (POST)
    const endpoint = API_ENDPOINTS.notifications.registerPushToken();

    // Validate token format before sending
    if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
      console.error('❌ Invalid push token format:', token);
      return { success: false, message: 'Invalid push token format' };
    }

    const requestBody = {
      pushToken: token,
      deviceId: Device.modelName || 'unknown',
      platform: Platform.OS,
      consumerUid: user.identifier,
    };

    console.log(`🔄 Registering push token at: ${endpoint}`);
    if (__DEV__) {
      console.log(`   Full push token:`, token);
      console.log(`   Request body:`, requestBody);
    } else {
      console.log(`   Push token:`, token.substring(0, 30) + '...');
      console.log(`   Request body:`, { ...requestBody, pushToken: token.substring(0, 30) + '...' });
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to register push token:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return { 
        success: false, 
        message: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      };
    }

    const result = await response.json();
    console.log('✅ Push token registered successfully');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Initialize push notifications
 * - Gets token
 * - Registers with backend
 * - Sets up listeners
 * @param {Function} onNotificationReceived - Callback when notification received
 * @param {Function} onNotificationTapped - Callback when notification tapped
 * @returns {Promise<{success: boolean, token?: string}>}
 */
export const initializePushNotifications = async (
  onNotificationReceived = null,
  onNotificationTapped = null
) => {
  try {
    // Get push token
    const token = await getPushToken();
    if (!token) {
      return { success: false, message: 'Could not get push token' };
    }

    // Register with backend
    const registerResult = await registerPushToken(token);
    if (!registerResult.success) {
      console.warn('⚠️ Failed to register push token with backend:', registerResult.message);
      // Continue anyway - token is still valid for Expo push notifications
    }

    // Set up notification listeners
    if (onNotificationReceived) {
      // Remove existing listener if any
      if (notificationReceivedListener) {
        notificationReceivedListener.remove();
      }
      
      notificationReceivedListener = Notifications.addNotificationReceivedListener(
        onNotificationReceived
      );
    }

    if (onNotificationTapped) {
      // Remove existing listener if any
      if (notificationResponseListener) {
        notificationResponseListener.remove();
      }
      
      notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
        onNotificationTapped
      );
    }

    console.log('✅ Push notifications initialized');
    return { success: true, token };
  } catch (error) {
    console.error('❌ Error initializing push notifications:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Clean up notification listeners
 */
export const cleanupPushNotifications = () => {
  if (notificationReceivedListener) {
    notificationReceivedListener.remove();
    notificationReceivedListener = null;
  }
  
  if (notificationResponseListener) {
    notificationResponseListener.remove();
    notificationResponseListener = null;
  }
};

/**
 * Get last notification response (when app opened from notification)
 * @returns {Promise<Notifications.NotificationResponse|null>}
 */
export const getLastNotificationResponse = async () => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response;
  } catch (error) {
    console.error('❌ Error getting last notification response:', error);
    return null;
  }
};

/**
 * Schedule a local notification (for testing)
 */
export const scheduleTestNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test push notification from NexusOne",
        data: { test: true },
      },
      trigger: { seconds: 2 },
    });
  } catch (error) {
    console.error('❌ Error scheduling test notification:', error);
  }
};
