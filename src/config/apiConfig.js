/**
 * Centralized API Configuration
 * Production only. Base URLs from config; tenant subdomain applied at runtime.
 */

import { API_CONFIG, API_BASE_URL, getDefaultApiHost } from './config';
import { getCurrentEnvironment } from './environment';

const currentEnv = getCurrentEnvironment();

// -----------------------------
// Tenant (subdomain) handling
// -----------------------------
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

const getApiHost = () => {
  const baseUrl = currentEnv.apiBaseUrl || API_BASE_URL;
  try {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return getDefaultApiHost();
  }
};

const API_HOST = getApiHost();

const getTenantBaseUrl = () => `${API_HOST}/${currentTenantSubdomain}/api`;
const getTenantTicketsBaseUrl = () => `${API_HOST}/${currentTenantSubdomain}/api`;
// Admin API for ticket creation (POST https://api.bestinfra.app/admin/api/tickets)
const getAdminTicketsBaseUrl = () => `${API_HOST}/admin/api`;
const getTenantHealthUrl = () => `${API_HOST}/${currentTenantSubdomain}/api/health`;
const getTenantPaymentUrl = () => `${API_HOST}/${currentTenantSubdomain}/api/payment`;
const getTenantAuthUrl = () => `${API_HOST}/${currentTenantSubdomain}/api/sub-app/auth`;

const MIDDLEWARE_BASE_URL = API_CONFIG.middlewareBaseUrl;

// Current API configuration (exposed as dynamic getters so tenant can change at runtime)
export const API = {
  get BASE_URL() {
    return getTenantBaseUrl();
  },
  get TICKETS_URL() {
    return getTenantTicketsBaseUrl();
  },
  get ADMIN_TICKETS_URL() {
    return getAdminTicketsBaseUrl();
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

    // OTP login: generate OTP (registered email only) and verify OTP
    loginOtp: () => `${API.AUTH_URL}/login-otp`,
    verifyOtp: () => `${API.AUTH_URL}/verify-otp`,
    forgotPassword: () => `${API.AUTH_URL}/login-otp`,
    updatePassword: () => `${API.AUTH_URL}/update-password`,
  },
  
  tickets: {
    stats: (consumerNumber) => `${API.ADMIN_TICKETS_URL}/tickets/stats?consumerNumber=${encodeURIComponent(consumerNumber)}`,
    table: (appId, consumerNumber, page = 1, limit = 10) =>
      `${API.ADMIN_TICKETS_URL}/tickets/app/${appId}?consumerNumber=${encodeURIComponent(consumerNumber)}&page=${page}&limit=${limit}`,
    create: () => `${API.ADMIN_TICKETS_URL}/tickets`,
    details: (id) => `${API.ADMIN_TICKETS_URL}/tickets/${id}`,
    update: (id) => `${API.ADMIN_TICKETS_URL}/tickets/${id}`,
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
