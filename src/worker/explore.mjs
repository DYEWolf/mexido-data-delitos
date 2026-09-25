// Municipal map explorer and one profile page per municipality. Layers are analysis results (credibility classes,
// hierarchical trends, registries), never quantiles of crude rates; counts are shown as circles, not choropleths.
import { esc, page } from './ui.mjs';
import { F } from './generated/findings.mjs';
import { num, pc, sgn, range, figure, legend, table, rows, mapDefs, map, circleKey } from './charts.mjs';

const RG = { amg: 'Área metropolitana de Guadalajara', an: 'Altos Norte', as: 'Altos Sur', resto: 'Resto del estado' };
const mun = (c) => F.mun[c].n;
const ml = (c) => `<a href="/municipio/${c}">${esc(mun(c))}</a>`;
const byName = (a, b) => mun(a).localeCompare(mun(b), 'es');
const CODES = Object.keys(F.mun).sort(byName);
const P1L = { oculta: 'Homicidio bajo y desaparición alta (se sostiene con 2015–2018)', oculta_p: 'Homicidio bajo y desaparición alta (depende del periodo)', ambos: 'Homicidio alto y desaparición alta', hom: 'Homicidio alto, desaparición no alta' };
const P1K = { oculta: 'des', oculta_p: 'des-p', ambos: 'ambos', hom: 'hom' };
const TL = { up: 'Sube creíblemente', down: 'Baja creíblemente', flat: 'Sin cambio claro' };
const idx = (list) => Object.fromEntries(list.map((m) => [m.cv, m]));
const desAlto = idx(F.p5.des.altos), homAlto = idx(F.p5.hom.altos), vcm = idx(F.p11.vcm.altos), fosas = idx(F.p8.mun);
const otras = new Set(F.p25.fueraSinRegistro);
const l12 = idx(F.p1.list12);

