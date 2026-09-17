import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: 'red', minHeight: '100vh', wordWrap: 'break-word' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Something went wrong. (React Crash)</h1>
          <p style={{ fontWeight: 'bold' }}>Error:</p>
          <pre style={{ background: '#550000', padding: '10px', overflowX: 'auto', marginBottom: '20px' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <p style={{ fontWeight: 'bold' }}>Component Stack:</p>
          <pre style={{ background: '#550000', padding: '10px', overflowX: 'auto' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
