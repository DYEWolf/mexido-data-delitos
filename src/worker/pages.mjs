import { esc, fmt, fecha, titleCase, page, initials } from './ui.mjs';
import { parseFilters, listCedulas, getCedula, municipios, overview } from './data.mjs';
import { MAP } from './generated/map.mjs';

const OFFICIAL = 'https://repd.jalisco.gob.mx/';
const updated = (o) => (o.meta.snapshot_observed_at ? fecha(o.meta.snapshot_observed_at.slice(0, 10)) : '');

function card(c) {
  const photo = c.foto_key ? `<img src="/foto/${esc(c.id)}" alt="Fotografía de ${esc(titleCase(c.nombre))}" loading="lazy">` : `<span aria-hidden="true">${initials(c.nombre)}</span>`;
  return `<a class="card" href="/cedula/${esc(c.id)}"><div class="photo${c.foto_key ? '' : ' empty'}">${photo}</div><div class="body">
<h3>${esc(titleCase(c.nombre) || 'Nombre no registrado')}</h3>
<p class="meta">${c.edad != null ? `${esc(c.edad)} años · ` : ''}${esc(titleCase(c.sexo))}</p>
<p class="meta">Desde el ${esc(fecha(c.fecha))}</p><p class="meta">${esc(titleCase(c.municipio_nombre) || 'Municipio no especificado')}</p></div></a>`;
}

export async function home(req, env) {
  const url = new URL(req.url);
  const f = parseFilters(url);
  const [o, list, muns] = await Promise.all([overview(env.DB), listCedulas(env.DB, f), municipios(env.DB)]);
  const ys = o.years.map((y) => ({ y }));
  const qs = (k, v) => { const p = new URLSearchParams(url.search); p.delete('despues'); p.delete('antes'); p.delete('pagina'); p.set(k, v); return `?${p}`; };
  const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const body = `
<h1>Personas desaparecidas en Jalisco</h1>
<p class="lede">Cédulas de búsqueda publicadas por el Registro Estatal de Personas Desaparecidas de Jalisco. Si reconoces a alguien, consulta su cédula y comunícate con las autoridades.</p>
<div class="stats">
 <div class="stat"><b>${fmt(o.totals.cedulas)}</b><span>cédulas de búsqueda públicas vigentes</span></div>
 <div class="stat"><b>16,250</b><span>personas desaparecidas según la estadística del registro (corte ${esc(fecha(o.meta.repd_stats_cutoff))})</span></div>
 <div class="stat"><b>${fmt(o.totals.s2026)}</b><span>delitos del fuero común en Jalisco, enero–agosto 2026 (SESNSP)</span></div>
</div>
<form class="filters" method="get" action="/" role="search">
 <label>Nombre<input type="search" name="q" value="${esc(url.searchParams.get('q') || '')}" placeholder="Buscar por nombre" maxlength="80"></label>
 <label>Municipio<select name="municipio">${opt('', 'Todos', f.municipio)}${muns.map((m) => opt(m.cvegeo, m.nombre, f.municipio)).join('')}${opt('ne', 'No especificado', f.municipio)}</select></label>
 <label>Sexo<select name="sexo">${opt('', 'Todos', f.sexo)}${opt('MUJER', 'Mujer', f.sexo)}${opt('HOMBRE', 'Hombre', f.sexo)}</select></label>
 <label>Año de desaparición<select name="anio">${opt('', 'Todos', f.anio)}${ys.map((y) => opt(y.y, y.y, f.anio)).join('')}</select></label>
 <button type="submit">Buscar</button>${url.search ? ' <a class="btn secondary" href="/">Limpiar</a>' : ''}
</form>
<p class="meta" aria-live="polite">${list.capped ? 'Más de ' : ''}${fmt(list.total)} ${list.total === 1 ? 'resultado' : 'resultados'}</p>
${list.rows.length ? `<div class="grid">${list.rows.map(card).join('')}</div>` : '<p>No hay cédulas que coincidan con la búsqueda.</p>'}
${list.prev || list.next ? `<nav class="pager" aria-label="Paginación">${list.prev ? `<a class="btn secondary" rel="prev nofollow" href="${esc(qs('antes', list.prev))}">← Más recientes</a>` : ''}${list.next ? `<a class="btn secondary" rel="next nofollow" href="${esc(qs('despues', list.next))}">Más antiguas →</a>` : ''}</nav>` : ''}`;
  return page({ title: 'Cédulas de búsqueda', path: '/', body, meta: { updated: updated(o) } });
}

