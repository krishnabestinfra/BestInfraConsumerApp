/**
 * Environment – production only. Re-exports from config. No switching, no process.env.
 */

import { API_CONFIG } from './config';

export const ENVIRONMENT_CONFIG = { production: API_CONFIG };

export const getCurrentEnvironment = () => API_CONFIG;

export const CURRENT_ENV = API_CONFIG;

export const isDev = () => false;
export const isProd = () => true;

export const shouldLogApiCalls = () => false;
export const getLogLevel = () => 'error';

export const getCacheConfig = () => ({
  enabled: API_CONFIG.cacheEnabled,
  duration: API_CONFIG.cacheDuration,
});

export const getNetworkConfig = () => ({
  timeout: API_CONFIG.requestTimeout,
  maxRetries: API_CONFIG.maxRetryAttempts,
});

export default CURRENT_ENV;
