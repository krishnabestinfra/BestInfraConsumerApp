import { Alert, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';

/**
 * Advanced version checking with backend API
 * This is an example of how to implement version checking with your backend
 */

/**
 * Check for binary updates using your backend API
 * Replace the API endpoint with your actual backend
 */
export const checkForBinaryUpdateWithAPI = async () => {
  try {
    const currentVersion = Application.nativeApplicationVersion;
    const packageName = Application.applicationId;
    const platform = Platform.OS;
    
    // Call your backend API to get the latest version
    const response = await fetch('https://your-api.com/api/version-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentVersion,
        packageName,
        platform,
      }),
    });
    
    const data = await response.json();
    
    if (data.hasUpdate && data.forceUpdate) {
      // Force update - show alert that can't be dismissed
      showForceUpdateAlert(packageName, data.updateMessage);
    } else if (data.hasUpdate) {
      // Optional update
      showOptionalUpdateAlert(packageName, data.updateMessage);
    }
  } catch (error) {
    console.error('Error checking for binary update with API:', error);
  }
};

/**
 * Show force update alert (cannot be dismissed)
 */
const showForceUpdateAlert = (packageName, message) => {
  Alert.alert(
    'Update Required',
    message || 'A critical update is available. Please update to continue using the app.',
    [
      {
        text: 'Update Now',
        onPress: () => redirectToStore(packageName),
      },
    ],
    { cancelable: false }
  );
};

/**
 * Show optional update alert
 */
const showOptionalUpdateAlert = (packageName, message) => {
  Alert.alert(
    'Update Available',
    message || 'A new version of the app is available. Would you like to update now?',
    [
      {
        text: 'Later',
        style: 'cancel',
      },
      {
        text: 'Update Now',
        onPress: () => redirectToStore(packageName),
      },
    ],
    { cancelable: false }
  );
};

/**
 * Redirect user to the appropriate app store
 */
const redirectToStore = (packageName) => {
  try {
    let storeUrl;
    
    if (Platform.OS === 'android') {
      // Try to open Play Store app first
      storeUrl = `market://details?id=${packageName}`;
      Linking.openURL(storeUrl).catch(() => {
        // Fallback to web Play Store
        const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
        Linking.openURL(webUrl);
      });
    } else if (Platform.OS === 'ios') {
      // For iOS, you need the App Store ID (not bundle ID)
      // Replace 'YOUR_APP_STORE_ID' with your actual App Store ID
      const appStoreId = 'YOUR_APP_STORE_ID'; // Replace with your App Store ID
      storeUrl = `itms-apps://itunes.apple.com/app/id${appStoreId}`;
      Linking.openURL(storeUrl).catch(() => {
        // Fallback to web App Store
        const webUrl = `https://apps.apple.com/app/id${appStoreId}`;
        Linking.openURL(webUrl);
      });
    }
  } catch (error) {
    console.error('Error redirecting to store:', error);
    Alert.alert('Error', 'Unable to open the app store. Please update manually.');
  }
};

/**
 * Compare version strings (e.g., "1.2.3" vs "1.2.4")
 * Returns: 1 if version1 > version2, -1 if version1 < version2, 0 if equal
 */
export const compareVersions = (version1, version2) => {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
};

/**
 * Example backend API response structure:
 * {
 *   "hasUpdate": true,
 *   "forceUpdate": false,
 *   "latestVersion": "1.2.3",
 *   "updateMessage": "New features and bug fixes available",
 *   "storeUrl": "https://play.google.com/store/apps/details?id=com.bestinfra.app"
 * }
 */
