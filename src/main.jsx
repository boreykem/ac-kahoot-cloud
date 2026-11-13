import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

// Automatically route all /api calls to Render backend when hosted on Cloudflare Pages, Workers, or custom domain
const isExternalCloud = typeof window !== 'undefined' && 
  !window.location.hostname.includes('onrender.com') && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1') &&
  !window.location.hostname.startsWith('192.168.') &&
  !window.location.hostname.startsWith('10.');

const BACKEND_URL = isExternalCloud
  ? 'https://ac-kahoot.onrender.com'
  : (import.meta.env.VITE_BACKEND_URL || '');

if (BACKEND_URL) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = BACKEND_URL + input;
    } else if (input instanceof URL && input.pathname.startsWith('/api')) {
      input = new URL(BACKEND_URL + input.pathname + input.search);
    } else if (input instanceof Request && input.url.startsWith('/api')) {
      input = new Request(BACKEND_URL + input.url, input);
    }
    return originalFetch.call(this, input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register Service Worker for PWA Desktop Install
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration ignored:', err);
    });
  });
}
