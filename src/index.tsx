import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { isChunkLoadError, reloadOnChunkError } from './lib/lazy'

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnChunkError();
  });
}

class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      reloadOnChunkError();
    }
  }
  handleRetry = () => {
    try {
      sessionStorage.removeItem('iqxo_chunk_error_reload_at');
    } catch {
      // ignore
    }
    if (!reloadOnChunkError()) {
      window.location.reload();
    }
  };
  render() {
    if (this.state.hasError) {
      const chunkErr = isChunkLoadError(this.state.error);
      return (
        <div style={{ padding: 24, color: '#E8E8E8', backgroundColor: '#0C0C0E', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            {chunkErr ? 'Connection interrupted' : 'Something went wrong'}
          </h1>
          <p style={{ fontSize: 14, color: '#A0A0A8', maxWidth: 320, marginBottom: 20 }}>
            {chunkErr
              ? 'We could not load the latest screen. Check your internet connection and tap Reload.'
              : 'Please reload the app to continue.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{ backgroundColor: '#5BC0DE', color: '#0C0C0E', fontWeight: 600, fontSize: 14, border: 'none', borderRadius: 9999, padding: '12px 28px', cursor: 'pointer' }}
          >
            Reload App
          </button>
          {!chunkErr && this.state.error?.message && (
            <pre style={{ marginTop: 24, maxWidth: '100%', overflowX: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.06)', color: '#A0A0A8', padding: 14, borderRadius: 8, fontSize: 11 }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
)