export async function cedula(req, env, id) {
  const c = await getCedula(env.DB, id);
  if (!c) return notFound(req);
  const senas = JSON.parse(c.senas || '[]'), ropa = JSON.parse(c.vestimenta || '[]');
  const row = (k, v) => (v === null || v === undefined || v === '' ? '' : `<dt>${k}</dt><dd>${esc(v)}</dd>`);
  const list = (items, fn) => items.length ? `<ul>${items.map((x) => `<li>${esc(fn(x))}</li>`).join('')}</ul>` : '<p class="muted">Sin información registrada.</p>';
  const nombre = titleCase(c.nombre) || 'Nombre no registrado';
  const body = `<p class="meta"><a href="/">← Volver a las cédulas</a></p>
<div class="profile"><div class="card"><div class="photo${c.foto_key ? '' : ' empty'}">${c.foto_key ? `<img src="/foto/${esc(c.id)}" alt="Fotografía de ${esc(nombre)}">` : `<span aria-hidden="true">${initials(c.nombre)}</span>`}</div></div>
<div><h1>${esc(nombre)}</h1><p class="lede">Persona desaparecida desde el ${esc(fecha(c.fecha))}${c.municipio_nombre ? ` en ${esc(titleCase(c.municipio_nombre))}, Jalisco` : ''}.</p>
<dl class="fields">${row('Edad al desaparecer', c.edad != null ? `${c.edad} años` : null)}${row('Sexo', titleCase(c.sexo))}${row('Género', titleCase(c.genero))}
${row('Nacionalidad', titleCase(c.nacionalidad))}${row('Estatura', c.estatura ? `${c.estatura} m` : null)}${row('Complexión', titleCase(c.complexion))}
${row('Tez', titleCase(c.tez))}${row('Cabello', titleCase(c.cabello))}${row('Ojos', titleCase(c.ojos))}${row('Folio de la cédula', c.id)}</dl>
<h2>Señas particulares</h2>${list(senas, (s) => [s.tipo, s.parte, s.descripcion || s.general].filter(Boolean).map(titleCase).join(' · '))}
<h2>Vestimenta</h2>${list(ropa, (v) => [v.prenda, v.color, v.marca, v.descripcion].filter(Boolean).map(titleCase).join(' · '))}
<h2>¿Tienes información?</h2><p>Consulta la cédula oficial con el folio <b>${esc(c.id)}</b> en el <a href="${OFFICIAL}" rel="noopener">Registro Estatal de Personas Desaparecidas de Jalisco</a> y comunícate con la Comisión de Búsqueda de Personas del Estado de Jalisco.</p>
<p class="meta">¿Esta cédula debe retirarse? <a href="/retiro?folio=${encodeURIComponent(c.id)}">Solicitar retiro</a></p></div></div>`;
  return page({ title: nombre, path: '/cedula', body });
}

const LAYERS = {
  cedulas: { label: 'Cédulas vigentes', col: 'cedulas_desaparecidas', note: 'Cédulas de búsqueda públicas de personas desaparecidas, por municipio registrado en la cédula.' },
  repd: { label: 'Personas desaparecidas (estadística REPD)', col: 'repd_desaparecidas', note: 'Estadística municipal del registro estatal, corte 31 de agosto de 2026. No incluye 86 personas sin municipio ni 47 que no aparecen en el mapa oficial.' },
  delitos2026: { label: 'Delitos 2026 (ene–ago)', col: 'sesnsp_2026_total', rate: 'poblacion_2026', note: 'Incidencia delictiva del fuero común, SESNSP (metodología RNID 2026), enero a agosto.' },
  homicidio2025: { label: 'Homicidio doloso 2025', col: 'sesnsp_2025_homicidio', rate: 'poblacion_2025', note: 'Carpetas por homicidio doloso, SESNSP 2025. Serie comparable con 2026 según la nota metodológica del SESNSP.' },
  homicidio2026: { label: 'Homicidio doloso 2026 (ene–ago)', col: 'sesnsp_2026_homicidio', rate: 'poblacion_2026', note: 'Carpetas por homicidio doloso, SESNSP RNID 2026, enero a agosto.' },
};

