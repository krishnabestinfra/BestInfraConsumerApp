/**
 * Session expired / logout event – emit only, no navigation.
 * apiClient calls triggerSessionExpired() when refresh fails. App can set a handler (e.g. navigate to Login).
 */

let onSessionExpired = null;

/**
 * @param {(() => void)|null} callback
 */
export function setSessionExpiredHandler(callback) {
  onSessionExpired = typeof callback === 'function' ? callback : null;
}

export function triggerSessionExpired() {
  if (onSessionExpired) {
    try {
      onSessionExpired();
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[sessionExpiredHandler]', e);
      }
    }
  }
}

export function clearSessionExpiredHandler() {
  onSessionExpired = null;
}
