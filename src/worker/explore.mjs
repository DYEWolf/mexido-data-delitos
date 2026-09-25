// Municipal map explorer and one profile page per municipality. Every municipality has a value on every layer:
// color = its smoothed rate, model estimate or class; ink outline = its difference with the state is credible.
// Counts are shown as circles, never as choropleths.
import { esc, page } from './ui.mjs';
import { F } from './generated/findings.mjs';
import { num, sgn, range, figure, legend, table, rows, mapDefs, map, circleKey } from './charts.mjs';
import { rateLayer, p1Layer, trendLayer } from './layers.mjs';

const RG = { amg: 'Área metropolitana de Guadalajara', an: 'Altos Norte', as: 'Altos Sur', resto: 'Resto del estado' };
const mun = (c) => F.mun[c].n;
const ml = (c) => `<a href="/municipio/${c}">${esc(mun(c))}</a>`;
const byName = (a, b) => mun(a).localeCompare(mun(b), 'es');
const CODES = Object.keys(F.mun).sort(byName);
const idx = (list) => Object.fromEntries(list.map((m) => [m.cv, m]));
const fosas = idx(F.p8.mun);
const otras = new Set(F.p25.fueraSinRegistro);
const l12 = idx(F.p1.list12);

// Each layer: label, group, piece, sub, legend html, fill, overlay, circles, table head/row and sort value.
function layers(db) {
  const repd = Object.fromEntries((db || []).map((m) => [m.cvegeo, m.repd_desaparecidas]));
  const rate = (kind, label, group, piece, sub) => ({ ...rateLayer(kind), label, group, piece, sub });
  const trend = (i) => ({ ...trendLayer(i), label: F.p19[i].k, group: 'Tendencias 2019–2025', piece: 19,
    sub: `Cambio anual promedio 2019–2025 estimado con un modelo jerárquico, que acerca los municipios chicos a la tendencia típica. Color fuerte: cambio creíble (el intervalo al 95% excluye el cero); color claro: la estimación apunta en esa dirección sin certeza. Estado: ${sgn(F.p19[i].state[0])} al año; municipio típico: ${sgn(F.p19[i].tipico[0])}.` });
  const p1 = p1Layer();
  return {
    violencia: { ...p1, label: 'Homicidio y desaparición', group: 'Violencia letal', piece: 1,
      sub: 'Cada municipio comparado con el promedio del estado en homicidio doloso (2015–2025) y en personas desaparecidas (acumulado). El color dice cuál de los dos pesa más.' },
    desaparicion: rate('des', 'Desaparición', 'Violencia letal', 5, `Personas desaparecidas por 100 mil habitantes (acumulado), con suavizado para municipios chicos. Estado: ${num(F.p5.des.tasa, 0)}.`),
    homicidio: rate('hom', 'Homicidio', 'Violencia letal', 5, `Homicidios dolosos por 100 mil habitantes al año, 2019–2025, con suavizado para municipios chicos. Estado: ${num(F.p5.hom.tasa, 1)}.`),
    conteo: { label: 'Personas desaparecidas (número)', group: 'Violencia letal', piece: 1, db: true,
      sub: 'Personas que siguen desaparecidas según la estadística del registro estatal, acumulado sin año. El círculo muestra la cantidad; para comparar municipios de distinto tamaño, usa la capa "Desaparición".',
      legend: legend([{ label: 'Personas desaparecidas (acumulado)', color: '--ink', shape: 'circle' }]), keyValues: [10, 100, 1000],
      fill: (c) => ({ tip: `${mun(c)}\n${num(repd[c])} personas desaparecidas` }),
      circles: CODES.filter((c) => repd[c] > 0).map((c) => ({ cv: c, v: repd[c], tip: `${mun(c)}\n${num(repd[c])} personas desaparecidas` })),
      head: ['Personas desaparecidas'], value: (c) => repd[c] ?? -1, row: (c) => [num(repd[c])] },
    fosas: { label: 'Fosas', group: 'Búsqueda', piece: 8,
      sub: 'Víctimas localizadas en sitios del registro público de la Fiscalía (círculos). En naranja, municipios fuera del área metropolitana donde la prensa o la fiscalía (por transparencia) reportan fosas en 2019–2024 sin ningún sitio en el registro.',
      legend: legend([{ label: `Con sitio en el registro (${F.p8.mun.length})`, color: '--c1', shape: 'half' }, { label: `Fosas en otras fuentes, sin sitio en el registro (${otras.size})`, color: '--c2' },
        { label: 'Sin sitio en el registro (no quiere decir que no haya fosas)', color: '--mid' }, { label: 'Víctimas localizadas', color: '--ink', shape: 'circle' }]),
      keyValues: [10, 100, 750], maxCircle: Math.max(...F.p8.mun.map((m) => m.loc)),
      fill: (c) => fosas[c] ? { k: 'reg', tip: `${mun(c)}\n${num(fosas[c].loc)} víctimas localizadas\n${num(fosas[c].sitios)} sitios · ${num(fosas[c].id)} identificadas` }
        : otras.has(c) ? { k: 'otra', tip: `${mun(c)}\nFosas reportadas por otras fuentes (2019–2024)\nSin sitio en el registro` } : { tip: `${mun(c)}\nSin sitio en el registro público` },
      circles: F.p8.mun.map((m) => ({ cv: m.cv, v: m.loc, tip: `${mun(m.cv)}\n${num(m.loc)} víctimas localizadas` })),
      head: ['Sitios', 'Víctimas localizadas', 'Identificadas'], value: (c) => (fosas[c] ? fosas[c].loc : otras.has(c) ? -0.5 : -1),
      row: (c) => (fosas[c] ? [num(fosas[c].sitios), num(fosas[c].loc), num(fosas[c].id)] : [otras.has(c) ? 'Solo en otras fuentes' : '—', '—', '—']) },
    mujeres: rate('vcm', 'Violencia contra mujeres', 'Víctimas', 11, `Mujeres víctimas de violencia familiar o sexual por 100 mil mujeres, enero–agosto 2026, con suavizado. Estado: ${num(F.p11.vcm.tasa)}.`),
    ...Object.fromEntries(F.p19.map((_, i) => [`tendencia-${i}`, trend(i)])),
  };
}

