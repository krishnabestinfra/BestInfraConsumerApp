/**
 * Unit tests for ErrorBoundary: getDerivedStateFromError and captureError behavior.
 */
import React from 'react';
import ErrorBoundary from '../ErrorBoundary';

const mockCaptureError = jest.fn();
jest.mock('../../../config/monitoring', () => ({
  captureError: (...args) => mockCaptureError(...args),
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getDerivedStateFromError returns hasError and error', () => {
    const err = new Error('Test error');
    const state = ErrorBoundary.getDerivedStateFromError(err);
    expect(state).toEqual({ hasError: true, error: err });
  });

  it('componentDidCatch calls captureError with error and errorInfo', () => {
    const err = new Error('Child error');
    const errorInfo = { componentStack: ' at Child' };
    const instance = new ErrorBoundary({ children: null });
    instance.componentDidCatch(err, errorInfo);
    expect(mockCaptureError).toHaveBeenCalledWith(err, errorInfo);
  });

  it('does not rethrow when captureError throws', () => {
    mockCaptureError.mockImplementationOnce(() => {
      throw new Error('Monitoring failed');
    });
    const err = new Error('Child error');
    const instance = new ErrorBoundary({ children: null });
    expect(() => instance.componentDidCatch(err, {})).not.toThrow();
    expect(mockCaptureError).toHaveBeenCalled();
  });
});
