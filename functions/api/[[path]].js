// Oct 27 2026: Cloudflare Pages Function - serve /api/* from degencap.uk itself by proxying to the backend. Calling
// https://fartpie.onrender.com directly made the login cookie third-party; Safari / iOS / third-party-cookie blocking dropped it and people
// were bounced back to the login screen after signing in. Through this proxy the session cookie belongs to degencap.uk (first-party).
const BACKEND = 'https://fartpie.onrender.com';
export async function onRequest({ request }) {
  const url = new URL(request.url);
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
  out.set('x-proxied-by', 'degencap-pages');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: out });
}
