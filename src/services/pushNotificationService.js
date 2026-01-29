/**
 * Push Notification Service
 * Simple service to get push notification token
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Show notifications even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Push notification permission denied');
      return null;
    }

    // Get project ID from app.json
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('❌ Project ID not found');
      return null;
    }

    // Get token
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    
    console.log('✅ Push token obtained');
    return token;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
};
