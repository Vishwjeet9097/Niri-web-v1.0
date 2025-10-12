import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ErrorContext } from '@/types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorContext: ErrorContext) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorContext?: ErrorContext;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorContext: {
        component: 'ErrorBoundary',
        action: 'componentDidCatch',
        timestamp: Date.now()
      }
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorContext: ErrorContext = {
      component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
      action: 'componentDidCatch',
      timestamp: Date.now(),
      userId: this.getCurrentUserId()
    };

    this.setState({
      error,
      errorInfo,
      errorContext
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo, errorContext);

    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo, errorContext);
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : undefined;
    } catch {
      return undefined;
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo, errorContext: ErrorContext) {
    // In a real application, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorContext,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Example: Send to your backend API
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData)
    }).catch(() => {
      // Silently fail if error logging fails
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-red-600">
                Something went wrong
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  An unexpected error occurred. Our team has been notified and is working to fix it.
                </AlertDescription>
              </Alert>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Error Details:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-mono text-red-800">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-600 cursor-pointer">
                          Stack Trace
                        </summary>
                        <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Error Context */}
              {this.state.errorContext && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Error Context:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Component: {this.state.errorContext.component}
                    </Badge>
                    <Badge variant="outline">
                      Action: {this.state.errorContext.action}
                    </Badge>
                    {this.state.errorContext.userId && (
                      <Badge variant="outline">
                        User: {this.state.errorContext.userId}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Time: {new Date(this.state.errorContext.timestamp).toLocaleString()}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={this.handleReload} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  If this problem persists, please contact support or try refreshing the page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
