import { Alert, Linking, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

/**
 * Check for app updates (both binary and OTA updates)
 * This function handles both Play Store/App Store binary updates and OTA updates
 */
export const checkForAppUpdates = async () => {
  try {
    // Only run in production builds
    if (!__DEV__) {
      await checkForOTAUpdate();
      await checkForBinaryUpdate();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
};

/**
 * Check for Over-the-Air (OTA) updates using expo-updates
 */
const checkForOTAUpdate = async () => {
  try {
    // Check if updates are available
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      // Show alert for OTA update
      Alert.alert(
        'Update Available',
        'A new version of the app is available. Would you like to restart to update now?',
        [
          {
            text: 'Later',
            style: 'cancel',
          },
          {
            text: 'Restart to Update',
            onPress: async () => {
              try {
                // Download and apply the update
                await Updates.fetchUpdateAsync();
                // Reload the app with the new update
                await Updates.reloadAsync();
              } catch (error) {
                console.error('Error applying OTA update:', error);
                Alert.alert('Update Failed', 'Failed to apply the update. Please try again later.');
              }
            },
          },
        ],
        { cancelable: false }
      );
    }
  } catch (error) {
    console.error('Error checking for OTA update:', error);
  }
};

/**
 * Check for binary updates (Play Store / App Store)
 * This is a simplified version - in production, you might want to use a service
 * to check the latest version from the store APIs
 */
const checkForBinaryUpdate = async () => {
  try {
    const currentVersion = Application.nativeApplicationVersion;
    const packageName = Application.applicationId;
    
    // In a real implementation, you would:
    // 1. Call your backend API to get the latest version from store
    // 2. Compare with current version
    // 3. Show update alert if newer version is available
    
    // For demonstration, we'll show how to redirect to store
    // You should implement your own version checking logic here
    
    // Example: Check if update is needed (replace with your logic)
    const needsUpdate = false; // Replace with actual version comparison
    
    if (needsUpdate) {
      showBinaryUpdateAlert(packageName);
    }
  } catch (error) {
    console.error('Error checking for binary update:', error);
  }
};

/**
 * Show alert for binary update and redirect to store
 */
const showBinaryUpdateAlert = (packageName) => {
  Alert.alert(
    'Update Available',
    'A new version of the app is available on the store. Would you like to update now?',
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
 * Get current app version information
 */
export const getAppVersionInfo = () => {
  return {
    version: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,
    applicationId: Application.applicationId,
    isDevice: Constants.isDevice,
    platform: Platform.OS,
  };
};

/**
 * Force check for updates (useful for manual refresh)
 */
export const forceCheckForUpdates = async () => {
  try {
    if (__DEV__) {
      Alert.alert('Development Mode', 'Update checking is disabled in development mode.');
      return;
    }

    // Check for OTA updates
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      Alert.alert(
        'Update Available',
        'A new version is available. Would you like to download and install it now?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Update Now',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (error) {
                console.error('Error applying update:', error);
                Alert.alert('Update Failed', 'Failed to apply the update. Please try again later.');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('No Updates', 'You are using the latest version of the app.');
    }
  } catch (error) {
    console.error('Error force checking for updates:', error);
    Alert.alert('Error', 'Unable to check for updates. Please try again later.');
  }
};

/**
 * Check if the app is running the latest update
 */
export const isRunningLatestUpdate = async () => {
  try {
    const update = await Updates.checkForUpdateAsync();
    return !update.isAvailable;
  } catch (error) {
    console.error('Error checking if running latest update:', error);
    return true; // Assume latest if we can't check
  }
};
