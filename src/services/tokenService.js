/**
 * Token Service – single place for token read/write and refresh.
 *
 * Responsibility: Read/write access and refresh tokens via authService; refreshAccessToken() used only by apiClient.
 * Does not navigate; on refresh failure authService/flow triggers session-expired (e.g. triggerSessionExpired).
 *
 * Flow: apiClient on 401 → tokenService.refreshAccessToken() → authService.refreshAccessToken();
 * success → setTokens; failure → clearTokens + caller handles reauth.
 */

import { authService } from './authService';

/**
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  return authService.getAccessToken();
}

/**
 * @returns {Promise<string|null>}
 */
export async function getRefreshToken() {
  return authService.getRefreshToken();
}

/**
 * @param {string} accessToken
 * @param {string} [refreshToken]
 */
export async function setTokens(accessToken, refreshToken) {
  await authService.storeAccessToken(accessToken);
  if (refreshToken != null) {
    await authService.storeRefreshToken(refreshToken);
  }
}

/**
 * Clear access and refresh tokens from secure storage.
 */
export async function clearTokens() {
  await authService.clearTokens();
}

/**
 * Refresh access token using refresh token. Uses authService (single refresh in flight).
 * @returns {Promise<{ success: boolean, accessToken?: string, refreshToken?: string }|{ success: false, silent?: boolean }>}
 */
export async function refreshAccessToken() {
  return authService.refreshAccessToken();
}

export default {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  refreshAccessToken,
};
