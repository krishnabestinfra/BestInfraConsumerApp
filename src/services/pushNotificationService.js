/**
 * Push Notification Service
 * Complete service for push notification management
 * - Token registration
 * - Notification handling
 * - In-app notification display
 *
 * expo-notifications is NOT loaded in Expo Go (SDK 53+ removed remote push there).
 * Use a development build for full push support.
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/constants';
import { authService } from './authService';
import { getUser } from '../utils/storage';
import { apiClient } from './apiClient';
import { isDemoUser } from '../constants/demoData';
import { fetchNotifications } from './apiService';
import { isRunningInExpoGo } from '../utils/expoGoDetect';

/** Lazy-load expo-notifications only when NOT in Expo Go (avoids SDK 53 error) */
const getNotifications = () => {
  if (isRunningInExpoGo()) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
};

/** Configure notification behavior — only when Notifications is available */
const setupNotificationHandler = () => {
  const Notifications = getNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

// Notification listeners
let notificationReceivedListener = null;
let notificationResponseListener = null;

// Listeners for in-app BI (NexusOne) test notification card only
let testCardListeners = [];

// BI/NexusOne notification copy (same for in-app card and system notification)
const TEST_NOTIFICATION_TITLE = 'NexusOne';
const TEST_NOTIFICATION_BODY = 'This is a test notification from Best Infra.';

/**
 * Subscribe to show the in-app BI notification card (NexusOne style).
 * Used by PushNotificationHandler. Payload: { title, body?, message?, data? }.
 * @returns {() => void} Unsubscribe function
 */
export const addTestNotificationCardListener = (callback) => {
  testCardListeners.push(callback);
  return () => {
    testCardListeners = testCardListeners.filter((l) => l !== callback);
  };
};

/**
 * Show the in-app BI notification card with the given payload.
 * Payload: { title, body?, message?, data? }. Used for test and for PUSH-channel API notifications.
 */
export const showNotificationCard = (payload) => {
  testCardListeners.forEach((cb) => cb(payload));
};

/**
 * Show the BI (NexusOne) in-app notification card only — no system/Expo notification.
 * Call this from Settings "Test push notification" so the user sees the app's card.
 */
export const showTestNotificationCard = () => {
  showNotificationCard({
    title: TEST_NOTIFICATION_TITLE,
    body: TEST_NOTIFICATION_BODY,
    data: { test: true },
  });
};

// Storage key for IDs of PUSH-channel notifications we've already shown (from API poll)
const PUSH_CHANNEL_SHOWN_IDS_KEY = '@push_channel_shown_ids';
const MAX_STORED_SHOWN_IDS = 200;

// Alert preferences (control which push notification types to show) - from Alerts screen
const ALERT_PREFERENCES_KEY = '@alert_preferences';
const DEFAULT_ALERT_PREFERENCES = {
  billDueReminders: true,
  paymentConfirmations: true,
  billAmountAlerts: true,
  tamperAlerts: true,
  emailNotifications: true,
};

/** API notification type -> Alerts screen toggle key */
const NOTIFICATION_TYPE_TO_PREF = {
  PAYMENT_SUCCESS: 'paymentConfirmations',
  BILL_OVERDUE: 'billDueReminders',
  BILL_DUE_REMINDER: 'billDueReminders',
  TICKET_STATUS_UPDATE: 'ticketUpdates',
  TAMPER: 'tamperAlerts',
  TAMPER_ALERT: 'tamperAlerts',
  BILL_AMOUNT: 'billAmountAlerts',
};

/**
 * Get saved alert preferences (for push notification filtering).
 * @returns {Promise<{ billDueReminders, paymentConfirmations, billAmountAlerts, tamperAlerts, emailNotifications, ticketUpdates? }>}
 */
export const getAlertPreferences = async () => {
  try {
    const raw = await AsyncStorage.getItem(ALERT_PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_ALERT_PREFERENCES, ticketUpdates: true };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ALERT_PREFERENCES, ticketUpdates: true, ...parsed };
  } catch {
    return { ...DEFAULT_ALERT_PREFERENCES, ticketUpdates: true };
  }
};

/**
 * Save alert preferences (call from Alerts screen on Save).
 * @param {Object} prefs - Same shape as getAlertPreferences
 */
export const setAlertPreferences = async (prefs) => {
  try {
    await AsyncStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    if (__DEV__) console.warn('Could not save alert preferences:', e?.message);
  }
};

/**
 * Whether the user has enabled push for this notification type (from Alerts toggles).
 */
const isPushEnabledForType = (type, prefs) => {
  const key = NOTIFICATION_TYPE_TO_PREF[type];
  if (!key) return true;
  return prefs[key] !== false;
};

const getShownPushNotificationIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(PUSH_CHANNEL_SHOWN_IDS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
};

const addShownPushNotificationIds = async (newIds) => {
  try {
    const existing = await getShownPushNotificationIds();
    const combined = [...new Set([...existing, ...newIds.map(String)])];
    const capped = combined.slice(-MAX_STORED_SHOWN_IDS);
    await AsyncStorage.setItem(PUSH_CHANNEL_SHOWN_IDS_KEY, JSON.stringify(capped));
  } catch (e) {
    if (__DEV__) console.warn('Could not save shown push notification ids:', e?.message);
  }
};


/**
 * Get push notification token for this device
 * @returns {Promise<string|null>} Token or null if permission denied
 */
