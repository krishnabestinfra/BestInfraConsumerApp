/**
 * Navigation Context
 * 
 * Provides global navigation state management to prevent unnecessary reloads
 * and ensure smooth navigation between screens.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastNavigationTime, setLastNavigationTime] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);

  // Smooth navigation with loading state management
  const navigateSmoothly = useCallback((screenName, params = {}) => {
    const now = Date.now();
    
    // Prevent rapid navigation
    if (lastNavigationTime && (now - lastNavigationTime) < 300) {
      return;
    }

    setIsNavigating(true);
    setLastNavigationTime(now);
    
    // Add to navigation history
    setNavigationHistory(prev => [...prev.slice(-4), { screen: screenName, timestamp: now }]);

    // Simulate smooth transition
    setTimeout(() => {
      setIsNavigating(false);
    }, 100);
  }, [lastNavigationTime]);

  // Check if we're in a rapid navigation sequence
  const isRapidNavigation = useMemo(() => {
    if (navigationHistory.length < 2) return false;
    const recent = navigationHistory.slice(-2);
    return (recent[1].timestamp - recent[0].timestamp) < 500;
  }, [navigationHistory]);

  const contextValue = useMemo(() => ({
    isNavigating,
    setIsNavigating,
    navigateSmoothly,
    isRapidNavigation,
    navigationHistory
  }), [isNavigating, navigateSmoothly, isRapidNavigation, navigationHistory]);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;
