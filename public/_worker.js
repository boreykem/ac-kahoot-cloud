export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API requests and WebSockets to Render backend
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
      const targetUrl = new URL(url.pathname + url.search, 'https://ac-kahoot.onrender.com');
      return fetch(new Request(targetUrl, request));
    }

    // Serve static frontend assets from Cloudflare Pages edge CDN
    return env.ASSETS.fetch(request);
  }
};

