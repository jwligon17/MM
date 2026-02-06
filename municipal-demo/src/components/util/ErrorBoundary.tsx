import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
  };

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    const { error, errorInfo } = this.state;

    if (error) {
      const stackDetails = [error.stack, errorInfo?.componentStack]
        .filter(Boolean)
        .join("\n");

      return (
        <div className="dashboard-map__container map__status map-error-boundary" role="alert">
          <div className="map-error-boundary__panel">
            <div className="map-error-boundary__title">Map failed to render</div>
            <div className="map-error-boundary__message">{error.message}</div>
            <pre className="map-error-boundary__stack">
              {stackDetails || "No stack trace available."}
            </pre>
            <button type="button" className="map-error-boundary__reload" onClick={this.handleReload}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