export async function mapa(req, env) {
  const url = new URL(req.url);
  const key = LAYERS[url.searchParams.get('capa')] ? url.searchParams.get('capa') : 'cedulas';
  const layer = LAYERS[key];
  const perCapita = url.searchParams.get('tasa') === '1' && !!layer.rate;
  const [muns, o] = await Promise.all([municipios(env.DB), overview(env.DB)]);
  const value = (m) => { const v = m[layer.col]; if (v == null) return null; return perCapita ? (m[layer.rate] ? (v / m[layer.rate]) * 100000 : null) : v; };
  const vals = muns.map(value).filter((v) => v !== null && v > 0).sort((a, b) => a - b);
  // Quantile classes over non-zero values; zero gets its own neutral class.
  const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
  const breaks = vals.length ? [q(0.2), q(0.4), q(0.6), q(0.8)] : [];
  const cls = (v) => (v === null ? 'none' : v <= 0 ? 0 : 1 + breaks.filter((b) => v > b).length);
  const shown = (v) => (v === null ? 'sin dato' : perCapita ? `${v.toFixed(1)} por 100 mil hab.` : fmt(v));
  const byCode = Object.fromEntries(muns.map((m) => [m.cvegeo, m]));
  const paths = Object.entries(MAP.paths).map(([code, d]) => {
    const m = byCode[code]; const v = m ? value(m) : null; const c = cls(v);
    return `<path d="${d}" fill="${c === 'none' ? 'var(--seq-0)' : `var(--seq-${c})`}" tabindex="0" data-name="${esc(m?.nombre)}" data-value="${esc(shown(v))}"><title>${esc(m?.nombre)}: ${esc(shown(v))}</title></path>`;
  }).join('');
  const lo = [0, ...breaks], hi = [...breaks, vals.at(-1)];
  const r = (n) => (perCapita ? n.toFixed(1) : fmt(Math.round(n)));
  const legend = `<ul class="legend"><li><i style="background:var(--seq-0)"></i>0</li>${vals.length ? hi.map((h, i) => `<li><i style="background:var(--seq-${i + 1})"></i>${r(i ? lo[i] : vals[0])} – ${r(h)}</li>`).join('') : ''}</ul>`;
  const tabs = Object.entries(LAYERS).map(([k, l]) => `<a href="?capa=${k}${perCapita && l.rate ? '&tasa=1' : ''}"${k === key ? ' aria-current="page"' : ''}>${esc(l.label)}</a>`).join('');
  const sorted = [...muns].sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1));
  const body = `<h1>Mapa municipal de Jalisco</h1><p class="lede">${esc(layer.note)}</p>
<nav class="tabs" aria-label="Capa del mapa">${tabs}</nav>
${layer.rate ? `<p><a href="?capa=${key}${perCapita ? '' : '&tasa=1'}">${perCapita ? 'Ver números absolutos' : 'Ver tasa por 100 mil habitantes (CONAPO)'}</a></p>` : ''}
<div class="map-wrap"><svg viewBox="0 0 ${MAP.width} ${MAP.height}" role="img" aria-label="Mapa de ${esc(layer.label)} por municipio">${paths}</svg><div class="tip" id="tip"></div></div>
${legend}
<script>(()=>{const w=document.querySelector('.map-wrap'),t=document.getElementById('tip');const show=(e,p)=>{t.textContent=p.dataset.name+': '+p.dataset.value;t.style.display='block';const b=w.getBoundingClientRect(),r=p.getBoundingClientRect();const x=(e&&e.clientX!=null?e.clientX:r.left+r.width/2)-b.left,y=(e&&e.clientY!=null?e.clientY:r.top)-b.top;t.style.left=Math.min(x+12,b.width-t.offsetWidth-4)+'px';t.style.top=Math.max(y-34,4)+'px'};
w.querySelectorAll('path').forEach(p=>{p.addEventListener('mousemove',e=>show(e,p));p.addEventListener('focus',()=>show(null,p));p.addEventListener('mouseleave',()=>t.style.display='none');p.addEventListener('blur',()=>t.style.display='none');p.querySelector('title')&&p.removeChild(p.querySelector('title'))})})()</script>
<h2>Tabla por municipio</h2><div class="table-scroll"><table><thead><tr><th>Municipio</th><th class="n">${esc(layer.label)}${perCapita ? ' (por 100 mil hab.)' : ''}</th><th class="n">Población ${layer.rate === 'poblacion_2025' ? '2025' : '2026'}</th></tr></thead><tbody>
${sorted.map((m) => `<tr><td><a href="/?municipio=${m.cvegeo}">${esc(m.nombre)}</a></td><td class="n">${esc(shown(value(m)))}</td><td class="n">${fmt(layer.rate === 'poblacion_2025' ? m.poblacion_2025 : m.poblacion_2026)}</td></tr>`).join('')}
</tbody></table></div>
<p class="note">Registros sin municipio no aparecen en el mapa: ${fmt(o.buckets.cedulas_municipio_no_especificado?.value)} cédulas; ${fmt(o.buckets.repd_se_ignora_desaparecidas?.value)} personas en la estadística REPD; delitos SESNSP con municipio no especificado: ${fmt(o.buckets.sesnsp_2025_no_especificado?.value)} (2025) y ${fmt(o.buckets.sesnsp_2026_no_especificado?.value)} (2026).</p>`;
  return page({ title: 'Mapa municipal', path: '/mapa', body, meta: { updated: updated(o) } });
}

