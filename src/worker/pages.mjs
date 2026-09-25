import { esc, fmt, fecha, titleCase, page, initials } from './ui.mjs';
import { parseFilters, listCedulas, getCedula, municipios, overview } from './data.mjs';
import { F } from './generated/findings.mjs';
import { columns, figure, table, num } from './charts.mjs';

const OFFICIAL = 'https://repd.jalisco.gob.mx/';
const updated = (o) => (o.meta.snapshot_observed_at ? fecha(o.meta.snapshot_observed_at.slice(0, 10)) : '');

function card(c) {
  const photo = c.foto_key ? `<img src="/foto/${esc(c.id)}" alt="Fotografía de ${esc(titleCase(c.nombre))}" loading="lazy">` : `<span aria-hidden="true">${initials(c.nombre)}</span>`;
  return `<a class="card" href="/cedula/${esc(c.id)}"><div class="photo${c.foto_key ? '' : ' empty'}">${photo}</div><div class="body">
<h3>${esc(titleCase(c.nombre) || 'Nombre no registrado')}</h3>
<p class="meta">${c.edad != null ? `${esc(c.edad)} años · ` : ''}${esc(titleCase(c.sexo))}</p>
<p class="meta">Desde el ${esc(fecha(c.fecha))}</p><p class="meta">${esc(titleCase(c.municipio_nombre) || 'Municipio no especificado')}</p></div></a>`;
}

export async function cedulas(req, env) {
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
${coverage()}
<form class="filters" method="get" action="/cedulas" role="search">
 <label>Nombre<input type="search" name="q" value="${esc(url.searchParams.get('q') || '')}" placeholder="Buscar por nombre" maxlength="80"></label>
 <label>Municipio<select name="municipio">${opt('', 'Todos', f.municipio)}${muns.map((m) => opt(m.cvegeo, m.nombre, f.municipio)).join('')}${opt('ne', 'No especificado', f.municipio)}</select></label>
 <label>Sexo<select name="sexo">${opt('', 'Todos', f.sexo)}${opt('MUJER', 'Mujer', f.sexo)}${opt('HOMBRE', 'Hombre', f.sexo)}</select></label>
 <label>Año de desaparición<select name="anio">${opt('', 'Todos', f.anio)}${ys.map((y) => opt(y.y, y.y, f.anio)).join('')}</select></label>
 <button type="submit">Buscar</button>${url.search ? ' <a class="btn secondary" href="/cedulas">Limpiar</a>' : ''}
</form>
<p class="meta" aria-live="polite">${list.capped ? 'Más de ' : ''}${fmt(list.total)} ${list.total === 1 ? 'resultado' : 'resultados'}</p>
${list.rows.length ? `<div class="grid">${list.rows.map(card).join('')}</div>` : '<p>No hay cédulas que coincidan con la búsqueda.</p>'}
${list.prev || list.next ? `<nav class="pager" aria-label="Paginación">${list.prev ? `<a class="btn secondary" rel="prev nofollow" href="${esc(qs('antes', list.prev))}">← Más recientes</a>` : ''}${list.next ? `<a class="btn secondary" rel="next nofollow" href="${esc(qs('despues', list.next))}">Más antiguas →</a>` : ''}</nav>` : ''}`;
  return page({ title: 'Cédulas de búsqueda', path: '/cedulas', body, meta: { updated: updated(o) } });
}

export async function cedula(req, env, id) {
  const c = await getCedula(env.DB, id);
  if (!c) return notFound(req);
  const senas = JSON.parse(c.senas || '[]'), ropa = JSON.parse(c.vestimenta || '[]');
  const row = (k, v) => (v === null || v === undefined || v === '' ? '' : `<dt>${k}</dt><dd>${esc(v)}</dd>`);
  const list = (items, fn) => items.length ? `<ul>${items.map((x) => `<li>${esc(fn(x))}</li>`).join('')}</ul>` : '<p class="muted">Sin información registrada.</p>';
  const nombre = titleCase(c.nombre) || 'Nombre no registrado';
  const body = `<p class="meta"><a href="/cedulas">← Volver a las cédulas</a></p>
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

// P24: the wall is not the registry. Shown above the wall so nobody reads the cards as the full picture.
function coverage() {
  const p = F.p24;
  return figure({ id: 'cobertura', title: `Estas fichas muestran a 1 de cada 3 personas desaparecidas, y no al azar`,
    sub: 'Cédulas públicas por cada 100 personas que siguen desaparecidas según la estadística oficial, por año de desaparición.',
    body: columns(p.porAnio.map((x) => ({ label: x.y, v: x.cob, color: '--c1', val: `${num(x.cob, 0)}%`, tip: `${x.y}\n${num(x.cob, 1)}% con cédula pública\n${num(x.ced)} cédulas · ${num(x.des)} personas` })),
      { max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v) => `${v}%`, height: 150 }),
    note: `Hay proporcionalmente más cédulas de mujeres (${num(p.sexo.MUJER.cobertura * 100, 0)}%) que de hombres (${num(p.sexo.HOMBRE.cobertura * 100, 0)}%), de menores y, sobre todo, de desapariciones recientes. El grupo menos representado es el más numeroso: hombres adultos. Por eso estas fichas sirven para buscar a alguien, no para describir quiénes desaparecen.`,
    source: 'Fuente: REPD, cédulas públicas y estadística oficial (corte 31 ago 2026). <a href="/metodologia#p24">Pieza 24</a>' });
}

