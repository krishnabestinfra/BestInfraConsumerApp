// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllCache } from './cacheManager';
import { API_ENDPOINTS } from '../constants/constants';
import { authService } from '../services/authService';

// Legacy token functions - now use authService
export const storeToken = async (token) => {
  try {
    await authService.storeAccessToken(token);
  } catch (e) {
    // Silent error handling for production
  }
};

export const getToken = async () => {
  try {
    // Get valid token (refresh if needed)
    return await authService.getValidAccessToken();
  } catch (e) {
    return null;
  }
};

// User storage functions
export const storeUser = async (user) => {
  try {
    await authService.storeUser(user);
  } catch (e) {
    // Silent error handling for production
  }
};

export const getUser = async () => {
  try {
    const user = await authService.getUser();
    return user || { name: "Guest" };
  } catch (e) {
    return { name: "Guest" };
  }
};

// Logout function - now uses authService
export const logoutUser = async () => {
  try {
    // Use authService logout which handles server-side token revocation
    await authService.logout();
    // Clear all cached consumer data on logout
    await clearAllCache();
  } catch (e) {
    // Silent error handling for production
  }
};

// Export clearStorage as an alias for logoutUser
export const clearStorage = logoutUser;

export const isUserLoggedIn = async () => {
  try {
    // Use authService to check authentication
    const isAuth = await authService.isAuthenticated();
    const user = await getUser();
    return !!(isAuth && user && user.name);
  } catch (e) {
    return false;
  }
};

// Helper function to extract consumer info from API response (login or verify-otp)
// Supports both password-login and OTP-login response shapes so dashboard gets same consumer data
// OTP/auth response may use data.user.username (consumer UID) and firstName/lastName for name
export const extractConsumerInfo = (apiResponse, fallbackIdentifier) => {
  const raw = apiResponse?.data || apiResponse;
  const consumerInfo =
    raw?.user ||
    raw?.consumer ||
    raw?.data ||
    raw;
  const fallback = fallbackIdentifier || consumerInfo?.email || "";

  // Name: support firstName+lastName (OTP/auth user shape) and name/consumerName (consumer shape)
  const nameFromFirstLast =
    [consumerInfo?.firstName, consumerInfo?.lastName].filter(Boolean).join(" ").trim() || null;
  const consumerName =
    consumerInfo?.name ||
    consumerInfo?.consumerName ||
    nameFromFirstLast;

  const meterId =
    consumerInfo?.meterId ||
    consumerInfo?.meter?.id ||
    consumerInfo?.meter?.meterId ||
    consumerInfo?.meterId ||
    consumerInfo?.id ||
    null;

  // Identifier: support username (OTP/auth response) and identifier/uniqueIdentificationNo/consumerNumber
  const identifier =
    consumerInfo?.identifier ||
    consumerInfo?.username ||
    consumerInfo?.uniqueIdentificationNo ||
    consumerInfo?.consumerNumber ||
    raw?.identifier ||
    raw?.uniqueIdentificationNo ||
    raw?.consumerNumber ||
    fallback;

  return {
    name: consumerName || "Consumer",
    identifier,
    email: consumerInfo?.emailId || consumerInfo?.email || "",
    consumerNumber: consumerInfo?.consumerNumber || consumerInfo?.uniqueIdentificationNo || identifier,
    meterSerialNumber: consumerInfo?.meterSerialNumber,
    meterId,
    uniqueIdentificationNo: consumerInfo?.uniqueIdentificationNo || identifier,
    totalOutstanding: consumerInfo?.totalOutstanding,
  };
};

// Helper function to test consumer authentication
export const testConsumerAuth = async (identifier, password, apiUrl) => {
  try {
    console.log(`🧪 Testing authentication for consumer: ${identifier}`);
    
    const response = await fetch(API_ENDPOINTS.auth.login(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        // Match working backend contract: identifier + password
        identifier: identifier.trim(),
        password: password.trim()
      })
    });

    const result = await response.json();
    
    return {
      success: response.ok && result.success,
      status: response.status,
      data: result,
      error: response.ok ? null : result.message || `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
};

// Helper function to validate if a string is a consumer name (not a UID)
export const isValidConsumerName = (name) => {
  if (!name || typeof name !== 'string') return false;
  // Check if it's not a UID pattern (BI25GMRA followed by numbers)
  return !name.match(/^BI25GMRA\d+$/);
};

// Helper function to get consistent consumer display name
export const getConsumerDisplayName = (consumerData, userName, isLoading = false) => {
  if (isLoading) {
    return "Loading...";
  }
  
  // Priority order: consumerData.name > consumerData.consumerName > valid userName > fallback
  const apiName = consumerData?.name || consumerData?.consumerName;
  const validStoredName = userName && isValidConsumerName(userName) ? userName : null;
  
  return apiName || validStoredName || "Consumer";
};

// Helper function to clean up stored user data and remove UIDs from name field
export const cleanupStoredUserData = async () => {
  try {
    const user = await getUser();
    if (user && user.name && !isValidConsumerName(user.name)) {
      // If stored name is a UID, replace it with a generic name
      const cleanedUser = {
        ...user,
        name: "Consumer"
      };
      await storeUser(cleanedUser);
      console.log("✅ Cleaned up stored user data - removed UID from name field");
    }
  } catch (error) {
    console.error("Error cleaning up stored user data:", error);
  }
};
