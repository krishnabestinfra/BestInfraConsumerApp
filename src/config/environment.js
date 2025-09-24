/**
 * Environment Configuration
 * 
 * Manages environment-specific settings for the application
 * Supports both development and production configurations
 */

// Environment detection - can be overridden by environment variables
// Force production mode by default to use hosted API
const forceProduction = process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' || process.env.EXPO_PUBLIC_ENVIRONMENT === undefined;
const forceDevelopment = process.env.EXPO_PUBLIC_ENVIRONMENT === 'development';

// TEMPORARY FIX: Force production mode to use hosted API
const isDevelopment = false; // Force to false to use hosted API
const isProduction = true; // Force to true to use hosted API

// Debug environment detection
console.log('🔧 Environment Detection Debug:');
console.log(`   __DEV__: ${__DEV__}`);
console.log(`   EXPO_PUBLIC_ENVIRONMENT: ${process.env.EXPO_PUBLIC_ENVIRONMENT}`);
console.log(`   forceProduction: ${forceProduction}`);
console.log(`   forceDevelopment: ${forceDevelopment}`);
console.log(`   isDevelopment: ${isDevelopment} (FORCED)`);
console.log(`   isProduction: ${isProduction} (FORCED)`);

// Environment configuration with environment variable support
export const ENVIRONMENT_CONFIG = {
  development: {
    name: 'development',
    apiBaseUrl: process.env.EXPO_PUBLIC_DEV_API_BASE_URL || 'http://192.168.1.83/api',
    ticketsBaseUrl: process.env.EXPO_PUBLIC_DEV_TICKETS_BASE_URL || 'http://192.168.1.83:4255/api',
    authBaseUrl: process.env.EXPO_PUBLIC_DEV_AUTH_BASE_URL || 'http://192.168.1.83/api/sub-app/auth',
    resetPasswordUrl: process.env.EXPO_PUBLIC_DEV_RESET_PASSWORD_URL || 'http://192.168.1.83:3000/api/v1/auth',
    healthUrl: process.env.EXPO_PUBLIC_DEV_HEALTH_URL || 'http://192.168.1.83/api/health',
    paymentUrl: process.env.EXPO_PUBLIC_DEV_PAYMENT_URL || 'http://192.168.1.83/api/payment',
    debugApiCalls: process.env.EXPO_PUBLIC_DEBUG_API_CALLS === 'true' || true,
    logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL || 'debug',
    cacheEnabled: true,
    cacheDuration: 300000, // 5 minutes
    requestTimeout: 10000,
    maxRetryAttempts: 3,
  },
  
  production: {
    name: 'production',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.bestinfra.app/v2gmr/api',
    ticketsBaseUrl: process.env.EXPO_PUBLIC_TICKETS_BASE_URL || 'https://api.bestinfra.app/v2gmr/api',
    authBaseUrl: process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'https://api.bestinfra.app/v2gmr/api/sub-app/auth',
    resetPasswordUrl: process.env.EXPO_PUBLIC_RESET_PASSWORD_URL || 'https://api.bestinfra.app/v2gmr/api/auth',
    healthUrl: process.env.EXPO_PUBLIC_HEALTH_URL || 'https://api.bestinfra.app/v2gmr/api/health',
    paymentUrl: process.env.EXPO_PUBLIC_PAYMENT_URL || 'https://api.bestinfra.app/v2gmr/api/payment',
    debugApiCalls: process.env.EXPO_PUBLIC_DEBUG_API_CALLS === 'true' || false,
    logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL || 'error',
    cacheEnabled: true,
    cacheDuration: 600000, // 10 minutes
    requestTimeout: 15000,
    maxRetryAttempts: 2,
  }
};

// Get current environment configuration
export const getCurrentEnvironment = () => {
  const config = isDevelopment ? ENVIRONMENT_CONFIG.development : ENVIRONMENT_CONFIG.production;
  
  // Log configuration for debugging
  console.log('🔧 Environment Configuration:');
  console.log(`   Mode: ${config.name}`);
  console.log(`   API Base URL: ${config.apiBaseUrl}`);
  console.log(`   Tickets URL: ${config.ticketsBaseUrl}`);
  console.log(`   Auth URL: ${config.authBaseUrl}`);
  console.log(`   Debug API Calls: ${config.debugApiCalls}`);
  
  return config;
};

// Current environment
export const CURRENT_ENV = getCurrentEnvironment();

// Environment helpers
export const isDev = () => isDevelopment;
export const isProd = () => isProduction;

// Debug helpers
export const shouldLogApiCalls = () => CURRENT_ENV.debugApiCalls;
export const getLogLevel = () => CURRENT_ENV.logLevel;

// Cache configuration
export const getCacheConfig = () => ({
  enabled: CURRENT_ENV.cacheEnabled,
  duration: CURRENT_ENV.cacheDuration,
});

// Network configuration
export const getNetworkConfig = () => ({
  timeout: CURRENT_ENV.requestTimeout,
  maxRetries: CURRENT_ENV.maxRetryAttempts,
});

export default CURRENT_ENV;