export async function metodologia(req, env) {
  const o = await overview(env.DB);
  const m = o.meta;
  const body = `<div class="prose"><h1>Metodología</h1>
<p class="lede">Qué datos usamos, de dónde vienen, qué decisiones tomamos y qué no sabemos. Todas las fuentes son públicas y oficiales.</p>
<h2>Fuentes</h2><ul>
<li><b>Registro Estatal de Personas Desaparecidas de Jalisco (REPD)</b>: cédulas de búsqueda de la versión pública. Registro observado el ${esc(updated(o))}, ${fmt(m.snapshot_count)} cédulas en total. Estadística agregada con corte al ${esc(fecha(m.repd_stats_cutoff))}.</li>
<li><b>SESNSP</b>: incidencia delictiva municipal del fuero común. Serie 2015–2025 (metodología anterior) y enero–agosto 2026 (metodología RNID).</li>
<li><b>CONAPO</b>: ${esc(m.conapo_version)} (población a mitad de año), para las tasas por 100 mil habitantes.</li>
<li><b>INEGI</b>: ${esc(m.inegi_version)}, para los límites y claves de los 125 municipios.</li></ul>
<h2>Qué cédulas mostramos</h2>
<p>Solo cédulas de personas con estatus <i>persona desaparecida</i> y autorización de publicación en la versión pública del registro. Cuando el registro reporta a alguien como localizado, su cédula sale del sitio en la siguiente actualización. No publicamos la colonia ni otros datos más precisos que el municipio.</p>
<p>El municipio se asigna por nombre al catálogo del INEGI. ${fmt(o.buckets.cedulas_municipio_no_especificado?.value)} cédulas no tienen municipio y aparecen como “no especificado”.</p>
<h2>Por qué las cifras no coinciden entre sí</h2><ul>
<li><b>Cédulas vs. estadística del registro.</b> Las ${fmt(o.totals.cedulas)} cédulas públicas son las que el registro publica como fichas de búsqueda; la estadística oficial reporta 16,250 personas desaparecidas. No todas las personas registradas tienen cédula pública.</li>
<li><b>Estadística estatal vs. mapa.</b> El total estatal (16,250) no coincide con la suma del mapa oficial (16,203): de esa suma, 86 personas están en el rubro “se ignora” (sin municipio) y 47 personas (38 hombres, 9 mujeres) cuentan en el total pero no aparecen en ninguna clave del mapa. La fuente no explica esta diferencia y no la corregimos.</li>
<li><b>Cambio de metodología del SESNSP en 2026.</b> El SESNSP adoptó el Registro Nacional de Incidencia Delictiva en 2026. Según su nota metodológica, homicidio doloso y feminicidio son comparables entre series; otros tipos requieren reagrupar categorías (por ejemplo, las tentativas se separaron en 2026). Por eso el mapa muestra 2025 y 2026 por separado.</li>
<li><b>Municipio no especificado.</b> El SESNSP usa la clave 14998 (hasta 2025) y 14999 (2026) para delitos sin municipio; no entran en tasas municipales.</li></ul>
<h2>Actualización</h2><p>Revisamos el registro cada 6 horas y hacemos una captura completa diaria. Si una captura sale incompleta o con anomalías, no retiramos ninguna cédula del sitio: así evitamos retirar a alguien por error.</p>
<h2>Retiro de información</h2><p>Cualquier persona puede <a href="/retiro">solicitar el retiro</a> de una cédula. Atendemos las solicitudes en un máximo de 24 horas.</p></div>`;
  return page({ title: 'Metodología', path: '/metodologia', body, meta: { updated: updated(o) } });
}

