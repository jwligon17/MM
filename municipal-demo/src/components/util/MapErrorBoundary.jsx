import React from "react";

export default class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState((prevState) => {
      if (prevState.error && prevState.error.stack) {
        return null;
      }

      return { error: { ...error, stack: error.stack ?? info.componentStack } };
    });
  }

  render() {
    const { error } = this.state;
    if (error) {
      const message = error.message ? `\n${error.message}` : "";
      const stack = error.stack ? `\n${error.stack}` : "";
      return (
        <div className="h-full w-full flex items-center justify-center p-6 text-slate-100">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed">
            {`Map failed to render${message}${stack}`}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
