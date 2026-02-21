/**
 * Global Error Boundary
 *
 * Catches JavaScript errors in the component tree and shows a fallback UI
 * instead of a white screen. Required for enterprise/production safety.
 * Reports errors to crash monitoring (production only) when available.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { captureError } from "../../config/monitoring";

const DEFAULT_MESSAGE = "Something went wrong. Please restart the app.";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }
    try {
      captureError(error, errorInfo);
    } catch (_) {
      // Monitoring must never break the app
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, onRetry } = this.props;
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            onRetry={onRetry || this.handleRetry}
          />
        );
      }
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {__DEV__ && this.state.error
              ? String(this.state.error.message)
              : DEFAULT_MESSAGE}
          </Text>
          <Pressable style={styles.button} onPress={onRetry || this.handleRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  message: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#163b7c",
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ErrorBoundary;