export async function mapa(req, env, loadMunicipios) {
  const url = new URL(req.url);
  const probe = layers();
  const key = probe[url.searchParams.get('capa')] ? url.searchParams.get('capa') : 'violencia';
  const all = layers(probe[key].db ? await loadMunicipios() : null);
  const L = all[key];
  const groups = [...new Set(Object.values(all).map((l) => l.group))];
  const tabs = groups.map((g) => `<div class="tabgroup"><span class="kicker">${esc(g)}</span><nav class="seg" aria-label="${esc(g)}">${Object.entries(all).filter(([, l]) => l.group === g)
    .map(([k, l]) => `<a href="/mapa?capa=${k}"${k === key ? ' aria-current="page"' : ''}>${esc(l.label)}</a>`).join('')}</nav></div>`).join('');
  const list = [...CODES].sort((a, b) => L.value(b) - L.value(a) || byName(a, b));
  const circleMax = L.maxCircle || (L.circles ? Math.max(...L.circles.map((c) => c.v)) : 0);
  const body = `<p class="kicker">Explorar</p><h1>Mapa municipal de Jalisco</h1>
<p class="lede">Los 125 municipios tienen un valor en cada capa: el gris nunca significa "sin datos". El color muestra el valor de cada municipio, y lo que es estadísticamente creíble (intervalo de confianza al 95%) va marcado con borde o con color fuerte, según la capa. Toca un municipio para ver su ficha.</p>
<div class="tabs2">${tabs}</div>${mapDefs()}
${figure({ cls: 'wide', title: esc(L.label), sub: L.sub, legend: L.legend + (L.circles ? circleKey(L.keyValues, circleMax) : ''),
    body: map({ label: `Mapa: ${L.label}`, fill: L.fill, overlay: L.overlay, circles: L.circles || [], maxCircle: circleMax || undefined }),
    source: `Fuente y método: <a href="/metodologia#p${L.piece}">pieza ${L.piece}</a>.` })}
<h2>Los 125 municipios</h2>
<div class="table-scroll">${table(['Municipio', 'Región', ...L.head], list.map((c) => [ml(c), esc(RG[F.mun[c].r]), ...L.row(c)]), L.head.map((_, i) => i + 2).filter((i) => !/Comparado|Clasificación|Desaparición$|Homicidio$/.test(L.head[i - 2])))}</div>`;
  return page({ title: 'Mapa municipal', path: '/mapa', body, meta: { description: 'Mapa municipal de Jalisco: desaparición, homicidio, fosas, violencia contra mujeres y tendencias de cinco delitos, con sus intervalos.' } });
}