const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)]|$)/g, '$1<i>$2</i>');
const SOURCES = [
  ['SESNSP, incidencia delictiva municipal 2015–2025', 'Carpetas de investigación (registro administrativo)', '1,471,935 delitos', 'Municipio × mes × tipo, subtipo y modalidad', 'Ene 2015 – dic 2025'],
  ['SESNSP, incidencia delictiva RNID 2026', 'Carpetas de investigación, metodología nueva', '76,393 delitos', 'Municipio × mes × tipo', 'Ene – ago 2026'],
  ['SESNSP, víctimas estatales', 'Víctimas por delito, sexo y menor/adulto', 'Serie anual y mensual', 'Estado', '2015–2025'],
  ['SESNSP, víctimas municipales', 'Víctimas por delito, sexo y edad', '80,631 (20% sin edad, 7% sin sexo)', 'Municipio', 'Ene – ago 2026'],
  ['REPD, estadística oficial', 'Personas desaparecidas y localizadas', '16,250 siguen desaparecidas; 22,017 localizadas', 'Estado por año, sexo y edad; municipio solo acumulado', '"2018 y antes" – ago 2026'],
  ['REPD, cédulas públicas', 'Fichas individuales', '10,234 (5,285 desaparecidas)', 'Persona', '1965 – sep 2026'],
  ['INEGI, estadísticas de defunciones', 'Certificados de defunción (microdatos anónimos)', '15,131 homicidios (registro 2018–2024) + 4,095 (2015–2017)', 'Persona: sexo, edad, municipio, arma, lugar', 'Ocurrencia 2015–2024 (2024 incompleto)'],
  ['Fiscalía del Estado de Jalisco, registro de fosas', 'Sitios de inhumación clandestina', '259 sitios, 2,218 víctimas, 1,174 identificadas', 'Sitio y municipio', 'Oct 2018 – ago 2026'],
  ['Plataforma Ciudadana de Fosas', 'Hallazgos según fiscalía (transparencia), FGR y prensa', '32 entidades', 'Municipio × año', '2006–2024'],
  ['INEGI, ENVIPE 2025 y 2026', 'Encuesta de victimización (diseño muestral)', 'Jalisco: unos 2,600 adultos por edición', 'Estado; área metropolitana y resto', 'Delitos de 2024 y 2025; percepción 2025 y 2026'],
  ['INEGI, tabulados de la ENVIPE', 'Cifras publicadas, para validar', 'Tabulados V y VIII', 'Estado', '2025 y 2026'],
  ['CONAPO, proyecciones de población', 'Población a mitad de año', '125 municipios × sexo × edad', 'Municipio', '1990–2040'],
  ['CONAPO, índice de marginación', 'Índice e indicadores', '125 municipios', 'Municipio', '2020'],
  ['INEGI, Marco Geoestadístico', 'Límites municipales', '125 polígonos', 'Municipio', 'Dic 2025'],
];
const RES = { ok: ['ok', 'Confirmada'], no: ['no', 'Refutada'], exp: ['exp', 'Exploratoria'] };

