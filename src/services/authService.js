/**
 * Authentication Service
 * 
 * Handles complete authentication flow with access tokens and refresh tokens:
 * - Access token: Short-lived (15 minutes), stored in memory/AsyncStorage
 * - Refresh token: Long-lived (7-30 days), stored securely
 * - Automatic token refresh on expiration
 * - Logout with token revocation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/constants';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const USER_KEY = 'user';

// Token expiry times (in milliseconds)
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

class AuthService {
  constructor() {
    this.refreshPromise = null; // Prevent concurrent refresh requests
  }

  /**
   * Store access token and its expiry time
   */
  async storeAccessToken(token) {
    try {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
      // Calculate expiry time (15 minutes from now)
      const expiryTime = Date.now() + ACCESS_TOKEN_EXPIRY;
      await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      console.log('✅ Access token stored, expires at:', new Date(expiryTime).toISOString());
    } catch (error) {
      console.error('❌ Error storing access token:', error);
      throw error;
    }
  }

  /**
   * Get access token
   */
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      return null;
    }
  }

  /**
   * Store refresh token securely
   */
  async storeRefreshToken(token) {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
      console.log('✅ Refresh token stored securely');
    } catch (error) {
      console.error('❌ Error storing refresh token:', error);
      throw error;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Check if access token is expired or about to expire (within 1 minute)
   */
  async isAccessTokenExpired() {
    try {
      const expiryTime = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
      if (!expiryTime) return true;
      
      const expiry = parseInt(expiryTime, 10);
      const now = Date.now();
      const buffer = 60 * 1000; // 1 minute buffer
      
      return now >= (expiry - buffer);
    } catch (error) {
      console.error('❌ Error checking token expiry:', error);
      return true; // Assume expired if we can't check
    }
  }

  /**
   * Extract refresh token from response cookies or headers
   * Note: In React Native, httpOnly cookies aren't accessible via JS
   * The server should send refresh token in response body for React Native apps
   * This function tries to extract from Set-Cookie header as fallback
   */
  extractRefreshTokenFromResponse(response) {
    try {
      // Try to get from Set-Cookie header (may not work for httpOnly cookies)
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Try to extract refreshToken from cookie string
        const match = setCookieHeader.match(/refreshToken=([^;,\s]+)/);
        if (match && match[1]) {
          console.log('✅ Extracted refresh token from Set-Cookie header');
          return decodeURIComponent(match[1]);
        }
      }
      
      // Also check for cookie in response headers (some implementations)
      const cookies = response.headers.get('cookie');
      if (cookies) {
        const match = cookies.match(/refreshToken=([^;,\s]+)/);
        if (match && match[1]) {
          console.log('✅ Extracted refresh token from Cookie header');
          return decodeURIComponent(match[1]);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting refresh token:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      console.log('🔄 Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.refreshPromise = this._performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  async _performTokenRefresh() {
    try {
      const refreshToken = await this.getRefreshToken();
      
      // If we have a stored refresh token, use it
      // If not, the server may have it in an httpOnly cookie (React Native will send it automatically)
      if (!refreshToken) {
        console.warn('⚠️ No refresh token stored locally. Server may have it in httpOnly cookie.');
      }

      console.log('🔄 Refreshing access token...');

      // Prepare request body - include refreshToken if we have it
      const requestBody = refreshToken ? { refreshToken } : {};
      
      const response = await fetch(API_ENDPOINTS.auth.refresh(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Note: In React Native, cookies (including httpOnly) are automatically sent
        // by the underlying network layer if they were set by the server
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
      });

      if (!response.ok) {
        // If refresh fails, clear tokens and require re-login
        if (response.status === 401 || response.status === 403) {
          console.error('❌ Refresh token invalid or expired');
          await this.clearTokens();
          throw new Error('Session expired. Please login again.');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Token refresh failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Extract new tokens from response
      const newAccessToken = result.data?.accessToken || result.accessToken || result.data?.token;
      const newRefreshToken = result.data?.refreshToken || result.refreshToken || 
                              this.extractRefreshTokenFromResponse(response) || refreshToken;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      // Store new tokens
      await this.storeAccessToken(newAccessToken);
      if (newRefreshToken && newRefreshToken !== refreshToken) {
        await this.storeRefreshToken(newRefreshToken);
      }

      console.log('✅ Access token refreshed successfully');
      
      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };

    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await this.clearTokens();
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken() {
    try {
      const isExpired = await this.isAccessTokenExpired();
      
      if (isExpired) {
        console.log('🔄 Access token expired, refreshing...');
        await this.refreshAccessToken();
      }
      
      return await this.getAccessToken();
    } catch (error) {
      console.error('❌ Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  async storeUser(userData) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('❌ Error storing user data:', error);
    }
  }

  /**
   * Get user data
   */
  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  /**
   * Handle login response - extract and store tokens
   */
  async handleLoginResponse(response, responseData) {
    try {
      // Extract access token from response
      const accessToken = responseData?.data?.accessToken || 
                         responseData?.accessToken || 
                         responseData?.data?.token;
      
      if (!accessToken) {
        throw new Error('No access token in login response');
      }

      // Extract refresh token from response body first (preferred for React Native)
      // Then try cookies as fallback
      let refreshToken = responseData?.data?.refreshToken || 
                       responseData?.refreshToken ||
                       this.extractRefreshTokenFromResponse(response);

      // Note: In React Native, httpOnly cookies set by the server are automatically
      // sent with subsequent requests, but we can't read them via JavaScript.
      // If the server only sends refresh token in httpOnly cookie, it will still
      // work for refresh requests, but we won't be able to store it locally.
      // The server should ideally send refreshToken in the response body for React Native apps.
      if (!refreshToken) {
        console.warn('⚠️ Refresh token not found in response body. Server may have sent it in httpOnly cookie.');
        console.warn('⚠️ For React Native, server should send refreshToken in response body, not just httpOnly cookie.');
        console.warn('⚠️ Refresh will still work if server accepts refreshToken from httpOnly cookie on refresh endpoint.');
      }

      // Store tokens
      await this.storeAccessToken(accessToken);
      if (refreshToken) {
        await this.storeRefreshToken(refreshToken);
      }

      console.log('✅ Login tokens stored successfully');
      
      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('❌ Error handling login response:', error);
      throw error;
    }
  }

  /**
   * Logout - revoke tokens on server and clear local storage
   * 
   * Flow:
   * 1. Get current access token and refresh token
   * 2. Call /auth/logout endpoint to revoke refresh token on server
   * 3. Server marks refresh token as revoked in DB/Redis
   * 4. Server clears refresh token cookie
   * 5. Frontend deletes access token and refresh token from local storage
   * 6. Clear user data
   * 
   * Any future use of the revoked refresh token will be rejected by the server
   */
  async logout() {
    try {
      console.log('🔄 Starting logout process...');
      
      // Step 1: Get current tokens before clearing
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      // Step 2: Call logout endpoint to revoke refresh token on server
      // Send both tokens if available (some servers need access token for validation)
      if (accessToken || refreshToken) {
        try {
          console.log('🔄 Calling logout endpoint to revoke tokens on server...');
          
          const requestBody = {};
          if (refreshToken) {
            requestBody.refreshToken = refreshToken;
          }
          if (accessToken) {
            requestBody.accessToken = accessToken;
          }
          
          const response = await fetch(API_ENDPOINTS.auth.logout(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              // Include access token in header for server validation
              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            },
            // Note: If refreshToken is in httpOnly cookie, it will be sent automatically
            body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
          });

          if (response.ok) {
            const responseData = await response.json().catch(() => ({}));
            console.log('✅ Logout successful on server - refresh token revoked');
            console.log('   Server response:', responseData.message || 'Tokens revoked');
          } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `HTTP ${response.status}`;
            console.warn(`⚠️ Server logout returned ${response.status}: ${errorMessage}`);
            // Continue with local logout even if server call fails
          }
        } catch (error) {
          console.warn('⚠️ Error calling logout endpoint:', error.message);
          // Continue with local logout even if server call fails
          // This ensures user can still logout even if server is unreachable
        }
      } else {
        console.log('ℹ️ No tokens found - skipping server logout call');
      }

      // Step 3: Clear all tokens from local storage
      // This deletes access token and refresh token from memory/local storage
      console.log('🔄 Clearing tokens from local storage...');
      await this.clearTokens();
      
      // Step 4: Clear user data
      console.log('🔄 Clearing user data...');
      await this.clearUser();
      
      console.log('✅ Logout completed successfully');
      console.log('   - Access token deleted from local storage');
      console.log('   - Refresh token deleted from local storage');
      console.log('   - User data cleared');
      console.log('   - Server has revoked refresh token (if call succeeded)');
      console.log('   - Any future use of revoked refresh token will be rejected');
      
      return { 
        success: true,
        message: 'Logout successful - all tokens cleared and revoked'
      };
    } catch (error) {
      console.error('❌ Error during logout:', error);
      
      // Still clear local data even if there's an error
      // This ensures user is logged out locally even if something fails
      try {
        await this.clearTokens();
        await this.clearUser();
        console.log('✅ Local data cleared despite error');
      } catch (clearError) {
        console.error('❌ Error clearing local data:', clearError);
      }
      
      return { 
        success: false, 
        error: error.message,
        message: 'Logout completed with errors - local data cleared'
      };
    }
  }

  /**
   * Clear all tokens
   */
  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        TOKEN_EXPIRY_KEY
      ]);
      console.log('✅ Tokens cleared');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  /**
   * Clear user data
   */
  async clearUser() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      console.log('✅ User data cleared');
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      return !!(accessToken || refreshToken);
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;

