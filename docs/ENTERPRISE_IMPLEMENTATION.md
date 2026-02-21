# Enterprise Implementation Summary

Single networking gateway with documented exceptions. All app-to-backend API traffic goes through **apiClient**.

---

## 1. Centralized API Client (One Gateway)

- **apiClient** (`src/services/apiClient.js`):
  - **15s default timeout** (AbortController)
  - **Token injection** (Bearer + X-Client tenant)
  - **Error normalization** (`success`, `error`, `status`, `isTimeout`, `isNetworkError`)
  - **Base URL** via `API_ENDPOINTS` (apiConfig.js)
  - **fetchLocal(uri)** – only for local/bundle asset URIs (no auth, 10s timeout)

**All backend/API calls use `apiClient.request()`:**

- Auth: `Login.js`, `ForgotPassword.js`, `OTPLogin.js`, `ResetPassword.js`, `authService` (refresh, logout)
- Screens: `ConsumerDataTable.js`, `Transactions.js`, `ConsumerDetailsBottomSheet.js`, `Invoices.js`
- Utils: `storage.js`, `cacheManager.js`, `versionChecker.js`, `performanceOptimizer.js`
- Services: `apiService.js` (makeRequest + notifications + payment transactions), `pushNotificationService.js`, `EnhancedPaymentService.js`, `paymentService.js` (our backend endpoints + verify + getPaymentStatus), `UltraFastApiClient.js` (delegates to apiClient)

---

## 2. Documented Exceptions (Controlled)

| Location | Purpose |
|----------|--------|
| **apiClient.js** | The only place that calls `fetch()` for API requests (internal implementation). |
| **apiClient.fetchLocal(uri)** | Local/bundle assets only (e.g. PDF templates). Used by `InvoicePDFService.js`. |
| **paymentService.js** – `requestRazorpayApi()` | Single helper for **Razorpay** (`https://api.razorpay.com`). External API, Basic Auth, 15s timeout. No other raw `fetch` for payments. |

No other files use raw `fetch`. All other network calls go through apiClient.

---

## 3. Secure Token Storage

- **secureStorage.js**: expo-secure-store for `access_token`, `refresh_token`, `token_expiry`; fallback to AsyncStorage; one-time migration from AsyncStorage.
- **authService**: tokens via secureStorage; user/remember_me/client_subdomain stay in AsyncStorage.

---

## 4. Global Error Boundary

- **ErrorBoundary.js**: class component, fallback UI on error.
- **App.js**: root wrapped with `<ErrorBoundary>`.

---

## 5. Keystore / Signing Keys

- `.gitignore`: `*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`.
- No signing keys in repo; keep them outside and use env/CI.

---

## 6. Network Timeout

- 15s default in apiClient for all `request()` calls.
- Razorpay: 15s in `requestRazorpayApi()`.
- fetchLocal: 10s.

---

## Quick Reference

| Area | Location |
|------|----------|
| API gateway | `apiClient.request()` – all backend traffic |
| Timeout | `apiClient.js` – 15s; `requestRazorpayApi` – 15s; `fetchLocal` – 10s |
| Token storage | `secureStorage.js` + `authService.js` |
| Error Boundary | `ErrorBoundary.js` + `App.js` |
| Exceptions | apiClient internal fetch; `apiClient.fetchLocal`; `paymentService.requestRazorpayApi` (Razorpay only) |

**NexusOne uses a single, enterprise-grade networking gateway for all backend and auth traffic; the only remaining uses of `fetch` are inside apiClient (implementation + fetchLocal) and the centralized Razorpay helper in paymentService.**
