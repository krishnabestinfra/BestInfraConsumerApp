/**
 * Unified Loading Manager
 * 
 * Handles all loading states, animations, and UI feedback across the app.
 * Consolidates functionality from loadingManager.js, InstantLoader.js, and AppInitializer.js
 * 
 * Features:
 * - Global loading state management
 * - Minimum loading duration to prevent flash
 * - Loading state subscriptions
 * - Skeleton loading components
 * - Progress tracking
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/colors';

class LoadingManager {
  constructor() {
    this.loadingStates = new Map();
    this.loadingCallbacks = new Map();
    this.minLoadingTime = 200; // Minimum loading time to prevent flash
    this.progressStates = new Map();
  }

  /**
   * Set loading state with minimum duration
   */
  setLoading(key, isLoading, minDuration = this.minLoadingTime) {
    const currentTime = Date.now();
    
    if (isLoading) {
      this.loadingStates.set(key, {
        isLoading: true,
        startTime: currentTime,
        minDuration
      });
    } else {
      const state = this.loadingStates.get(key);
      if (state) {
        const elapsed = currentTime - state.startTime;
        const remaining = Math.max(0, state.minDuration - elapsed);
        
        if (remaining > 0) {
          setTimeout(() => {
            this.loadingStates.set(key, { isLoading: false });
            this.notifyCallbacks(key, false);
          }, remaining);
        } else {
          this.loadingStates.set(key, { isLoading: false });
          this.notifyCallbacks(key, false);
        }
      }
    }
    
    this.notifyCallbacks(key, isLoading);
  }

  /**
   * Set progress for long-running operations
   */
  setProgress(key, progress) {
    this.progressStates.set(key, progress);
    this.notifyCallbacks(key, true, progress);
  }

  /**
   * Get loading state
   */
  getLoading(key) {
    return this.loadingStates.get(key)?.isLoading || false;
  }

  /**
   * Get progress
   */
  getProgress(key) {
    return this.progressStates.get(key) || 0;
  }

  /**
   * Subscribe to loading state changes
   */
  subscribe(key, callback) {
    if (!this.loadingCallbacks.has(key)) {
      this.loadingCallbacks.set(key, new Set());
    }
    this.loadingCallbacks.get(key).add(callback);
    
    return () => {
      const callbacks = this.loadingCallbacks.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.loadingCallbacks.delete(key);
        }
      }
    };
  }

  /**
   * Notify all callbacks for a key
   */
  notifyCallbacks(key, isLoading, progress = null) {
    const callbacks = this.loadingCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(isLoading, progress));
    }
  }

  /**
   * Clear all loading states
   */
  clear() {
    this.loadingStates.clear();
    this.loadingCallbacks.clear();
    this.progressStates.clear();
  }
}

// Singleton instance
const loadingManager = new LoadingManager();

/**
 * Hook for using loading manager
 */
export const useLoading = (key, initialLoading = false) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [progress, setProgress] = useState(0);
  const unsubscribeRef = useRef(null);

  const setLoading = useCallback((loading, minDuration) => {
    loadingManager.setLoading(key, loading, minDuration);
  }, [key]);

  const setProgressValue = useCallback((progressValue) => {
    loadingManager.setProgress(key, progressValue);
  }, [key]);

  const getLoading = useCallback(() => {
    return loadingManager.getLoading(key);
  }, [key]);

  const getProgress = useCallback(() => {
    return loadingManager.getProgress(key);
  }, [key]);

  useEffect(() => {
    unsubscribeRef.current = loadingManager.subscribe(key, (loading, progressValue) => {
      setIsLoading(loading);
      if (progressValue !== null) {
        setProgress(progressValue);
      }
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [key]);

  return {
    isLoading,
    progress,
    setLoading,
    setProgress: setProgressValue,
    getLoading,
    getProgress
  };
};

/**
 * Skeleton Loading Component
 */
export const SkeletonLoader = memo(({ 
  lines = 3, 
  style,
  showAvatar = false 
}) => {
  const renderSkeletonLines = () => {
    return Array.from({ length: lines }, (_, index) => (
      <View 
        key={index} 
        style={[
          styles.skeletonLine, 
          index === 0 && styles.skeletonLineLong,
          index === lines - 1 && styles.skeletonLineShort
        ]} 
      />
    ));
  };

  return (
    <View style={[styles.skeletonContainer, style]}>
      {showAvatar && <View style={styles.skeletonAvatar} />}
      {renderSkeletonLines()}
    </View>
  );
});

/**
 * Progress Loading Component
 */
export const ProgressLoader = memo(({ 
  progress = 0, 
  showPercentage = true,
  style 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.progressContainer, style, { opacity: fadeAnim }]}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      {showPercentage && (
        <View style={styles.progressTextContainer}>
          <ActivityIndicator size="small" color={COLORS.secondaryColor} />
        </View>
      )}
    </Animated.View>
  );
});

/**
 * Instant Loader Component
 * Shows cached data instantly or skeleton while loading
 */
export const InstantLoader = memo(({
  children,
  dataKey,
  fallback,
  showSkeleton = true,
  skeletonComponent,
  onDataReady,
  ...props
}) => {
  const [isReady, setIsReady] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Simple instant ready for now - can be enhanced later
    setIsReady(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const renderContent = () => {
    if (!isReady) {
      return showSkeleton ? (skeletonComponent || <SkeletonLoader />) : null;
    }

    if (fallback && dataKey) {
      return fallback;
    }

    return children;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} {...props}>
      {renderContent()}
    </Animated.View>
  );
});

/**
 * App Initializer Component
 * Handles app startup and critical data preloading
 */
export const AppInitializer = memo(({ children, onInitialized }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationProgress, setInitializationProgress] = useState(0);
  const { setLoading, setProgress } = useLoading('app_initialization');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        console.log('🚀 AppInitializer: Starting app initialization...');
        
        // Step 1: Load user data
        setProgress(20);
        const { getUser } = await import('./storage');
        const user = await getUser();
        
        if (user && user.identifier) {
          // Step 2: Preload critical data
          setProgress(40);
          const { cacheManager } = await import('./cacheManager');
          await cacheManager.preloadCriticalData();
          
          // Step 3: Complete initialization
          setProgress(100);
          console.log('✅ AppInitializer: App initialization complete');
        } else {
          setProgress(100);
        }
        
        setIsInitialized(true);
        if (onInitialized) {
          onInitialized();
        }
      } catch (error) {
        console.error('AppInitializer: Error during initialization:', error);
        setIsInitialized(true);
        if (onInitialized) {
          onInitialized();
        }
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [onInitialized, setLoading, setProgress]);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.secondaryColor} />
        <ProgressLoader 
          progress={initializationProgress} 
          showPercentage={false}
          style={styles.progressLoader}
        />
      </View>
    );
  }

  return children;
});

// Add display names
SkeletonLoader.displayName = 'SkeletonLoader';
ProgressLoader.displayName = 'ProgressLoader';
InstantLoader.displayName = 'InstantLoader';
AppInitializer.displayName = 'AppInitializer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonLineLong: {
    width: '100%',
  },
  skeletonLineShort: {
    width: '60%',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  progressContainer: {
    width: 200,
    marginTop: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 2,
  },
  progressTextContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  progressLoader: {
    marginTop: 20,
  },
});

export default loadingManager;