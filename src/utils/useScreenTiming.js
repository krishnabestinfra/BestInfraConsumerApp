/**
 * Screen timing hook (ARCHITECTURE 7.1)
 * Tracks: mount → first paint (onLayout) → data shown.
 * Logs in __DEV__ for validation; production can extend to analytics.
 */

import { useRef, useEffect, useCallback } from 'react';
import { InteractionManager } from 'react-native';

export const screenTimingStats = {};

/**
 * @param {string} screenName - Screen identifier for logging
 * @param {{ isLoading: boolean, dataReady?: boolean }} options - When to mark "data shown"
 * @returns {{ onLayout: () => void, markDataShown: () => void }}
 */
export function useScreenTiming(screenName, options = {}) {
  const { isLoading = false, dataReady = false } = options;
  const mountedAt = useRef(null);
  const firstPaintAt = useRef(null);
  const dataShownAt = useRef(null);

  useEffect(() => {
    mountedAt.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return () => {
      const stats = screenTimingStats[screenName];
      if (stats && __DEV__) {
        // eslint-disable-next-line no-console
        console.log(`[ScreenTiming] ${screenName} session: mount→paint ${stats.mountToPaint}ms, mount→data ${stats.mountToData ?? '-'}ms`);
      }
    };
  }, [screenName]);

  const onLayout = useCallback(() => {
    if (firstPaintAt.current != null) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    firstPaintAt.current = now;
    if (!screenTimingStats[screenName]) screenTimingStats[screenName] = {};
    screenTimingStats[screenName].mountToPaint = Math.round(now - (mountedAt.current ?? now));
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[ScreenTiming] ${screenName} first paint: ${screenTimingStats[screenName].mountToPaint}ms`);
    }
  }, [screenName]);

  const markDataShown = useCallback(() => {
    if (dataShownAt.current != null) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    dataShownAt.current = now;
    if (!screenTimingStats[screenName]) screenTimingStats[screenName] = {};
    screenTimingStats[screenName].mountToData = Math.round(now - (mountedAt.current ?? now));
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[ScreenTiming] ${screenName} data shown: ${screenTimingStats[screenName].mountToData}ms`);
    }
  }, [screenName]);

  // Auto-mark data shown when loading finishes and we have data
  useEffect(() => {
    if (!isLoading && dataReady && dataShownAt.current == null) {
      InteractionManager.runAfterInteractions(() => markDataShown());
    }
  }, [isLoading, dataReady, markDataShown]);

  return { onLayout, markDataShown };
}
