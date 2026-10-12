import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HR360 Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white border border-red-200 rounded shadow-sm m-6">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Module Display Encountered an Issue</h2>
          <p className="text-sm text-slate-600 max-w-md mb-4 leading-relaxed">
            The workspace encountered an unexpected state while loading this module. You can reload the view or return to dashboard.
          </p>
          {this.state.error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-mono rounded max-w-lg overflow-x-auto mb-6 text-left">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded flex items-center shadow-xs"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
