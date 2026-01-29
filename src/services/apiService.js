/**
 * Unified API Service
 * 
 * Handles all API communications, authentication, and data fetching.
 * Consolidates functionality from apiService.js and authHelper.js
 * 
 * Features:
 * - Centralized API endpoints
 * - Authentication handling
 * - Error management
 * - Request/response logging
 * - Token management
 */

import { Platform } from 'react-native';
import { API, API_ENDPOINTS, ENV_INFO } from '../constants/constants';
import { getToken } from '../utils/storage';
import { cacheManager } from '../utils/cacheManager';
import { apiClient } from './apiClient';
import { authService } from './authService';

// Use centralized API configuration
const BASE_URL = API.BASE_URL;
const TICKETS_BASE_URL = API.TICKETS_URL;

/**
 * Make authenticated API request with automatic token refresh
 * This function now handles 401 errors and token refresh automatically
 * 
 * @deprecated Consider using apiClient.request() directly for better consistency
 * This function is kept for backward compatibility
 */
const makeRequest = async (url, options = {}) => {
  try {
    // Get valid access token (will auto-refresh if expired)
    const token = await authService.getValidAccessToken();
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    // Handle 401 errors with token refresh
    if (response.status === 401) {
      console.log('🔄 401 error detected in makeRequest, attempting token refresh...');
      
      try {
        // Try to refresh the token
        const refreshResult = await authService.refreshAccessToken();
        
        // Check if refresh was successful or silent failure
        let newToken = null;
        if (refreshResult && refreshResult.success === false && refreshResult.silent === true) {
          // Silent failure (404) - use existing token
          newToken = await authService.getAccessToken();
        } else {
          // Get new token
          newToken = await authService.getAccessToken();
        }
        
        if (newToken) {
          // Retry the request with token
          const retryResponse = await fetch(url, {
            method: options.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${newToken}`,
              ...options.headers,
            },
            ...options,
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            return { success: true, data: retryData.data || retryData };
          } else {
            // If retry still fails, return error
            const errorData = await retryResponse.json().catch(() => ({}));
            return { 
              success: false, 
              message: errorData.message || `HTTP error! status: ${retryResponse.status}`,
              status: retryResponse.status,
              requiresReauth: true
            };
          }
        }
      } catch (refreshError) {
        // Check if it's a silent failure
        if (refreshError && typeof refreshError === 'object' && refreshError.silent === true) {
          // Silent failure - try with existing token
          const existingToken = await authService.getAccessToken();
          if (existingToken) {
            try {
              const retryResponse = await fetch(url, {
                method: options.method || 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${existingToken}`,
                  ...options.headers,
                },
                ...options,
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                return { success: true, data: retryData.data || retryData };
              }
            } catch (e) {
              // Silent failure
            }
          }
        } else {
          // Only log non-silent errors
          console.error('❌ Token refresh failed in makeRequest:', refreshError);
        }
        
        return { 
          success: false, 
          message: 'Session expired. Please login again.',
          requiresReauth: true
        };
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error(`API Error (${url}):`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Test consumer credentials
 */
export const testConsumerCredentials = async (identifier, password) => {
  try {
    console.log(`🧪 Testing credentials for consumer: ${identifier}`);
    
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
      error: response.ok ? null : result.message || `HTTP ${response.status}`,
      hasValidCredentials: response.ok && result.success
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message,
      hasValidCredentials: false
    };
  }
};

/**
 * Fetch consumer data with caching
 */
export const fetchConsumerData = async (consumerId, forceRefresh = false) => {
  try {
    return await cacheManager.getData(
      'consumer_data',
      API_ENDPOINTS.consumers.get(consumerId),
      consumerId,
      forceRefresh
    );
  } catch (error) {
    console.error("Error fetching consumer data:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Background sync consumer data
 */
export const syncConsumerData = async (consumerId) => {
  try {
    return await cacheManager.backgroundRefresh(
      'consumer_data',
      API_ENDPOINTS.consumers.get(consumerId),
      consumerId
    );
  } catch (error) {
    console.error("Error syncing consumer data:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch postpaid billing data
 */
export const fetchPostpaidBillingData = async (consumerId) => {
  try {
    return await makeRequest(`${API.BASE_URL}/billing/postpaid/table`);
  } catch (error) {
    console.error("Error fetching postpaid billing data:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch billing history for a consumer
 * Tries multiple endpoint formats to handle different API structures
 * Uses apiClient for automatic token management and refresh
 */
export const fetchBillingHistory = async (uid) => {
  if (!uid) {
    return { success: false, message: 'Missing consumer identifier' };
  }

  // List of possible billing endpoint formats to try
  const billingEndpoints = [
    // Primary endpoint
    API_ENDPOINTS.billing.history(uid),
    // Alternative endpoints
    `${API.BASE_URL}/billing/postpaid/table?uid=${uid}`,
    `${API.BASE_URL}/billing/postpaid/history?uid=${uid}`,
    `${API.BASE_URL}/consumers/${uid}/billing`,
    `${API.BASE_URL}/consumers/${uid}/bills`,
    `${API.BASE_URL}/bills?uid=${uid}`,
    `${API.BASE_URL}/invoices?uid=${uid}`,
  ];

  // Try each endpoint until one succeeds
  for (const endpoint of billingEndpoints) {
    try {
      console.log(`🔄 Trying billing endpoint: ${endpoint}`);
      
      // Use apiClient for better token handling and automatic refresh
      const result = await apiClient.request(endpoint, {
        method: 'GET',
        showLogs: false, // Reduce logging for multiple attempts
      });
      
      if (result.success && result.data) {
        // Check if data is actually present
        const data = result.data;
        const hasData = Array.isArray(data) ? data.length > 0 : 
                       (data && typeof data === 'object' && Object.keys(data).length > 0);
        
        if (hasData) {
          console.log(`✅ Billing history fetched successfully from: ${endpoint}`);
          return result;
        }
      }
      
      // If we get a 404, try next endpoint
      if (result.status === 404 || (result.error && result.error.includes('404'))) {
        console.log(`⚠️ Endpoint returned 404, trying next...`);
        continue;
      }
      
      // If we get success but no data, still try other endpoints first
      if (result.success && (!result.data || (Array.isArray(result.data) && result.data.length === 0))) {
        console.log(`⚠️ Endpoint responded but no data found, trying next...`);
        continue;
      }
      
      // If we get success with data (even if empty), return it
      if (result.success) {
        console.log(`✅ Endpoint responded successfully`);
        return result;
      }
    } catch (error) {
      console.log(`⚠️ Error with endpoint ${endpoint}:`, error.message);
      // Continue to next endpoint
      continue;
    }
  }

  // If all endpoints failed, check if consumer data has billing info
  try {
    console.log('🔄 Trying to get billing data from consumer endpoint...');
    const consumerResult = await apiClient.request(API_ENDPOINTS.consumers.get(uid), {
      method: 'GET',
      showLogs: false,
    });
    
    if (consumerResult.success && consumerResult.data) {
      // Check if consumer data contains billing history
      const consumerData = consumerResult.data;
      const billingData = consumerData.billingHistory || 
                         consumerData.bills || 
                         consumerData.invoices ||
                         consumerData.billing ||
                         consumerData.paymentHistory; // Sometimes billing is in payment history
      
      if (billingData) {
        console.log('✅ Found billing data in consumer response');
        return {
          success: true,
          data: Array.isArray(billingData) ? billingData : [billingData]
        };
      }
    }
  } catch (error) {
    console.log('⚠️ Could not get billing from consumer data:', error.message);
  }

  // All attempts failed - return empty result gracefully
  console.warn('⚠️ All billing endpoint attempts failed - returning empty result');
  return { 
    success: true, 
    data: [],
    message: 'No billing history found. The billing endpoint may not be available for this consumer.',
    warning: true,
    empty: true
  };
};

/**
 * Fetch ticket statistics with caching
 */
export const fetchTicketStats = async (uid) => {
  try {
    return await cacheManager.getData(
      'ticket_stats',
      API_ENDPOINTS.tickets.stats(uid),
      uid
    );
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch tickets table data with caching
 */
export const fetchTicketsTable = async (uid) => {
  try {
    return await cacheManager.getData(
      'ticket_table',
      API_ENDPOINTS.tickets.table(uid),
      uid
    );
  } catch (error) {
    console.error("Error fetching tickets table:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Get cached consumer data instantly
 */
export const getCachedConsumerData = async (identifier) => {
  return await cacheManager.getCachedData('consumer_data', identifier);
};

/**
 * Get cached ticket stats instantly
 */
export const getCachedTicketStats = async (identifier) => {
  return await cacheManager.getCachedData('ticket_stats', identifier);
};

/**
 * Get cached ticket table instantly
 */
export const getCachedTicketTable = async (identifier) => {
  return await cacheManager.getCachedData('ticket_table', identifier);
};

/**
 * Clear all cached data
 */
export const clearAllCache = () => {
  return cacheManager.clearAllCache();
};

/**
 * Check if data is cached and valid
 */
export const hasValidCache = async (identifier) => {
  return await cacheManager.hasValidCache('consumer_data', identifier);
};

// ==================== NOTIFICATIONS API ====================

/**
 * Fetch notifications for a specific consumer
 * Uses bearer token from logged-in user
 */
export const fetchNotifications = async (uid, page = 1, limit = 10) => {
  try {
    // Get valid access token (will auto-refresh if expired)
    // If refresh fails, try to continue with existing token (might still work)
    let token;
    try {
      token = await authService.getValidAccessToken();
    } catch (tokenError) {
      console.warn('⚠️ Error getting access token for notifications:', tokenError.message);
      // Try to get existing token as fallback
      token = await authService.getAccessToken();
    }
    
    if (!token) {
      console.warn('⚠️ No access token available for notifications - returning empty list');
      return { 
        success: true, // Return success with empty data instead of error
        data: { notifications: [], pagination: {} },
        message: 'Authentication required. Please login to see notifications.'
      };
    }

    // Use the correct API endpoint with page and limit
    const url = API_ENDPOINTS.notifications.list(page, limit);
    
    console.log('🔄 Fetching notifications:', {
      url,
      page,
      limit,
      tokenPresent: !!token
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📬 Notifications API response status:', response.status);

    // Handle specific HTTP status codes gracefully
    if (response.status === 401) {
      console.warn('⚠️ 401 Unauthorized - token may be invalid or expired');
      // Don't throw error - return empty notifications gracefully
      // The auth service will handle token refresh/clearing if needed
      return { 
        success: true, 
        data: { notifications: [] },
        status: 401,
        message: 'Authentication required. Notifications unavailable.'
      };
    }
    
    if (response.status === 403) {
      console.warn('⚠️ 403 Forbidden - notifications not available');
      return { 
        success: true, 
        data: { notifications: [] },
        status: 403,
        message: 'Notifications not available for this consumer'
      };
    }

    if (response.status === 404) {
      console.warn('⚠️ 404 Not Found - notifications endpoint not found');
      return { 
        success: true, 
        data: { notifications: [] },
        status: 404,
        message: 'Notifications endpoint not found'
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ Notifications API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Notifications API response:', {
      success: result.success,
      notificationsCount: result.data?.notifications?.length || 0,
      total: result.data?.pagination?.total || 0
    });

    // Handle response structure: { success: true, data: { notifications: [], pagination: {} } }
    if (result.success && result.data) {
      const notifications = result.data.notifications || [];
      return { 
        success: true, 
        data: {
          notifications: notifications,
          pagination: result.data.pagination || {}
        }
      };
    }

    // Fallback for different response structures
    return { 
      success: true, 
      data: { 
        notifications: result.notifications || result.data || [],
        pagination: result.pagination || {}
      }
    };
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return { 
      success: false,
      data: { notifications: [] },
      message: error.message 
    };
  }
};

/**
 * Mark a notification as read
 * Uses bearer token from logged-in user
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    // Get valid access token (will auto-refresh if expired)
    const token = await authService.getValidAccessToken();
    if (!token) {
      return { 
        success: false, 
        message: 'No access token available. Please login again.' 
      };
    }

    const url = API_ENDPOINTS.notifications.markRead(notificationId);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Marked notification ${notificationId} as read`);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Mark all notifications as read for a consumer
 * Uses bearer token from logged-in user
 */
export const markAllNotificationsAsRead = async (uid) => {
  try {
    // Get valid access token (will auto-refresh if expired)
    const token = await authService.getValidAccessToken();
    if (!token) {
      return { 
        success: false, 
        message: 'No access token available. Please login again.' 
      };
    }

    const url = API_ENDPOINTS.notifications.markAllRead(uid);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Marked all notifications as read for UID: ${uid}`);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    return { success: false, message: error.message };
  }
};

// ==================== PAYMENT TRANSACTIONS API ====================

/**
 * Fetch payment transactions for a specific consumer
 * Shows all transactions made via nexusone mobile app
 * Uses bearer token from logged-in user
 * 
 * @param {string} consumerId - Consumer identifier (optional, will use logged-in user if not provided)
 * @returns {Promise<{success: boolean, data: Array, message?: string}>}
 */
export const fetchPaymentTransactions = async (consumerId = null) => {
  try {
    // Get valid access token (will auto-refresh if expired)
    let token;
    try {
      token = await authService.getValidAccessToken();
    } catch (tokenError) {
      console.warn('⚠️ Error getting access token for transactions:', tokenError.message);
      token = await authService.getAccessToken();
    }
    
    if (!token) {
      console.warn('⚠️ No access token available for transactions - returning empty list');
      return { 
        success: true,
        data: [],
        message: 'Authentication required. Please login to see transactions.'
      };
    }

    // Get consumer ID from user if not provided
    let uid = consumerId;
    if (!uid) {
      const { getUser } = await import('../utils/storage');
      const user = await getUser();
      if (user && user.identifier) {
        uid = user.identifier;
      } else {
        return {
          success: false,
          data: [],
          message: 'Consumer identifier is required'
        };
      }
    }

    // Fetch consumer data which contains payment history
    const url = API_ENDPOINTS.consumers.get(uid);
    
    console.log('🔄 Fetching payment transactions:', {
      url,
      consumerId: uid,
      tokenPresent: !!token
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('💳 Payment transactions API response status:', response.status);

    // Handle specific HTTP status codes gracefully
    if (response.status === 401) {
      console.warn('⚠️ 401 Unauthorized - token may be invalid or expired');
      return { 
        success: true, 
        data: [],
        status: 401,
        message: 'Authentication required. Transactions unavailable.'
      };
    }
    
    if (response.status === 403) {
      console.warn('⚠️ 403 Forbidden - transactions not available');
      return { 
        success: true, 
        data: [],
        status: 403,
        message: 'Transactions not available for this consumer'
      };
    }

    if (response.status === 404) {
      console.warn('⚠️ 404 Not Found - consumer endpoint not found');
      return { 
        success: true, 
        data: [],
        status: 404,
        message: 'Consumer endpoint not found'
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('❌ Payment transactions API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Payment transactions API response:', {
      success: result.success,
      hasData: !!(result.data && result.data.paymentHistory),
      paymentHistoryCount: result.data?.paymentHistory?.length || 0
    });

    // Extract payment history from consumer data
    if (result.success && result.data && result.data.paymentHistory) {
      const paymentHistory = result.data.paymentHistory || [];
      
      // Filter for mobile app payments (nexusone app)
      // Check if payment has source: 'react_native_app' or paymentMode indicates mobile
      const mobileAppPayments = paymentHistory.filter((payment) => {
        // Filter for mobile app payments
        // Check various indicators that this is from mobile app:
        // 1. payment.source === 'react_native_app'
        // 2. payment.paymentMode contains 'mobile' or 'app'
        // 3. payment.notes?.source === 'react_native_app'
        // 4. If no source field, include all payments (assume they're from mobile if in mobile app)
        const source = payment.source || payment.notes?.source || '';
        const paymentMode = (payment.paymentMode || '').toLowerCase();
        const isMobileApp = 
          source === 'react_native_app' ||
          source === 'nexusone_app' ||
          paymentMode.includes('mobile') ||
          paymentMode.includes('app') ||
          paymentMode.includes('upi') || // UPI payments are typically from mobile
          !source; // If no source specified, assume mobile app (since we're in mobile app)
        
        return isMobileApp;
      });

      // Transform payment history data for the table (matching Transactions.js format)
      const transformedData = mobileAppPayments.map((payment, index) => {
        // Extract transaction ID from various possible fields
        const transactionId = 
          payment.transactionId || 
          payment.transaction_id ||
          payment.paymentId ||
          payment.payment_id ||
          payment.razorpay_payment_id ||
          payment.orderId ||
          payment.order_id ||
          `TXN-${Date.now()}-${index}`;

        // Extract payment date
        const paymentDate = 
          payment.paymentDate || 
          payment.payment_date ||
          payment.createdAt ||
          payment.created_at ||
          payment.date ||
          new Date().toISOString();

        // Extract amount (handle both paise and rupees)
        let amount = payment.creditAmount || payment.amount || payment.totalAmount || 0;
        // If amount is in paise (very large number), convert to rupees
        if (amount > 10000) {
          amount = amount / 100;
        }

        // Extract payment mode
        const paymentMode = 
          payment.paymentMode || 
          payment.payment_mode ||
          payment.method ||
          'UPI';

        // Determine status
        const status = (amount > 0) ? 'Success' : 'Failed';

        // Format date for display
        const formatDate = (dateString) => {
          try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch {
            return dateString;
          }
        };

        return {
          id: index + 1,
          transactionId: transactionId,
          orderId: payment.orderId || payment.order_id || payment.razorpay_order_id || 'N/A',
          date: formatDate(paymentDate),
          amount: `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          paymentMode: paymentMode,
          status: status,
          // Include raw data for reference
          raw: {
            ...payment,
            transactionId,
            orderId: payment.orderId || payment.order_id || payment.razorpay_order_id,
            amount,
            paymentDate,
            paymentMode,
            status
          }
        };
      });

      // Sort by date (newest first)
      transformedData.sort((a, b) => {
        const dateA = new Date(a.raw.paymentDate).getTime();
        const dateB = new Date(b.raw.paymentDate).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      console.log('✅ Payment transactions transformed:', {
        totalPayments: paymentHistory.length,
        mobileAppPayments: mobileAppPayments.length,
        transformedCount: transformedData.length
      });

      return { 
        success: true, 
        data: transformedData,
        total: transformedData.length,
        message: `Found ${transformedData.length} mobile app transaction(s)`
      };
    }

    // If no payment history found
    return { 
      success: true, 
      data: [],
      message: 'No payment history found for this consumer'
    };
  } catch (error) {
    console.error('❌ Error fetching payment transactions:', error);
    return { 
      success: false,
      data: [],
      message: error.message 
    };
  }
};