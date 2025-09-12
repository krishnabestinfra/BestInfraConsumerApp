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

import { GLOBAL_API_URL } from '../constants/constants';
import { getToken } from '../utils/storage';
import { cacheManager } from '../utils/cacheManager';

const BASE_URL = `http://${GLOBAL_API_URL}:4256/api`;
const TICKETS_BASE_URL = `http://${GLOBAL_API_URL}:4255/api`;

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
    
    const response = await fetch(`${BASE_URL}/sub-app/auth/login`, {
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
      `${BASE_URL}/consumers/${consumerId}`,
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
      `${BASE_URL}/consumers/${consumerId}`,
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
    return await makeRequest(`${BASE_URL}/billing/postpaid/table`);
  } catch (error) {
    console.error("Error fetching postpaid billing data:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch ticket statistics with caching
 */
export const fetchTicketStats = async (uid) => {
  try {
    return await cacheManager.getData(
      'ticket_stats',
      `${TICKETS_BASE_URL}/tickets/stats?uid=${uid}`,
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
      `${TICKETS_BASE_URL}/tickets/table?uid=${uid}`,
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