// Each layer: legend, fill(c) -> { k, tip }, optional circles, table rows and a note. `db` rows are only needed for counts.
function layers(db) {
  const repd = Object.fromEntries((db || []).map((m) => [m.cvegeo, m.repd_desaparecidas]));
  const trend = (i) => { const d = F.p19[i];
    return { label: `Tendencia: ${d.k.toLowerCase()}`, group: 'Tendencias 2019–2025', piece: 19,
      sub: `Cambio anual promedio 2019–2025 con modelo jerárquico. Estado: ${sgn(d.state[0])} al año; municipio típico: ${sgn(d.tipico[0])}.`,
      legend: [{ label: 'Baja creíblemente', color: '--down' }, { label: 'Sin cambio claro', color: '--mid' }, { label: 'Sube creíblemente', color: '--up' }],
      fill: (c) => { const m = d.m[c]; return { k: m[3] === 'flat' ? 'none' : m[3], tip: `${mun(c)}\n${sgn(m[0])} al año\nIC95 ${sgn(m[1])} a ${sgn(m[2])} · ${TL[m[3]]}` }; },
      head: ['Municipio', 'Cambio anual', 'IC95', 'Carpetas 2019–2025', 'Clasificación'], sort: (a, b) => d.m[a][0] - d.m[b][0],
      row: (c) => { const m = d.m[c]; return [ml(c), sgn(m[0]), `${sgn(m[1])} a ${sgn(m[2])}`, num(m[4]), TL[m[3]]]; } }; };
  return {
    violencia: { label: 'Homicidio y desaparición', group: 'Violencia letal', piece: 1,
      sub: 'Homicidio doloso 2015–2025 contra personas desaparecidas acumuladas. "Alto" solo cuando el intervalo al 95% excluye el promedio del estado.',
      legend: [{ label: P1L.oculta, color: '--des' }, { label: P1L.oculta_p, color: '--des', shape: 'half' }, { label: P1L.ambos, color: '--c3' }, { label: P1L.hom, color: '--hom' }, { label: 'Otros municipios', color: '--mid' }],
      fill: (c) => { const k = F.p1.cls[c]; return k ? { k: P1K[k], tip: `${mun(c)}\n${P1L[k]}${l12[c] ? `\n${num(l12[c].des)} desaparecidas · ${num(l12[c].hom)} homicidios` : ''}` } : { tip: `${mun(c)}\nSin contraste creíble` }; },
      head: ['Municipio', 'Región', 'Clasificación'], filter: (c) => F.p1.cls[c], sort: (a, b) => Object.keys(P1L).indexOf(F.p1.cls[a]) - Object.keys(P1L).indexOf(F.p1.cls[b]) || byName(a, b),
      row: (c) => [ml(c), RG[F.mun[c].r], P1L[F.p1.cls[c]]] },
    desaparicion: { label: 'Desaparición alta', group: 'Violencia letal', piece: 5,
      sub: 'Personas desaparecidas acumuladas por 100 mil habitantes, con suavizado para municipios chicos. Coloreados: intervalo al 95% por encima del promedio estatal.',
      legend: [{ label: `Creíblemente superior al promedio (${F.p5.des.altos.length})`, color: '--des' }, { label: 'Indistinguible o inferior', color: '--mid' }],
      fill: (c) => desAlto[c] ? { k: 'des', tip: `${mun(c)}\n${num(desAlto[c].eb, 1)} por 100 mil\nIC95 ${range(desAlto[c].ic[0], desAlto[c].ic[1])}` } : { tip: `${mun(c)}\nNo es creíblemente superior` },
      head: ['Municipio', 'Por 100 mil (suavizada)', 'IC95', 'Personas'], filter: (c) => desAlto[c], sort: (a, b) => desAlto[b].eb - desAlto[a].eb,
      row: (c) => [ml(c), num(desAlto[c].eb, 1), range(desAlto[c].ic[0], desAlto[c].ic[1]), num(desAlto[c].casos)] },
    homicidio: { label: 'Homicidio alto', group: 'Violencia letal', piece: 5,
      sub: 'Homicidio doloso 2019–2025 por 100 mil habitantes al año, con suavizado. Coloreados: intervalo al 95% por encima del promedio estatal.',
      legend: [{ label: `Creíblemente superior al promedio (${F.p5.hom.altos.length})`, color: '--hom' }, { label: 'Indistinguible o inferior', color: '--mid' }],
      fill: (c) => homAlto[c] ? { k: 'hom', tip: `${mun(c)}\n${num(homAlto[c].eb, 1)} por 100 mil al año\nIC95 ${range(homAlto[c].ic[0], homAlto[c].ic[1])}` } : { tip: `${mun(c)}\nNo es creíblemente superior` },
      head: ['Municipio', 'Por 100 mil al año (suavizada)', 'IC95', 'Carpetas'], filter: (c) => homAlto[c], sort: (a, b) => homAlto[b].eb - homAlto[a].eb,
      row: (c) => [ml(c), num(homAlto[c].eb, 1), range(homAlto[c].ic[0], homAlto[c].ic[1]), num(homAlto[c].casos)] },
    conteo: { label: 'Personas desaparecidas', group: 'Violencia letal', piece: 1, db: true,
      sub: 'Personas que siguen desaparecidas según la estadística del REPD, acumulado sin año, por municipio. Los círculos muestran cantidades; para comparar municipios de distinto tamaño, usa "Desaparición alta".',
      legend: [{ label: 'Personas desaparecidas (acumulado)', color: '--ink', shape: 'circle' }],
      keyValues: [10, 100, 1000], fill: (c) => ({ tip: `${mun(c)}\n${num(repd[c])} personas desaparecidas` }),
      circles: CODES.filter((c) => repd[c] > 0).map((c) => ({ cv: c, v: repd[c], tip: `${mun(c)}\n${num(repd[c])} personas desaparecidas` })),
      head: ['Municipio', 'Personas desaparecidas'], filter: (c) => repd[c] != null, sort: (a, b) => (repd[b] || 0) - (repd[a] || 0), row: (c) => [ml(c), num(repd[c])] },
    fosas: { label: 'Fosas', group: 'Búsqueda', piece: 8,
      sub: 'Víctimas localizadas en sitios del registro público de la Fiscalía (círculos) y municipios fuera del área metropolitana con fosas reportadas por prensa o por la fiscalía (transparencia) sin sitio en el registro.',
      legend: [{ label: 'Con sitio en el registro', color: '--c1', shape: 'half' }, { label: 'Fosas en otras fuentes, sin sitio en el registro', color: '--c2' }, { label: 'Víctimas localizadas', color: '--ink', shape: 'circle' }],
      keyValues: [10, 100, 750], maxCircle: Math.max(...F.p8.mun.map((m) => m.loc)),
      fill: (c) => fosas[c] ? { k: 'reg', tip: `${mun(c)}\n${num(fosas[c].loc)} víctimas localizadas\n${num(fosas[c].sitios)} sitios · ${num(fosas[c].id)} identificadas` } : otras.has(c) ? { k: 'otra', tip: `${mun(c)}\nFosas reportadas por otras fuentes (2019–2024)\nSin sitio en el registro` } : { tip: `${mun(c)}\nSin sitio registrado` },
      circles: F.p8.mun.map((m) => ({ cv: m.cv, v: m.loc, tip: `${mun(m.cv)}\n${num(m.loc)} víctimas localizadas` })),
      head: ['Municipio', 'Sitios', 'Víctimas localizadas', 'Identificadas'], filter: (c) => fosas[c] || otras.has(c), sort: (a, b) => (fosas[b]?.loc ?? -1) - (fosas[a]?.loc ?? -1),
      row: (c) => fosas[c] ? [ml(c), num(fosas[c].sitios), num(fosas[c].loc), num(fosas[c].id)] : [ml(c), 'Solo en otras fuentes', '—', '—'] },
    mujeres: { label: 'Violencia contra mujeres', group: 'Víctimas', piece: 11,
      sub: `Mujeres víctimas de violencia familiar o sexual por 100 mil mujeres, enero–agosto 2026 (estado: ${num(F.p11.vcm.tasa)}). Coloreados: creíblemente por encima del estado.`,
      legend: [{ label: `Creíblemente superior (${F.p11.vcm.altos.length})`, color: '--women' }, { label: 'Indistinguible o inferior', color: '--mid' }],
      fill: (c) => vcm[c] ? { k: 'vcm', tip: `${mun(c)}\n${num(vcm[c].eb, 0)} por 100 mil mujeres\nIC95 ${range(vcm[c].ic[0], vcm[c].ic[1], 0)}` } : { tip: `${mun(c)}\nNo es creíblemente superior` },
      head: ['Municipio', 'Por 100 mil mujeres', 'IC95', 'Víctimas'], filter: (c) => vcm[c], sort: (a, b) => vcm[b].eb - vcm[a].eb,
      row: (c) => [ml(c), num(vcm[c].eb, 0), range(vcm[c].ic[0], vcm[c].ic[1], 0), num(vcm[c].n)] },
    ...Object.fromEntries(F.p19.map((_, i) => [`tendencia-${i}`, trend(i)])),
  };
}

