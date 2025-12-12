import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface Props {
    children: ReactNode;
    /** Fallback UI to show on error. If not provided, default fallback is used. */
    fallback?: ReactNode;
    /** Called when an error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** If true, shows a retry button to reset the boundary */
    showRetry?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component for graceful error handling
 * Catches JavaScript errors in child component tree and displays a fallback UI
 *
 * @example
 * <ErrorBoundary onError={logError} showRetry>
 *   <ComplexComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
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
                <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-elevated)] border border-red-500/20 rounded-xl text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Something went wrong
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    {this.props.showRetry && (
                        <Button
                            onClick={this.handleRetry}
                            variant="secondary"
                            className="flex items-center gap-2"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </Button>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

/**
 * Functional wrapper for ErrorBoundary with hooks support
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    errorBoundaryProps?: Omit<Props, 'children'>
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}
