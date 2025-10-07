/**
 * Navigation Optimizer
 * 
 * Utility functions to optimize navigation and prevent unnecessary reloads
 */

import { InteractionManager } from 'react-native';

// Debounce navigation to prevent rapid taps
let lastNavigationTime = 0;
const NAVIGATION_DEBOUNCE = 300; // 300ms

export const debounceNavigation = (navigationFunction) => {
  return (...args) => {
    const now = Date.now();
    if (now - lastNavigationTime < NAVIGATION_DEBOUNCE) {
      return;
    }
    lastNavigationTime = now;
    navigationFunction(...args);
  };
};

// Run after interactions complete for smoother navigation
export const runAfterInteractions = (callback) => {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
};

// Optimize screen transitions
export const optimizeScreenTransition = (navigation, screenName, params = {}) => {
  runAfterInteractions(() => {
    navigation.navigate(screenName, params);
  });
};

// Check if navigation is safe (not during rapid navigation)
export const isNavigationSafe = () => {
  const now = Date.now();
  return (now - lastNavigationTime) > NAVIGATION_DEBOUNCE;
};

// Preload screen data
export const preloadScreenData = async (dataLoader) => {
  try {
    await InteractionManager.runAfterInteractions(() => {
      return dataLoader();
    });
  } catch (error) {
    console.error('Error preloading screen data:', error);
  }
};

// Optimize list rendering
export const optimizeListRendering = (items, maxItems = 50) => {
  if (items.length <= maxItems) {
    return items;
  }
  
  // Return first batch for immediate rendering
  return items.slice(0, maxItems);
};

// Memory management for large datasets
export const manageMemoryUsage = (data, maxSize = 100) => {
  if (Array.isArray(data) && data.length > maxSize) {
    return data.slice(-maxSize); // Keep only recent items
  }
  return data;
};
