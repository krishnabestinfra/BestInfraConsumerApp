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
import { cacheManager } from '../utils/cacheManager';
import { apiClient } from './apiClient';
import { authService } from './authService';

// Use centralized API configuration
const BASE_URL = API.BASE_URL;
const TICKETS_BASE_URL = API.TICKETS_URL;

/**
 * Make authenticated API request via centralized apiClient.
 * Single networking gateway: timeout, token, error normalization.
 */
const makeRequest = async (url, options = {}) => {
  try {
    const result = await apiClient.request(url, {
      method: options.method || 'GET',
      body: options.body,
      headers: options.headers,
      showLogs: false,
    });
    if (!result.success) {
      return {
        success: false,
        message: result.error || `HTTP ${result.status}`,
        status: result.status,
        requiresReauth: result.status === 401 || result.status === 403,
      };
    }
    const data = result.data ?? result.rawBody ?? result;
    return { success: true, data: data?.data ?? data };
  } catch (error) {
    console.error(`API Error (${url}):`, error?.message || error);
    return { success: false, message: error?.message || String(error) };
  }
};

/**
 * Test consumer credentials
 */
export const testConsumerCredentials = async (identifier, password) => {
  try {
    console.log(`🧪 Testing credentials for consumer: ${identifier}`);
    const result = await apiClient.request(API_ENDPOINTS.auth.login(), {
      method: 'POST',
      body: { identifier: identifier.trim(), password: password.trim() },
      skipAuth: true,
    });
    const data = result.rawBody ?? result.data ?? result;
    return {
      success: result.success && (data?.success === true || data?.status === 'success'),
      status: result.status || 0,
      data,
      error: result.success ? null : (result.error || data?.message || `HTTP ${result.status}`),
      hasValidCredentials: result.success && (data?.success === true || data?.status === 'success'),
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error?.message || String(error),
      hasValidCredentials: false,
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
 * @param {string} uid - Consumer identifier
 * @param {boolean} forceRefresh - If true, bypass cache and fetch fresh data (e.g. after creating a ticket)
 */
export const fetchTicketStats = async (uid, forceRefresh = false) => {
  try {
    return await cacheManager.getData(
      'ticket_stats',
      API_ENDPOINTS.tickets.stats(uid),
      uid,
      forceRefresh
    );
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch tickets table data with caching
 * @param {string} uid - Consumer identifier
 * @param {boolean} forceRefresh - If true, bypass cache and fetch fresh data (e.g. after creating a ticket)
 */
export const fetchTicketsTable = async (uid, forceRefresh = false) => {
  try {
    return await cacheManager.getData(
      'ticket_table',
      API_ENDPOINTS.tickets.table(uid),
      uid,
      forceRefresh
    );
  } catch (error) {
    console.error("Error fetching tickets table:", error);
    return { success: false, message: error.message };
  }
};

/** Map form category label to API category value (backend expects: BILLING, METER, CONNECTION, TECHNICAL, OTHER) */
const TICKET_CATEGORY_MAP = {
  'Technical Issue': 'TECHNICAL',
  'Technical': 'TECHNICAL',
  'Billing Issue': 'BILLING',
  'Billing': 'BILLING',
  'Connection Issue': 'CONNECTION',
  'Connection': 'CONNECTION',
  'Meter Issue': 'METER',
  'Meter': 'METER',
  'General Inquiry': 'OTHER',
  'General': 'OTHER',
};
/** Map form priority to API value (backend expects: LOW, MEDIUM, HIGH, URGENT) */
const TICKET_PRIORITY_MAP = {
  'Low': 'LOW',
  'Medium': 'MEDIUM',
  'High': 'HIGH',
  'Urgent': 'URGENT',
};

/**
 * Create new ticket via API (POST to /tickets)
 * @param {string} consumerNumber - Consumer identifier
 * @param {object} formData - { subject, description, category, priority? }
 * @returns {Promise<{ success: boolean, data?: any, message?: string }>}
 */
export const createTicket = async (consumerNumber, formData) => {
  try {
    const category = TICKET_CATEGORY_MAP[formData.category] || (typeof formData.category === 'string' ? formData.category.toUpperCase() : 'OTHER').replace('GENERAL', 'OTHER') || 'OTHER';
    const priority = TICKET_PRIORITY_MAP[formData.priority] || (typeof formData.priority === 'string' ? formData.priority.toUpperCase() : 'HIGH') || 'HIGH';
    const payload = {
      subject: formData.subject || 'No subject',
      description: formData.description || '',
      category,
      priority,
      consumerNumber,
    };
    if (__DEV__) {
      console.log('🎫 createTicket called → POST https://api.bestinfra.app/gmr/api/tickets (with access token)');
      console.log('🎫 Payload sent to backend:', JSON.stringify(payload, null, 2));
    }
    const result = await apiClient.createTicket(payload);
    if (__DEV__) {
      console.log('🎫 Create ticket API result:', result?.success ? 'SUCCESS' : 'FAILED', result);
      if (result?.success) console.log('🎫 Ticket created:', result.data || result);
      if (!result?.success) console.log('🎫 Error:', result?.message || result?.error);
    }
    return result;
  } catch (error) {
    console.error('🎫 Error creating ticket:', error);
    return {
      success: false,
      message: error.message || 'Failed to create ticket',
    };
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

    const url = API_ENDPOINTS.notifications.list(page, limit);
    console.log('🔄 Fetching notifications:', { url, page, limit, tokenPresent: !!token });

    const result = await apiClient.request(url, { method: 'GET', showLogs: false });
    console.log('📬 Notifications API response status:', result.status);

    if (result.status === 401) {
      console.warn('⚠️ 401 Unauthorized - token may be invalid or expired');
      return { success: true, data: { notifications: [], pagination: {} }, status: 401, message: 'Authentication required. Notifications unavailable.' };
    }
    if (result.status === 403) {
      console.warn('⚠️ 403 Forbidden - notifications not available');
      return { success: true, data: { notifications: [], pagination: {} }, status: 403, message: 'Notifications not available for this consumer' };
    }
    if (result.status === 404) {
      console.warn('⚠️ 404 Not Found - notifications endpoint not found');
      return { success: true, data: { notifications: [], pagination: {} }, status: 404, message: 'Notifications endpoint not found' };
    }
    if (!result.success) {
      console.error('❌ Notifications API error:', result.status, result.error);
      return { success: false, data: { notifications: [], pagination: {} }, message: result.error || `HTTP ${result.status}` };
    }

    const data = result.rawBody ?? result.data ?? result;
    console.log('✅ Notifications API response:', { success: data?.success, notificationsCount: data?.data?.notifications?.length || 0, total: data?.data?.pagination?.total || 0 });
    if (data?.success && data?.data) {
      const notifications = data.data.notifications || [];
      return { success: true, data: { notifications, pagination: data.data.pagination || {} } };
    }
    return { success: true, data: { notifications: data?.notifications || data?.data || [], pagination: data?.pagination || {} } };
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return { success: false, data: { notifications: [], pagination: {} }, message: error?.message || String(error) };
  }
};

/**
 * Mark a notification as read
 * Uses bearer token from logged-in user
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const token = await authService.getValidAccessToken();
    if (!token) return { success: false, message: 'No access token available. Please login again.' };

    const url = API_ENDPOINTS.notifications.markRead(notificationId);
    const result = await apiClient.request(url, { method: 'PUT', showLogs: false });
    if (!result.success) throw new Error(result.error || `HTTP ${result.status}`);

    const data = result.rawBody ?? result.data ?? result;
    console.log(`✅ Marked notification ${notificationId} as read`);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    return { success: false, message: error?.message || String(error) };
  }
};

/**
 * Mark all notifications as read for a consumer
 * Uses bearer token from logged-in user
 */
export const markAllNotificationsAsRead = async (uid) => {
  try {
    const token = await authService.getValidAccessToken();
    if (!token) return { success: false, message: 'No access token available. Please login again.' };

    const url = API_ENDPOINTS.notifications.markAllRead(uid);
    const result = await apiClient.request(url, { method: 'PUT', showLogs: false });
    if (!result.success) throw new Error(result.error || `HTTP ${result.status}`);

    const data = result.rawBody ?? result.data ?? result;
    console.log(`✅ Marked all notifications as read for UID: ${uid}`);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    return { success: false, message: error?.message || String(error) };
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

    const url = API_ENDPOINTS.consumers.get(uid);
    console.log('🔄 Fetching payment transactions:', { url, consumerId: uid, tokenPresent: !!token });

    const result = await apiClient.request(url, { method: 'GET', showLogs: false });
    console.log('💳 Payment transactions API response status:', result.status);

    if (result.status === 401) {
      console.warn('⚠️ 401 Unauthorized - token may be invalid or expired');
      return { success: true, data: [], status: 401, message: 'Authentication required. Transactions unavailable.' };
    }
    if (result.status === 403) {
      console.warn('⚠️ 403 Forbidden - transactions not available');
      return { success: true, data: [], status: 403, message: 'Transactions not available for this consumer' };
    }
    if (result.status === 404) {
      console.warn('⚠️ 404 Not Found - consumer endpoint not found');
      return { success: true, data: [], status: 404, message: 'Consumer endpoint not found' };
    }
    if (!result.success) {
      console.error('❌ Payment transactions API error:', result.status, result.error);
      return { success: false, data: [], message: result.error || `HTTP ${result.status}` };
    }

    const resultData = result.rawBody ?? result.data ?? result;
    console.log('✅ Payment transactions API response:', {
      success: resultData.success,
      hasData: !!(resultData.data && resultData.data.paymentHistory),
      paymentHistoryCount: resultData.data?.paymentHistory?.length || 0
    });

    if (resultData.success && resultData.data && resultData.data.paymentHistory) {
      const paymentHistory = resultData.data.paymentHistory || [];
      
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
    return { success: false, data: [], message: error?.message || String(error) };
  }
};