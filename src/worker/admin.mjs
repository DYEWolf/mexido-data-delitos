import { esc, fmt, page, titleCase } from './ui.mjs';

// Cloudflare Access sits in front of the admin hostname; we still verify its JWT (RS256 signature, issuer,
// expiry and, when ACCESS_AUD is configured, audience) so the admin never trusts a header alone.
const TEAM = 'https://mexicovisible.cloudflareaccess.com';
let certCache = { at: 0, keys: [] };

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

async function accessIdentity(req, env) {
  if (env.ADMIN_DEV_BYPASS === 'local-only' && env.ENVIRONMENT === 'development') return { email: 'dev@localhost' };
  const url = new URL(req.url);
  if (url.hostname !== env.ADMIN_HOSTNAME) return null;
  const token = req.headers.get('cf-access-jwt-assertion');
  if (!token) return null;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const claims = JSON.parse(new TextDecoder().decode(b64url(p)));
    if (header.alg !== 'RS256' || claims.iss !== TEAM || !(claims.exp * 1000 > Date.now())) return null;
    if (env.ACCESS_AUD && ![].concat(claims.aud).includes(env.ACCESS_AUD)) return null;
    if (Date.now() - certCache.at > 3600_000) {
      const certs = await fetch(`${TEAM}/cdn-cgi/access/certs`).then((r) => r.json());
      certCache = { at: Date.now(), keys: certs.keys || [] };
    }
    const jwk = certCache.keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    return ok ? { email: claims.email } : null;
  } catch { return null; }
}

