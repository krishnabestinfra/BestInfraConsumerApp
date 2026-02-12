/**
 * Centralized API Configuration
 * 
 * Manages all API endpoints for both development and production environments
 * Provides easy switching between local and hosted APIs
 */

import { ENVIRONMENT_CONFIG, getCurrentEnvironment } from './environment';

// Get current environment configuration
const currentEnv = getCurrentEnvironment();

// -----------------------------
// Tenant (subdomain) handling
// -----------------------------
// Default tenant for hosted APIs – will be overridden after login using middleware response
let currentTenantSubdomain = 'gmr';

export const setTenantSubdomain = (subdomain) => {
  if (!subdomain || typeof subdomain !== 'string') {
    return;
  }
  currentTenantSubdomain = subdomain.toLowerCase();
  if (__DEV__) {
    console.log('🔧 Tenant subdomain set to:', currentTenantSubdomain);
  }
};

export const getTenantSubdomain = () => currentTenantSubdomain;

// Helper: extract host from configured API base URL
// e.g. 'https://api.bestinfra.app/gmr/api' -> 'https://api.bestinfra.app'
const getApiHost = () => {
  const baseUrl = currentEnv.apiBaseUrl || ENVIRONMENT_CONFIG.production.apiBaseUrl;
  try {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    // Fallback to known host
    return 'https://api.bestinfra.app';
  }
};

const API_HOST = getApiHost();

// Build tenant-specific base URLs (for hosted / production mode)
const getTenantBaseUrl = () => {
  if (currentEnv.name === 'development') {
    // In development we keep using direct local URL
    return currentEnv.apiBaseUrl;
  }
  return `${API_HOST}/${currentTenantSubdomain}/api`;
};

const getTenantTicketsBaseUrl = () => {
  if (currentEnv.name === 'development') {
    return currentEnv.ticketsBaseUrl;
  }
  // Tickets also live under tenant API
  return `${API_HOST}/${currentTenantSubdomain}/api`;
};

const getTenantHealthUrl = () => {
  if (currentEnv.name === 'development') {
    return currentEnv.healthUrl;
  }
  return `${API_HOST}/${currentTenantSubdomain}/api/health`;
};

const getTenantPaymentUrl = () => {
  if (currentEnv.name === 'development') {
    return currentEnv.paymentUrl;
  }
  return `${API_HOST}/${currentTenantSubdomain}/api/payment`;
};

// Tenant-specific auth base URL (sub-app auth)
const getTenantAuthUrl = () => {
  if (currentEnv.name === 'development') {
    return currentEnv.authBaseUrl;
  }
  return `${API_HOST}/${currentTenantSubdomain}/api/sub-app/auth`;
};

// Middleware base URL for authentication (common for all clients)
// NOTE: Currently, the live backend exposes working auth at the tenant sub-app
// route (e.g. https://api.bestinfra.app/gmr/api/sub-app/auth/login), not at
// /middleware/auth/login. We keep this value for future use, but login/refresh/
// logout are wired to AUTH_URL to match the working backend.
const MIDDLEWARE_BASE_URL = currentEnv.middlewareBaseUrl || 'https://api.bestinfra.app/middleware';

// Current API configuration (exposed as dynamic getters so tenant can change at runtime)
export const API = {
  get BASE_URL() {
    return getTenantBaseUrl();
  },
  get TICKETS_URL() {
    return getTenantTicketsBaseUrl();
  },
  get AUTH_URL() {
    return getTenantAuthUrl();
  },
  get RESET_PASSWORD_URL() {
    return currentEnv.resetPasswordUrl;
  },
  get HEALTH_URL() {
    return getTenantHealthUrl();
  },
  get PAYMENT_URL() {
    return getTenantPaymentUrl();
  },
  // Expose middleware base for debugging if needed
  get MIDDLEWARE_BASE_URL() {
    return MIDDLEWARE_BASE_URL;
  },
};

