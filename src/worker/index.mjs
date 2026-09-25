import { metodologia, notFound, serverError } from './pages.mjs';
import { home, violenciaLetal, busqueda, tendencias, victimas, cifraNegra } from './story.mjs';
import { mapa, municipio, municipioIndex } from './explore.mjs';
import { municipios } from './data.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (body, init = {}) => new Response(JSON.stringify(body), { ...init, headers: { ...JSON_HEADERS, ...(init.headers || {}) } });

async function api(req, env, path) {
  const cache = { headers: { 'cache-control': 'public, max-age=300' } };
  if (path === '/api/municipios') return json({ ok: true, results: (await municipios(env.DB)).map(({ cedulas_desaparecidas, ...m }) => m) }, cache);
  return null;
}

const STORY = { '/violencia-letal': violenciaLetal, '/busqueda': busqueda, '/tendencias': tendencias, '/victimas': victimas, '/cifra-negra': cifraNegra };
const ROBOTS = `User-agent: *
Allow: /$
Allow: /mapa
Allow: /municipio
Allow: /metodologia
${Object.keys(STORY).map((p) => `Allow: ${p}`).join('\n')}
Disallow: /*?
Disallow: /api/
`;
// Public GET pages are cached at the edge for 10 minutes: repeated visits and crawlers cost no D1 reads.
const CACHEABLE = /^\/($|mapa$|municipio(\/14\d{3})?$|metodologia$|violencia-letal$|busqueda$|tendencias$|victimas$|cifra-negra$|api\/municipios$)/;
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
  // The cédula admin is retired for now; its hostname serves nothing.
  if (env.ADMIN_HOSTNAME && url.hostname === env.ADMIN_HOSTNAME) return notFound(request);
  if (!env.DB) return notFound(request);
  if (!['GET', 'HEAD'].includes(request.method)) return json({ ok: false, error: 'method_not_allowed' }, { status: 405 });

  try {
    if (path.startsWith('/api/')) return (await api(request, env, path)) || notFound(request);
    if (path === '/') return home();
    if (STORY[path]) return STORY[path]();
    if (path === '/municipio') {
      const m = url.searchParams.get('m');
      return /^14\d{3}$/.test(m || '') ? Response.redirect(`${url.origin}/municipio/${m}`, 302) : municipioIndex();
    }
    const mu = path.match(/^\/municipio\/(14\d{3})$/);
    if (mu) return (await municipio(request, env, mu[1], (c) => env.DB.prepare('SELECT repd_desaparecidas FROM municipios WHERE cvegeo = ?').bind(c).first())) || notFound(request);
    if (path === '/mapa') return await mapa(request, env, () => municipios(env.DB));
    if (path === '/metodologia') return await metodologia(request, env);
    return notFound(request);
  } catch (error) {
    console.error(JSON.stringify({ event: 'request_failed', path, message: String(error?.message || error) }));
    if (path.startsWith('/api/')) return json({ ok: false, error: 'internal_error' }, { status: 500 });
    const res = serverError(request);
    if (res.status === 503) res.headers.set('retry-after', '1800');
    return res;
  }
}
