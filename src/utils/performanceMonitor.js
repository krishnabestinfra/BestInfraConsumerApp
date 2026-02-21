/**
 * Lightweight performance monitoring: API latency and cold start.
 *
 * Responsibility: reportApiLatency(endpoint, durationMs, method) for slow requests (>1500ms);
 * reportColdStart() when app is ready (e.g. after fonts). Logs in __DEV__; production can extend to Sentry.
 * No heavy tracing; no sensitive payloads; does not affect response flow or create memory leaks.
 */

const SLOW_API_THRESHOLD_MS = 1500;

const _appStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * Report API request latency. Call from apiClient after response.
 * Logs in dev; in production can send to Sentry/monitoring (non-blocking).
 * @param {string} endpoint - Request URL (do not log full URL with query params if sensitive)
 * @param {number} durationMs - Elapsed time in milliseconds
 * @param {string} method - HTTP method
 */
export function reportApiLatency(endpoint, durationMs, method = 'GET') {
  if (durationMs < SLOW_API_THRESHOLD_MS) return;
  try {
    const path = typeof endpoint === 'string' ? endpoint.replace(/\?.*$/, '') : '';
    if (__DEV__) {
      console.warn(`[Perf] Slow API (${Math.round(durationMs)}ms): ${method} ${path}`);
    }
    if (!__DEV__ && typeof global !== 'undefined' && global.__sentryPerformanceCapture) {
      global.__sentryPerformanceCapture('api.latency', { endpoint: path, durationMs, method });
    }
  } catch (_) {
    // never throw
  }
}

/**
 * Record app cold start time. Call once when app is "ready" (e.g. after fonts loaded).
 * Uses module load time if no startMark provided.
 * @param {number} [startMark] - Time from app load (optional; defaults to first import time)
 */
export function reportColdStart(startMark) {
  try {
    const start = startMark != null ? startMark : _appStartTime;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = now - start;
    if (__DEV__ && durationMs >= 0) {
      console.log(`[Perf] Cold start: ${Math.round(durationMs)}ms`);
    }
  } catch (_) {}
}

export default { reportApiLatency, reportColdStart };
