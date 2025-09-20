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
import { LinearGradient } from 'expo-linear-gradient';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/colors';

// Shimmer effect

const Shimmer = ({ style }) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
     shimmerAnim.setValue(-1);
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 300],
  });

  return (
    <View style={[style, { overflow: "hidden", backgroundColor: "#e0e0e0" }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={["#e0e0e0", "#f5f5f5", "#e0e0e0"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

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
  variant = "lines", // "lines" | "barchart" | "table" | "card"
  lines = 3,
  columns = 3,         
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

      const renderCardSkeleton = () => (
      <View style={[styles.cardSkeleton, style]}>
        <Shimmer style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "60%" }]} />
      </View>
    );


  const renderBarChartSkeleton = () => (
    <View style={[styles.chartContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Shimmer
          key={index}
          style={[
            styles.chartBar,
            {
              height: 60 + Math.random() * 100,
              width: 22,
            },
          ]}
        />
      ))}
    </View>
  );

  const renderTableSkeleton = () => (
    <View style={[styles.tableContainer, style]}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <View key={colIndex} style={styles.headerCell} />
        ))}
      </View>

      {/* Rows */}
      {Array.from({ length: lines }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.tableRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Shimmer key={colIndex} style={styles.tableCell} />
          ))}
        </View>
      ))}
    </View>
  );

    switch (variant) {
    case "barchart":
      return renderBarChartSkeleton();
    case "table":
      return renderTableSkeleton();
    case "card":
      return renderCardSkeleton();
    default:
      return renderSkeletonLines();
  }
});


  // return (
  //   <View style={[styles.skeletonContainer, style]}>
  //     {showAvatar && <View style={styles.skeletonAvatar} />}
  //     {renderSkeletonLines()}
  //   </View>
  // );

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
    width: '100%',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  chartContainer: {
  height: 210,
  marginHorizontal: 20,
  marginTop: 25,
  borderRadius: 5,
  backgroundColor: "#eef8f0",
  flexDirection: "row",
  alignItems: "flex-end",
  justifyContent: "space-between", // <-- ensures equal spacing
  paddingHorizontal: 10,

  },
  chartBar: {
  backgroundColor: "#e0e0e0",
  // borderRadius: 6,
  marginHorizontal: 4

  },

tableContainer: {
  marginTop: 0,
  borderColor: "#eee",
  borderRadius: 6,
  overflow: "hidden",
  gap:3,
},
tableRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderColor: "#f0f0f0",
  backgroundColor: "#F8F9FA",

},
tableCell: {
  flex: 1,
  height:15,
  backgroundColor: "#e0e0e0",
  borderRadius: 4,
  marginHorizontal: 6,
  width:5,
},

 readingCardSkeleton: {
  flex: 1,
  backgroundColor: "#F8FAFC",
  borderRadius: 8,
  padding: 12,
  borderLeftWidth: 3,
  borderColor: "#E2E8F0",
  marginHorizontal: 4,
},
skeletonPhase: {
  height: 12,
  width: "50%",
  backgroundColor: "#E2E8F0", 
  borderRadius: 4,
  marginBottom: 6,
},
skeletonValue: {
  height: 18,
  width: "70%",
  backgroundColor: "#CBD5E1", 
  borderRadius: 4,
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