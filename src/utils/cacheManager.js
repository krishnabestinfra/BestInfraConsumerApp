/**
 * Unified Cache Manager
 * 
 * Handles all caching, preloading, and data persistence for the app.
 * Consolidates functionality from the old cacheManager.js and preloader.js
 * 
 * Features:
 * - In-memory caching for instant access
 * - AsyncStorage persistence for offline support
 * - Background data refresh
 * - Preloading for critical data
 * - Cache invalidation and cleanup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API, API_ENDPOINTS } from '../constants/constants';
import { getUser } from './storage';
import { apiClient } from '../services/apiClient';
import { isDemoUser, getDemoDashboardConsumerData } from '../constants/demoData';

// Cache configuration
const CACHE_KEYS = {
  CONSUMER_DATA: 'cached_consumer_data',
  TICKET_STATS: 'cached_ticket_stats',
  TICKET_TABLE: 'cached_ticket_table',
  CACHE_TIMESTAMP: 'cache_timestamp',
  CONSUMER_IDENTIFIER: 'current_consumer_identifier'
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (fresh threshold)
const STALE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours (max age before eviction)
const PRELOAD_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for preloaded data

class UnifiedCacheManager {
  constructor() {
    this.cache = new Map();
    this.isInitialized = false;
    this.preloadPromises = new Map();
  }

  /**
   * Initialize cache from AsyncStorage
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.CONSUMER_DATA);
      const timestamp = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
      const identifier = await AsyncStorage.getItem(CACHE_KEYS.CONSUMER_IDENTIFIER);
      
      if (cachedData && timestamp && identifier) {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = parseInt(timestamp);
        const age = Date.now() - cacheTime;

        if (age < STALE_MAX_AGE) {
          this.cache.set(identifier, {
            data: parsedData,
            timestamp: cacheTime
          });
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Cache initialization error:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Get cached data instantly
   */
  async getCachedData(key, identifier = null) {
    await this.initialize();
    
    const cacheKey = identifier ? `${key}_${identifier}` : key;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < STALE_MAX_AGE) {
        return {
          success: true,
          data: cached.data,
          fromCache: true,
          stale: age >= CACHE_DURATION,
          timestamp: cached.timestamp
        };
      } else {
        this.cache.delete(cacheKey);
        await this.clearStoredCache(cacheKey);
      }
    }
    
    return { success: false, fromCache: false, stale: false };
  }

  /**
   * Store data in cache
   */
  async setCachedData(key, data, identifier = null) {
    await this.initialize();
    
    const cacheKey = identifier ? `${key}_${identifier}` : key;
    const timestamp = Date.now();
    const cacheEntry = { data, timestamp };
    
    this.cache.set(cacheKey, cacheEntry);
    
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, timestamp.toString());
      if (identifier) {
        await AsyncStorage.setItem(CACHE_KEYS.CONSUMER_IDENTIFIER, identifier);
      }
    } catch (error) {
      console.error('Error storing cache:', error);
    }
  }

  /**
   * Fetch fresh data from API
   */
  async fetchFreshData(endpoint, identifier = null) {
    try {
      const user = await getUser();
      const effectiveIdentifier = identifier || user?.identifier || 'unknown';

      // For demo users, completely skip network calls and return
      // rich local demo dashboard data instead of hitting the backend.
      if (isDemoUser(effectiveIdentifier)) {
        console.log('🟡 Demo user detected - using local demo data in cacheManager for', effectiveIdentifier);
        const demoData = getDemoDashboardConsumerData(effectiveIdentifier);
        return {
          success: true,
          data: demoData,
          fromCache: false,
          timestamp: Date.now(),
          demo: true,
          skippedNetwork: true,
        };
      }

      console.log('🔄 Fetching fresh data from API:');
      console.log(`   Endpoint: ${endpoint}`);
      console.log(`   Consumer: ${effectiveIdentifier}`);

      const result = await apiClient.request(endpoint, { method: 'GET' });
      console.log(`   Response status: ${result.status}`);

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        throw new Error(result.error || `HTTP ${result.status}`);
      }
      const resultData = result.data ?? result.rawBody ?? result;
      const data = resultData?.data ?? resultData;
      console.log('✅ API Response received');
      
      return {
        success: true,
        data,
        fromCache: false,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Error fetching fresh data:', error);
      return { 
        success: false, 
        fromCache: false, 
        error: error.message,
        status: error.message.includes('HTTP') ? parseInt(error.message.match(/\d+/)?.[0]) : 0
      };
    }
  }

  /**
   * Get data with caching strategy
   */
  async getData(key, endpoint, identifier = null, forceRefresh = false) {
    await this.initialize();
    
    if (forceRefresh) {
      const result = await this.fetchFreshData(endpoint, identifier);
      if (result.success) {
        await this.setCachedData(key, result.data, identifier);
      }
      return result;
    }
    
    // Try cache first
    const cachedResult = await this.getCachedData(key, identifier);
    if (cachedResult.success) {
      // Trigger background refresh if cache is old
      const now = Date.now();
      const cacheAge = now - cachedResult.timestamp;
      
      if (cacheAge > 5 * 60 * 1000) { // 5 minutes
        this.backgroundRefresh(key, endpoint, identifier).catch(error => {
          console.error('Background refresh failed:', error);
        });
      }
      
      return cachedResult;
    }
    
    // No valid cache, fetch fresh data
    const result = await this.fetchFreshData(endpoint, identifier);
    if (result.success) {
      await this.setCachedData(key, result.data, identifier);
    }
    
    return result;
  }

  /**
   * Background refresh without blocking UI
   */
  async backgroundRefresh(key, endpoint, identifier = null) {
    try {
      const result = await this.fetchFreshData(endpoint, identifier);
      if (result.success) {
        await this.setCachedData(key, result.data, identifier);
      }
      return result;
    } catch (error) {
      console.error('Background refresh failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Preload critical data on app start
   */
  async preloadCriticalData() {
    try {
      const user = await getUser();
      if (user && user.identifier) {
        const identifier = user.identifier;
        
        // Preload consumer data
        await this.getData(
          CACHE_KEYS.CONSUMER_DATA,
          API_ENDPOINTS.consumers.get(identifier),
          identifier
        );
        
        // Preload ticket stats
        await this.getData(
          CACHE_KEYS.TICKET_STATS,
          API_ENDPOINTS.tickets.stats(identifier),
          identifier
        );
        
        // Preload ticket table (admin API: /admin/api/tickets/app/{appId}?consumerNumber=...&page=1&limit=10)
        await this.getData(
          CACHE_KEYS.TICKET_TABLE,
          API_ENDPOINTS.tickets.table(1, identifier, 1, 10),
          identifier
        );
        
        console.log('✅ Critical data preloaded successfully');
      }
    } catch (error) {
      console.error('Preload error:', error);
    }
  }

  /**
   * Clear cache for specific key
   */
  async clearCache(key, identifier = null) {
    const cacheKey = identifier ? `${key}_${identifier}` : key;
    this.cache.delete(cacheKey);
    await this.clearStoredCache(cacheKey);
  }

  /**
   * Clear all cached data
   */
  async clearAllCache() {
    this.cache.clear();
    try {
      await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear stored cache
   */
  async clearStoredCache(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing stored cache:', error);
    }
  }

  /**
   * Check if data is cached and valid
   */
  async hasValidCache(key, identifier = null) {
    await this.initialize();
    const cacheKey = identifier ? `${key}_${identifier}` : key;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const now = Date.now();
      return (now - cached.timestamp) < CACHE_DURATION;
    }
    return false;
  }
}

// Export singleton instance
export const cacheManager = new UnifiedCacheManager();

// Export utility functions for easy use
export const getCachedConsumerData = (identifier) => 
  cacheManager.getCachedData(CACHE_KEYS.CONSUMER_DATA, identifier);

export const getConsumerDataWithCache = (identifier, forceRefresh = false) => 
  cacheManager.getData(
    CACHE_KEYS.CONSUMER_DATA,
    API_ENDPOINTS.consumers.get(identifier),
    identifier,
    forceRefresh
  );

export const backgroundSyncConsumerData = (identifier) => 
  cacheManager.backgroundRefresh(
    CACHE_KEYS.CONSUMER_DATA,
    API_ENDPOINTS.consumers.get(identifier),
    identifier
  );

export const getCachedTicketStats = (identifier) => 
  cacheManager.getCachedData(CACHE_KEYS.TICKET_STATS, identifier);

export const getCachedTicketTable = (identifier) => 
  cacheManager.getCachedData(CACHE_KEYS.TICKET_TABLE, identifier);

export const clearAllCache = () => cacheManager.clearAllCache();
export const hasValidCache = (identifier) => 
  cacheManager.hasValidCache(CACHE_KEYS.CONSUMER_DATA, identifier);