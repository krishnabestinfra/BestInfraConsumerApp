/**
 * Centralized API Client (single networking gateway)
 *
 * Responsibility: All backend HTTP goes through this client. No direct fetch for API in screens.
 *
 * Flow:
 * - request() → cache/pending check → _makeRequest()
 * - _makeRequest(): attach token, fetch; on 2xx optionally validate with Zod (apiSchemaMap);
 *   on 401 enter refresh lock + queue, then retry or session expired; on 4xx/5xx normalized error.
 * - Slow requests (>1500ms) reported via reportApiLatency(); no sensitive payloads logged.
 *
 * Decisions:
 * - Token refresh: one-at-a-time (isRefreshing), queue replay on success, clear + session-expired on failure.
 * - Refresh endpoint itself is never retried; max one retry per original request (_retry flag).
 * - Validation: only for endpoints in apiSchemaMap (auth, tickets, payment, consumers); schema.safeParse;
 *   on failure return normalized error so corrupted data never reaches screens.
 */

import { getUser } from '../utils/storage';
import { API_ENDPOINTS } from '../constants/constants';
import { authService } from './authService';
import { getTenantSubdomain } from '../config/apiConfig';
import * as tokenService from './tokenService';
import { triggerSessionExpired } from '../utils/sessionExpiredHandler';
import { getSchemaForEndpoint } from '../schemas/apiSchemaMap';
import { reportApiLatency } from '../utils/performanceMonitor';
import { apiLogger } from '../utils/logger';

/** Cache hit/miss stats for validation (7.2) */
export const apiClientCacheStats = {
  hits: 0,
  misses: 0,
  get hitRate() { const t = this.hits + this.misses; return t > 0 ? (this.hits / t * 100).toFixed(1) : 0; }
};

const logApiCacheEvent = (hit, endpoint) => {
  if (hit) apiClientCacheStats.hits++; else apiClientCacheStats.misses++;
  if (__DEV__) {
    const path = typeof endpoint === 'string' ? endpoint.replace(/\?.*$/, '').slice(-50) : '';
    // eslint-disable-next-line no-console
    console.log(`[ApiCache] ${hit ? 'HIT' : 'MISS'} ${path} (hitRate: ${apiClientCacheStats.hitRate}%)`);
  }
};

const REQUIRES_REAUTH_RESPONSE = {
  success: false,
  error: 'Session expired - please login again',
  status: 401,
  requiresReauth: true,
};

class ApiClient {
  constructor() {
    this.baseTimeout = 10000;
    this.maxRetries = 1;
    this.requestCache = new Map();
    this.pendingRequests = new Map();
    this.isRefreshing = false;
    this._requestQueue = [];
    this._subscribers = new Map(); // endpoint → Set<callback>

    this.CACHE_FRESH = 30_000;  // 0-30s: return cache, skip network
    this.CACHE_STALE = 60_000;  // 30-60s: return cache, refresh in background
  }

  /**
   * Subscribe to background refreshes for a cache key.
   * Returns an unsubscribe function.
   */
  onCacheUpdate(cacheKey, callback) {
    if (!this._subscribers.has(cacheKey)) this._subscribers.set(cacheKey, new Set());
    this._subscribers.get(cacheKey).add(callback);
    return () => this._subscribers.get(cacheKey)?.delete(callback);
  }

  _notifySubscribers(cacheKey, data) {
    const subs = this._subscribers.get(cacheKey);
    if (subs) subs.forEach(cb => { try { cb(data); } catch {} });
  }

