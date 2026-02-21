# Architecture Overview

Enterprise-grade Expo React Native app: single API gateway, token refresh, env separation, crash monitoring, and optional response validation.

---

## 1. Networking Flow

```
Screens / Context
       │
       ▼
  apiService / authService / paymentService
       │
       ▼
  apiClient.request(endpoint, options)
       │
       ├── GET cache check (30s TTL) ──► return cached
       ├── Pending request reuse (GET) ──► await same promise
       │
       ▼
  _makeRequest()
       │
       ├── getValidAccessToken() [authService]
       ├── fetch(endpoint, { headers: Authorization, X-Client })
       │
       ├── 2xx ──► optional Zod validation (apiSchemaMap) ──► return { success, data }
       ├── 401 ──► token refresh (lock + queue) ──► retry or session expired
       ├── 4xx/5xx ──► normalized error response
       │
       ▼
  reportApiLatency() if >1500ms
```

- **Single gateway:** All backend calls go through `apiClient`. No raw `fetch` for API in screens.
- **Base URL:** From `config.ts` → `Constants.expoConfig.extra` (injected at build by `app.config.js`). `apiConfig.js` adds tenant subdomain and exposes `API_ENDPOINTS`.

---

## 2. Token Refresh Flow

- **401 on any request:** apiClient does not retry the failed request immediately. It enters the refresh path.
- **Refresh lock:** `isRefreshing` ensures only one refresh at a time. Concurrent 401s push `{ resolve, reject, endpoint, options }` onto `_requestQueue`.
- **tokenService.refreshAccessToken()** calls authService; uses refresh token; returns `{ success, accessToken?, refreshToken? }` or `{ success: false, silent? }`.
- **On success:** New tokens stored via authService; queue is replayed (each queued request retried with new token); lock released.
- **On failure (e.g. 404 on refresh):** tokenService clears tokens; `triggerSessionExpired()` runs (event/callback); all queued requests resolve with `REQUIRES_REAUTH_RESPONSE`; lock released.
- **No retry for refresh endpoint:** If the request that got 401 was the refresh call itself, we do not retry; we resolve with session expired.
- **Max one retry per original request:** `_retry` flag prevents infinite retry loops.

---

## 3. Error Handling Flow

- **Network/timeout:** apiClient returns `{ success: false, error: string, status: 0|408, isNetworkError?|isTimeout? }`.
- **4xx/5xx:** handleErrorResponse returns normalized `{ success: false, error, status }`; 403/404 have specific flags; 5xx may trigger one retry.
- **Schema validation (Zod):** If a schema is mapped for the endpoint in `apiSchemaMap.js`, response is validated with `schema.safeParse()`. On failure we return `{ success: false, error: 'Invalid response format...', schemaValidationFailed: true }` and do not pass data to screens.
- **ErrorBoundary:** Catches render errors; calls `captureError(error, errorInfo)` from monitoring (production only); shows fallback UI; does not navigate.

---

## 4. Environment Separation

- **Build-time only:** `app.config.js` loads `.env.<development|staging|production>` (by `APP_ENV` / `EAS_BUILD_PROFILE`), then `.env` with override: false. It sets `extra.apiBaseUrl`, `extra.env`, `extra.razorpayKeyId`, `extra.razorpaySecretKey`, `extra.sentryDsn`.
- **Runtime:** No `process.env` in app code. `config.ts` reads `Constants.expoConfig.extra` and exposes `getApiBaseUrl()`, `getEnvName()`, `API_CONFIG`, Razorpay getters. `apiConfig.js` and `environment.js` use config for URLs and env name.
- **EAS:** `eas.json` profiles set `env.APP_ENV` (development / staging / production) so the correct `.env.*` is used per build.

---

## 5. Monitoring Integration

- **Crash monitoring (Sentry):** Initialized in `monitoring.ts` only when `getEnvName() === 'production'` and `extra.sentryDsn` is set. `beforeSend` sanitizes headers/body/user. ErrorBoundary calls `captureError()`. Init and capture are wrapped in try/catch so monitoring never crashes the app.
- **Performance:** `performanceMonitor.js` records cold start (log in __DEV__) and API latency. apiClient calls `reportApiLatency(endpoint, durationMs, method)` for requests over 1500ms; in __DEV__ logs slow APIs; in production can be extended to send to Sentry or another backend.

---

## 6. File Responsibilities

| File | Responsibility |
|------|----------------|
| `config.ts` | Single source for API base URL and env name from `extra`. No process.env. |
| `apiConfig.js` | Tenant subdomain, `API_ENDPOINTS`, getters for BASE_URL / AUTH_URL / etc. |
| `apiClient.js` | Single HTTP gateway: auth, timeout, retry, 401 refresh queue, Zod validation, latency reporting. |
| `tokenService.js` | Token read/write and refresh; used by apiClient only; no navigation. |
| `monitoring.ts` | Sentry init (production), captureError, beforeSend sanitization. |
| `performanceMonitor.js` | Cold start and slow-API logging; optional production reporting. |
| `schemas/apiSchemaMap.js` | Maps endpoint URL patterns to Zod schemas for response validation. |
