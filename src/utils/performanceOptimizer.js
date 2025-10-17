/**
 * Performance Optimizer
 * 
 * Utilities for maximum performance:
 * - Request deduplication
 * - Aggressive caching
 * - Parallel processing
 * - Memory optimization
 */

// Request deduplication map
const pendingRequests = new Map();

// Performance metrics
const performanceMetrics = {
  requestCount: 0,
  cacheHits: 0,
  averageResponseTime: 0,
  totalResponseTime: 0
};

/**
 * Deduplicate requests to prevent duplicate API calls
 */
export const deduplicateRequest = (key, requestFunction) => {
  if (pendingRequests.has(key)) {
    console.log(`⚡ Performance: Reusing pending request for ${key}`);
    return pendingRequests.get(key);
  }

  const requestPromise = requestFunction().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, requestPromise);
  return requestPromise;
};

/**
 * Measure and track performance metrics
 */
export const measurePerformance = async (operation, operationName) => {
  const startTime = performance.now();
  performanceMetrics.requestCount++;
  
  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performanceMetrics.totalResponseTime += duration;
    performanceMetrics.averageResponseTime = 
      performanceMetrics.totalResponseTime / performanceMetrics.requestCount;
    
    console.log(`⏱️ Performance: ${operationName} completed in ${duration.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.error(`❌ Performance: ${operationName} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
};

/**
 * Batch multiple operations for parallel execution
 */
export const batchOperations = async (operations, batchSize = 5) => {
  const results = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Optimize memory usage by cleaning up old data
 */
export const optimizeMemory = () => {
  // Clear old pending requests
  const now = Date.now();
  for (const [key, promise] of pendingRequests.entries()) {
    // Remove requests older than 30 seconds
    if (now - (promise.timestamp || 0) > 30000) {
      pendingRequests.delete(key);
    }
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  console.log('🧹 Performance: Memory optimized');
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = () => {
  return {
    ...performanceMetrics,
    cacheHitRate: performanceMetrics.cacheHits / performanceMetrics.requestCount * 100,
    pendingRequests: pendingRequests.size
  };
};

/**
 * Preload critical data for instant access
 */
export const preloadCriticalData = async (dataLoaders) => {
  console.log('🚀 Performance: Preloading critical data');
  
  const startTime = performance.now();
  
  try {
    const results = await Promise.allSettled(
      dataLoaders.map(loader => loader())
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Performance: Preloaded ${dataLoaders.length} data sources in ${duration.toFixed(2)}ms`);
    
    return results;
  } catch (error) {
    console.error('❌ Performance: Preloading failed:', error);
    throw error;
  }
};

/**
 * Optimize images and assets
 */
export const optimizeAssets = {
  // Lazy load images
  lazyLoadImage: (imageUri, placeholder) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(imageUri);
      img.onerror = () => resolve(placeholder);
      img.src = imageUri;
    });
  },
  
  // Preload critical images
  preloadImages: (imageUris) => {
    return Promise.allSettled(
      imageUris.map(uri => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(uri);
          img.onerror = () => resolve(null);
          img.src = uri;
        });
      })
    );
  }
};

/**
 * Network optimization
 */
export const networkOptimizer = {
  // Check network speed
  checkNetworkSpeed: async () => {
    const startTime = performance.now();
    
    try {
      await fetch('https://api.bestinfra.app/v2gmr/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const speed = endTime - startTime;
      
      if (speed < 500) return 'fast';
      if (speed < 1500) return 'medium';
      return 'slow';
    } catch (error) {
      return 'offline';
    }
  },
  
  // Adjust timeout based on network speed
  getOptimalTimeout: async () => {
    const speed = await networkOptimizer.checkNetworkSpeed();
    
    switch (speed) {
      case 'fast': return 5000;
      case 'medium': return 10000;
      case 'slow': return 15000;
      default: return 20000;
    }
  }
};

export default {
  deduplicateRequest,
  measurePerformance,
  batchOperations,
  optimizeMemory,
  getPerformanceMetrics,
  preloadCriticalData,
  optimizeAssets,
  networkOptimizer
};
