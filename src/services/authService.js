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
import { getItem as secureGet, setItem as secureSet, removeItem as secureRemove, multiRemove as secureMultiRemove } from '../utils/secureStorage';
import { API_ENDPOINTS } from '../constants/constants';
import { apiClient } from './apiClient';
import { setTenantSubdomain } from '../config/apiConfig';
import { isDemoUser } from '../constants/demoData';

// Token storage keys (sensitive → stored via secureStorage when available)
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const USER_KEY = 'user';
const REMEMBER_ME_KEY = 'remember_me';
const CLIENT_SUBDOMAIN_KEY = 'client_subdomain';

// Token expiry times (in milliseconds)
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

class AuthService {
  constructor() {
    this.refreshPromise = null; // Prevent concurrent refresh requests

    // Try to restore previously selected tenant (subdomain) from storage on app start (fire-and-forget)
    AsyncStorage.getItem(CLIENT_SUBDOMAIN_KEY)
      .then((storedSubdomain) => {
        if (storedSubdomain) {
          setTenantSubdomain(storedSubdomain);
          console.log('✅ Restored tenant subdomain from storage:', storedSubdomain);
        }
      })
      .catch((error) => {
        console.error('❌ Error restoring tenant subdomain from storage:', error);
      });
  }

  /** Derive tenant from user identifier. BI26NTPA* = ntpl, else gmr. */
  _deriveTenantFromIdentifier(identifier) {
    const id = (identifier || '').toString().toUpperCase();
    return id.startsWith('BI26NTPA') ? 'ntpl' : 'gmr';
  }

  /**
   * Ensure tenant subdomain is set before any API fetch. Call from SplashScreen before refreshConsumer.
   * Prioritizes identifier-based derivation so NTPL user (BI26NTPA*) always gets ntpl even if storage had gmr.
   */
  async restoreTenantBeforeFetch(user = null) {
    try {
      const u = user || (await this.getUser());
      const identifier = u?.identifier || u?.username || '';
      const tenant = identifier
        ? this._deriveTenantFromIdentifier(identifier)
        : ((await AsyncStorage.getItem(CLIENT_SUBDOMAIN_KEY)) || 'gmr');
      setTenantSubdomain(tenant);
      await AsyncStorage.setItem(CLIENT_SUBDOMAIN_KEY, tenant);
      if (__DEV__) console.log('🔧 Tenant set:', identifier ? `${identifier} -> ${tenant}` : `from storage -> ${tenant}`);
    } catch (e) {
      console.error('❌ Error restoring tenant:', e);
      setTenantSubdomain('gmr');
    }
  }

