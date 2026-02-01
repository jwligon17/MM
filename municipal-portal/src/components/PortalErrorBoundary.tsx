import React from "react";

type PortalErrorBoundaryProps = {
  children: React.ReactNode;
};

type PortalErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

class PortalErrorBoundary extends React.Component<
  PortalErrorBoundaryProps,
  PortalErrorBoundaryState
> {
  state: PortalErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[PortalErrorBoundary] runtime error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message = this.state.error?.message || "Unexpected error.";

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            width: "100%",
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "16px",
            padding: "28px 32px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
            Portal hit an error
          </div>
          <div style={{ opacity: 0.85, marginBottom: "16px" }}>
            {message}
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#38bdf8",
              color: "#0f172a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {this.state.errorInfo?.componentStack ? (
            <details style={{ marginTop: "16px", opacity: 0.75 }}>
              <summary style={{ cursor: "pointer" }}>Details</summary>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: "8px" }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    );
  }
}

export default PortalErrorBoundary;