export async function metodologia(req, env) {
  const o = await overview(env.DB);
  const c = F.hypCounts;
  const pieces = [...new Set(F.hyp.map((h) => h.p))];
  const body = `<div class="prose sec"><h1>Qué datos usamos, cómo los leemos y qué no sabemos</h1>
<p class="lede">Todas las fuentes son públicas. La evidencia cruda se guarda fuera del sitio con su huella SHA-256; aquí solo llegan agregados. Cada análisis responde una pregunta con hipótesis escritas antes de calcular, y se publica también lo que resultó falso.</p>
<ul class="chips"><li><a href="#fuentes">Fuentes</a></li><li><a href="#leer">Cómo leer las cifras</a></li><li><a href="#metodo">Método</a></li><li><a href="#hipotesis">Registro de hipótesis</a></li><li><a href="#faltan">Lo que no tenemos</a></li><li><a href="#cedulas">Cédulas y retiro</a></li></ul></div>
<section class="sec" id="fuentes"><h2>Fuentes</h2><div class="table-scroll">${table(['Fuente', 'Qué es', 'Cantidad', 'Nivel', 'Periodo'], SOURCES.map((r) => r.map(esc)))}</div>
<p class="fig-note">Cada corrida del análisis se detiene si un total no cuadra con la cifra oficial, con una segunda fuente o con la consistencia interna de la fuente. Donde el INEGI publica la misma cifra, el cálculo la reproduce: cifra negra nacional (93.4%), percepción de inseguridad (12 de 12 cifras con diferencia de 0.00 puntos) y actividades que se dejaron de hacer (64 de 64).</p></section>
<section class="sec" id="leer"><h2>Cómo leer las cifras</h2><ol class="caveats">${F.caveats.map((v) => `<li id="c${v.n}"><b>${esc(v.title)}.</b> ${v.text.split('\n\n').map(md).join('</p><p>')}</li>`).join('')}</ol></section>
<section class="sec prose" id="metodo"><h2>Método</h2>
<p><b>Una pregunta por análisis</b>, con hipótesis y criterio de refutación escritos en el código antes de calcular. Si una hipótesis falla, se reporta; no se ajusta después. Las excepciones (correcciones de método detectadas en revisión) están documentadas y cambiaron cuatro veredictos.</p>
<p><b>Incertidumbre siempre.</b> Tasas con intervalo exacto de Poisson al 95%; proporciones con intervalo de Wilson; razones con intervalos exactos condicionales; encuesta con linealización de Taylor sobre el diseño muestral (estratos y unidades primarias).</p>
<p><b>Municipios chicos.</b> Suavizado bayesiano empírico: un municipio es "alto" o "bajo" solo si su intervalo al 95% no incluye la tasa estatal. Las tendencias municipales usan un modelo jerárquico binomial negativo, validado con datos simulados.</p>
<p><b>Robustez.</b> Los hallazgos principales se prueban con dos medidas, dos periodos o dos fuentes independientes. Las relaciones entre municipios son ecológicas: no se aplican a personas ni implican causa.</p>
<p><b>El sitio no calcula nada.</b> Las gráficas muestran los resultados guardados por el análisis (${esc(F.built)}); se generan con <code>scripts/build-findings.cjs</code>, que se detiene si un municipio o un campo no cuadra.</p></section>
<section class="sec" id="hipotesis"><h2>Registro de hipótesis</h2>
<p>${num(c.ok + c.no + c.exp)} hipótesis en ${pieces.length} análisis: <span class="badge ok">${c.ok} confirmadas</span> <span class="badge no">${c.no} refutadas</span> <span class="badge exp">${c.exp} exploratorias</span>. Seis refutaciones son por décimas o centésimas y no dicen nada por sí mismas. No existe la pieza 4: se conserva la numeración original.</p>
${pieces.map((p) => `<details class="hyp" id="p${p}"><summary><b>Pieza ${p}</b> · ${esc(F.pieces[p] || '')} <span class="muted">(${F.hyp.filter((h) => h.p === p).length})</span></summary><ul>${F.hyp.filter((h) => h.p === p).map((h) => `<li><span class="badge ${RES[h.res][0]}">${RES[h.res][1]}</span> <b>${esc(h.id)}</b>: ${esc(h.text)}${h.detail ? ` <span class="muted">— ${esc(h.detail)}</span>` : ''}</li>`).join('')}</ul></details>`).join('')}</section>
<section class="sec prose" id="faltan"><h2>Lo que no tenemos</h2><ul>
<li><b>Defunciones del INEGI de 2025.</b> Son la prueba independiente de la caída del homicidio registrado en 2025.</li>
<li><b>Desaparición por municipio y año.</b> El registro estatal no la publica; por eso la desaparición municipal es acumulada.</li>
<li><b>Capturas periódicas de la estadística del registro.</b> Con una sola captura no se sabe si el total de personas pendientes sube o baja.</li>
<li><b>Registro Nacional de Personas Desaparecidas</b> (sin descarga) y <b>datos forenses del IJCF</b> (fuente no disponible).</li>
<li><b>Víctimas por edad antes de 2026</b> en delitos sexuales y familiares, y motivos de no denuncia de delitos sexuales y amenazas en Jalisco (la muestra no alcanza).</li></ul></section>
<section class="sec prose" id="cedulas"><h2>Cédulas y retiro</h2>
<p>El sitio conserva la consulta de cédulas de búsqueda del Registro Estatal de Personas Desaparecidas (registro observado el ${esc(updated(o))}, ${fmt(o.meta.snapshot_count)} cédulas en total). Solo se muestran cédulas con estatus <i>persona desaparecida</i> y autorización de publicación; cuando el registro reporta a alguien como localizado, su cédula sale del sitio en la siguiente actualización. No publicamos la colonia ni otros datos más precisos que el municipio. Si una captura sale incompleta, no retiramos ninguna cédula, para no retirar a alguien por error.</p>
<p>Las cédulas cubren a 1 de cada 3 personas desaparecidas y con sesgo (pieza 24): no se usan para describir el perfil ni para comparar regiones. Cualquier persona puede <a href="/retiro">solicitar el retiro</a> de una cédula; atendemos las solicitudes en un máximo de 24 horas.</p>
<p>SESNSP: la clave 14998 (hasta 2025) y 14999 (2026) agrupa delitos sin municipio; no entran en tasas municipales. Registros sin municipio: ${fmt(o.buckets.cedulas_municipio_no_especificado?.value)} cédulas y ${fmt(o.buckets.repd_se_ignora_desaparecidas?.value)} personas en la estadística del registro.</p></section>`;
  return page({ title: 'Metodología', path: '/metodologia', body, meta: { updated: updated(o), description: 'Fuentes, método, límites y registro de las 111 hipótesis del análisis de violencia en Jalisco.' } });
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
<p class="lede">Gracias. Revisaremos tu solicitud en un máximo de 24 horas.${folio ? ` Folio: <b>${esc(folio)}</b>.` : ''}</p><p><a href="/cedulas">Volver a las cédulas</a></p></div>` });
}

export function notFound(req) {
  if ((req.headers.get('accept') || '').includes('text/html')) {
    return page({ title: 'Página no encontrada', status: 404, cache: 'no-store', body: '<h1>Página no encontrada</h1><p><a href="/">Ir al inicio</a></p>' });
  }
  return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