  /**
   * Make an authenticated API request with two-tier caching:
   *  - Fresh (0-30s): return cached result, no network call.
   *  - Stale (30-60s): return cached result immediately, trigger background refresh.
   *  - Expired (>60s): normal network request.
   */
  async request(endpoint, options = {}) {
    const method = options.method || 'GET';
    const cacheKey = `${method}:${endpoint}`;
    const isMutation = method !== 'GET';

    if (!isMutation && this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      const age = Date.now() - cached.timestamp;

      if (age < this.CACHE_FRESH) {
        logApiCacheEvent(true, endpoint);
        apiLogger.info('Cache hit (fresh) for', endpoint);
        return cached.data;
      }

      if (age < this.CACHE_STALE) {
        logApiCacheEvent(true, endpoint);
        apiLogger.info('Cache hit (stale) for', endpoint, '— background refresh');
        this._backgroundRefresh(endpoint, options, cacheKey);
        return cached.data;
      }
    }

    if (!isMutation && this.pendingRequests.has(cacheKey)) {
      apiLogger.info('Reusing pending request for', endpoint);
      return this.pendingRequests.get(cacheKey);
    }

    logApiCacheEvent(false, endpoint);
    const requestPromise = this._makeRequest(endpoint, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      if (result.success && !isMutation) {
        this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fire-and-forget network refresh that updates the in-memory cache
   * and notifies any subscribers. Deduplicates with pending requests.
   */
  _backgroundRefresh(endpoint, options, cacheKey) {
    if (this.pendingRequests.has(cacheKey)) return;

    const promise = this._makeRequest(endpoint, options);
    this.pendingRequests.set(cacheKey, promise);

    promise
      .then((result) => {
        if (result.success) {
          this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
          this._notifySubscribers(cacheKey, result);
        }
      })
      .catch(() => {})
      .finally(() => this.pendingRequests.delete(cacheKey));
  }

  /**
   * Make the actual HTTP request
   */
  async _makeRequest(endpoint, options = {}) {
    const requestStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = this.baseTimeout,
      retries = this.maxRetries,
      showLogs = true,
      skipAuth = false,
      signal: externalSignal,
    } = options;

    try {
      if (externalSignal?.aborted) {
        return { success: false, error: 'Request cancelled', status: 0, isAborted: true };
      }

      const token = skipAuth ? null : await authService.getValidAccessToken();
      const user = await getUser();

      if (showLogs) {
        apiLogger.debug(method, endpoint, 'Consumer:', user?.identifier ? '[set]' : 'unknown', 'Token:', !!token);
        if (method === 'POST' && body) {
          apiLogger.debug('Request body keys:', body ? Object.keys(body) : []);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      if (externalSignal) {
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const tenantSubdomain = getTenantSubdomain ? getTenantSubdomain() : null;
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(tenantSubdomain && { 'X-Client': tenantSubdomain }),
        ...headers,
      };

      const response = await fetch(endpoint, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (showLogs) {
        apiLogger.debug('Response status', response.status);
      }

      // Handle different response statuses
      if (!response.ok) {
        return await this.handleErrorResponse(response, endpoint, retries, options);
      }

      const parsed = await response.json();
      const headersObj = Object.fromEntries(response.headers.entries());

      try {
        const schema = getSchemaForEndpoint(endpoint);
        if (schema && typeof schema.safeParse === 'function') {
          const toValidate = parsed.data !== undefined ? parsed : { data: parsed };
          const result = schema.safeParse(toValidate);
          if (!result.success) {
            if (__DEV__) {
              console.warn('[API Schema] Validation failed:', endpoint, result.error?.issues ?? result.error);
            }
            return {
              success: false,
              error: 'Invalid response format - please try again',
              status: response.status,
              schemaValidationFailed: true,
            };
          }
        }
      } catch (validationError) {
        if (__DEV__) {
          console.warn('[API Schema] Validation skipped (error):', validationError?.message ?? validationError);
        }
        // Proceed with response unchanged so API flow is never broken
      }

      if (showLogs) {
        apiLogger.debug('Response received, success:', !!parsed?.data);
      }

      const responsePayload = {
        success: true,
        data: parsed.data ?? parsed,
        rawBody: parsed,
        status: response.status,
        headers: headersObj,
      };

      const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - requestStartTime;
      if (durationMs > 1500) {
        reportApiLatency(endpoint, durationMs, method);
      }

      return responsePayload;

    } catch (error) {
      apiLogger.error('Request failed', method, endpoint, error?.message || error);
      
      if (error.name === 'AbortError') {
        if (externalSignal?.aborted) {
          return { success: false, error: 'Request cancelled', status: 0, isAborted: true };
        }
        apiLogger.warn('Request timeout', timeout, 'ms', endpoint);
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
   * Handle error responses. 401: refresh with lock + queue; max 1 retry per request; no retry for refresh endpoint.
   */
  async handleErrorResponse(response, endpoint, retries, originalOptions) {
    let errorDetails = '';
    try {
      const errorResponse = await response.json();
      errorDetails = errorResponse.message || errorResponse.error || '';
      if (__DEV__) apiLogger.debug('Error response', response.status, errorDetails);
    } catch (e) {}

    const errorMessage = `HTTP ${response.status}: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`;
    const isTokenExpired = response.status === 401 ||
      (typeof errorDetails === 'string' && (
        errorDetails.toLowerCase().includes('token_expired') ||
        errorDetails.toLowerCase().includes('token expired') ||
        errorDetails.toLowerCase().includes('invalid token') ||
        errorDetails.toLowerCase().includes('unauthorized')
      ));

    if (isTokenExpired) {
      const refreshEndpoint = API_ENDPOINTS.auth?.refresh?.() ?? '';
      const isRefreshRequest = originalOptions._skip401Refresh === true || (refreshEndpoint && endpoint === refreshEndpoint);

      if (originalOptions._retry === true) {
        return REQUIRES_REAUTH_RESPONSE;
      }
      if (isRefreshRequest) {
        return REQUIRES_REAUTH_RESPONSE;
      }

      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this._requestQueue.push({ resolve, reject, endpoint, options: { ...originalOptions } });
        });
      }

      this.isRefreshing = true;
      try {
        const refreshResult = await tokenService.refreshAccessToken();
        const success = refreshResult && refreshResult.success === true;
        const silentFail = refreshResult && refreshResult.success === false && refreshResult.silent === true;

        if (silentFail) {
          const existingToken = await tokenService.getAccessToken();
          if (existingToken) {
            const retryResult = await this._makeRequest(endpoint, { ...originalOptions, _retry: true });
            this.isRefreshing = false;
            this._requestQueue = [];
            return retryResult;
          }
        }

        if (success) {
          const currentResult = await this._makeRequest(endpoint, { ...originalOptions, _retry: true });
          const queue = this._requestQueue.slice();
          this._requestQueue = [];
          this.isRefreshing = false;
          for (const item of queue) {
            this._makeRequest(item.endpoint, { ...item.options, _retry: true })
              .then(item.resolve)
              .catch((err) => item.reject(err));
          }
          return currentResult;
        }

        await tokenService.clearTokens();
        triggerSessionExpired();
        const reauth = REQUIRES_REAUTH_RESPONSE;
        for (const item of this._requestQueue) {
          item.resolve(reauth);
        }
        this._requestQueue = [];
        this.isRefreshing = false;
        return reauth;
      } catch (refreshError) {
        if (refreshError && typeof refreshError === 'object' && refreshError.silent === true) {
          const existingToken = await tokenService.getAccessToken();
          if (existingToken) {
            const retryResult = await this._makeRequest(endpoint, { ...originalOptions, _retry: true });
            this.isRefreshing = false;
            this._requestQueue = [];
            return retryResult;
          }
        }
        await tokenService.clearTokens();
        triggerSessionExpired();
        for (const item of this._requestQueue) {
          item.resolve(REQUIRES_REAUTH_RESPONSE);
        }
        this._requestQueue = [];
        this.isRefreshing = false;
        return REQUIRES_REAUTH_RESPONSE;
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
      apiLogger.info('Retrying request, attempts left:', retries);
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
   * Get consumer data — above-the-fold, fail fast so cache or error shows sooner
   */
  async getConsumerData(consumerId) {
    const endpoint = API_ENDPOINTS.consumers.get(consumerId);
    return this.request(endpoint, {
      timeout: 10000,
      retries: 1,
    });
  }

  /**
   * Get consumer report (daily/monthly consumption or payment history)
   * @param {string} identifier - Consumer UID, consumer number, or other identifier
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {string} reportType - 'daily-consumption' | 'monthly-consumption' | 'payment-history'
   */
  async getConsumerReport(identifier, startDate, endDate, reportType) {
    const endpoint = API_ENDPOINTS.consumers.report(identifier, startDate, endDate, reportType);
    return this.request(endpoint, {
      timeout: 12000,
      retries: 1,
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
   * Get tickets stats (admin API)
   */
  async getTicketsStats(consumerNumber) {
    const endpoint = API_ENDPOINTS.tickets.stats(consumerNumber);
    return this.request(endpoint);
  }

  /**
   * Get tickets table (admin API: /admin/api/tickets/app/{appId}?consumerNumber=...&page=1&limit=10)
   */
  async getTicketsTable(appId, consumerNumber, page = 1, limit = 10) {
    const endpoint = API_ENDPOINTS.tickets.table(appId, consumerNumber, page, limit);
    return this.request(endpoint);
  }

  /**
   * Get ticket details by id (admin API)
   */
  async getTicketDetails(id) {
    const endpoint = API_ENDPOINTS.tickets.details(id);
    return this.request(endpoint);
  }

  /**
   * Create new ticket (POST body: subject, description, category, priority, consumerNumber)
   * Endpoint: https://api.bestinfra.app/gmr/api/tickets (with Bearer token)
   */
  async createTicket(payload) {
    const endpoint = API_ENDPOINTS.tickets.create();
    if (__DEV__) {
      apiLogger.debug('Create ticket', endpoint, 'payload keys:', payload ? Object.keys(payload) : []);
    }
    return this.request(endpoint, {
      method: 'POST',
      body: payload,
      showLogs: true,
    });
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

  /**
   * Fetch local/bundle asset (single exception: no auth, no JSON).
   * Use only for file:// or bundle URIs. All API traffic must use request().
   */
  async fetchLocal(uri) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(uri, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
