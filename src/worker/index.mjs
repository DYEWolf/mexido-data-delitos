import { home, cedula, mapa, metodologia, retiroForm, retiroSubmit, notFound } from './pages.mjs';
import { admin } from './admin.mjs';
import { parseFilters, listCedulas, getCedula, municipios, overview } from './data.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (body, init = {}) => new Response(JSON.stringify(body), { ...init, headers: { ...JSON_HEADERS, ...(init.headers || {}) } });
const PUBLIC_FIELDS = ['id', 'nombre', 'edad', 'sexo', 'genero', 'fecha', 'municipio_cvegeo', 'municipio_nombre', 'nacionalidad',
  'estatura', 'complexion', 'tez', 'cabello', 'ojos'];

async function api(req, env, path) {
  const cache = { headers: { 'cache-control': 'public, max-age=300' } };
  if (path === '/api/cedulas') {
    const { rows, total } = await listCedulas(env.DB, parseFilters(new URL(req.url)));
    return json({ ok: true, total, results: rows.map(({ foto_key, ...r }) => ({ ...r, foto: !!foto_key })) }, cache);
  }
  const m = path.match(/^\/api\/cedulas\/([A-Za-z0-9_-]{1,64})$/);
  if (m) {
    const c = await getCedula(env.DB, m[1]);
    if (!c) return json({ ok: false, error: 'not_found' }, { status: 404 });
    return json({ ok: true, cedula: { ...Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, c[k]])),
      senas: JSON.parse(c.senas), vestimenta: JSON.parse(c.vestimenta), foto: !!c.foto_key } }, cache);
  }
  if (path === '/api/municipios') return json({ ok: true, results: await municipios(env.DB) }, cache);
  if (path === '/api/resumen') { const o = await overview(env.DB); return json({ ok: true, ...o }, cache); }
  return null;
}

async function foto(env, id) {
  const c = await getCedula(env.DB, id);
  if (!c?.foto_key || !env.PUBLIC_DERIVATIVES) return null;
  const obj = await env.PUBLIC_DERIVATIVES.get(c.foto_key);
  if (!obj) return null;
  return new Response(obj.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' } });
}

const ROBOTS = `User-agent: *
Allow: /$
Allow: /cedula/
Allow: /mapa
Allow: /metodologia
Disallow: /*?
Disallow: /api/
Disallow: /retiro
Disallow: /foto/
`;
// Public GET pages are cached at the edge for 10 minutes: repeated visits and crawlers cost no D1 reads.
const CACHEABLE = /^\/($|cedula\/|mapa$|metodologia$|api\/(cedulas|municipios|resumen))/;
const EDGE_TTL = 600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
    if (path === '/robots.txt') return new Response(ROBOTS, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
    // No edge cache in local development, so edits show up on the next reload.
    const cacheable = env.ENVIRONMENT !== 'development' && request.method === 'GET' && env.DB && url.hostname !== env.ADMIN_HOSTNAME && CACHEABLE.test(path) && typeof caches !== 'undefined';
    if (cacheable) {
      const hit = await caches.default.match(request);
      if (hit) return hit;
    }
    const response = await route(request, env, url, path);
    if (env.ENVIRONMENT === 'development') {
      const dev = new Response(response.body, response);
      dev.headers.set('cache-control', 'no-store');
      return dev;
    }
    if (cacheable && response.status === 200) {
      const copy = new Response(response.body, response);
      copy.headers.set('cache-control', `public, max-age=${EDGE_TTL}`);
      ctx?.waitUntil?.(caches.default.put(request, copy.clone()));
      return copy;
    }
    return response;
  },
};

async function route(request, env, url, path) {
  if (path === '/health') return json({ ok: true, environment: env.ENVIRONMENT || 'unknown' });
  if (path === '/admin' || path.startsWith('/admin/')) return admin(request, env);
  // Public site is never served on the admin hostname and vice versa.
  if (env.ADMIN_HOSTNAME && url.hostname === env.ADMIN_HOSTNAME) return Response.redirect(`${url.origin}/admin`, 302);
  if (!env.DB) return notFound(request);
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return json({ ok: false, error: 'method_not_allowed' }, { status: 405 });

  try {
    if (path.startsWith('/api/')) return (await api(request, env, path)) || notFound(request);
    if (path === '/') return await home(request, env);
    const c = path.match(/^\/cedula\/([A-Za-z0-9_-]{1,64})$/);
    if (c) return await cedula(request, env, c[1]);
    const f = path.match(/^\/foto\/([A-Za-z0-9_-]{1,64})$/);
    if (f) return (await foto(env, f[1])) || notFound(request);
    if (path === '/mapa') return await mapa(request, env);
    if (path === '/metodologia') return await metodologia(request, env);
    if (path === '/retiro') return request.method === 'POST' ? await retiroSubmit(request, env) : retiroForm(request, env);
    return notFound(request);
  } catch (error) {
    console.error(JSON.stringify({ event: 'request_failed', path, message: String(error?.message || error) }));
    return json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
