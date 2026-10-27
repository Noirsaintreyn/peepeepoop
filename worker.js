// Oct 27 2026: serve the API from degencap.uk itself. The site used to call https://fartpie.onrender.com directly, which made the login
// cookie a third-party cookie - Safari / iOS (and Chrome with third-party cookies blocked) silently drop it, so people logged in and were
// bounced straight back to the login screen. Proxying /api/* through this domain makes the session cookie first-party.
const BACKEND = 'https://fartpie.onrender.com';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const headers = new Headers(request.headers);
      headers.delete('host');
      const init = { method: request.method, headers, redirect: 'manual' };
      if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();
      let r;
      try { r = await fetch(BACKEND + url.pathname + url.search, init); }
      catch (e) { return new Response(JSON.stringify({ success: false, error: 'backend unreachable' }), { status: 502, headers: { 'Content-Type': 'application/json' } }); }
      const out = new Headers(r.headers);
      out.delete('access-control-allow-origin'); out.delete('access-control-allow-credentials');
      const cookies = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
      if (cookies.length) { out.delete('set-cookie'); for (const c of cookies) out.append('set-cookie', c.replace(/;\s*Domain=[^;]*/i, '')); }
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: out });
    }
    return env.ASSETS.fetch(request);
  }
};
