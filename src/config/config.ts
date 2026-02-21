/**
 * Centralized environment config. Single source for API base URL and env-specific values.
 *
 * Responsibility: Expose getApiBaseUrl(), getEnvName(), API_CONFIG, getRazorpayKeyId/Secret, getDefaultApiHost.
 * All values from Constants.expoConfig.extra (injected at build by app.config.js from .env.*). No process.env in app.
 *
 * Flow: app.config.js loads .env.<env> and .env, sets extra; config.ts reads extra and exports constants/functions.
 * apiConfig and apiClient consume config only; no hardcoded URLs in app code.
 */

import Constants from 'expo-constants';

type ExpoExtra = {
  apiBaseUrl?: string;
  env?: string;
  razorpayKeyId?: string;
  razorpaySecretKey?: string;
};

const DEFAULT_PRODUCTION_HOST = 'https://api.bestinfra.app';
const DEFAULT_API_BASE = `${DEFAULT_PRODUCTION_HOST}/gmr/api`;

function getExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra as ExpoExtra) ?? {};
}

/**
 * API base URL for the current environment (from build-time extra).
 * All envs use production URL unless overridden in .env and EAS.
 */
export function getApiBaseUrl(): string {
  const base = getExtra().apiBaseUrl?.trim();
  return base || DEFAULT_API_BASE;
}

/**
 * Current environment name: 'development' | 'staging' | 'production'.
 */
export function getEnvName(): string {
  const name = getExtra().env?.trim()?.toLowerCase();
  if (name === 'development' || name === 'staging' || name === 'production') return name;
  return 'production';
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Host only (e.g. https://api.bestinfra.app) for fallbacks/parsing.
 */
export function getDefaultApiHost(): string {
  try {
    const u = new URL(getApiBaseUrl());
    return `${u.protocol}//${u.host}`;
  } catch {
    return DEFAULT_PRODUCTION_HOST;
  }
}

export const API_CONFIG = {
  name: getEnvName(),
  apiBaseUrl: getApiBaseUrl(),
  ticketsBaseUrl: getApiBaseUrl(),
  authBaseUrl: `${getDefaultApiHost()}/gmr/api/sub-app/auth`,
  resetPasswordUrl: `${getDefaultApiHost()}/gmr/api/auth`,
  healthUrl: `${getDefaultApiHost()}/gmr/api/health`,
  paymentUrl: `${getDefaultApiHost()}/gmr/api/payment`,
  middlewareBaseUrl: `${getDefaultApiHost()}/middleware`,
  requestTimeout: 15000,
  maxRetryAttempts: 2,
  cacheEnabled: true,
  cacheDuration: 600000,
};

export function getRazorpayKeyId(): string {
  return getExtra().razorpayKeyId ?? '';
}

export function getRazorpaySecretKey(): string {
  return getExtra().razorpaySecretKey ?? '';
}

export default API_CONFIG;
