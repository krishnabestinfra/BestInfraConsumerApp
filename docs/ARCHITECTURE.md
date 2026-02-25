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
| `utils/logger.js` | Structured logger (debug/info/warn/error); apiLogger used in apiClient; no sensitive payloads. |
| `config/featureFlags.js` | Central config for which screens/features are enabled (plan/A-B). |
| `constants/designTokens.js` | Spacing, radius, list defaults for consistent UI. |
| `components/global/AppFlatList.js` | Shared FlatList with default virtualization props. |
| `components/global/withScreenErrorBoundary.js` | HOC to wrap screens in ErrorBoundary for screen-level isolation. |
| `screens/invoices/useInvoiceFilter.js` | Hook for invoice filter state and modal; keeps Invoices screen lean. |

---

## 7. Performance & scalability

- **First paint:** App does not block on font loading; navigator and Splash show immediately (system fonts), then custom fonts apply when loaded.
- **List screens:** Invoices, Notifications, TicketDetails (timeline), ChatSupport (messages), and Reports (recent list) use `FlatList` (or `AppFlatList`) with `keyExtractor`, `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, and `removeClippedSubviews` for virtualized scrolling. List item components (e.g. NotificationCard) are wrapped in `React.memo` where appropriate.
- **Cold start:** Measured via `reportColdStart()` after fonts; slow APIs (>1500ms) reported via `reportApiLatency()`.
- **Tests:** `npm test` runs Jest. Suites: `performanceMonitor.test.js`, `apiClient.test.js` (cache, pending reuse, 404/403), `ErrorBoundary.test.js` (getDerivedStateFromError, captureError).

---

## 8. Logging & feature flags

- **Logger:** `utils/logger.js` exposes `apiLogger`; apiClient uses it instead of `console.log` in the request path. Levels: debug, info, warn, error; in production only warn/error by default so prod logs stay useful without leaking data.
- **Feature flags:** `config/featureFlags.js` defines `featureFlags` and `isFeatureEnabled(key)` for conditional screens/features. Use for plan-based or A/B rollout.

---

## 9. How to add a new list screen

- Use `FlatList` or `AppFlatList` with a stable `keyExtractor`, `ListEmptyComponent` for loading/error/empty, and optional `ListHeaderComponent`. Pass `onRefresh` and `RefreshControl` when pull-to-refresh is needed.
- Memoize the `renderItem` component (e.g. with `React.memo`) and use `useCallback` for handlers so list identity stays stable.
- Prefer `designTokens.listDefaults` or `AppFlatList` for consistent `initialNumToRender`, `windowSize`, etc.
- For **fixed-height list items**, pass `getItemLayout` so FlatList can size scroll without measuring every item (faster scroll).

---

## 10. Token lifecycle & SecureStore

- **Access token:** Short-lived; stored via `secureStorage` (SecureStore when available, else AsyncStorage). authService stores/reads; apiClient uses via authService.getValidAccessToken().
- **Refresh token:** Long-lived; stored in SecureStore when available. Used only by tokenService.refreshAccessToken() on 401.
- **Migration:** On first read of a sensitive key, secureStorage migrates from AsyncStorage to SecureStore and removes from AsyncStorage. No duplicate storage.
- **Logout / session expired:** tokenService.clearTokens() removes both; triggerSessionExpired() notifies app to redirect to login. No reuse of expired token.

---

## 11. Runbook (production)

- **Sentry:** Check project dashboard for errors; filter by release. beforeSend redacts headers/body/user; no tokens in events.
- **Health:** Use apiClient.healthCheck() or health endpoint for connectivity. No health check on app startup by default.
- **Session / outage:** If users report "session expired" or login failures, check auth/refresh endpoint and tenant subdomain. Clear tokens and re-login is the user-side fix.

---

## 12. Dashboards & screens

- **Current:** PostPaidDashboard (main), LsDataTable, and shared components (UltraFastScreen, OptimizedScreen) exist. Feature flags (`config/featureFlags.js`) allow toggling; navigation still points to PostPaidDashboard as primary.
- **Intended:** Prefer one config-driven or role-based dashboard long-term; legacy variants can be deprecated or hidden via feature flags when consolidation is done.
- **Screen-level ErrorBoundary:** Key screens (Invoices, Notifications, PostPaidDashboard, Transactions, Tickets, TicketDetails, ChatSupport, Reports) are wrapped with `withScreenErrorBoundary` so one broken screen does not crash the whole app.

--------------------------------------------------------------------------------
# Performance Improvements – Priority List (Paste into Cursor)

Use this list in order. Each item has a clear priority number and a detailed description so you can implement or prompt Cursor to implement it correctly.

---

## Priority 1 – Do First (Biggest Impact)

### 1.1 Run API calls in parallel

**What:** Today, Dashboard and Tickets (and some other screens) run several API calls one after another (await first, then await second). Total wait time is the sum of all calls. Change this so independent calls run at the same time and you await them together; total wait becomes roughly the slowest single call.

**Where and how:**
- **Dashboard (PostPaidDashboard.js):** In `fetchConsumerData`, do not await consumer data and then await billing. Instead: start both `apiClient.getConsumerData(user.identifier)` and `fetchBillingHistory(user.identifier)` (store the promises), then `await Promise.all([consumerPromise, billingPromise])`. From the two results, set `consumerData` and `latestInvoiceDates` in one go. Keep error handling (e.g. if one fails, still set the other if it succeeded).
- **Tickets (Tickets.js):** In `fetchData`, after you have `consumerNumber` (from the consumer result or cache), do not await stats and then await table. Start both `fetchTicketStats(consumerNumber, forceRefreshTickets)` and `fetchTicketsTable(consumerNumber, forceRefreshTickets, { appId: 1, page: 1, limit: 10 })`, then `await Promise.all([statsPromise, tablePromise])`. Set `ticketStats` and `tableData` from the results. Consumer fetch can stay as is, or run in parallel with stats/table if you already have consumerNumber from cache.
- **Invoices / Usage / Recharge:** If any screen does two or more independent API calls in sequence (e.g. consumer then billing), run those in parallel with `Promise.all` and set all state from the combined result.

**Why:** Reduces total loading time from “sum of all calls” to “max of all calls,” which often cuts perceived wait by half or more.

---

### 1.2 Show cache first, then refresh

**What:** When a screen loads, if cached data exists for that screen (consumer, billing, tickets, etc.), render that data immediately instead of showing a full-screen skeleton or “Loading…” until the network responds. Then start the network request in the background; when it completes, update the UI. The user sees content in under ~100 ms when cache is warm.

**Where and how:**
- **Dashboard:** On mount or when `fetchConsumerData` is triggered, first call whatever returns cached consumer data (e.g. cacheManager.getCachedData or the in-memory cache used by apiService/cacheManager). If cache returns success and data, immediately set `consumerData` (and if available, latest invoice dates) and set `isLoading` to false so the real content renders. Then start the normal API flow (getConsumerData + fetchBillingHistory, in parallel per 1.1). When the network response arrives, update `consumerData` and `latestInvoiceDates` again. Do not overwrite with “loading” state if you already showed cache.
- **Tickets:** Same idea: try cache first (consumer, and if you cache ticket stats/table, those too). If cache hit, render that data and set loading false, then fetch in background and update when done.
- **Invoices, Usage, Recharge:** Where you have cache (e.g. consumer, billing history), read cache first, render it, then revalidate in the background.

**Why:** Makes repeat visits and tab switches feel instant and reduces perceived dependency on a slow API.

---

### 1.3 Don’t refetch on every focus

**What:** Right now, screens like Tickets (and possibly others) call their fetch function every time the screen gains focus via `useFocusEffect`. That causes unnecessary refetches when the user switches tabs and comes back shortly after. Only refetch when data is actually stale or when the user explicitly pulls to refresh.

**Where and how:**
- **Tickets.js:** Add a ref, e.g. `lastFetchedAtRef = useRef(0)`. In `useFocusEffect`, before calling `fetchData()`, check: if `Date.now() - lastFetchedAtRef.current < 120000` (2 minutes), skip the fetch. When you do call `fetchData()` and it completes successfully, set `lastFetchedAtRef.current = Date.now()`. When the user explicitly pulls to refresh (when you re-enable refresh control), call `fetchData()` regardless and update the ref after success.
- **Invoices, Usage, Recharge, Dashboard:** If any of them use `useFocusEffect` to refetch on every focus, apply the same pattern: a ref for last fetch time, skip fetch if within 2 minutes, always fetch on explicit refresh.

**Why:** Fewer redundant requests, less loading flicker, and better behavior when the API is slow.

---

## Priority 2 – High Impact (More Work)

### 2.1 Split PostPaidDashboard into smaller, memoized components

**What:** PostPaidDashboard.js is a very large single component. Any state change (e.g. `isLoading`, `consumerData`, `pickedDateRange`) can cause the whole tree to re-render. Split the main content into smaller sections, each a separate component wrapped in `React.memo`, so only the section that actually needs to re-render does.

**Where and how:**
- Create separate components (in the same file or separate files): e.g. `AmountSection` (due amount + green “Pay” box), `MeterCard` (consumer name, last communication, meter number, tap for details), `EnergySummary` (Energy Summary header, Pick a Date, usage row, time period buttons, chart or table), `UsageStatsRow` (Average Daily and Peak Usage cards), `ComparisonCard` (comparison header, this month/last month, progress bar, savings message), `AlertsTableSection` (Alerts title + horizontal table).
- Each component receives only the props it needs (e.g. `consumerData`, `isLoading`, `timePeriod`, `displayMode`, `pickedDateRange`, handlers, theme props). Wrap each in `React.memo`.
- In PostPaidDashboard, render these components instead of one big block of JSX. Keep all state and callbacks in the parent; pass them down so that when e.g. only `consumerData` changes, only components that use `consumerData` re-render.

**Why:** Reduces render cost and keeps the file maintainable; avoids unnecessary work on every keystroke or loading toggle.

---

### 2.2 Reduce number of Shimmer and ring animations

**What:** The dashboard skeleton uses many Shimmer blocks, and several screens use 20 animated rings (Dashboard header, ChatSupport, AnimatedRings, RippleEffect). Each Shimmer runs an `Animated.loop` and each ring runs animation work. Too many simultaneous animations can make scrolling and touch feel laggy.

**Where and how:**
- **Dashboard skeleton (PostPaidDashboardSkeleton):** Replace many small Shimmer placeholders per section with one or two Shimmer blocks per section (e.g. one for the amount area, one for the meter card, one for the chart area). Reuse the same Shimmer component with different sizes.
- **Rings:** In PostPaidDashboard (header), ChatSupport.js, AnimatedRings.js, and RippleEffect.js, change the constant that defines the number of rings (e.g. `RING_COUNT`) from 20 to 8 or 10. Ensure the layout still looks acceptable.

**Why:** Fewer animations mean less work on the JS/UI thread and smoother interaction.

---

### 2.3 Stale-while-revalidate

**What:** When cached data exists but is older than a threshold (e.g. 2–5 minutes), still show that cache immediately so the user sees content right away. In the background, trigger a network request; when the new data arrives, update the UI. The app should never block the first paint on the network when cache has data.

**Where and how:**
- In the same places you implement “show cache first” (1.2), add a notion of cache age. When reading from cache, if the cached timestamp is older than e.g. 2–5 minutes, still return and display that data, but treat the data as stale: show it immediately and also start a network request. When the request completes, update cache and state so the UI refreshes with fresh data. Optionally show a small “Updated just now” or refresh indicator when the background update completes.
- Ensure that when you have cache (even stale), you do not show a full-screen loading skeleton; you show the cached content and optionally a non-blocking refresh indicator.

**Why:** Users always see something fast; fresh data appears when the network allows without blocking the initial experience.

---

### 2.4 Single source of truth for consumer data

**What:** Right now, multiple screens each do their own sequence: getUser(), getCachedConsumerData(), fetchConsumerData(). That can lead to duplicate requests and inconsistent “current consumer” state. Centralize “current consumer” and “last fetch time” in one place (e.g. a small React context or a store) and have screens read from it; only that layer triggers refresh when needed.

**Where and how:**
- Create a ConsumerContext (or similar) that holds: current consumer object, last fetch timestamp, loading state, and a method to refresh (e.g. refreshConsumer()). On app load or login, initialize from cache if available; then allow screens to call refreshConsumer() when they need fresh data (or when cache is stale per your stale-while-revalidate logic).
- In Dashboard, Tickets, Invoices, Usage, Recharge, replace local “fetch consumer + set state” with: read consumer from context, and call context’s refresh when the screen needs to ensure fresh data (respecting the “don’t refetch on every focus” rule from 1.3). Optionally preload consumer in this context right after login so Dashboard is warm.

**Why:** Fewer duplicate requests, consistent consumer state, and one place to implement cache-first and refresh rules.

---

## Priority 3 – Medium Impact

### 3.1 Combined “dashboard summary” API (backend)

**What:** Dashboard currently needs consumer data and billing (for due date). That’s two round-trips. Have the backend expose one “dashboard summary” or “consumer with billing summary” endpoint that returns consumer plus latest invoice dates (and optionally due amount) in one response. The app then makes one call instead of two.

**Where and how:**
- Backend: Add an endpoint (e.g. GET /consumers/{id}/dashboard-summary or extend GET /consumers/{id}) that returns consumer fields plus latest invoice issue/due date and optionally total outstanding. Ensure it’s fast (indexed, minimal queries).
- App: In Dashboard fetch, call this single endpoint instead of getConsumerData + fetchBillingHistory. Parse the response and set both consumerData and latestInvoiceDates from it. You can keep the parallel approach for other screens that still use the separate endpoints.

**Why:** One round-trip for the main screen reduces latency and server load.

---

### 3.2 Cache-first and background refresh in apiClient

**What:** For critical GET requests (e.g. consumer, billing), if the apiClient (or your cache layer) has a fresh cached result (e.g. younger than 30–60 seconds), return that immediately and optionally trigger a background refresh. When the background request completes, update the cache and notify subscribers so the UI can re-render once with fresh data.

**Where and how:**
- In apiClient (or the layer that wraps it for consumer/billing), when a GET is made: check in-memory (or persistent) cache for that URL + params. If hit and age < 30–60 s, resolve the promise immediately with cached data. Optionally start a new request in the background; when it completes, update cache and call a small list of callbacks or set a “version” so that components subscribed to this data can re-render.
- Ensure pending-request deduplication still applies: if a request for the same resource is already in flight, reuse that promise instead of starting a second request.

**Why:** Instant responses when data was recently loaded; data still stays fresh in the background.

---

### 3.3 Virtualize the Alerts table on Dashboard

**What:** The Alerts section uses a horizontal ScrollView that renders the full table (all rows). If the list grows, every row is mounted and the tree is large. Use a virtualized list so only visible rows are mounted.

**Where and how:**
- In PostPaidDashboard, replace the structure that renders the Alerts table (the horizontal ScrollView wrapping the table content) with a FlatList (horizontal if the design is horizontal). Use data={tableData}, renderItem to render each row, keyExtractor, and set initialNumToRender (e.g. 5–10), maxToRenderPerBatch, and windowSize so only a small set of rows is mounted. Keep the same row UI and columns; only the list mechanism changes.
- If the table has a fixed row height, implement getItemLayout so FlatList doesn’t have to measure every item; that improves scroll performance.

**Why:** Long alert lists no longer block the UI or cause jank; only visible rows are in the tree.

---

### 3.4 Stable fetch callbacks

**What:** If fetchConsumerData, fetchData, or fetchInvoices is recreated on every render (e.g. because their useCallback deps change often), then useEffect or useFocusEffect that depend on them will re-run and may trigger duplicate fetches or unnecessary loading states. Ensure these callbacks are stable.

**Where and how:**
- Wrap fetchConsumerData, fetchData, fetchInvoices (and similar) in useCallback. For dependencies, include only what is truly needed (e.g. setLoading, or a ref to latest consumer id). Avoid putting entire objects (e.g. consumerData) in the dependency array if you only need a stable identifier; use a ref for the latest value if necessary. Ensure the effect that calls fetch runs only on mount or when you intentionally want a refetch (e.g. after login or when stale per 1.3).

**Why:** Prevents duplicate network calls and flickering loading states.

---

### 3.5 Preload critical data after login

**What:** As soon as the user logs in successfully, start loading the data the Dashboard (and optionally other main screens) need, so that when they navigate to Dashboard, cache is already warm or the request is already in flight.

**Where and how:**
- In the login success handler (e.g. after storing token and user), call your preload function (e.g. cacheManager.preloadCriticalData()) or explicitly call the same logic that loads consumer data (and optionally billing) for the logged-in user. Do not block the navigation to the next screen; run this in the background. When the user opens Dashboard, either cache is already filled or the request is deduplicated so the wait is minimal.

**Why:** First Dashboard open feels faster because work has already started at login.

---

## Priority 4 – Further Optimizations

### 4.1 Defer heavy chart computation

**What:** effectiveDataForChart on Dashboard derives monthly data from daily (loops, maps, object creation). For large daily datasets this can take tens of milliseconds on the JS thread and cause a brief freeze. Run this work after first paint or during idle time.

**Where and how:**
- Keep the useMemo for effectiveDataForChart, but for the “daily → monthly” aggregation part (or the whole derivation if it’s heavy), consider: (a) running it in requestIdleCallback so it runs when the browser/app is idle, or (b) computing it in a useEffect that runs after mount and stores the result in state, so the first paint can show a simple placeholder or previous chart and then update when the computation finishes. Ensure you don’t block the initial render on this computation.

**Why:** First paint stays fast; chart updates smoothly when the computation completes.

---

### 4.2 Memoize list item renderers

**What:** For Invoices FlatList, Tickets table rows, and Dashboard alerts rows, the renderItem or row component can re-create on every parent render, causing unnecessary re-renders of list items. Memoize row components and keep renderItem stable.

**Where and how:**
- Extract the Invoices list item into a small component (e.g. InvoiceCard) and wrap it in React.memo. Pass only the needed props (item, isDark, themeColors, onPress, etc.). In the parent, use useCallback for renderItem so the function reference is stable (e.g. renderItem={renderInvoiceCard} with renderInvoiceCard from useCallback with [isDark, themeColors] or similar). Do the same for Tickets table rows and Dashboard alerts rows if they are not already memoized.
- Ensure keyExtractor is stable (useCallback with empty deps or deps that rarely change).

**Why:** Fewer re-renders when scrolling or when parent state changes.

---

### 4.3 Avoid inline objects and styles in render

**What:** In the main screens, patterns like style={[styles.x, isDark && { backgroundColor: themeColors.screen }]} create a new object every render, which can increase reconciliation work. Move dynamic style parts into a useMemo or a shared style object built once per theme.

**Where and how:**
- For sections that use the same dynamic style (e.g. dark background), create a style object once per theme: e.g. const sectionStyle = useMemo(() => ({ ...styles.section, backgroundColor: isDark ? themeColors.screen : styles.section.backgroundColor }), [isDark, themeColors.screen]). Use sectionStyle in the component instead of inline object. Do this for the most frequently re-rendered containers (Dashboard sections, list headers, cards).

**Why:** Reduces allocation and reconciliation work on every render.

---

### 4.4 Cancel in-flight requests on unmount

**What:** If the user leaves a screen before a fetch completes, the response can still arrive and call setState on an unmounted component, or trigger unnecessary work. Cancel the request when the component unmounts or when a new fetch for the same screen is started.

**Where and how:**
- In fetchConsumerData, fetchData, fetchInvoices (and similar), create an AbortController at the start of the fetch. Pass controller.signal to fetch (or to the apiClient if it supports AbortSignal). In the useEffect or useFocusEffect that triggers the fetch, return a cleanup function that calls controller.abort(). If you start a new fetch (e.g. user pulled to refresh), abort the previous controller before creating a new one. Handle abort in catch (ignore or log “aborted”) so you don’t treat it as a generic error.

**Why:** Avoids stale updates and warnings; cleaner behavior when navigating quickly.

---

### 4.5 Lazy-load below-the-fold sections on Dashboard

**What:** The Dashboard mounts all sections at once (amount, meter, chart, stats, comparison, alerts). Spreading work over time can make the first paint faster by rendering only the top sections first.

**Where and how:**
- Render AmountSection, MeterCard, and EnergySummary (or the first screenful) immediately. For UsageStatsRow, ComparisonCard, and AlertsTableSection, either: (a) render them after a short delay (e.g. requestAnimationFrame + setTimeout 0 or 50 ms), or (b) render them when the user scrolls near them (e.g. with a simple visibility or scroll position check). Keep the same components; only the timing of when they mount changes.

**Why:** First paint and interactivity improve by deferring off-screen work.

---

## Priority 5 – Backend and API

### 5.1 Shorter timeout for above-the-fold requests

**What:** Using a 15 s timeout for critical first-screen requests means the app can wait a long time before showing an error or fallback. Use a lower timeout for the main consumer/dashboard request so the user sees cache or an error sooner.

**Where and how:**
- In apiClient (or in the options passed per request), allow a per-request timeout. For the Dashboard’s main consumer (and dashboard summary) request, pass a timeout of e.g. 8–10 s. On timeout, abort and let the app show cached data if available or a clear “slow network”/retry state. Keep a longer timeout for non-critical or background requests if needed.

**Why:** Fails fast and lets the app fall back to cache or retry instead of blocking for 15 s.

---

### 5.2 Smaller API payloads

**What:** Large JSON responses take longer to transfer and parse. Return only the fields the app needs.

**Where and how:**
- Backend: Review consumer, billing, tickets, and invoice responses. Remove or make optional any field not used by the app. If the API supports field selection (e.g. ?fields=name,meterSerialNumber,...), use it from the app. App: When calling APIs, request only needed fields if the backend supports it.

**Why:** Faster transfer and less JSON parsing on the device.

---

### 5.3 Faster DB queries and indexes

**What:** Slow API response time is often due to slow queries. Ensure the backend uses indexes and avoids N+1 patterns.

**Where and how:**
- Backend: Add indexes on columns used in WHERE and JOIN for consumer, billing, tickets, and invoice list queries (e.g. consumer id, date ranges, ticket status). Prefer one query with joins or batch loading instead of one query per related entity (N+1). Monitor slow query log and optimize the hottest paths.

**Why:** Reduces server response time, which directly improves perceived app speed.

---

### 5.4 HTTP/2 and compression

**What:** HTTP/2 allows multiple requests over one connection with multiplexing. Compression reduces payload size.

**Where and how:**
- Ensure the API base URL is served over HTTP/2 (server and any reverse proxy). Ensure the backend compresses JSON (gzip or brotli) and that the client sends Accept-Encoding: gzip (or brotli). Verify in network tools that responses are compressed.

**Why:** Less latency and smaller payloads, especially when making parallel requests.

---

## Priority 6 – Build, Assets, Startup

### 6.1 Lazy-load non-initial tab screens

**What:** All tab screens may be loaded up front, increasing initial bundle and first paint time. Lazy-load screens that aren’t the default tab.

**Where and how:**
- Use React.lazy (and Suspense) for screen components that are not the default tab (e.g. Tickets, Invoices, Usage, Settings). Or use your navigator’s lazy option so those screens are loaded when first visited. Ensure the default tab (e.g. Dashboard) is not lazy so the first screen appears immediately.

**Why:** Smaller initial JS and faster first interactive.

---

### 6.2 Optimize SVGs and heavy assets

**What:** Many SVG icons and assets can increase bundle size and render cost. Reduce size and number of nodes.

**Where and how:**
- Run SVGs through an optimizer (e.g. svgo). Prefer a single icon font or sprite where possible instead of many separate SVG components. For below-the-fold icons, consider lazy-loading or replacing with a simpler placeholder until visible.

**Why:** Faster load and less work during render.

---

### 6.3 Pause animations when screen is not visible

**What:** Shimmer and ring animations keep running even when the user has switched to another tab or screen, wasting CPU/GPU. Pause them when the screen is not focused.

**Where and how:**
- In screens that use Shimmer (dashboard skeleton) or ring animations (Dashboard header, ChatSupport, AnimatedRings, RippleEffect), use useFocusEffect: when the screen loses focus, call the same cleanup that stops the animation (e.g. animation.stop() for Animated.loop, or set a “paused” state that the Shimmer/rings respect). When the screen gains focus again, restart the animation. Ensure useNativeDriver: true where possible so work runs on the native thread.

**Why:** Saves battery and keeps other screens smooth when the user isn’t on this screen.

---

## Priority 7 – Monitoring and Validation

### 7.1 Measure key screens

**What:** You need numbers to know if changes help. Measure time from screen focus to first meaningful paint and to “data displayed” for Dashboard, Tickets, Invoices.

**Where and how:**
- Use reportApiLatency (or your existing monitoring) for API timing. Add simple marks: e.g. when the screen mounts, when cache is applied, when the first network response is received, when the main content is rendered. Compute “time to first paint” and “time to data displayed” and log or send to your analytics. Set targets (e.g. &lt; 1.5 s to data on 4G) and track progress.

**Why:** Ensures improvements are real and regressions are caught.

---

### 7.2 Track cache hit rate

**What:** Knowing how often data is served from cache vs network helps tune cache TTL and preload logic.

**Where and how:**
- When returning data from cache (consumer, billing, tickets), log or increment a “cache hit” counter; when data comes from the network, log “cache miss.” Optionally send a periodic summary (e.g. cache hit rate per screen or per endpoint) to your backend or analytics. Aim for a high hit rate on repeat visits and tab switches.

**Why:** Validates that cache-first and preload are effective.

---

### 7.3 Cache billing and invoices per consumer

**What:** Billing history and invoice list are requested on multiple screens. Cache them by consumer id with a TTL so repeat visits or multiple screens don’t refetch the same data.

**Where and how:**
- In cacheManager (or the layer that wraps billing/invoice APIs), store billing history and invoice list keyed by consumer identifier with a TTL (e.g. 5–15 minutes). When Invoices, Usage, or Recharge request billing or invoices, check cache first; if hit and not expired, return cached data and optionally revalidate in background. When fetching from network, write result to cache before returning.

**Why:** Fewer duplicate requests and faster navigation between screens that use the same data.