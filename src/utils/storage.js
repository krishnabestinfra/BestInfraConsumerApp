// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllCache } from './cacheManager';
import { API_ENDPOINTS } from '../constants/constants';

export const storeUser = async (user) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  } catch (e) {
    // Silent error handling for production
  }
};

export const getUser = async () => {
  try {
    const userData = await AsyncStorage.getItem('user');
    return userData != null ? JSON.parse(userData) : { name: "Guest" };
  } catch (e) {
    return { name: "Guest" };
  }
};

export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem('token', token);
  } catch (e) {
    // Silent error handling for production
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (e) {
    return null;
  }
};

export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    // Clear all cached consumer data on logout
    await clearAllCache();
  } catch (e) {
    // Silent error handling for production
  }
};

export const isUserLoggedIn = async () => {
  try {
    const token = await getToken();
    const user = await getUser();
    return !!(token && user && user.name);
  } catch (e) {
    return false;
  }
};

// Helper function to extract consumer name from API response
export const extractConsumerInfo = (apiResponse, identifier) => {
  const consumerInfo = apiResponse?.data?.user || apiResponse?.data || apiResponse;
  
  // Ensure we never use identifier as name - only use actual names
  const consumerName = consumerInfo?.name || consumerInfo?.consumerName;
  
  return {
    name: consumerName || "Consumer", // Fallback to "Consumer" instead of identifier
    identifier: consumerInfo?.identifier || consumerInfo?.consumerNumber || identifier,
    email: consumerInfo?.emailId || consumerInfo?.email || "",
    consumerNumber: consumerInfo?.consumerNumber || identifier,
    meterSerialNumber: consumerInfo?.meterSerialNumber,
    uniqueIdentificationNo: consumerInfo?.uniqueIdentificationNo,
    totalOutstanding: consumerInfo?.totalOutstanding,
    // Add other relevant fields as needed
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