// Debug API configuration (only in development)
if (__DEV__) {
  console.log('🔧 API Configuration Debug:');
  console.log(`   Environment: ${currentEnv.name}`);
  console.log(`   API.BASE_URL: ${API.BASE_URL}`);
  console.log(`   API.AUTH_URL: ${API.AUTH_URL}`);
  console.log(`   API.TICKETS_URL: ${API.TICKETS_URL}`);
}


export const API_ENDPOINTS = {

  consumers: {
    get: (id) => `${API.BASE_URL}/consumers/${id}`,
    list: () => `${API.BASE_URL}/consumers`,
    report: (identifier, startDate, endDate, reportType) =>
      `${API.BASE_URL}/consumers/${encodeURIComponent(identifier)}/report?startDate=${startDate}&endDate=${endDate}&reportType=${encodeURIComponent(reportType)}`,
    health: () => `${API.HEALTH_URL}/`,
  },
  
  // Authentication endpoints
  auth: {
    // Use the working sub-app auth base (e.g. https://api.bestinfra.app/gmr/api/sub-app/auth)
    // so that login works for current backend deployment.
    login: () => `${API.AUTH_URL}/login`,
    logout: () => `${API.AUTH_URL}/logout`,
    refresh: () => `${API.AUTH_URL}/refresh`,
    resetPassword: () => `${API.RESET_PASSWORD_URL}/reset-password`,

    // These remain tenant app-specific (currently GMR); they are not part of middleware auth spec
    forgotPassword: () => 'https://api.bestinfra.app/gmr/api/sub-app/auth/login-otp',
    verifyOtp: () => 'https://api.bestinfra.app/gmr/api/sub-app/auth/verify-otp',
    updatePassword: () => 'https://api.bestinfra.app/gmr/api/sub-app/auth/update-password',
  },
  
  tickets: {
    stats: (uid) => `${API.TICKETS_URL}/tickets/stats?uid=${uid}`,
    table: (uid) => `${API.TICKETS_URL}/tickets/table?uid=${uid}`,
    // Ticket creation is tenant-specific; use current tenant base URL
    create: () => `${API.TICKETS_URL}/tickets`,
    update: (id) => `${API.TICKETS_URL}/tickets/${id}`,
  },
  
  // Payment endpoints
  payment: {
    createLink: () => `${API.BASE_URL}/billing/payment/create-link`,
    verify: () => `${API.BASE_URL}/billing/payment/verify`,
    history: (uid) => `${API.PAYMENT_URL}/history?uid=${uid}`,
  },
  
  // Billing endpoints
  billing: {
    history: (uid) => `${API.BASE_URL}/billing?uid=${uid}`,
    invoice: (billNumber) => `${API.BASE_URL}/billing/invoice?billNumber=${billNumber}`,
  },
  

  notifications: {
    list: (page = 1, limit = 10) => `${API.BASE_URL}/notifications?page=${page}&limit=${limit}`,
    markRead: (id) => `${API.BASE_URL}/notifications/${id}/read`,
    markAllRead: (uid) => `${API.BASE_URL}/notifications/${uid}/read-all`,
    registerPushToken: () => `${API.BASE_URL}/notifications`,
  },
  

  lsdata: {
    consumption: (startDate, endDate, meterId) => `${API.BASE_URL}/lsdata/consumption?startDate=${startDate}&endDate=${endDate}&meterId=${meterId}`,
  },
  

  health: () => `${API.HEALTH_URL}/`,
  version: () => `${API.BASE_URL}/version`,
};


export const ENV_INFO = {
  isDevelopment: currentEnv.name === 'development',
  isProduction: currentEnv.name === 'production',
  currentEnvironment: currentEnv.name,
  apiBaseUrl: API.BASE_URL,
  ticketsBaseUrl: API.TICKETS_URL,
  environmentConfig: currentEnv,
};


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
