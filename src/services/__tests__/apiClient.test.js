/**
 * Unit tests for apiClient: cache, pending reuse, error normalization.
 * Mocks fetch and auth/storage so no real network or token logic runs.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../../utils/storage', () => ({
  getUser: jest.fn().mockResolvedValue({ identifier: 'test-user' }),
}));

jest.mock('../../constants/constants', () => ({
  API_ENDPOINTS: {
    auth: { refresh: () => 'https://api.test/refresh' },
  },
}));

jest.mock('../authService', () => ({
  authService: {
    getValidAccessToken: jest.fn().mockResolvedValue('mock-token'),
  },
}));

jest.mock('../../config/apiConfig', () => ({
  getTenantSubdomain: jest.fn().mockReturnValue('gmr'),
}));

jest.mock('../../schemas/apiSchemaMap', () => ({
  getSchemaForEndpoint: jest.fn().mockReturnValue(null),
}));

jest.mock('../../utils/performanceMonitor', () => ({
  reportApiLatency: jest.fn(),
}));

const mockTriggerSessionExpired = jest.fn();
jest.mock('../../utils/sessionExpiredHandler', () => ({
  triggerSessionExpired: (...args) => mockTriggerSessionExpired(...args),
}));

const tokenService = require('../tokenService');
jest.mock('../tokenService', () => ({
  refreshAccessToken: jest.fn().mockResolvedValue({ success: false }),
  clearTokens: jest.fn().mockResolvedValue(undefined),
  getAccessToken: jest.fn().mockResolvedValue(null),
}));

// Import after mocks (default export is the singleton)
const apiClient = require('../apiClient').default;

describe('apiClient', () => {
  const baseUrl = 'https://api.test/data';

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.requestCache.clear();
    apiClient.pendingRequests.clear();
    apiClient.isRefreshing = false;
    apiClient._requestQueue = [];
  });

  describe('request', () => {
    it('returns success when fetch returns 200 with JSON', async () => {
      const data = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ data }),
      });

      const result = await apiClient.request(baseUrl, { method: 'GET' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('caches GET response and returns cached result within 30s', async () => {
      const data = { cached: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ data }),
      });

      const r1 = await apiClient.request(baseUrl, { method: 'GET' });
      const r2 = await apiClient.request(baseUrl, { method: 'GET' });

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r2.data).toEqual(data);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not cache POST requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ data: { first: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ data: { second: true } }),
        });

      const r1 = await apiClient.request(baseUrl, { method: 'POST', body: {} });
      const r2 = await apiClient.request(baseUrl, { method: 'POST', body: {} });

      expect(r1.data).toEqual({ first: true });
      expect(r2.data).toEqual({ second: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns normalized error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Resource not found' }),
      });

      const result = await apiClient.request(baseUrl + '/404', { method: 'GET' });

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      expect(result.isNotFound).toBe(true);
      expect(typeof result.error).toBe('string');
    });

    it('returns normalized error on 403', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      const result = await apiClient.request(baseUrl, { method: 'GET' });

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.isAccessDenied).toBe(true);
    });
  });

  describe('pending request reuse', () => {
    it('reuses same promise for concurrent GET to same endpoint', async () => {
      let resolveFetch;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = () =>
          resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: () => Promise.resolve({ data: { concurrent: true } }),
          });
      });
      mockFetch.mockReturnValueOnce(fetchPromise);

      const req1 = apiClient.request(baseUrl + '/concurrent', { method: 'GET' });
      const req2 = apiClient.request(baseUrl + '/concurrent', { method: 'GET' });
      resolveFetch();

      const [r1, r2] = await Promise.all([req1, req2]);
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r1.data).toEqual(r2.data);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('401 and session expired', () => {
    it('returns requiresReauth when 401 and refresh is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Token expired' }),
      });

      const result = await apiClient.request(baseUrl + '/auth-required', { method: 'GET' });

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.requiresReauth).toBe(true);
      expect(typeof result.error).toBe('string');
    });
  });

  describe('network error', () => {
    it('returns normalized error when fetch throws network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      const result = await apiClient.request(baseUrl, { method: 'GET' });

      expect(result.success).toBe(false);
      expect(result.isNetworkError).toBe(true);
      expect(result.status).toBe(0);
      expect(typeof result.error).toBe('string');
    });
  });
});
