/**
 * Authentication Helper Functions
 * 
 * Utility functions for testing and managing authentication state
 */

import { authService } from '../services/authService';
import { logoutUser, clearStorage } from './storage';
import { clearAllCache } from './cacheManager';

/**
 * Force logout and clear all authentication data
 * Useful for testing login flow or forcing re-authentication
 */
export const forceLogout = async () => {
  try {
    console.log('🔄 Forcing logout...');
    
    // Use authService logout which handles server-side token revocation
    await authService.logout();
    
    // Clear all cached data
    await clearAllCache();
    
    console.log('✅ Force logout completed - all tokens and data cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Error during force logout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear all authentication data without calling server
 * Useful for development/testing when you want to clear local data only
 */
export const clearAuthData = async () => {
  try {
    console.log('🔄 Clearing authentication data...');
    
    // Clear tokens
    await authService.clearTokens();
    
    // Clear user data
    await authService.clearUser();
    
    // Clear all cached data
    await clearAllCache();
    
    console.log('✅ Authentication data cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get the current access token
 * @param {boolean} includeFullToken - If true, returns full token; if false, returns masked version
 * @returns {Promise<string|null>} The access token or null if not available
 */
export const getAccessToken = async (includeFullToken = false) => {
  try {
    const token = await authService.getAccessToken();
    if (!token) return null;
    
    if (includeFullToken) {
      return token;
    } else {
      // Return masked version for logging
      return token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : null;
    }
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    return null;
  }
};

/**
 * Get the current valid access token (will refresh if expired)
 * @param {boolean} includeFullToken - If true, returns full token; if false, returns masked version
 * @returns {Promise<string|null>} The valid access token or null if not available
 */
export const getValidAccessToken = async (includeFullToken = false) => {
  try {
    const token = await authService.getValidAccessToken();
    if (!token) return null;
    
    if (includeFullToken) {
      return token;
    } else {
      // Return masked version for logging
      return token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : null;
    }
  } catch (error) {
    console.error('❌ Error getting valid access token:', error);
    return null;
  }
};

/**
 * Check current authentication status
 */
export const checkAuthStatus = async () => {
  try {
    const isAuth = await authService.isAuthenticated();
    const accessToken = await authService.getAccessToken();
    const refreshToken = await authService.getRefreshToken();
    const isExpired = await authService.isAccessTokenExpired();
    
    return {
      isAuthenticated: isAuth,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      isAccessTokenExpired: isExpired,
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}` : null,
    };
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
    return {
      isAuthenticated: false,
      hasAccessToken: false,
      hasRefreshToken: false,
      isAccessTokenExpired: true,
      error: error.message,
    };
  }
};

export default {
  forceLogout,
  clearAuthData,
  checkAuthStatus,
  getAccessToken,
  getValidAccessToken,
};