export async function mapa(req, env, loadMunicipios) {
  const url = new URL(req.url);
  const probe = layers();
  const key = probe[url.searchParams.get('capa')] ? url.searchParams.get('capa') : 'violencia';
  const db = probe[key].db ? await loadMunicipios() : null;
  const L = layers(db)[key];
  const all = layers(db);
  const groups = [...new Set(Object.values(all).map((l) => l.group))];
  const tabs = groups.map((g) => `<div class="tabgroup"><span class="ctl-l">${esc(g)}</span><nav class="seg" aria-label="${esc(g)}">${Object.entries(all).filter(([, l]) => l.group === g)
    .map(([k, l]) => `<a href="/mapa?capa=${k}"${k === key ? ' aria-current="page"' : ''}>${esc(l.label.replace('Tendencia: ', ''))}</a>`).join('')}</nav></div>`).join('');
  const list = CODES.filter((c) => !L.filter || L.filter(c)).sort(L.sort || byName);
  const circleMax = L.maxCircle || (L.circles ? Math.max(...L.circles.map((c) => c.v)) : 0);
  const body = `<h1>Mapa municipal de Jalisco</h1>
<p class="lede">Cada capa es un resultado del análisis, no un conteo crudo: un municipio se colorea solo cuando la diferencia con el promedio del estado es creíble. Toca un municipio para ver su ficha.</p>
<div class="tabs2">${tabs}</div>${mapDefs()}
${figure({ cls: 'wide', title: esc(L.label), sub: L.sub, legend: legend(L.legend) + (L.circles ? circleKey(L.keyValues, circleMax) : ''),
    body: map({ label: `Mapa: ${L.label}`, fill: L.fill, circles: L.circles || [], maxCircle: circleMax || undefined }),
    source: `Fuente y método: <a href="/metodologia#p${L.piece}">pieza ${L.piece}</a>.`,
    table: '' })}
<h2>${list.length === 125 ? 'Los 125 municipios' : `${list.length} ${list.length === 1 ? 'municipio' : 'municipios'} en esta capa`}</h2>
<div class="table-scroll">${table(L.head, list.map(L.row), L.head.map((_, i) => i).filter((i) => i > 0 && !/Región|Clasificación/.test(L.head[i])))}</div>
${list.length < 125 ? `<p class="fig-note">Los demás municipios no se distinguen del promedio del estado en esta capa, o no tienen registro. Todos tienen ficha: <a href="/municipio">elige uno</a>.</p>` : ''}`;
  return page({ title: 'Mapa municipal', path: '/mapa', body, meta: { description: 'Mapa municipal de Jalisco: desaparición, homicidio, fosas, violencia contra mujeres y tendencias de cinco delitos, con sus intervalos.' } });
}