function forbidden(env) {
  return new Response(JSON.stringify({ ok: false, error: 'forbidden', environment: env.ENVIRONMENT || 'unknown',
    message: 'Admin endpoints require Cloudflare Access.' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const REASONS = { family_request: 'Familiar pide retiro', takedown_request: 'La persona pide retiro', correction: 'Localizada / datos incorrectos', privacy: 'Privacidad', other: 'Otro', legal: 'Legal' };

export async function admin(req, env) {
  const who = await accessIdentity(req, env);
  if (!who) return forbidden(env);
  const url = new URL(req.url);
  if (url.pathname === '/admin/health') return new Response(JSON.stringify({ ok: true, environment: env.ENVIRONMENT }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  if (req.method === 'POST') {
    // Same-origin form posts only.
    if (req.headers.get('origin') && new URL(req.headers.get('origin')).host !== url.host) return forbidden(env);
    const form = await req.formData();
    const action = form.get('action'), id = String(form.get('id') || ''), requestId = Number(form.get('request') || 0);
    const now = new Date().toISOString();
    if (action === 'suppress' && /^[A-Za-z0-9_-]{1,64}$/.test(id)) {
      const reason = Object.hasOwn(REASONS, form.get('reason')) ? form.get('reason') : 'other';
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO suppressions (id, reason, created_at) VALUES (?,?,?)').bind(id, reason, now),
        env.DB.prepare("UPDATE takedown_requests SET status='suppressed', resolved_at=? WHERE id=? OR (cedula_id=? AND status='pending')").bind(now, requestId, id),
      ]);
      // Drop the edge-cached copies of this cédula (wall pages expire within 10 minutes on their own).
      if (typeof caches !== 'undefined' && env.PUBLIC_HOSTNAME) {
        await Promise.all([`/cedula/${id}`, `/api/cedulas/${id}`].map((p) => caches.default.delete(`https://${env.PUBLIC_HOSTNAME}${p}`)));
      }
    } else if (action === 'restore' && /^[A-Za-z0-9_-]{1,64}$/.test(id)) {
      await env.DB.prepare('DELETE FROM suppressions WHERE id=?').bind(id).run();
    } else if (action === 'reject' && requestId) {
      await env.DB.prepare("UPDATE takedown_requests SET status='rejected', resolved_at=? WHERE id=?").bind(now, requestId).run();
    }
    return Response.redirect(`${url.origin}/admin`, 303);
  }
  const [pending, supp, meta] = await env.DB.batch([
    env.DB.prepare(`SELECT t.*, c.nombre FROM takedown_requests t LEFT JOIN cedulas c ON c.id = t.cedula_id WHERE t.status='pending' ORDER BY t.created_at`),
    env.DB.prepare('SELECT s.*, c.nombre FROM suppressions s LEFT JOIN cedulas c ON c.id = s.id ORDER BY s.created_at DESC LIMIT 200'),
    env.DB.prepare('SELECT key, value FROM meta'),
  ]);
  const m = Object.fromEntries(meta.results.map((r) => [r.key, r.value]));
  const age = (iso) => { const h = (Date.now() - Date.parse(iso)) / 3600000; return h < 1 ? 'hace menos de 1 h' : `hace ${Math.floor(h)} h`; };
  const body = `<h1>Administración</h1><p class="meta">Sesión: ${esc(who.email)} · Registro observado ${esc(m.snapshot_observed_at)} · Construido ${esc(m.built_at)} · ${fmt(m.published)} cédulas publicadas</p>
<h2>Solicitudes de retiro pendientes (${pending.results.length})</h2>
${pending.results.length ? `<div class="table-scroll"><table><thead><tr><th>Recibida</th><th>Folio</th><th>Persona</th><th>Motivo</th><th>Contacto / mensaje</th><th></th></tr></thead><tbody>
${pending.results.map((t) => `<tr><td>${esc(age(t.created_at))}${(Date.now() - Date.parse(t.created_at)) > 20 * 3600000 ? ' <b>⚠ cerca de 24 h</b>' : ''}</td><td>${esc(t.cedula_id || '—')}</td><td>${t.cedula_id ? `<a href="/cedula/${esc(t.cedula_id)}">${esc(titleCase(t.nombre) || 'no encontrada')}</a>` : '—'}</td>
<td>${esc(REASONS[t.reason] || t.reason)}${t.relation ? `<br><span class="meta">${esc(t.relation)}</span>` : ''}</td><td>${esc(t.contact || '')}<br><span class="meta">${esc(t.message || '')}</span></td>
<td><form method="post"><input type="hidden" name="request" value="${t.id}">${t.cedula_id ? `<input type="hidden" name="id" value="${esc(t.cedula_id)}"><input type="hidden" name="reason" value="${esc(t.reason)}"><button name="action" value="suppress">Retirar</button> ` : ''}<button class="secondary" name="action" value="reject">Descartar</button></form></td></tr>`).join('')}
</tbody></table></div>` : '<p>No hay solicitudes pendientes.</p>'}
<h2>Retirar una cédula manualmente</h2><form method="post" class="filters"><label>Folio<input name="id" required pattern="[A-Za-z0-9_-]+" maxlength="64"></label>
<label>Motivo<select name="reason">${Object.entries(REASONS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label><button name="action" value="suppress">Retirar</button></form>
<h2>Cédulas retiradas (${supp.results.length})</h2>
${supp.results.length ? `<div class="table-scroll"><table><thead><tr><th>Folio</th><th>Persona</th><th>Motivo</th><th>Fecha</th><th></th></tr></thead><tbody>
${supp.results.map((s) => `<tr><td>${esc(s.id)}</td><td>${esc(titleCase(s.nombre) || '—')}</td><td>${esc(REASONS[s.reason] || s.reason)}</td><td>${esc(s.created_at.slice(0, 16).replace('T', ' '))}</td>
<td><form method="post"><input type="hidden" name="id" value="${esc(s.id)}"><button class="secondary" name="action" value="restore">Restaurar</button></form></td></tr>`).join('')}</tbody></table></div>` : '<p>Ninguna.</p>'}`;
  return page({ title: 'Administración', path: '/admin', body, cache: 'no-store' });
}
