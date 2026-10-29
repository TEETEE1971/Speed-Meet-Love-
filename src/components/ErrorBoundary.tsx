import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Speed Meet Love runtime error caught by boundary:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      // Clear potentially corrupt session keys if needed
      window.location.reload();
    } catch (e) {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFF8FA] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-pink-200 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-pink-100 flex items-center justify-center mx-auto text-[#FF2E93]">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 font-heading">
              {this.props.fallbackTitle || 'Speed Meet Love'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We encountered a display issue on this device. Your account, membership tier, and speed dating registrations are safe.
            </p>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left font-mono text-[11px] text-slate-600 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-2xl btn-pink-gradient font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