export async function municipio(req, env, code, loadOne) {
  const m = F.mun[code];
  if (!m) return null;
  const row = await loadOne(code);
  const facts = [];
  const k1 = F.p1.cls[code];
  if (k1) facts.push(`<b>${P1L[k1]}.</b> ${l12[code] ? `${num(l12[code].des)} personas desaparecidas y ${num(l12[code].hom)} homicidios dolosos en 2015–2025: ${num(l12[code].razon, 1)} veces la razón del estado. ` : ''}<a href="/violencia-letal#mapa-violencia-oculta">Ver en contexto</a>.`);
  facts.push(desAlto[code] ? `<b>Desaparición creíblemente superior al promedio del estado:</b> ${num(desAlto[code].eb, 1)} personas desaparecidas por 100 mil habitantes (IC95 ${range(desAlto[code].ic[0], desAlto[code].ic[1])}; estado: ${num(F.p5.des.tasa, 0)}).`
    : 'Su desaparición acumulada no es creíblemente superior al promedio del estado.');
  facts.push(homAlto[code] ? `<b>Homicidio creíblemente superior al promedio del estado</b> en 2019–2025: ${num(homAlto[code].eb, 1)} por 100 mil al año (IC95 ${range(homAlto[code].ic[0], homAlto[code].ic[1])}; estado: ${num(F.p5.hom.tasa, 1)}).`
    : 'Su homicidio 2019–2025 no es creíblemente superior al promedio del estado.');
  if (vcm[code]) facts.push(`<b>Violencia familiar o sexual contra mujeres creíblemente superior al estado</b> en enero–agosto 2026: ${num(vcm[code].eb, 0)} víctimas por 100 mil mujeres (estado: ${num(F.p11.vcm.tasa)}).`);
  if (fosas[code]) facts.push(`<b>Fosas en el registro público:</b> ${num(fosas[code].sitios)} ${fosas[code].sitios === 1 ? 'sitio' : 'sitios'}, ${num(fosas[code].loc)} víctimas localizadas, ${num(fosas[code].id)} identificadas.`);
  else if (otras.has(code)) facts.push('<b>Fosas reportadas por la prensa o por la fiscalía (transparencia) en 2019–2024, sin ningún sitio en el registro público.</b>');
  else facts.push('Sin sitios en el registro público de fosas.');
  const trends = F.p19.map((d) => ({ d, t: d.m[code] }));
  const lo = Math.min(-40, ...trends.map((x) => x.t[1])), hi = Math.max(40, ...trends.map((x) => x.t[2]));
  const fig = figure({ id: 'tendencias', title: 'Cambio anual promedio de cinco delitos denunciados, 2019–2025',
    sub: 'Punto: estimación del municipio con su intervalo al 95% (modelo jerárquico). Marca gris: tendencia del estado.',
    legend: legend([{ label: 'Baja creíblemente', color: '--down', shape: 'dot' }, { label: 'Sin cambio claro', color: '--flat', shape: 'dot' }, { label: 'Sube creíblemente', color: '--up', shape: 'dot' }, { label: 'Estado', color: '--ink-3', shape: 'tick' }]),
    body: rows({ min: Math.max(lo, -80), max: Math.min(hi, 120), zero: 0, fmt: (v) => sgn(v, 0), refLabel: 'Estado',
      rows: trends.map(({ d, t }) => ({ label: d.k, sub: `${num(t[4])} carpetas`, v: t[0], lo: t[1], hi: t[2], ref: d.state[0], color: t[3] === 'up' ? '--up' : t[3] === 'down' ? '--down' : '--flat', val: sgn(t[0]),
        tip: `${d.k}\n${sgn(t[0])} al año\nIC95 ${sgn(t[1])} a ${sgn(t[2])} · estado ${sgn(d.state[0])}` })) }),
    note: m.pob < 20000 ? 'Municipio de menos de 20 mil habitantes: con pocas carpetas, su tendencia se acerca a la del municipio típico y sus intervalos son anchos.' : '',
    source: 'Fuente: SESNSP, carpetas de investigación; CONAPO. <a href="/metodologia#p19">Pieza 19</a>',
    table: table(['Delito', 'Cambio anual', 'IC95', 'Carpetas 2019–2025', 'Estado'], trends.map(({ d, t }) => [d.k, sgn(t[0]), `${sgn(t[1])} a ${sgn(t[2])}`, num(t[4]), sgn(d.state[0])]), [1, 2, 3, 4]) });
  const i = CODES.indexOf(code);
  const body = `<nav class="crumbs" aria-label="Ruta"><a href="/mapa">Mapa</a> · ${esc(RG[m.r])}</nav><h1>${esc(m.n)}</h1>
<p class="lede">${num(m.pob)} habitantes (CONAPO 2025).${row?.repd_desaparecidas != null ? ` ${num(row.repd_desaparecidas)} personas siguen desaparecidas según la estadística del registro estatal (acumulado, corte 31 de agosto de 2026).` : ''}</p>
${mapDefs()}<div class="two"><div><h2 style="margin-top:8px">Lo que dicen los datos</h2><ul class="facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul></div>
<div class="locator">${map({ small: true, inset: m.r === 'amg', label: `Ubicación de ${m.n}`, fill: (c) => (c === code ? { k: 'sel', tip: mun(c) } : { tip: mun(c) }) })}</div></div>
${fig}
<aside class="read"><h2>Cómo leer esta ficha</h2><ul>
<li><b>"Creíblemente superior"</b> quiere decir que el intervalo al 95% de la tasa del municipio queda por encima del promedio del estado. Si no, el municipio es indistinguible del promedio aunque su número crudo parezca alto o bajo.</li>
<li><b>Son registros:</b> denuncias (SESNSP), personas reportadas (REPD) y sitios procesados (Fiscalía). En Jalisco, alrededor de 92 de cada 100 delitos no llegan a una carpeta.</li>
<li><b>La desaparición por municipio es acumulada, sin año:</b> el registro no la publica por año y municipio.</li></ul></aside>
<nav class="ch-nav" aria-label="Municipios">${i > 0 ? `<a href="/municipio/${CODES[i - 1]}"><small>← Anterior</small>${esc(mun(CODES[i - 1]))}</a>` : ''}${i < CODES.length - 1 ? `<a class="next" href="/municipio/${CODES[i + 1]}"><small>Siguiente →</small>${esc(mun(CODES[i + 1]))}</a>` : ''}</nav>`;
  return page({ title: m.n, path: '/municipio', body, meta: { description: `${m.n}, Jalisco: desaparición, homicidio, fosas y tendencias de cinco delitos con datos oficiales.` } });
}

export function municipioIndex() {
  const byRegion = ['amg', 'an', 'as', 'resto'].map((r) => [r, CODES.filter((c) => F.mun[c].r === r)]);
  const body = `<nav class="crumbs" aria-label="Ruta"><a href="/mapa">Mapa</a></nav><h1>Fichas municipales</h1><p class="lede">Una ficha por cada uno de los 125 municipios de Jalisco.</p>
${byRegion.map(([r, cs]) => `<h2>${esc(RG[r])} (${cs.length})</h2><ul class="chips">${cs.map((c) => `<li>${ml(c)}</li>`).join('')}</ul>`).join('')}`;
  return page({ title: 'Fichas municipales', path: '/municipio', body });
}
