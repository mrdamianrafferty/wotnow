import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Display name for the feature section (shown in fallback UI) */
  feature: string;
  /** Optional custom fallback component */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-level error boundary that catches rendering errors
 * in a subsection of the page, showing a localized fallback
 * instead of crashing the entire page.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.feature}] Error boundary caught:`, error, errorInfo);
    // If Sentry is available, report
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__SENTRY__) {
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureException(error, { extra: { feature: this.props.feature, componentStack: errorInfo.componentStack } });
      }).catch(() => {});
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800 font-medium mb-2">
            Something went wrong loading {this.props.feature}
          </p>
          <p className="text-red-600 text-sm mb-4">
            This section encountered an error. The rest of the page should still work.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