const CMP = { superior: 'creíblemente por encima del promedio del estado', inferior: 'creíblemente por debajo del promedio del estado', indistinguible: 'no se distingue del promedio del estado' };

export async function municipio(req, env, code, loadOne) {
  const m = F.mun[code];
  if (!m) return null;
  const row = await loadOne(code);
  const d = F.p5.des.m[code], h = F.p5.hom.m[code], v = F.p11.vcm.m[code], x1 = F.p1.m[code];
  const facts = [
    `<b>Personas desaparecidas:</b> ${num(d[1], 0)} por 100 mil habitantes (IC95 ${range(d[2], d[3], 0)}), ${CMP[d[4]]} (${num(F.p5.des.tasa, 0)}).`,
    `<b>Homicidio doloso 2019–2025:</b> ${num(h[1], 1)} por 100 mil al año (IC95 ${range(h[2], h[3])}), ${CMP[h[4]]} (${num(F.p5.hom.tasa, 1)}). ${num(h[0])} carpetas.`,
    `<b>Homicidio contra desaparición:</b> ${esc(p1Layer().label(code).toLowerCase())}. ${num(x1[0])} personas desaparecidas y ${num(x1[1])} homicidios dolosos en 2015–2025${
      l12[code] ? `; es uno de los 12 municipios con homicidio bajo y desaparición alta${l12[code].robust ? ', y se sostiene con el homicidio de 2015–2018' : ', aunque no se sostiene con el homicidio de 2015–2018'}. <a href="/violencia-letal#mapa-violencia-oculta">Ver en contexto</a>` : ''}.`,
    `<b>Violencia familiar o sexual contra mujeres</b> (enero–agosto 2026): ${num(v[1], 0)} víctimas por 100 mil mujeres (IC95 ${range(v[2], v[3], 0)}), ${CMP[v[4]]} (${num(F.p11.vcm.tasa)}).`,
    fosas[code] ? `<b>Fosas en el registro público:</b> ${num(fosas[code].sitios)} ${fosas[code].sitios === 1 ? 'sitio' : 'sitios'}, ${num(fosas[code].loc)} víctimas localizadas, ${num(fosas[code].id)} identificadas.`
      : otras.has(code) ? '<b>Fosas reportadas por la prensa o por la fiscalía (transparencia) en 2019–2024</b>, sin ningún sitio en el registro público.'
        : '<b>Fosas:</b> sin sitios en el registro público de la Fiscalía (eso no quiere decir que no haya).',
  ];
  const trends = F.p19.map((dd) => ({ d: dd, t: dd.m[code] }));
  const lo = Math.min(-40, ...trends.map((t) => t.t[1])), hi = Math.max(40, ...trends.map((t) => t.t[2]));
  const fig = figure({ id: 'tendencias', title: 'Cambio anual promedio de cinco delitos denunciados, 2019–2025',
    sub: 'Punto: estimación del municipio con su intervalo al 95% (modelo jerárquico). Marca gris: tendencia del estado.',
    legend: legend([{ label: 'Baja de forma creíble', color: '--down', shape: 'dot' }, { label: 'Sin cambio claro', color: '--flat', shape: 'dot' }, { label: 'Sube de forma creíble', color: '--up', shape: 'dot' }, { label: 'Estado', color: '--ink-3', shape: 'tick' }]),
    body: rows({ min: Math.max(lo, -80), max: Math.min(hi, 120), zero: 0, fmt: (val) => sgn(val, 0), refLabel: 'Estado',
      rows: trends.map(({ d: dd, t }) => ({ label: dd.k, sub: `${num(t[4])} carpetas`, v: t[0], lo: t[1], hi: t[2], ref: dd.state[0], color: t[3] === 'up' ? '--up' : t[3] === 'down' ? '--down' : '--flat', val: sgn(t[0]),
        tip: `${dd.k}\n${sgn(t[0])} al año\nIC95 ${sgn(t[1])} a ${sgn(t[2])} · estado ${sgn(dd.state[0])}` })) }),
    note: m.pob < 20000 ? 'Municipio de menos de 20 mil habitantes: con pocas carpetas, su tendencia se acerca a la del municipio típico y sus intervalos son anchos.' : '',
    source: 'Fuente: SESNSP, carpetas de investigación; CONAPO. <a href="/metodologia#p19">Pieza 19</a>',
    table: table(['Delito', 'Cambio anual', 'IC95', 'Carpetas 2019–2025', 'Estado'], trends.map(({ d: dd, t }) => [dd.k, sgn(t[0]), `${sgn(t[1])} a ${sgn(t[2])}`, num(t[4]), sgn(dd.state[0])]), [1, 2, 3, 4]) });
  const i = CODES.indexOf(code);
  const body = `<p class="kicker"><a href="/mapa">Mapa</a> · ${esc(RG[m.r])}</p><h1>${esc(m.n)}</h1>
<p class="lede">${num(m.pob)} habitantes (CONAPO 2025).${row?.repd_desaparecidas != null ? ` ${num(row.repd_desaparecidas)} personas siguen desaparecidas según la estadística del registro estatal (acumulado, corte 31 de agosto de 2026).` : ''}</p>
${mapDefs()}<div class="two"><div><h2 style="margin-top:8px">Lo que dicen los datos</h2><ul class="facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul></div>
<div class="locator">${map({ small: true, inset: m.r === 'amg', label: `Ubicación de ${m.n}`, fill: (c) => (c === code ? { k: 'sel', tip: mun(c) } : { tip: mun(c) }) })}</div></div>
${fig}
<aside class="read"><h2>Cómo leer esta ficha</h2><ul>
<li><b>Las tasas están suavizadas:</b> en municipios chicos, unos pocos casos mueven mucho la tasa cruda, así que se acercan al promedio del estado según lo poco que dicen sus datos. El intervalo al 95% dice cuánto puede variar.</li>
<li><b>"Creíblemente por encima o por debajo"</b> quiere decir que el intervalo al 95% no incluye el promedio del estado. Si lo incluye, el municipio no se distingue del promedio aunque su número parezca alto o bajo.</li>
<li><b>Son registros:</b> denuncias (SESNSP), personas reportadas (REPD) y sitios procesados (Fiscalía). En Jalisco, alrededor de 92 de cada 100 delitos no llegan a una carpeta.</li>
<li><b>La desaparición por municipio es acumulada, sin año:</b> el registro no la publica por año y municipio.</li></ul></aside>
<nav class="ch-nav" aria-label="Municipios">${i > 0 ? `<a href="/municipio/${CODES[i - 1]}"><small>← Anterior</small>${esc(mun(CODES[i - 1]))}</a>` : ''}${i < CODES.length - 1 ? `<a class="next" href="/municipio/${CODES[i + 1]}"><small>Siguiente →</small>${esc(mun(CODES[i + 1]))}</a>` : ''}</nav>`;
  return page({ title: m.n, path: '/municipio', body, meta: { description: `${m.n}, Jalisco: desaparición, homicidio, fosas y tendencias de cinco delitos con datos oficiales.` } });
}

export function municipioIndex() {
  const byRegion = ['amg', 'an', 'as', 'resto'].map((r) => [r, CODES.filter((c) => F.mun[c].r === r)]);
  const body = `<p class="kicker"><a href="/mapa">Mapa</a></p><h1>Fichas municipales</h1><p class="lede">Una ficha por cada uno de los 125 municipios de Jalisco.</p>
${byRegion.map(([r, cs]) => `<h2>${esc(RG[r])} (${cs.length})</h2><ul class="chips">${cs.map((c) => `<li>${ml(c)}</li>`).join('')}</ul>`).join('')}`;
  return page({ title: 'Fichas municipales', path: '/municipio', body });
}
