import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="max-w-md mx-auto py-24 text-center px-4">
            <h1 className="text-2xl text-stone-800 mb-3">Something went wrong</h1>
            <p className="text-stone-500 text-sm mb-6">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-stone-800 text-white px-6 py-3 text-sm tracking-wider uppercase hover:bg-amber-900"
            >
              Reload
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
