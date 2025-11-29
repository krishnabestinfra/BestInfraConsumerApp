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

import { API, API_ENDPOINTS, ENV_INFO } from '../constants/constants';
import { getToken } from '../utils/storage';
import { cacheManager } from '../utils/cacheManager';
import { apiClient } from './apiClient';

// Use centralized API configuration
const BASE_URL = API.BASE_URL;
const TICKETS_BASE_URL = API.TICKETS_URL;

/**
 * Make authenticated API request
 */
const makeRequest = async (url, options = {}) => {
  try {
    const token = await getToken();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
 */
export const fetchNotifications = async (uid) => {
  try {
    const url = `${BASE_URL}/notifications?uid=${uid}`;
    const token = await getToken();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    // Handle specific HTTP status codes gracefully
    if (response.status === 403) {
      // 403 Forbidden - notifications feature may not be enabled for this consumer
      // Return success with empty notifications to avoid error logs
      return { 
        success: true, 
        data: { notifications: [] },
        status: 403,
        message: 'Notifications not available for this consumer'
      };
    }

    if (response.status === 404) {
      // 404 Not Found - endpoint may not exist yet
      return { 
        success: true, 
        data: { notifications: [] },
        status: 404,
        message: 'Notifications endpoint not found'
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: data.data || data };
  } catch (error) {
    // Only log actual network errors, not HTTP status errors
    if (!error.message.includes('HTTP error!')) {
      console.error("Network error fetching notifications:", error);
    }
    return { 
      success: true, // Return success to prevent error propagation
      data: { notifications: [] },
      message: error.message 
    };
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const url = `${BASE_URL}/notifications/${notificationId}/read`;
    const token = await getToken();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Marked notification ${notificationId} as read`);
    return data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Mark all notifications as read for a consumer
 */
export const markAllNotificationsAsRead = async (uid) => {
  try {
    const url = `${BASE_URL}/notifications/${uid}/read-all`;
    const token = await getToken();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Marked all notifications as read for UID: ${uid}`);
    return data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, message: error.message };
  }
};