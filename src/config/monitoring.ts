/**
 * Crash monitoring – production-only, fail-safe.
 *
 * Responsibility: Initialize Sentry when env === 'production' and DSN set; capture errors from ErrorBoundary;
 * beforeSend sanitizes headers/body/user so no tokens or credentials are sent.
 *
 * Flow: App.js calls initializeMonitoring() once; ErrorBoundary in componentDidCatch calls captureError(error, errorInfo).
 * If init or capture throws, catch and continue – monitoring must never crash the app.
 * No process.env in app; DSN and env from Constants.expoConfig.extra (injected at build).
 */

import Constants from 'expo-constants';
import { getEnvName } from './config';

type ExpoExtra = { sentryDsn?: string };
const MASK = '[REDACTED]';
const SENSITIVE_KEYS = [
  'authorization', 'Authorization', 'bearer', 'Bearer',
  'access_token', 'accessToken', 'refresh_token', 'refreshToken',
  'password', 'Password', 'secret', 'token', 'Token',
  'cookie', 'Cookie', 'x-api-key', 'X-Api-Key',
];

let Sentry: typeof import('@sentry/react-native') | null = null;
let initialized = false;

try {
  const mod = require('@sentry/react-native');
  Sentry = mod?.default ?? mod;
} catch {
  Sentry = null;
}

function getSentryDsn(): string {
  const extra = (Constants.expoConfig?.extra as ExpoExtra) ?? {};
  return (extra.sentryDsn ?? '').trim();
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length > 20 && /^[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\./.test(value)) return MASK;
    if (value.toLowerCase().includes('bearer ') || value.toLowerCase().includes('token')) return MASK;
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_KEYS.some(s => lower.includes(s.toLowerCase()))) {
        out[k] = MASK;
      } else {
        out[k] = sanitizeValue(o[k]);
      }
    }
    return out;
  }
  return value;
}

function beforeSendImpl(event: Record<string, unknown>, _hint: unknown): Record<string, unknown> | null {
  try {
    const e = { ...event };
    if (e.request) {
      const req = e.request as Record<string, unknown>;
      if (req.headers) req.headers = sanitizeValue(req.headers) as Record<string, string>;
      if (req.data) req.data = sanitizeValue(req.data);
      if (req.cookies) req.cookies = MASK;
    }
    if (e.extra) e.extra = sanitizeValue(e.extra) as Record<string, unknown>;
    if (e.contexts) e.contexts = sanitizeValue(e.contexts) as Record<string, unknown>;
    if (e.user) {
      const u = e.user as Record<string, unknown>;
      if (u.email) u.email = MASK;
      if (u.ip_address) u.ip_address = MASK;
    }
    return e;
  } catch {
    return event;
  }
}

/**
 * Call once from App.js before rendering. Safe to call multiple times; only inits once.
 * Only runs in production and when DSN is set. Never throws.
 */
export function initializeMonitoring(): void {
  if (initialized) return;
  try {
    const env = getEnvName();
    if (env !== 'production') {
      if (__DEV__) {
        console.warn('[Monitoring] Disabled in non-production:', env);
      }
      return;
    }
    const dsn = getSentryDsn();
    if (!dsn) {
      if (__DEV__) {
        console.warn('[Monitoring] No sentryDsn in extra; skipping.');
      }
      return;
    }
    if (!Sentry) {
      if (__DEV__) {
        console.warn('[Monitoring] Sentry SDK not available; skipping.');
      }
      return;
    }
    Sentry.init({
      dsn,
      enabled: true,
      debug: false,
      environment: env,
      beforeSend: ((event: unknown, hint: unknown) => beforeSendImpl(event as Record<string, unknown>, hint)) as unknown as NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSend'],
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
    });
    initialized = true;
  } catch (err) {
    if (__DEV__) {
      console.warn('[Monitoring] Init failed (app continues):', err);
    }
  }
}

/**
 * Call from ErrorBoundary componentDidCatch. Safe; never throws.
 */
export function captureError(error: Error, errorInfo?: { componentStack?: string }): void {
  if (!initialized || !Sentry) return;
  try {
    const extra = errorInfo?.componentStack ? { componentStack: errorInfo.componentStack } : undefined;
    Sentry.captureException(error, extra ? { extra } : undefined);
  } catch {
    // ignore
  }
}

export default { initializeMonitoring, captureError };