export function retiroForm(req, env, { error, folio } = {}) {
  const url = new URL(req.url);
  const f = folio ?? url.searchParams.get('folio') ?? '';
  const body = `<div class="prose"><h1>Solicitar retiro de una cédula</h1>
<p class="lede">Si eres la persona de la cédula, un familiar, o la persona ya fue localizada, puedes pedir que retiremos su información de este sitio. Revisamos cada solicitud en un máximo de 24 horas.</p>
${error ? `<p class="note" role="alert">${esc(error)}</p>` : ''}
<form method="post" action="/retiro">
<p><label>Folio de la cédula (aparece en la ficha)<input name="folio" value="${esc(f)}" maxlength="64" pattern="[A-Za-z0-9_-]*"></label></p>
<p><label>Motivo<select name="motivo" required><option value="">Elige una opción</option><option value="family_request">Soy familiar y pido el retiro</option><option value="takedown_request">Soy la persona de la cédula</option><option value="correction">La persona ya fue localizada / datos incorrectos</option><option value="privacy">Otro motivo de privacidad</option><option value="other">Otro</option></select></label></p>
<p><label>Relación con la persona (opcional)<input name="relacion" maxlength="80"></label></p>
<p><label>Correo o teléfono para darte respuesta (opcional)<input name="contacto" maxlength="120"></label></p>
<p><label>Mensaje (opcional)<textarea name="mensaje" maxlength="1000"></textarea></label></p>
<div class="cf-turnstile" data-sitekey="${esc(env.TURNSTILE_SITE_KEY)}"></div>
<p><button type="submit">Enviar solicitud</button></p></form>
<p class="meta">Solo usamos tus datos de contacto para responder esta solicitud.</p></div>`;
  return page({ title: 'Solicitar retiro', path: '/retiro', body, cache: 'no-store', status: error ? 400 : 200,
    head: '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' });
}

export async function retiroSubmit(req, env) {
  const form = await req.formData();
  const get = (k, max) => String(form.get(k) ?? '').trim().slice(0, max);
  const folio = get('folio', 64), motivo = get('motivo', 32);
  if (!['family_request', 'takedown_request', 'correction', 'privacy', 'other'].includes(motivo)) return retiroForm(req, env, { error: 'Elige un motivo.', folio });
  if (folio && !/^[A-Za-z0-9_-]+$/.test(folio)) return retiroForm(req, env, { error: 'El folio no es válido.', folio });
  const token = String(form.get('cf-turnstile-response') ?? '');
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY || '', response: token, remoteip: req.headers.get('cf-connecting-ip') || '' }) })
    .then((r) => r.json()).catch(() => ({ success: false }));
  if (!verify.success) return retiroForm(req, env, { error: 'No pudimos verificar que no eres un robot. Intenta de nuevo.', folio });
  await env.DB.prepare('INSERT INTO takedown_requests (cedula_id, reason, relation, contact, message, created_at) VALUES (?,?,?,?,?,?)')
    .bind(folio || null, motivo, get('relacion', 80) || null, get('contacto', 120) || null, get('mensaje', 1000) || null, new Date().toISOString()).run();
  return page({ title: 'Solicitud recibida', path: '/retiro', cache: 'no-store', body: `<div class="prose"><h1>Solicitud recibida</h1>
<p class="lede">Gracias. Revisaremos tu solicitud en un máximo de 24 horas.${folio ? ` Folio: <b>${esc(folio)}</b>.` : ''}</p><p><a href="/">Volver a las cédulas</a></p></div>` });
}

export function notFound(req) {
  if ((req.headers.get('accept') || '').includes('text/html')) {
    return page({ title: 'Página no encontrada', status: 404, cache: 'no-store', body: '<h1>Página no encontrada</h1><p><a href="/">Ir a las cédulas</a></p>' });
  }
  return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
