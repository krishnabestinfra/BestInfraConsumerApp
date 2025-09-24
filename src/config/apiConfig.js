/**
 * Centralized API Configuration
 * 
 * Manages all API endpoints for both development and production environments
 * Provides easy switching between local and hosted APIs
 */

import { ENVIRONMENT_CONFIG, getCurrentEnvironment } from './environment';

// Get current environment configuration
const currentEnv = getCurrentEnvironment();

// API Base URLs
const API_CONFIG = {
  // Development (Local) Configuration
  development: {
    BASE_URL: ENVIRONMENT_CONFIG.development.apiBaseUrl,
    TICKETS_URL: ENVIRONMENT_CONFIG.development.ticketsBaseUrl,
    AUTH_URL: ENVIRONMENT_CONFIG.development.authBaseUrl,
    RESET_PASSWORD_URL: ENVIRONMENT_CONFIG.development.resetPasswordUrl,
    HEALTH_URL: ENVIRONMENT_CONFIG.development.healthUrl,
    PAYMENT_URL: ENVIRONMENT_CONFIG.development.paymentUrl,
  },
  
  // Production (Hosted) Configuration
  production: {
    BASE_URL: ENVIRONMENT_CONFIG.production.apiBaseUrl,
    TICKETS_URL: ENVIRONMENT_CONFIG.production.ticketsBaseUrl,
    AUTH_URL: ENVIRONMENT_CONFIG.production.authBaseUrl,
    RESET_PASSWORD_URL: ENVIRONMENT_CONFIG.production.resetPasswordUrl,
    HEALTH_URL: ENVIRONMENT_CONFIG.production.healthUrl,
    PAYMENT_URL: ENVIRONMENT_CONFIG.production.paymentUrl,
  }
};

// Get current environment configuration
const getCurrentConfig = () => {
  // You can override this with environment variables or user settings
  const environment = currentEnv.name;
  return API_CONFIG[environment];
};

// Current API configuration
export const API = getCurrentConfig();

// Debug API configuration
console.log('🔧 API Configuration Debug:');
console.log(`   Environment: ${currentEnv.name}`);
console.log(`   API.BASE_URL: ${API.BASE_URL}`);
console.log(`   API.AUTH_URL: ${API.AUTH_URL}`);
console.log(`   API.TICKETS_URL: ${API.TICKETS_URL}`);

// Specific endpoint builders
export const API_ENDPOINTS = {
  // Consumer endpoints
  consumers: {
    get: (id) => `${API.BASE_URL}/consumers/${id}`,
    list: () => `${API.BASE_URL}/consumers`,
    health: () => `${API.HEALTH_URL}/`,
  },
  
  // Authentication endpoints
  auth: {
    login: () => `${API.AUTH_URL}/login`,
    logout: () => `${API.AUTH_URL}/logout`,
    refresh: () => `${API.AUTH_URL}/refresh`,
    resetPassword: () => `${API.RESET_PASSWORD_URL}/reset-password`,
    forgotPassword: () => `${API.RESET_PASSWORD_URL}/forgot-password`,
  },
  
  // Tickets endpoints
  tickets: {
    stats: (uid) => `${API.TICKETS_URL}/tickets/stats?uid=${uid}`,
    table: (uid) => `${API.TICKETS_URL}/tickets/table?uid=${uid}`,
    create: () => `${API.TICKETS_URL}/tickets/create`,
    update: (id) => `${API.TICKETS_URL}/tickets/${id}`,
  },
  
  // Payment endpoints
  payment: {
    createLink: () => `${API.PAYMENT_URL}/create-link`,
    verify: () => `${API.PAYMENT_URL}/verify`,
    history: (uid) => `${API.PAYMENT_URL}/history?uid=${uid}`,
  },
  
  // Notifications endpoints
  notifications: {
    list: (uid) => `${API.BASE_URL}/notifications?uid=${uid}`,
    markRead: (id) => `${API.BASE_URL}/notifications/${id}/read`,
  },
  
  // Utility endpoints
  health: () => `${API.HEALTH_URL}/`,
  version: () => `${API.BASE_URL}/version`,
};

// Environment information
export const ENV_INFO = {
  isDevelopment: currentEnv.name === 'development',
  isProduction: currentEnv.name === 'production',
  currentEnvironment: currentEnv.name,
  apiBaseUrl: API.BASE_URL,
  ticketsBaseUrl: API.TICKETS_URL,
  environmentConfig: currentEnv,
};

// Helper functions
export const getApiUrl = (endpoint) => {
  return endpoint;
};

export const isHostedApi = () => {
  return API.BASE_URL.includes('api.bestinfra.app');
};

export const isLocalApi = () => {
  return API.BASE_URL.includes('192.168.1.83') || API.BASE_URL.includes('localhost') || API.BASE_URL.includes('127.0.0.1');
};

// Debug information
export const getApiDebugInfo = () => {
  return {
    environment: ENV_INFO.currentEnvironment,
    baseUrl: API.BASE_URL,
    ticketsUrl: API.TICKETS_URL,
    isHosted: isHostedApi(),
    isLocal: isLocalApi(),
    endpoints: API_ENDPOINTS,
  };
};

export default API;