  /**
   * Store access token and its expiry time (secure storage when available)
   */
  async storeAccessToken(token) {
    try {
      await secureSet(ACCESS_TOKEN_KEY, token);
      const expiryTime = Date.now() + ACCESS_TOKEN_EXPIRY;
      await secureSet(TOKEN_EXPIRY_KEY, expiryTime.toString());
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
      return await secureGet(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      return null;
    }
  }

  /**
   * Store refresh token (secure storage when available)
   */
  async storeRefreshToken(token) {
    try {
      await secureSet(REFRESH_TOKEN_KEY, token);
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
      return await secureGet(REFRESH_TOKEN_KEY);
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
      const expiryTime = await secureGet(TOKEN_EXPIRY_KEY);
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
   * Refresh access token using refresh token.
   * Prevents concurrent refresh; 20s hard timeout so a stuck refresh doesn't block forever.
   */
  async refreshAccessToken() {
    if (this.refreshPromise) {
      if (__DEV__ && !this._waitingLogged) {
        this._waitingLogged = true;
        console.log('🔄 Token refresh already in progress, waiting...');
      }
      return this.refreshPromise;
    }

    this._waitingLogged = false;
    const REFRESH_MAX_WAIT_MS = 20000;
    const refreshWithTimeout = Promise.race([
      this._performTokenRefresh(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Token refresh timed out')), REFRESH_MAX_WAIT_MS)
      ),
    ]);
    this.refreshPromise = refreshWithTimeout;

    try {
      return await this.refreshPromise;
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
      const clientSubdomain = await AsyncStorage.getItem(CLIENT_SUBDOMAIN_KEY);
      
      // If we have a stored refresh token, use it
      // If not, the server may have it in an httpOnly cookie (React Native will send it automatically)
      if (!refreshToken) {
        console.warn('⚠️ No refresh token stored locally. Server may have it in httpOnly cookie.');
      }

      console.log('🔄 Refreshing access token...');
      console.log(`   Refresh endpoint: ${API_ENDPOINTS.auth.refresh()}`);

      // Prepare request body - include refreshToken and client (tenant subdomain) if we have them
      const requestBody = {};
      if (refreshToken) {
        requestBody.refreshToken = refreshToken;
      }
      if (clientSubdomain) {
        requestBody.client = clientSubdomain;
      }
      
      try {
        const refreshUrl = API_ENDPOINTS.auth.refresh();
        console.log('🔄 Attempting token refresh at:', refreshUrl);

        const result = await apiClient.request(refreshUrl, {
          method: 'POST',
          body: Object.keys(requestBody).length > 0 ? requestBody : undefined,
          skipAuth: true,
          timeout: 15000,
          showLogs: false,
          _skip401Refresh: true, // do not trigger refresh again if refresh endpoint returns 401
        });

        if (!result.success) {
          if (result.status === 404) {
            // Backend has no refresh endpoint – clear tokens so we don't keep using an expired token
            await this.clearTokens();
            return {
              success: false,
              error: 'refresh_endpoint_not_found',
              silent: false
            };
          }
          if (result.status === 401 || result.status === 403) {
            console.error('❌ Refresh token invalid or expired');
            await this.clearTokens();
            throw new Error('Session expired. Please login again.');
          }
          if (result.isTimeout) {
            throw new Error('Token refresh timeout - please check your connection');
          }
          throw new Error(result.error || `Token refresh failed: HTTP ${result.status}`);
        }

        const parsed = result.rawBody ?? result.data ?? result;
        const responseLike = { headers: { get: (name) => result.headers && result.headers[name?.toLowerCase()] } };

      const newAccessToken = parsed.data?.accessToken ||
                            parsed.data?.gmrToken ||
                            parsed.data?.ntplToken ||
                            parsed.accessToken ||
                            parsed.gmrToken ||
                            parsed.ntplToken ||
                            parsed.data?.token;
      const newRefreshToken = parsed.data?.refreshToken ||
                             parsed.data?.gmrRefreshToken ||
                             parsed.data?.ntplRefreshToken ||
                             parsed.refreshToken ||
                             parsed.gmrRefreshToken ||
                             parsed.ntplRefreshToken ||
                             this.extractRefreshTokenFromResponse(responseLike) || refreshToken;

      if (!newAccessToken) {
        return {
          success: false,
          error: 'no_token_in_response',
          message: 'No access token in refresh response'
        };
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
      } catch (fetchError) {
        if (fetchError.message && (
          fetchError.message.includes('Network') ||
          fetchError.message.includes('timeout') ||
          fetchError.message.includes('Failed to fetch')
        )) {
          console.warn('⚠️ Network/timeout during token refresh - keeping existing tokens');
        }
        if (fetchError.message && (
          fetchError.message.includes('Route not found') ||
          fetchError.message.includes('404') ||
          fetchError.message.includes('not found')
        )) {
          await this.clearTokens();
          return {
            success: false,
            error: 'refresh_endpoint_not_found',
            silent: false
          };
        }
        throw fetchError;
      }
    } catch (error) {
      // Check if this is a silent failure (404 endpoint not found)
      if (error && typeof error === 'object' && error.silent === true) {
        // Silent failure - don't log errors, just return failure
        return error;
      }
      
      // Only log errors for non-silent failures
      const isNotFoundError = error.message && (
        error.message.includes('Route not found') ||
        error.message.includes('404') ||
        error.message.includes('not available') ||
        error.message.includes('endpoint not found')
      );
      
      if (!isNotFoundError) {
        // Only log non-404 errors
        console.error('❌ Token refresh failed:', error);
      }
      
      // Only clear tokens if it's an authentication error (401/403), not network/configuration errors
      const isAuthError = error.message && (
        error.message.includes('Session expired') ||
        error.message.includes('invalid') ||
        error.message.includes('expired') ||
        error.message.includes('401') ||
        error.message.includes('403')
      );
      
      if (isAuthError && !isNotFoundError) {
        console.log('🔄 Clearing tokens due to authentication error');
        await this.clearTokens();
      } else if (isNotFoundError) {
        // Silent handling for 404 - don't log warnings
        // Don't clear tokens - let the user continue with existing token until it expires
      }
      
      // For 404 errors, return silent failure instead of throwing
      if (isNotFoundError) {
        return {
          success: false,
          error: 'refresh_endpoint_not_found',
          silent: true
        };
      }
      
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
        try {
          const refreshResult = await this.refreshAccessToken();
          
          // Refresh failed (e.g. 404 endpoint not found) – don't reuse expired token
          if (refreshResult && refreshResult.success === false) {
            if (refreshResult.error === 'refresh_endpoint_not_found') {
              return null; // Tokens already cleared; user must re-login
            }
            if (refreshResult.silent === true) {
              const existingToken = await this.getAccessToken();
              return existingToken;
            }
            return null;
          }
        } catch (refreshError) {
          // Check if it's a silent failure
          if (refreshError && typeof refreshError === 'object' && refreshError.silent === true) {
            // Silent failure - use existing token without logging
            const existingToken = await this.getAccessToken();
            return existingToken;
          }
          
          // Check if it's a network/configuration error vs auth error
          const isNotFoundError = refreshError.message && (
            refreshError.message.includes('Route not found') ||
            refreshError.message.includes('404') ||
            refreshError.message.includes('not available') ||
            refreshError.message.includes('endpoint not found')
          );
          
          const isNetworkError = refreshError.message && (
            refreshError.message.includes('Network') ||
            refreshError.message.includes('timeout') ||
            refreshError.message.includes('connection')
          );
          
          // Only log errors for non-silent failures
          if (!isNotFoundError) {
            console.error('❌ Token refresh failed in getValidAccessToken:', refreshError);
          }
          
          // Only clear tokens for auth errors, not network/configuration errors
          if (!isNotFoundError && !isNetworkError) {
            // Auth error - clear tokens
            await this.clearTokens();
            return null;
          } else {
            // Network/config error - try to use existing token even if expired
            // Some servers might still accept slightly expired tokens
            const existingToken = await this.getAccessToken();
            return existingToken; // Return without logging warnings
          }
        }
      }
      
      return await this.getAccessToken();
    } catch (error) {
      console.error('❌ Error getting valid access token:', error);
      // Try to return existing token as fallback
      try {
        const existingToken = await this.getAccessToken();
        if (existingToken) {
          console.warn('⚠️ Returning existing token despite error');
          return existingToken;
        }
      } catch (fallbackError) {
        console.error('❌ Error getting fallback token:', fallbackError);
      }
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
      // Support multiple naming conventions:
      // - Generic: accessToken, token
      // - GMR-specific: gmrToken, gmrAccessToken
      // - NTPL-specific: ntplToken, ntplAccessToken
      const accessToken = responseData?.data?.accessToken || 
                         responseData?.data?.gmrAccessToken ||
                         responseData?.data?.gmrToken ||
                         responseData?.data?.ntplAccessToken ||
                         responseData?.data?.ntplToken ||
                         responseData?.accessToken || 
                         responseData?.gmrAccessToken ||
                         responseData?.gmrToken ||
                         responseData?.ntplAccessToken ||
                         responseData?.ntplToken ||
                         responseData?.data?.token;
      
      if (!accessToken) {
        console.error('❌ Available response data keys:', Object.keys(responseData?.data || responseData || {}));
        throw new Error('No access token in login response');
      }

      // Extract refresh token from response body first (preferred for React Native)
      // Support multiple naming conventions:
      // - Generic: refreshToken
      // - GMR-specific: gmrRefreshToken
      // - NTPL-specific: ntplRefreshToken
      // Then try cookies as fallback
      let refreshToken = responseData?.data?.refreshToken || 
                       responseData?.data?.gmrRefreshToken ||
                       responseData?.data?.ntplRefreshToken ||
                       responseData?.refreshToken ||
                       responseData?.gmrRefreshToken ||
                       responseData?.ntplRefreshToken ||
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

      // Extract tenant/client subdomain from middleware login response (if provided)
      // Supports both top-level and nested "data" structures:
      // {
      //   "clients": [{ "subdomain": "ntpl", "name": "ntpl" }]
      // }
      const clients =
        responseData?.data?.clients ||
        responseData?.clients ||
        [];

      const clientSubdomain =
        Array.isArray(clients) && clients.length > 0
          ? clients[0].subdomain || clients[0].client || null
          : null;

      if (clientSubdomain) {
        try {
          // Persist selected tenant so that all subsequent API calls use correct {subdomain}/api
          await AsyncStorage.setItem(CLIENT_SUBDOMAIN_KEY, clientSubdomain);
          setTenantSubdomain(clientSubdomain);
          console.log('✅ Tenant subdomain stored from login response:', clientSubdomain);
        } catch (subdomainError) {
          console.error('❌ Error storing tenant subdomain:', subdomainError);
        }
      } else {
        console.warn('⚠️ No client subdomain found in login response. Falling back to default tenant.');
      }

      console.log('✅ Login tokens stored successfully');
      
      return {
        accessToken,
        refreshToken,
        clientSubdomain: clientSubdomain || null,
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
      
      // Step 1: Get user to check if demo user
      const user = await this.getUser();
      const isDemo = user?.identifier ? isDemoUser(user.identifier) : false;
      
      // Step 2: Get current tokens and tenant before clearing
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      const clientSubdomain = await AsyncStorage.getItem(CLIENT_SUBDOMAIN_KEY);
      
      // Step 3: Call logout endpoint to revoke refresh token on server
      // Skip API call for demo users (instant logout)
      if (!isDemo && (accessToken || refreshToken)) {
        try {
          console.log('🔄 Calling logout endpoint to revoke tokens on server...');
          
          const requestBody = {};
          if (refreshToken) {
            requestBody.refreshToken = refreshToken;
          }
          if (clientSubdomain) {
            // Middleware spec: client = subdomain from login
            requestBody.client = clientSubdomain;
          }
          
          const result = await apiClient.request(API_ENDPOINTS.auth.logout(), {
            method: 'POST',
            body: Object.keys(requestBody).length > 0 ? requestBody : undefined,
            timeout: 15000,
          });

          if (result.success) {
            const responseData = result.rawBody ?? result.data ?? result;
            console.log('✅ Logout successful on server - refresh token revoked');
            console.log('   Server response:', responseData?.message || 'Tokens revoked');
          } else {
            console.warn(`⚠️ Server logout returned ${result.status}: ${result.error || 'Unknown'}`);
          }
        } catch (error) {
          console.warn('⚠️ Error calling logout endpoint:', error?.message || error);
          // Continue with local logout even if server call fails
          // This ensures user can still logout even if server is unreachable
        }
      } else if (isDemo) {
        console.log('📦 Demo user - skipping server logout call for instant logout');
      } else {
        console.log('ℹ️ No tokens found - skipping server logout call');
      }

      // Step 4: Clear all tokens from local storage
      // This deletes access token and refresh token from memory/local storage
      console.log('🔄 Clearing tokens from local storage...');
      await this.clearTokens();
      
      // Step 5: Clear user data
      console.log('🔄 Clearing user data...');
      await this.clearUser();
      // Clear stored tenant info and reset to default
      try {
        await AsyncStorage.removeItem(CLIENT_SUBDOMAIN_KEY);
        setTenantSubdomain('gmr');
        console.log('🔄 Cleared tenant subdomain and reset to default');
      } catch (tenantClearError) {
        console.error('❌ Error clearing tenant subdomain:', tenantClearError);
      }
      
      console.log('✅ Logout completed successfully');
      console.log('   - Access token deleted from local storage');
      console.log('   - Refresh token deleted from local storage');
      console.log('   - User data cleared');
      if (!isDemo) {
        console.log('   - Server has revoked refresh token (if call succeeded)');
        console.log('   - Any future use of revoked refresh token will be rejected');
      }
      
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
   * Clear all tokens (from secure storage and AsyncStorage)
   */
  async clearTokens() {
    try {
      await secureMultiRemove([
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
   * Clear all authentication data (tokens, user, remember me)
   */
  async clearAllAuthData() {
    try {
      await this.clearTokens();
      await this.clearUser();
      await this.clearRememberMe();
      console.log('✅ All authentication data cleared');
    } catch (error) {
      console.error('❌ Error clearing all auth data:', error);
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
   * Store remember me preference
   */
  async setRememberMe(rememberMe) {
    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
      console.log('✅ Remember me preference stored:', rememberMe);
    } catch (error) {
      console.error('❌ Error storing remember me preference:', error);
    }
  }

  /**
   * Get remember me preference
   */
  async getRememberMe() {
    try {
      const value = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      return value === 'true';
    } catch (error) {
      console.error('❌ Error getting remember me preference:', error);
      return false; // Default to false if error
    }
  }

  /**
   * Clear remember me preference
   */
  async clearRememberMe() {
    try {
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);
      console.log('✅ Remember me preference cleared');
    } catch (error) {
      console.error('❌ Error clearing remember me preference:', error);
    }
  }

  /**
   * Check if user is authenticated
   * This checks if tokens exist AND are valid (not expired)
   */
  async isAuthenticated() {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      // If no tokens at all, not authenticated
      if (!accessToken && !refreshToken) {
        return false;
      }
      
      // If we have access token, check if it's expired
      if (accessToken) {
        const isExpired = await this.isAccessTokenExpired();
        // If access token is valid, user is authenticated
        if (!isExpired) {
          return true;
        }
      }
      
      // If access token expired but we have refresh token, try to refresh
      // This validates that refresh token is still valid
      if (refreshToken) {
        try {
          // Try to get valid token (will refresh if needed)
          const validToken = await this.getValidAccessToken();
          return !!validToken;
        } catch (error) {
          // If refresh fails, user is not authenticated
          console.log('⚠️ Token refresh failed during auth check, user needs to login');
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;

