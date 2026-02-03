/**
 * Centralized API Client
 * 
 * Provides a unified interface for all API calls with:
 * - Automatic token management
 * - Consistent error handling
 * - Request/response logging
 * - Retry logic
 * - Timeout handling
 */

import { getToken, getUser } from '../utils/storage';
import { API_ENDPOINTS } from '../constants/constants';
import { authService } from './authService';

class ApiClient {
  constructor() {
    this.baseTimeout = 15000; // 15 seconds default timeout (increased from 10s)
    this.maxRetries = 1; // Reduced retries for speed
    this.requestCache = new Map(); // In-memory request cache
    this.pendingRequests = new Map(); // Prevent duplicate requests
  }

  /**
   * Make an authenticated API request with caching
   */
  async request(endpoint, options = {}) {
    const cacheKey = `${options.method || 'GET'}:${endpoint}`;
    
    // Return cached result if available
    if (this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30000) { // 30 second cache
        console.log(`⚡ API: Cache hit for ${endpoint}`);
        return cached.data;
      }
    }

    // Return pending request if already in progress
    if (this.pendingRequests.has(cacheKey)) {
      console.log(` API: Reusing pending request for ${endpoint}`);
      return this.pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = this._makeRequest(endpoint, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful result
      if (result.success) {
        this.requestCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Make the actual HTTP request
   */
  async _makeRequest(endpoint, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = this.baseTimeout,
      retries = this.maxRetries,
      showLogs = true
    } = options;

    try {
      // Get valid authentication token (will refresh if expired)
      const token = await authService.getValidAccessToken();
      const user = await getUser();

      if (showLogs) {
        console.log(`🔄 API Request: ${method} ${endpoint}`);
        console.log(`   Consumer: ${user?.identifier || 'unknown'}`);
        console.log(`   Token present: ${!!token}`);
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Prepare request headers
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...headers,
      };

      // Make the request
      const response = await fetch(endpoint, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (showLogs) {
        console.log(`   Response status: ${response.status}`);
        console.log(`   Response headers:`, Object.fromEntries(response.headers.entries()));
      }

      // Handle different response statuses
      if (!response.ok) {
        return await this.handleErrorResponse(response, endpoint, retries, options);
      }

      // Parse successful response
      const result = await response.json();
      
      if (showLogs) {
        console.log('✅ API Response received:', result);
      }

      return {
        success: true,
        data: result.data || result,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      };

    } catch (error) {
      console.error(`❌ API Request failed: ${method} ${endpoint}`, error);
      
      // Handle different error types
      if (error.name === 'AbortError') {
        console.error(`⏱️ Request timeout after ${timeout}ms: ${endpoint}`);
        return {
          success: false,
          error: `Request timeout after ${Math.round(timeout / 1000)}s - the server may be slow. Please try again.`,
          status: 408,
          isTimeout: true
        };
      }

      if (error.message.includes('Network request failed')) {
        return {
          success: false,
          error: 'Network error - please check your connection',
          status: 0,
          isNetworkError: true
        };
      }

      return {
        success: false,
        error: error.message,
        status: 0
      };
    }
  }

  /**
   * Handle error responses with retry logic
   */
  async handleErrorResponse(response, endpoint, retries, originalOptions) {
    let errorDetails = '';
    
    try {
      const errorResponse = await response.json();
      errorDetails = errorResponse.message || errorResponse.error || '';
      console.log('❌ API Error Response:', errorResponse);
    } catch (e) {
      console.log('❌ Could not parse error response');
    }

    const errorMessage = `HTTP ${response.status}: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`;
    console.error('❌ API Error:', errorMessage);

    // Check for token expiration errors (401 status or specific error messages)
    const isTokenExpired = response.status === 401 || 
                          errorDetails.toLowerCase().includes('token_expired') ||
                          errorDetails.toLowerCase().includes('token expired') ||
                          errorDetails.toLowerCase().includes('invalid token') ||
                          errorDetails.toLowerCase().includes('unauthorized');

    // Handle specific error cases
    if (isTokenExpired) {
      // Token expired or invalid - try to refresh
      console.log('🔄 Access token expired or invalid, attempting refresh...');
      console.log(`   Error details: ${errorDetails || '401 Unauthorized'}`);
      
      try {
        // Attempt to refresh the token
        const refreshResult = await authService.refreshAccessToken();
        
        // Check if refresh was successful or silent failure
        if (refreshResult && refreshResult.success === false && refreshResult.silent === true) {
          // Silent failure (404) - use existing token
          const existingToken = await authService.getAccessToken();
          if (existingToken) {
            // Retry with existing token
            const retryResponse = await fetch(endpoint, {
              method: originalOptions.method || 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${existingToken}`,
                ...originalOptions.headers,
              },
              body: originalOptions.body ? JSON.stringify(originalOptions.body) : null,
            });
            
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              return {
                success: true,
                data: retryResult.data || retryResult,
                status: retryResponse.status,
              };
            }
          }
          // If existing token doesn't work, return auth error
          return {
            success: false,
            error: 'Authentication failed - please login again',
            status: 401,
            requiresReauth: true
          };
        }
        
        // Get the new token
        const newToken = await authService.getAccessToken();
        
        if (newToken) {
          // Retry the original request with new token
          console.log('✅ Token refreshed, retrying original request...');
          
          // Extract original request parameters
          const {
            method = 'GET',
            headers: originalHeaders = {},
            body: originalBody = null,
            timeout = this.baseTimeout,
          } = originalOptions;
          
          // Prepare headers with new token
          const retryHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Authorization': `Bearer ${newToken}`,
            ...originalHeaders,
          };
          
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          // Retry the request
          const retryResponse = await fetch(endpoint, {
            method,
            headers: retryHeaders,
            body: originalBody ? JSON.stringify(originalBody) : null,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            console.log('✅ Request succeeded after token refresh');
            return {
              success: true,
              data: retryResult.data || retryResult,
              status: retryResponse.status,
              headers: Object.fromEntries(retryResponse.headers.entries()),
              wasRefreshed: true
            };
          } else {
            // If retry still fails, token refresh might have failed
            console.error('❌ Request failed even after token refresh');
            return {
              success: false,
              error: 'Authentication failed - please login again',
              status: 401,
              requiresReauth: true
            };
          }
        } else {
          // No new token available
          console.error('❌ No new token after refresh');
          return {
            success: false,
            error: 'Authentication failed - please login again',
            status: 401,
            requiresReauth: true
          };
        }
      } catch (refreshError) {
        // Check if it's a silent failure
        if (refreshError && typeof refreshError === 'object' && refreshError.silent === true) {
          // Silent failure - try with existing token
          const existingToken = await authService.getAccessToken();
          if (existingToken) {
            try {
              const retryResponse = await fetch(endpoint, {
                method: originalOptions.method || 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${existingToken}`,
                  ...originalOptions.headers,
                },
                body: originalOptions.body ? JSON.stringify(originalOptions.body) : null,
              });
              
              if (retryResponse.ok) {
                const retryResult = await retryResponse.json();
                return {
                  success: true,
                  data: retryResult.data || retryResult,
                  status: retryResponse.status,
                };
              }
            } catch (e) {
              // Silent failure
            }
          }
        } else {
          // Only log non-silent errors
          console.error('❌ Token refresh failed:', refreshError);
        }
        
        return {
          success: false,
          error: 'Session expired - please login again',
          status: 401,
          requiresReauth: true
        };
      }
    }

    if (response.status === 403) {
      // Access denied - don't retry
      return {
        success: false,
        error: 'Access denied - contact support',
        status: 403,
        isAccessDenied: true
      };
    }

    if (response.status === 404) {
      // Not found - don't retry
      return {
        success: false,
        error: 'Resource not found',
        status: 404,
        isNotFound: true
      };
    }

    if (response.status >= 500 && retries > 0) {
      // Server error - retry
      console.log(`🔄 Retrying request (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return this.request(endpoint, { ...originalOptions, retries: retries - 1 });
    }

    return {
      success: false,
      error: errorMessage,
      status: response.status
    };
  }

  /**
   * Get consumer data
   * Uses longer timeout since this endpoint can take longer to process
   */
  async getConsumerData(consumerId) {
    const endpoint = API_ENDPOINTS.consumers.get(consumerId);
    return this.request(endpoint, {
      timeout: 30000, // 30 seconds timeout for consumer data
      retries: 2, // Allow 2 retries for this important endpoint
    });
  }

  /**
   * Get consumer list
   */
  async getConsumerList() {
    const endpoint = API_ENDPOINTS.consumers.list();
    return this.request(endpoint);
  }

  /**
   * Get tickets stats
   */
  async getTicketsStats(uid) {
    const endpoint = API_ENDPOINTS.tickets.stats(uid);
    return this.request(endpoint);
  }

  /**
   * Get tickets table
   */
  async getTicketsTable(uid) {
    const endpoint = API_ENDPOINTS.tickets.table(uid);
    return this.request(endpoint);
  }

  /**
   * Get ticket details by id
   */
  async getTicketDetails(id) {
    const endpoint = API_ENDPOINTS.tickets.update(id);
    return this.request(endpoint);
  }

  /**
   * Get notifications
   */
  async getNotifications(uid) {
    const endpoint = API_ENDPOINTS.notifications.list(uid);
    return this.request(endpoint);
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId) {
    const endpoint = API_ENDPOINTS.notifications.markRead(notificationId);
    return this.request(endpoint, { method: 'POST' });
  }

  /**
   * Create payment link
   */
  async createPaymentLink(paymentData) {
    const endpoint = API_ENDPOINTS.payment.createLink();
    return this.request(endpoint, { 
      method: 'POST', 
      body: paymentData 
    });
  }

  /**
   * Verify payment
   */
  async verifyPayment(paymentData) {
    const endpoint = API_ENDPOINTS.payment.verify();
    return this.request(endpoint, { 
      method: 'POST', 
      body: paymentData 
    });
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(uid) {
    const endpoint = API_ENDPOINTS.payment.history(uid);
    return this.request(endpoint);
  }

  /**
   * Health check
   */
  async healthCheck() {
    const endpoint = API_ENDPOINTS.health();
    return this.request(endpoint);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