export const getPushToken = async () => {
  try {
    // Expo Go: Push notifications (remote) were removed in SDK 53 — use development build
    if (isRunningInExpoGo()) {
      return null;
    }

    const Notifications = getNotifications();
    if (!Notifications) return null;

    setupNotificationHandler();

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

    // Get token — skipped in Expo Go (SDK 53+ removed remote push there)
    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    } catch (expoGoError) {
      const msg = String(expoGoError?.message ?? '');
      if (msg.includes('Expo Go') || msg.includes('SDK 53') || msg.includes('removed')) {
        return null; // Silently skip — expected in Expo Go
      }
      throw expoGoError;
    }
    
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
    
    const result = await apiClient.request(endpoint, {
      method: 'POST',
      body: requestBody,
    });

    if (!result.success) {
      console.error('❌ Failed to register push token:', { status: result.status, error: result.error });
      return {
        success: false,
        message: result.error || `HTTP ${result.status}`,
        status: result.status,
      };
    }
    console.log('✅ Push token registered successfully');
    return { success: true, data: result.data ?? result.rawBody ?? result };
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
    const Notifications = getNotifications();
    if (Notifications && onNotificationReceived) {
      // Remove existing listener if any
      if (notificationReceivedListener) {
        notificationReceivedListener.remove();
      }
      
      notificationReceivedListener = Notifications.addNotificationReceivedListener(
        onNotificationReceived
      );
    }

    if (Notifications && onNotificationTapped) {
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
    const Notifications = getNotifications();
    if (!Notifications) return null;
    const response = await Notifications.getLastNotificationResponseAsync();
    return response;
  } catch (error) {
    console.error('❌ Error getting last notification response:', error);
    return null;
  }
};

const DEFAULT_CHANNEL_ID = 'nexusone-default';

/**
 * Ensure Android notification channel exists (so notification shows in tray and status bar)
 */
const ensureNotificationChannel = async () => {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return;
  try {
    const Notifications = getNotifications();
    if (!Notifications) return;
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: 'NexusOne Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1f255e',
    });
  } catch (e) {
    console.warn('Could not set notification channel:', e?.message);
  }
};

/**
 * Schedule a system notification for testing (shows in pull bar in 2 seconds).
 * Uses NexusOne/BI title and body. App name & icon in pull bar = "NexusOne" only in a
 * development build; in Expo Go the system shows "Expo Go".
 */
export const scheduleTestNotification = async () => {
  if (isRunningInExpoGo()) {
    throw new Error('System notifications require a development build (not Expo Go)');
  }
  try {
    const Notifications = getNotifications();
    if (!Notifications) throw new Error('Push notifications not available');
    await ensureNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: TEST_NOTIFICATION_TITLE,
        body: TEST_NOTIFICATION_BODY,
        data: { test: true },
        ...(Platform.OS === 'android' && { channelId: DEFAULT_CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
  } catch (error) {
    console.error('❌ Error scheduling test notification:', error);
    throw error;
  }
};

/**
 * Fetch notifications from API, filter those with meta.channels including "PUSH",
 * and show any new ones as in-app card + system notification (pull bar).
 * Call on app foreground and on an interval when app is open.
 */
export const checkAndShowPushChannelNotifications = async () => {
  try {
    const user = await getUser();
    const uid = user?.identifier || user?.consumerNumber || user?.uid;
    if (!uid) return;
    if (isDemoUser(uid)) return;

    const result = await fetchNotifications(uid, 1, 30);
    if (!result.success || !result.data?.notifications?.length) return;

    const notifications = result.data.notifications;
    const pushChannel = notifications.filter(
      (n) => n.meta && Array.isArray(n.meta.channels) && n.meta.channels.includes('PUSH')
    );
    if (pushChannel.length === 0) return;

    const shownIds = await getShownPushNotificationIds();
    const newOnes = pushChannel.filter((n) => !shownIds.includes(String(n.id)));
    if (newOnes.length === 0) return;

    const sorted = [...newOnes].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    const latest = sorted[0];

    const prefs = await getAlertPreferences();
    if (!isPushEnabledForType(latest.type, prefs)) {
      await addShownPushNotificationIds(newOnes.map((n) => n.id));
      if (__DEV__) console.log('📬 Push skipped (alert off):', latest.type);
      return;
    }

    const content = {
      title: latest.title || 'Notification',
      body: latest.message || '',
      data: {
        type: latest.type,
        notificationId: String(latest.id),
        redirect_url: latest.redirect_url || '',
      },
      ...(Platform.OS === 'android' && { channelId: DEFAULT_CHANNEL_ID }),
    };

    if (!isRunningInExpoGo()) {
      await ensureNotificationChannel();
      const Notifications = getNotifications();
      if (Notifications) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: null,
        });
      }
    }
    showNotificationCard({
      title: latest.title || 'Notification',
      body: latest.message || '',
      data: content.data,
    });
    await addShownPushNotificationIds(newOnes.map((n) => n.id));
    if (__DEV__) {
      console.log('📬 Shown PUSH-channel notification:', latest.id, latest.type);
    }
  } catch (e) {
    if (__DEV__) console.warn('checkAndShowPushChannelNotifications:', e?.message);
  }
};

/**
 * Test push notification: show BI in-app card now + schedule system notification in 2s.
 * In Expo Go, only the in-app card is shown (system notifications require a dev build).
 */
export const sendTestPushNotification = () => {
  showTestNotificationCard();
  if (isRunningInExpoGo()) return;
  scheduleTestNotification().catch((e) => console.warn('Schedule test failed:', e?.message));
};
