import { esc, fmt, page, CHAPTERS } from './ui.mjs';
import { overview } from './data.mjs';
import { F } from './generated/findings.mjs';
import { table, num } from './charts.mjs';

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
<ul class="chips"><li><a href="#fuentes">Fuentes</a></li><li><a href="#leer">Cómo leer las cifras</a></li><li><a href="#metodo">Método</a></li><li><a href="#hipotesis">Registro de hipótesis</a></li><li><a href="#faltan">Lo que no tenemos</a></li></ul></div>
<section class="sec" id="fuentes"><h2>Fuentes</h2><div class="table-scroll">${table(['Fuente', 'Qué es', 'Cantidad', 'Nivel', 'Periodo'], SOURCES.map((r) => r.map(esc)))}</div>
<p class="fig-note">Cada corrida del análisis se detiene si un total no cuadra con la cifra oficial, con una segunda fuente o con la consistencia interna de la fuente. Donde el INEGI publica la misma cifra, el cálculo la reproduce: cifra negra nacional (93.4%), percepción de inseguridad (12 de 12 cifras con diferencia de 0.00 puntos) y actividades que se dejaron de hacer (64 de 64).</p></section>
<section class="sec" id="leer"><h2>Cómo leer las cifras</h2><ol class="caveats">${F.caveats.map((v) => `<li id="c${v.n}"><b>${esc(v.title)}.</b> ${v.text.split('\n\n').map(md).join('</p><p>')}</li>`).join('')}</ol></section>
<section class="sec prose" id="metodo"><h2>Método</h2>
<p><b>Una pregunta por análisis</b>, con hipótesis y criterio de refutación escritos en el código antes de calcular. Si una hipótesis falla, se reporta; no se ajusta después. Las excepciones (correcciones de método detectadas en revisión) están documentadas y cambiaron cuatro veredictos.</p>
<p><b>Incertidumbre siempre.</b> Tasas con intervalo exacto de Poisson al 95%; proporciones con intervalo de Wilson; razones con intervalos exactos condicionales; encuesta con linealización de Taylor sobre el diseño muestral (estratos y unidades primarias).</p>
<p><b>Municipios chicos.</b> Suavizado bayesiano empírico: un municipio es "alto" o "bajo" solo si su intervalo al 95% no incluye la tasa estatal. Las tendencias municipales usan un modelo jerárquico binomial negativo, validado con datos simulados.</p>
<p><b>Robustez.</b> Los hallazgos principales se prueban con dos medidas, dos periodos o dos fuentes independientes. Las relaciones entre municipios son ecológicas: no se aplican a personas ni implican causa.</p>
<p><b>Registros sin municipio.</b> En el SESNSP, la clave 14998 (hasta 2025) y 14999 (2026) agrupa delitos sin municipio; no entran en tasas municipales. En la estadística del registro estatal, ${fmt(o.buckets.repd_se_ignora_desaparecidas?.value)} personas desaparecidas no tienen municipio.</p>
<p><b>El sitio no calcula nada.</b> Las gráficas muestran los resultados guardados por el análisis (${esc(F.built)}); se generan con <code>scripts/build-findings.cjs</code>, que se detiene si un municipio o un campo no cuadra.</p></section>
<section class="sec" id="hipotesis"><h2>Registro de hipótesis</h2>
<p>${num(c.ok + c.no + c.exp)} hipótesis en ${pieces.length} análisis: <span class="badge ok">${c.ok} confirmadas</span> <span class="badge no">${c.no} refutadas</span> <span class="badge exp">${c.exp} exploratorias</span>. Seis refutaciones son por décimas o centésimas y no dicen nada por sí mismas. No existe la pieza 4: se conserva la numeración original.</p>
${pieces.map((p) => `<details class="hyp" id="p${p}"><summary><b>Pieza ${p}</b> · ${esc(F.pieces[p] || '')} <span class="muted">(${F.hyp.filter((h) => h.p === p).length})</span></summary><ul>${F.hyp.filter((h) => h.p === p).map((h) => `<li><span class="badge ${RES[h.res][0]}">${RES[h.res][1]}</span> <b>${esc(h.id)}</b>: ${esc(h.text)}${h.detail ? ` <span class="muted">— ${esc(h.detail)}</span>` : ''}</li>`).join('')}</ul></details>`).join('')}</section>
<section class="sec prose" id="faltan"><h2>Lo que no tenemos</h2><ul>
<li><b>Defunciones del INEGI de 2025.</b> Son la prueba independiente de la caída del homicidio registrado en 2025.</li>
<li><b>Desaparición por municipio y año.</b> El registro estatal no la publica; por eso la desaparición municipal es acumulada.</li>
<li><b>Capturas periódicas de la estadística del registro.</b> Con una sola captura no se sabe si el total de personas pendientes sube o baja.</li>
<li><b>Registro Nacional de Personas Desaparecidas</b> (sin descarga) y <b>datos forenses del IJCF</b> (fuente no disponible).</li>
<li><b>Víctimas por edad antes de 2026</b> en delitos sexuales y familiares, y motivos de no denuncia de delitos sexuales y amenazas en Jalisco (la muestra no alcanza).</li></ul></section>`;
  return page({ title: 'Metodología', path: '/metodologia', body, meta: { description: 'Fuentes, método, límites y registro de las 111 hipótesis del análisis de violencia en Jalisco.' } });
}


export function notFound(req) {
  if ((req.headers.get('accept') || '').includes('text/html')) {
    return page({ title: 'Página no encontrada', status: 404, cache: 'no-store', body: '<h1>Página no encontrada</h1><p><a href="/">Ir al inicio</a></p>' });
  }
  return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

// Shown when a page that reads the database fails (D1 down or over its daily read quota).
// The chapters are prerendered from generated findings and keep working, so the page points there.
export function serverError(req) {
  if ((req.headers.get('accept') || '').includes('text/html')) {
    const links = [...CHAPTERS.map(([h, l, d]) => [h, l, d]), ['/mapa', 'Mapa municipal', 'Homicidio, desaparición y fosas por municipio']];
    return page({ title: 'Datos no disponibles', status: 503, cache: 'no-store', body: `<h1>Estos datos no están disponibles en este momento</h1>
<p class="lede">La base de datos que alimenta esta página no respondió. Suele resolverse en unas horas; vuelve a intentarlo más tarde. Nada de lo que se publica aquí se perdió.</p>
<section class="sec"><h2>Mientras tanto, puedes leer</h2><ul class="facts">${links.map(([h, l, d]) => `<li><a href="${h}"><b>${esc(l)}</b></a>: ${esc(d)}</li>`).join('')}</ul>
<p><a href="/metodologia">Metodología y límites</a></p></section>` });
  }
  return new Response(JSON.stringify({ ok: false, error: 'internal_error' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
