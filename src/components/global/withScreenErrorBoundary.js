/**
 * Wraps a screen component in an ErrorBoundary so one broken screen
 * does not take down the whole app. Use for screen-level isolation.
 */
import React from 'react';
import ErrorBoundary from './ErrorBoundary';

export function withScreenErrorBoundary(Component) {
  function WrappedScreen(props) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  WrappedScreen.displayName = `WithScreenErrorBoundary(${Component.displayName || Component.name || 'Screen'})`;
  return WrappedScreen;
}

export default withScreenErrorBoundary;
