// Home and the five chapters of findings. Every number comes from generated/findings.mjs (analysis outputs);
// headlines state the finding, each figure names its source and piece, and each chapter ends with how to read it.
import { esc, page, CHAPTERS } from './ui.mjs';
import { F } from './generated/findings.mjs';
import { niceTicks, num, pc, sgn, range, figure, legend, table, stats, rows, stack, columns, line, pyramid, waffle, scatter, mapDefs, map, circleKey, spark } from './charts.mjs';

const RG = { amg: 'Área metropolitana', an: 'Altos Norte', as: 'Altos Sur', resto: 'Resto del estado' };
const RGC = { amg: '--amg', an: '--an', as: '--as', resto: '--resto' };
const REGIONS = ['amg', 'an', 'as', 'resto'];
const mun = (c) => F.mun[c].n;
const ml = (c) => `<a href="/municipio/${c}">${esc(mun(c))}</a>`;
const src = (text, ...pieces) => `Fuente: ${text}. ${pieces.map((p) => `<a href="/metodologia#p${p}">Pieza ${p}</a>`).join(' · ')}`;
const iv = ([e, lo, hi], d = 1, unit = '%') => `${num(e, d)}${unit} (IC95 ${range(lo, hi, d)})`;
const age = (a) => a.replace('-', '–').replace(/ a (\d+) años/, '–$1').replace('Más de 60 años', '60+');
const cav = (...ns) => ns.map((n) => `<a href="/metodologia#c${n}">§${n}</a>`).join(', ');

const memo = new Map();
const once = (key, fn) => { if (!memo.has(key)) memo.set(key, fn()); return memo.get(key); };

function chapter(i, { title, lede, tiles, body, reading, description }) {
  const [href, label] = CHAPTERS[i];
  const prev = CHAPTERS[i - 1], next = CHAPTERS[i + 1];
  const html = `<header class="ch-head"><h1>${title}</h1><p class="lede">${lede}</p><p class="byline">Capítulo ${i + 1} de ${CHAPTERS.length} · ${esc(label)}</p>${tiles ? stats(tiles) : ''}</header>
${body}
<aside class="read"><h2>Cómo leer estas cifras</h2><ul>${reading.map((r) => `<li>${r}</li>`).join('')}</ul></aside>
<nav class="ch-nav" aria-label="Capítulos">${prev ? `<a href="${prev[0]}"><small>← Capítulo ${i}</small>${esc(prev[2])}</a>` : '<a href="/"><small>← Inicio</small>Resumen</a>'}${
  next ? `<a class="next" href="${next[0]}"><small>Capítulo ${i + 2} →</small>${esc(next[2])}</a>` : '<a class="next" href="/mapa"><small>Explorar →</small>Mapa municipal</a>'}</nav>`;
  return { title: label, path: href, body: html, description };
}
const respond = (c) => page({ title: c.title, path: c.path, body: c.body, meta: { description: c.description } });

// ============================================================ Home
function homeChart7(height = 120) {
  const p = F.p7;
  return line({ x: p.ages.map(age), height, xEvery: 4, fmt: (v) => `${num(v)}%`, tipFmt: (v) => `${num(v, 1)}%`, max: 20, ticks: [0, 10, 20],
    series: [{ label: 'Asesinados (INEGI)', color: '--hom', vals: p.hom, marks: 'none' }, { label: 'Desaparecidos (REPD)', color: '--des', vals: p.des, marks: 'none' },
      { label: 'Población', color: '--flat', vals: p.pop, marks: 'none', thin: true }] });
}

function homicideSeries() {
  const years = Array.from({ length: 11 }, (_, i) => 2015 + i);
  const s23 = Object.fromEntries(F.p23.serie.map((x) => [x.y, x]));
  return {
    years,
    vic: years.map((y) => s23[y]?.dol ?? F.p12.victimas[y] ?? null),
    car: years.map((y) => s23[y]?.car ?? F.p12.carpetas[y] ?? null),
    inegi: years.map((y) => s23[y]?.inegi ?? F.p12.inegi[y] ?? null),
  };
}

export function home() {
  return page(once('home', () => {
    const hs = homicideSeries();
    const fcards = [
      { href: '/violencia-letal', n: 1, big: `${num(F.p7.hombres.hom[0], 0)}%`, h: 'Misma población, distintos lugares',
        p: 'de las víctimas de homicidio y de las personas que siguen desaparecidas son hombres, con casi la misma edad. Pero la desaparición pesa más fuera del área metropolitana.',
        chart: legend([{ label: 'Asesinados', color: '--hom', shape: 'line' }, { label: 'Desaparecidos', color: '--des', shape: 'line' }, { label: 'Población', color: '--flat', shape: 'line' }]) + homeChart7() },
      { href: '/busqueda', n: 2, big: `${num(F.p8.amg[0], 0)}%`, h: 'La búsqueda registrada se queda en Guadalajara',
        p: `de las víctimas halladas en fosas registradas están en el área metropolitana, donde vive el ${num(F.p8.amgDes, 0)}% de las personas desaparecidas.`,
        chart: stack([{ label: 'Personas desaparecidas', parts: [{ v: F.p8.amgDes, color: '--amg', label: 'Área metropolitana' }, { v: 100 - F.p8.amgDes, color: '--resto', label: 'Fuera' }] },
          { label: 'Víctimas en fosas', parts: [{ v: F.p8.amg[0], color: '--amg', label: 'Área metropolitana' }, { v: 100 - F.p8.amg[0], color: '--resto', label: 'Fuera' }] }], { fmt: (v) => `${num(v, 0)}%` }) },
      { href: '/tendencias', n: 3, big: '9 de 16', h: 'Bajaron el homicidio y el robo, no la violencia familiar ni la sexual',
        p: 'delitos bajaron de 2019 a 2025. El abuso sexual denunciado se duplicó. Cambio anual promedio:',
        chart: rows({ compact: true, min: -20, max: 20, ticks: [-20, 0, 20], zero: 0, fmt: (v) => sgn(v, 0), valW: '3.8rem',
          rows: ['Homicidio doloso', 'Robo con violencia', 'Violencia familiar', 'Violación', 'Abuso sexual'].map((k) => { const d = F.p6.find((x) => x.k === k);
            return { label: k, v: d.t[0], lo: d.t[1], hi: d.t[2], color: d.cls === 'baja' ? '--down' : d.cls === 'sube' ? '--up' : '--flat', val: sgn(d.t[0]), tip: `${k}\n${sgn(d.t[0])} anual` }; }) }) },
      { href: '/tendencias#caida-2025', n: 3, big: sgn((F.p12.rr.victimas[0] - 1) * 100, 0), h: 'La caída del homicidio registrado en 2025',
        p: 'de víctimas de homicidio doloso de 2024 a 2025. Otras señales no cayeron igual, y los certificados de defunción de 2025 aún no se publican.',
        chart: legend([{ label: 'Víctimas (SESNSP)', color: '--hom', shape: 'line' }, { label: 'Certificados (INEGI)', color: '--c2', shape: 'line' }]) + line({ x: hs.years.map(String), height: 120, xEvery: 5, fmt: (v) => num(v), ticks: [0, 1500, 3000],
          series: [{ label: 'Víctimas SESNSP', color: '--hom', vals: hs.vic, marks: 'end' }, { label: 'Homicidios INEGI', color: '--c2', vals: hs.inegi, marks: 'end', hollow: [9] }] }) },
      { href: '/victimas', n: 4, big: '9 de 10', h: 'La violencia sexual recae en niñas y adolescentes',
        p: `víctimas de abuso sexual denunciado en 2026 son menores de edad, y 9 de cada 10 víctimas de violencia familiar son mujeres.`,
        chart: `<div class="two" style="gap:12px;align-items:center">${waffle(F.p11.perfil.find((d) => d.k === 'Abuso sexual').men[0], { color: '--women', label: '90 de cada 100 víctimas de abuso sexual son menores' })}<p>Mujeres de 13 a 17 años: <b>${num(F.p11.grupos['Abuso sexual'].find((g) => g.s === 'Mujer' && g.e.startsWith('13')).v[0], 0)}</b> víctimas de abuso sexual por 100 mil en ocho meses.</p></div>` },
      { href: '/cifra-negra', n: 5, big: `${num(F.p9.e26.jal[0], 0)} de 100`, h: 'Casi nada llega a las cifras',
        p: 'delitos ocurridos en Jalisco en 2025 no llegaron a una carpeta de investigación. En dos de cada tres, la razón es atribuible a la autoridad.',
        chart: `<div class="two" style="gap:12px;align-items:center">${waffle(100 - F.p9.e26.jal[0], { color: '--c1', label: '8 de cada 100 delitos llegan a una carpeta' })}<p>Solo los cuadros de color llegan a una carpeta: <b>8 de cada 100</b>. La excepción es el robo de vehículo, porque el seguro exige denuncia.</p></div>` },
    ];
    const muns = Object.entries(F.mun).sort((a, b) => a[1].n.localeCompare(b[1].n, 'es'));
    const hc = F.hypCounts;
    const body = `<header class="hero">
<h1 class="hero-t">En Jalisco, la violencia letal tiene dos caras.</h1>
<p class="lede">Quienes son asesinados y quienes desaparecen tienen el mismo perfil, pero no están en los mismos lugares: fuera del área metropolitana la desaparición pesa más y casi no hay búsqueda registrada. El homicidio registrado bajó en todo el estado, aunque eso todavía no demuestra que haya menos muertes violentas, y el robo solo bajó en el área metropolitana. La violencia familiar no bajó en ninguna región, y el abuso sexual, que recae sobre todo en niñas y adolescentes, subió. Todo esto es una fracción: alrededor de 92 de cada 100 delitos no llegan a una carpeta de investigación.</p>
<p class="byline">Jalisco · datos oficiales 2015–2026</p></header>
${stats([
  { value: num(F.p3.total), label: 'personas siguen desaparecidas', note: `${num(F.p3.antes2019)} desde 2018 o antes · REPD, corte 31 ago 2026` },
  { value: num(F.p8.tot.victimas_localizadas), label: `víctimas halladas en ${num(F.p8.tot.sitios)} fosas registradas`, note: `${num(F.p8.ident[0], 1)}% identificadas · Fiscalía, ago 2026` },
  { value: sgn((F.p12.rr.victimas[0] - 1) * 100, 0), label: 'víctimas de homicidio doloso, 2025 contra 2024', note: 'Homicidio registrado (SESNSP); falta INEGI 2025' },
  { value: `${num(F.p9.e26.jal[0], 1)}%`, label: 'de los delitos no llega a una carpeta', note: 'Cifra negra, ENVIPE 2026 (delitos de 2025)' },
])}
<h2>Seis hallazgos</h2>
<ol class="findings">${fcards.map((c) => `<li><a class="finding" href="${c.href}"><div class="ft"><h3>${esc(c.h)}</h3><span class="big">${c.big}</span><p>${c.p}</p></div><span class="more">Capítulo ${c.n}: ${esc(CHAPTERS[c.n - 1][1])} →</span><div class="viz" aria-hidden="true">${c.chart}</div></a></li>`).join('')}</ol>
<section class="sec"><h2>Tu municipio</h2><p>Cada municipio tiene una ficha con lo que dicen los datos: si su desaparición o su homicidio se distinguen del promedio del estado, cómo cambiaron cinco delitos de 2019 a 2025 y qué hay registrado de fosas.</p>
<form class="filters" method="get" action="/municipio"><label>Municipio<select name="m" required><option value="">Elige un municipio</option>${muns.map(([c, m]) => `<option value="${c}">${esc(m.n)}</option>`).join('')}</select></label><button type="submit">Ver ficha</button> <a class="btn secondary" href="/mapa">Ver el mapa</a></form></section>
<section class="sec"><h2>Cómo leemos las cifras</h2><div class="principles">
<p><b>Denuncias no son delitos.</b> El SESNSP cuenta carpetas de investigación; 92% de los delitos no llegan a una. Por eso cada tendencia de denuncias se lee con la encuesta de victimización al lado.</p>
<p><b>Siempre con incertidumbre.</b> Cada tasa, proporción o tendencia lleva su intervalo de confianza al 95%. Un municipio solo es "alto" o "bajo" si su intervalo no incluye el promedio del estado; si lo incluye, es indistinguible del promedio, aunque su número crudo parezca extremo.</p>
<p><b>Dos fuentes cuando se puede.</b> Los hallazgos principales se prueban con dos medidas, dos periodos o dos fuentes independientes (por ejemplo, homicidio del SESNSP y certificados de defunción del INEGI).</p>
<p><b>Hipótesis escritas antes de calcular.</b> De ${num(hc.ok + hc.no + hc.exp)} hipótesis, ${hc.ok} se confirmaron, ${hc.no} se refutaron y ${hc.exp} son exploratorias. Las refutadas también se publican. <a href="/metodologia#hipotesis">Ver el registro completo</a>.</p></div></section>`;
    return { title: 'Violencia en Jalisco, con datos oficiales', path: '/', body };
  }));
}

// ============================================================ 1. Violencia letal
export function violenciaLetal() {
  return respond(once('c1', () => {
    const p1 = F.p1, p2 = F.p2, p3 = F.p3, p5 = F.p5, p7 = F.p7;
    const CLS = { oculta: ['des', 'Homicidio bajo, desaparición alta: se sostiene también con el homicidio de 2015–2018'], oculta_p: ['des-p', 'Homicidio bajo, desaparición alta: depende del periodo'],
      ambos: ['ambos', 'Homicidio alto y desaparición alta'], hom: ['hom', 'Homicidio alto, desaparición no alta'] };
    const counts = Object.values(p1.cls).reduce((a, k) => ({ ...a, [k]: (a[k] || 0) + 1 }), {});
    const l12 = Object.fromEntries(p1.list12.map((m) => [m.cv, m]));
    const fig7 = figure({ id: 'misma-poblacion', title: 'Edad de los hombres asesinados y de los hombres que siguen desaparecidos',
      sub: 'Porcentaje de cada grupo por edad. Las dos curvas casi se enciman; la población masculina es otra cosa.',
      legend: legend([{ label: 'Hombres asesinados (INEGI 2019–2023)', color: '--hom', shape: 'line' }, { label: 'Hombres que siguen desaparecidos (REPD 2019–2025)', color: '--des', shape: 'line' }, { label: 'Población masculina (CONAPO)', color: '--flat', shape: 'line' }]),
      body: line({ x: p7.ages.map(age), height: 260, xEvery: 2, fmt: (v) => `${num(v)}%`, tipFmt: (v) => `${num(v, 1)}%`, max: 20,
        series: [{ label: 'Asesinados', color: '--hom', vals: p7.hom, marks: 'none' }, { label: 'Desaparecidos', color: '--des', vals: p7.des, marks: 'none' },
          { label: 'Población', color: '--flat', vals: p7.pop, marks: 'none', thin: true }] }),
      note: `Distancia entre las dos distribuciones (Jensen-Shannon): ${num(p7.js.homicidio_vs_desaparicion.js, 2)}; entre cada una y la población masculina: ${num(p7.js.homicidio_vs_poblacion_masculina.js, 2)}. Edad media: ${num(p7.meanAge.homicidio, 1)} y ${num(p7.meanAge.desaparicion, 1)} años.`,
      source: src('INEGI, defunciones por homicidio 2019–2023; REPD, personas que siguen desaparecidas 2019–2025; CONAPO', 7),
      table: table(['Edad', 'Asesinados', 'Desaparecidos', 'Población'], p7.ages.map((a, i) => [age(a), pc(p7.hom[i]), pc(p7.des[i]), pc(p7.pop[i])]), [1, 2, 3]) });

    const ages = p2.rates.map((r) => age(r.age)).reverse();
    const figPy = figure({ id: 'sexo-edad', title: 'Personas que siguen desaparecidas por cada 100 mil al año, por sexo y edad',
      sub: 'Desaparecidas de 2019 a 2025 que no han sido localizadas. La línea fina en cada barra es el intervalo al 95%.',
      body: pyramid({ ages, left: { label: 'Hombres', color: '--men', vals: p2.rates.map((r) => r.h).reverse() }, right: { label: 'Mujeres', color: '--women', vals: p2.rates.map((r) => r.m).reverse() } }),
      source: src('REPD, estadística oficial por sexo y edad (corte 31 ago 2026); CONAPO, población 2019–2025', 2),
      table: table(['Edad', 'Hombres', 'IC95', 'Mujeres', 'IC95', 'Razón H/M'], p2.rates.map((r) => [age(r.age), num(r.h[0], 1), range(r.h[1], r.h[2]), num(r.m[0], 1), range(r.m[1], r.m[2]), r.m[0] ? num(r.h[0] / r.m[0], 1) : '—']), [1, 2, 3, 4, 5]) });

    const [oh, om] = p2.outcome;
    const figOut = figure({ id: 'desenlace', title: 'Qué pasó con las personas reportadas como desaparecidas',
      sub: 'Todas las personas registradas en el REPD, por sexo.',
      legend: legend([{ label: 'Siguen desaparecidas', color: '--des' }, { label: 'Localizadas sin vida', color: '--ink-2' }, { label: 'Localizadas con vida', color: '--axis' }]),
      body: stack([oh, om].map((o) => ({ label: `${o.sexo === 'HOMBRE' ? 'Hombres' : 'Mujeres'} (${num(o.reg)})`, parts: [
        { v: o.siguen, color: '--des', label: 'Siguen desaparecidas', extra: `${num(o.siguen)} personas` },
        { v: o.sinVida, color: '--ink-2', text: '--bg', label: 'Localizadas sin vida', extra: `${num(o.sinVida)} personas` },
        { v: o.vida, color: '--axis', text: '--ink', label: 'Localizadas con vida', extra: `${num(o.vida)} personas` }] }))),
      note: `De los hombres que fueron localizados, ${num(oh.pSinVida[0], 1)}% estaban sin vida; de las mujeres, ${num(om.pSinVida[0], 1)}%.`,
      source: src('REPD, personas desaparecidas y localizadas, todos los años', 2),
      table: table(['', 'Registradas', 'Siguen desaparecidas', 'Localizadas con vida', 'Localizadas sin vida'], [oh, om].map((o) => [o.sexo === 'HOMBRE' ? 'Hombres' : 'Mujeres', num(o.reg), `${num(o.siguen)} (${pc(o.pSiguen[0])})`, num(o.vida), num(o.sinVida)]), [1, 2, 3, 4]) });

    const g = p1.grid;
    const cell = (h, d, k) => `<td class="n${k ? ` bv-${k}` : ''}">${g[h][d]}</td>`;
    const grid = `<table class="bv"><caption>Los 125 municipios según su homicidio y su desaparición, comparados con el promedio del estado</caption><thead><tr><th></th><th class="n">Desaparición alta</th><th class="n">Indistinguible</th><th class="n">Desaparición baja</th></tr></thead><tbody>
<tr><th>Homicidio alto</th>${cell('alto', 'alto', 'ambos')}${cell('alto', 'promedio', 'hom')}${cell('alto', 'bajo', 'hom')}</tr>
<tr><th>Indistinguible</th>${cell('promedio', 'alto')}${cell('promedio', 'promedio')}${cell('promedio', 'bajo')}</tr>
<tr><th>Homicidio bajo</th>${cell('bajo', 'alto', 'des')}${cell('bajo', 'promedio')}${cell('bajo', 'bajo')}</tr></tbody></table>`;
    const figMap = figure({ id: 'mapa-violencia-oculta', cls: 'wide', title: '12 municipios donde un mapa de homicidios no mostraría la violencia',
      sub: 'Homicidio doloso 2015–2025 (SESNSP) contra personas desaparecidas acumuladas (REPD), por municipio. "Alto" y "bajo" solo cuando el intervalo al 95% excluye el promedio del estado.',
      legend: legend([{ label: `${CLS.oculta[1]} (${counts.oculta})`, color: '--des' }, { label: `${CLS.oculta_p[1]} (${counts.oculta_p})`, color: '--des', shape: 'half' },
        { label: `${CLS.ambos[1]} (${counts.ambos})`, color: '--c3' }, { label: `${CLS.hom[1]} (${counts.hom})`, color: '--hom' }, { label: `Otros ${125 - Object.keys(p1.cls).length} municipios`, color: '--mid' }]),
      body: map({ label: 'Mapa de municipios por homicidio y desaparición', fill: (c) => { const k = p1.cls[c]; if (!k) return { tip: `${mun(c)}\nSin contraste creíble de homicidio bajo con desaparición alta` };
        const m = l12[c]; return { k: CLS[k][0], tip: `${mun(c)}\n${CLS[k][1]}${m ? `\n${num(m.des)} personas desaparecidas · ${num(m.hom)} homicidios 2015–2025\n${num(m.razon, 1)} veces la razón estatal de desaparecidas por homicidio` : ''}` }; } }) +
        `<div class="two" style="margin-top:16px">${grid}<div><p class="fig-note" style="margin-top:0">Los 12 municipios, de mayor a menor razón de desaparecidas por homicidio respecto del promedio estatal:</p><ul class="chips">${p1.list12.map((m) => `<li><a href="/municipio/${m.cv}"${m.robust ? ' class="on"' : ''}>${esc(mun(m.cv))} · ${num(m.razon, 1)}×</a></li>`).join('')}</ul><p class="fig-note">Con borde de color: se sostienen también con los certificados de defunción de 2015–2018 (pieza 23).</p></div></div>`,
      note: `Ejemplo: San Miguel el Alto registra ${num(p1.ejemplo.desaparecidas)} personas desaparecidas y ${num(p1.ejemplo.homicidios)} homicidios en 11 años. Los 12 se confirman con dos ventanas del SESNSP y con los homicidios del INEGI 2019–2023; con el homicidio de 2015–2018 se sostienen 6.`,
      source: src('SESNSP, carpetas de homicidio doloso 2015–2025; REPD, personas desaparecidas por municipio (acumulado); INEGI, defunciones', 1, 7, 23),
      table: table(['Municipio', 'Región', 'Desaparecidas', 'Homicidios 2015–2025', 'Razón relativa', 'IC95', '¿Con 2015–2018?'], p1.list12.map((m) => [ml(m.cv), RG[F.mun[m.cv].r], num(m.des), num(m.hom), num(m.razon, 2), range(m.ic[0], m.ic[1], 2), m.robust ? 'Sí' : 'No']), [2, 3, 4, 5]) });

    const figReg = figure({ id: 'por-region', title: 'Personas desaparecidas por cada homicidio, relativo al promedio del estado',
      sub: '1 = igual que el estado. Escala logarítmica. El punto lleno es la estimación principal; los círculos, las dos comprobaciones.',
      legend: legend([{ label: 'SESNSP 2015–2025 (principal), con IC95', color: '--des', shape: 'dot' }, { label: 'Comprobaciones: SESNSP 2019–2025 e INEGI 2019–2023', color: '--des', shape: 'ring' }]),
      body: rows({ min: 0.6, max: 4.5, log: true, ticks: [0.75, 1, 1.5, 2, 3, 4], zero: 1, fmt: (v) => `${num(v, v < 1 ? 2 : 1)}×`,
        rows: ['as', 'resto', 'an', 'amg'].map((r) => { const a = p1.regions.s1525[r], b = p1.regions.s1925[r], c = p1.regions.inegi[r];
          return { label: RG[r], lo: a[1], hi: a[2], color: '--des', val: `${num(a[0], 2)}×`, link: false, marks: [
            { v: b[0], color: '--des', shape: 'ring', tip: `${RG[r]} · SESNSP 2019–2025\n${num(b[0], 2)}×\nIC95 ${range(b[1], b[2], 2)}` },
            { v: c[0], color: '--des', shape: 'ring', tip: `${RG[r]} · INEGI 2019–2023\n${num(c[0], 2)}×\nIC95 ${range(c[1], c[2], 2)}` },
            { v: a[0], color: '--des', tip: `${RG[r]} · SESNSP 2015–2025\n${num(a[0], 2)}×\nIC95 ${range(a[1], a[2], 2)}` }] }; }) }),
      note: `A nivel estatal hay ${num(p1.estatal, 2)} personas desaparecidas por homicidio registrado (2015–2025). Correlación municipal entre las tasas de homicidio y de desaparición: ρ = ${num(p1.rho[0], 2)} (IC95 ${range(p1.rho[1], p1.rho[2], 2)}): saber cuántos homicidios tiene un municipio dice poco de cuántas desapariciones tiene.`,
      source: src('SESNSP, INEGI y REPD', 1, 7),
      table: table(['Región', 'SESNSP 2015–2025', 'SESNSP 2019–2025', 'INEGI 2019–2023'], ['as', 'resto', 'an', 'amg'].map((r) => [RG[r], ...['s1525', 's1925', 'inegi'].map((k) => `${num(p1.regions[k][r][0], 2)} [${range(p1.regions[k][r][1], p1.regions[k][r][2], 2)}]`)]), [1, 2, 3]) });

    const altos = (k) => Object.fromEntries(p5[k].altos.map((m) => [m.cv, m]));
    const ah = altos('hom'), ad = altos('des');
    const figConc = figure({ id: 'concentracion', cls: 'wide', title: 'El homicidio se concentra; la desaparición está repartida por el estado',
      sub: 'Municipios con tasa creíblemente superior al promedio estatal (intervalo al 95% por encima), con suavizado para municipios chicos.',
      body: `<div class="maps2"><div><h4>Homicidio doloso 2019–2025: ${p5.hom.altos.length} municipios</h4>${legend([{ label: 'Creíblemente superior', color: '--hom' }, { label: 'Indistinguible o inferior', color: '--mid' }])}${map({ small: true, label: 'Homicidio creíblemente alto', fill: (c) => ah[c] ? { k: 'hom', tip: `${mun(c)}\n${num(ah[c].eb, 1)} por 100 mil al año\nIC95 ${range(ah[c].ic[0], ah[c].ic[1])}` } : { tip: `${mun(c)}\nNo es creíblemente superior al promedio` } })}</div>
<div><h4>Personas desaparecidas (acumulado): ${p5.des.altos.length} municipios</h4>${legend([{ label: 'Creíblemente superior', color: '--des' }, { label: 'Indistinguible o inferior', color: '--mid' }])}${map({ small: true, label: 'Desaparición creíblemente alta', fill: (c) => ad[c] ? { k: 'des', tip: `${mun(c)}\n${num(ad[c].eb, 1)} por 100 mil habitantes\nIC95 ${range(ad[c].ic[0], ad[c].ic[1])} · ${num(ad[c].casos)} personas` } : { tip: `${mun(c)}\nNo es creíblemente superior al promedio` } })}</div></div>
<h4 style="margin:24px 0 8px;font-size:.92rem">Qué parte de la población concentra la mitad de los casos</h4>${rows({ min: 0, max: 60, ticks: [0, 10, 20, 30, 40, 50, 60], fmt: (v) => `${v}%`, valW: '4rem',
  rows: [{ label: 'Homicidio doloso 2019–2025', v: p5.hom.half * 100, bar: true, color: '--hom', ref: 50, val: pc(p5.hom.half * 100, 0), tip: `Homicidio\nLa mitad de los casos está en municipios con ${pc(p5.hom.half * 100, 0)} de la población` },
    { label: 'Personas desaparecidas', v: p5.des.half * 100, bar: true, color: '--des', ref: 50, val: pc(p5.des.half * 100, 0), tip: `Desaparición\nLa mitad de los casos está en municipios con ${pc(p5.des.half * 100, 0)} de la población` }], refLabel: 'Reparto parejo: 50%' })}
<p class="fig-note">La marca vertical en 50% sería un reparto perfectamente parejo. Índice de concentración (Gini): homicidio ${num(p5.hom.gini, 2)}, desaparición ${num(p5.des.gini, 2)}.</p>`,
      source: src('REPD (acumulado) y SESNSP 2019–2025; tasas con suavizado bayesiano empírico y CONAPO', 5),
      table: table(['Municipio', 'Región', 'Desaparición por 100 mil (suavizada)', 'IC95', '¿Homicidio creíblemente alto?'], p5.des.altos.map((m) => [ml(m.cv), RG[F.mun[m.cv].r], num(m.eb, 1), range(m.ic[0], m.ic[1]), ah[m.cv] ? 'Sí' : 'No']), [2, 3]) });

    const coh = p3.cohortes.filter((c) => c.y !== '2026');
    const figDeuda = figure({ id: 'deuda', title: 'Las denuncias bajan, pero cada año suma cientos de personas que no aparecen',
      sub: 'Por año: denuncias de desaparición recibidas (barra clara) y personas desaparecidas ese año que siguen sin ser localizadas (barra oscura).',
      legend: legend([{ label: 'Denuncias recibidas en el año', color: '--des', shape: 'half' }, { label: 'Siguen desaparecidas', color: '--des' }]),
      body: columns(coh.map((c) => { const d = p3.denuncias.find((x) => String(x.y) === c.y);
        return { label: c.y, v: c.n, ghost: d?.rep, color: '--des', tip: `${c.y}\n${num(c.n)} siguen desaparecidas\n${num(d?.rep)} denuncias recibidas` }; }), { ghostColor: '--des', labelAt: 'v', height: 220 }) +
        `<h4 style="margin:22px 0 8px;font-size:.92rem">Las ${num(p3.total)} personas que siguen desaparecidas, por año en que desaparecieron</h4>${stack([{ label: 'Personas desaparecidas hoy', parts: [
          { v: p3.antes2019, color: '--des', label: '2018 o antes', extra: `${num(p3.antes2019)} personas` },
          { v: coh.reduce((a, c) => a + c.n, 0), color: '--ink-3', text: '--bg', label: '2019–2025', extra: `${num(coh.reduce((a, c) => a + c.n, 0))} personas` },
          { v: p3.cohortes.find((c) => c.y === '2026').n, color: '--axis', text: '--ink', label: 'Enero–agosto 2026', extra: `${num(p3.cohortes.find((c) => c.y === '2026').n)} personas` }] }])}`,
      note: `Las denuncias bajan ${num(Math.abs(p3.tendDen[0]), 1)}% al año (IC95 ${range(Math.abs(p3.tendDen[2]), Math.abs(p3.tendDen[1]))}); las personas que quedan sin aparecer, ${num(Math.abs(p3.tendSig[0]), 1)}% al año. Solo existe la cifra de hoy: con una captura no se sabe si el total pendiente sube o baja.`,
      source: src('REPD, estadística oficial (corte 31 ago 2026)', 3),
      table: table(['Año', 'Denuncias recibidas', 'Localizadas el mismo año', 'Siguen desaparecidas', 'IC95'], p3.cohortes.map((c) => { const d = p3.denuncias.find((x) => String(x.y) === c.y);
        return [c.y, d ? num(d.rep) : '—', d ? num(d.loc) : '—', num(c.n), range(c.ic[0], c.ic[1], 0)]; }), [1, 2, 3, 4]) });

    const figMarg = figure({ id: 'marginacion', title: '¿La desaparición sigue a la pobreza? No: la diferencia es metropolitana',
      sub: 'Municipios agrupados por grado de marginación (CONAPO 2020).',
      body: `<div class="table-scroll">${table(['Grado de marginación', 'Municipios', 'Desaparecidas por 100 mil (acumulado)', 'Homicidio por 100 mil al año (INEGI 2019–2023)'], F.p10.map((g) => [g.g, num(g.n), num(g.desap, 1), num(g.hom, 1)]), [1, 2, 3])}</div>`,
      note: 'La tasa de desaparición baja ligeramente con la marginación y el homicidio no cambia. El peso relativo de la desaparición es mayor donde hay más población rural, pero ese efecto desaparece al quitar los 10 municipios del área metropolitana. En los municipios más marginados se registra proporcionalmente menos desaparición, lo que es compatible con menos denuncia (Mezquitic y Bolaños, región wixárika).',
      source: src('CONAPO, índice de marginación municipal 2020; REPD; INEGI. Asociación ecológica, no causal', 10) });

    return chapter(0, {
      title: 'Quienes desaparecen y quienes son asesinados son la misma población, pero no están en los mismos lugares',
      description: 'En Jalisco, asesinados y desaparecidos tienen el mismo perfil, pero fuera del área metropolitana la violencia letal se registra sobre todo como desaparición.',
      lede: 'Nueve de cada diez son hombres, con la misma edad. El homicidio se concentra en el sur del área metropolitana y en Altos Norte; la desaparición se reparte por todo el estado y, fuera del área metropolitana, pesa más que el homicidio.',
      tiles: [
        { value: `${num(p7.hombres.hom[0], 0)}% · ${num(p7.hombres.des[0], 0)}%`, label: 'son hombres: de los asesinados y de quienes siguen desaparecidos' },
        { value: '12', label: 'municipios con homicidio bajo y desaparición alta', note: 'Confirmados con dos fuentes de homicidio' },
        { value: `${num(p1.regions.s1525.as[0], 1)}×`, label: 'personas desaparecidas por homicidio en Altos Sur, respecto del promedio', note: `Área metropolitana: ${num(p1.regions.s1525.amg[0], 2)}×` },
        { value: num(p3.total), label: 'personas siguen desaparecidas', note: `${num(p3.antes2019 / p3.total * 100, 0)}% desde 2018 o antes` },
      ],
      body: `${mapDefs()}
<section class="sec"><h2>La misma población</h2><p>Entre las víctimas de homicidio (certificados de defunción del INEGI) y las personas que siguen desaparecidas (registro estatal), la proporción de hombres y la edad casi coinciden. Se parecen entre sí mucho más de lo que cada grupo se parece a la población.</p>${fig7}</section>
<section class="sec"><h2>Desde los 15 años, la desaparición sin resolver es sobre todo de hombres</h2><p>En la infancia, niños y niñas desaparecen sin ser localizados a la misma tasa. A partir de los 15 años se separan: a los 25–29 la tasa de los hombres es 7 veces la de las mujeres, y pasa de 10 veces después de los 35. El pico de las mujeres también está en los 25–29 años, no en la adolescencia.</p>${figPy}${figOut}</section>
<section class="sec"><h2>No en los mismos lugares</h2><p>Si la desaparición siguiera al homicidio, cada municipio tendría más o menos la misma proporción de una y otro. No es así: la proporción varía mucho más de lo que explica el azar. En el área metropolitana la violencia letal se registra sobre todo como homicidio; fuera de ella, sobre todo como desaparición.</p>${figMap}${figReg}${figConc}</section>
<section class="sec"><h2>La deuda pendiente</h2><p>Los casos nuevos bajan, y que las cohortes recientes, con menos tiempo para ser localizadas, aporten menos personas pendientes es evidencia conservadora de que la baja es real. Pero 16,250 personas siguen sin ser localizadas.</p>${figDeuda}</section>
<section class="sec">${figMarg}</section>`,
      reading: [
        `<b>Desaparición no es muerte.</b> Leer la desaparición sin resolver como violencia letal es un supuesto: de las 22,017 personas localizadas, 85% aparecieron con vida. Para quienes siguen desaparecidas, la proporción sin vida es desconocida y probablemente mayor (${cav(12)}).`,
        `<b>La desaparición por municipio es acumulada, sin año.</b> Compararla con el homicidio de un periodo supone que la antigüedad de los casos es parecida entre regiones. Por eso la lista de 12 depende del periodo: con el homicidio de 2015–2018 se sostienen 6 (${cav(4, 20)}).`,
        `<b>El total del REPD (16,250) no cuadra con su mapa (16,203).</b> 86 personas no tienen municipio y 47 no aparecen en ninguna clave. La fuente no lo explica (${cav(5)}).`,
        `<b>Las comparaciones entre municipios son ecológicas.</b> No se aplican a personas ni implican causa (${cav(10, 11)}).`],
    });
  }));
}

// ============================================================ 2. Búsqueda
export function busqueda() {
  return respond(once('c2', () => {
    const p8 = F.p8, p25 = F.p25;
    const reg = Object.fromEntries(p8.mun.map((m) => [m.cv, m]));
    const otros = new Set(p25.fueraSinRegistro);
    const fuente = (c) => [p25.muns.prensa.includes(c) ? 'prensa' : null, p25.muns.fiscalia.includes(c) ? 'base de la fiscalía por transparencia' : null].filter(Boolean).join(' y ');
    const amgPob = F.p5.regions.amg.pob * 100;
    const figShare = figure({ id: 'donde-se-busca', title: 'Dónde vive la gente, dónde están las personas desaparecidas y dónde se han hallado víctimas en fosas',
      legend: legend([{ label: 'Área metropolitana (10 municipios)', color: '--amg' }, { label: 'Resto de Jalisco (115 municipios)', color: '--resto' }]),
      body: stack([
        { label: 'Población 2025', parts: [{ v: amgPob, color: '--amg', label: 'Área metropolitana' }, { v: 100 - amgPob, color: '--resto', label: 'Resto de Jalisco' }] },
        { label: 'Personas desaparecidas', parts: [{ v: p8.amgDes, color: '--amg', label: 'Área metropolitana' }, { v: 100 - p8.amgDes, color: '--resto', label: 'Resto de Jalisco' }] },
        { label: 'Víctimas halladas en fosas registradas', parts: [{ v: p8.amg[0], color: '--amg', label: 'Área metropolitana', extra: `IC95 ${range(p8.amg[1], p8.amg[2])}%` }, { v: 100 - p8.amg[0], color: '--resto', label: 'Resto de Jalisco', extra: `${num(p8.fuera.victimas_localizadas)} víctimas` }] }]),
      source: src('Fiscalía del Estado de Jalisco, registro de sitios de inhumación clandestina (corte 31 ago 2026); REPD; CONAPO', 8) });

    const cmax = Math.max(...p8.mun.map((m) => m.loc));
    const figMap = figure({ id: 'mapa-fosas', cls: 'wide', title: 'Fosas registradas y fosas que otras fuentes reportan fuera del registro',
      sub: 'Círculos: víctimas localizadas en sitios del registro público, por municipio. Naranja: municipios fuera del área metropolitana donde la prensa o la base de la fiscalía obtenida por transparencia reportan fosas en 2019–2024, sin ningún sitio en el registro.',
      legend: legend([{ label: `Con sitio en el registro (${p8.mun.length} municipios)`, color: '--c1', shape: 'half' }, { label: `Fosas reportadas por otras fuentes, sin sitio en el registro (${otros.size})`, color: '--c2' }, { label: 'Víctimas localizadas en el registro', color: '--ink', shape: 'circle' }]) + circleKey([10, 100, 750], cmax),
      body: map({ label: 'Mapa de fosas registradas por municipio', maxCircle: cmax,
        fill: (c) => reg[c] ? { k: 'reg', tip: `${mun(c)}\n${num(reg[c].loc)} víctimas localizadas\n${num(reg[c].sitios)} ${reg[c].sitios === 1 ? 'sitio' : 'sitios'} · ${num(reg[c].id)} identificadas` }
          : otros.has(c) ? { k: 'otra', tip: `${mun(c)}\nFosas en ${fuente(c)} (2019–2024)\nSin sitio en el registro público` } : { tip: `${mun(c)}\nSin sitio registrado` },
        circles: p8.mun.map((m) => ({ cv: m.cv, v: m.loc, tip: `${mun(m.cv)}\n${num(m.loc)} víctimas localizadas\n${num(m.sitios)} ${m.sitios === 1 ? 'sitio' : 'sitios'}` })) }),
      note: (() => { const both = p25.fueraSinRegistro.filter((c) => F.p1.cls[c] === 'oculta' || F.p1.cls[c] === 'oculta_p'); return `${both.length === 2 ? 'Dos' : num(both.length)} de los ${otros.size} municipios con fosas fuera del registro, ${both.map(ml).join(' y ')}, están entre los 12 con homicidio bajo y desaparición alta.`; })(),
      source: src('Fiscalía del Estado de Jalisco (registro público); Plataforma Ciudadana de Fosas (PDH IBERO, ARTICLE 19, Data Cívica): prensa y fiscalía por transparencia', 8, 25),
      table: table(['Municipio', 'Sitios', 'Víctimas localizadas', 'Identificadas'], p8.mun.map((m) => [ml(m.cv), num(m.sitios), num(m.loc), num(m.id)]), [1, 2, 3]) +
        table(['Fuera del registro', 'Fuente'], [...otros].map((c) => [ml(c), fuente(c)])) });

    const figId = figure({ id: 'identificacion', title: 'Cuatro de cada diez cuerpos hallados siguen sin nombre años después',
      sub: 'Porcentaje de víctimas identificadas, por año en que empezó a procesarse el sitio (sitios ya cerrados).',
      body: columns(p8.porAnio.map((x) => ({ label: String(x.y), v: x.pct, color: '--c1', dim: x.y >= 2024, val: `${num(x.pct, 0)}%`,
        tip: `Sitios iniciados en ${x.y}\n${num(x.pct, 1)}% identificadas\n${num(x.id)} de ${num(x.loc)} víctimas` })), { max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v) => `${v}%`, height: 200 }),
      note: `En total, ${num(p8.ident[0], 1)}% (IC95 ${range(p8.ident[1], p8.ident[2])}) de las ${num(p8.tot.victimas_localizadas)} víctimas halladas fue identificada: ${num(p8.sexo.hombres)} hombres y ${num(p8.sexo.mujeres)} mujeres. En los sitios de 2024 a 2026 (barras atenuadas) el Instituto Jalisciense de Ciencias Forenses sigue emitiendo dictámenes.`,
      source: src('Fiscalía del Estado de Jalisco, registro de sitios (cifras preliminares)', 8),
      table: table(['Año de inicio', 'Víctimas localizadas', 'Identificadas', '%'], p8.porAnio.map((x) => [x.y, num(x.loc), num(x.id), pc(x.pct)]), [1, 2, 3]) });

    const yrs = p25.serie.map((x) => String(x.y));
    const figFuentes = figure({ id: 'tres-fuentes', title: 'Dos versiones oficiales de la misma Fiscalía no cuadran',
      sub: 'Víctimas o cuerpos hallados por año, 2019–2024, según tres fuentes. Cada fuente cuenta una unidad distinta.',
      legend: legend([{ label: 'Registro público: víctimas localizadas', color: '--c1', shape: 'line' }, { label: 'Fiscalía por transparencia: cuerpos', color: '--c2', shape: 'line' }, { label: 'Prensa: cuerpos (cota baja a alta)', color: '--c3', shape: 'line' }]),
      body: line({ x: yrs, height: 240, fmt: (v) => num(v),
        series: [{ label: 'Registro público', color: '--c1', vals: p25.serie.map((x) => x.regV), end: 'Registro' },
          { label: 'Fiscalía (transparencia)', color: '--c2', vals: p25.serie.map((x) => x.fisC), end: 'Fiscalía' },
          { label: 'Prensa, cota baja', color: '--c3', vals: p25.serie.map((x) => x.preLo), band: p25.serie.map((x) => [x.preLo, x.preHi]), end: 'Prensa' }] }),
      note: `Sumados 2019–2024, la base entregada por transparencia cuenta ${num(p25.fiscaliaVsRegistro.plataforma_fiscalia_cuerpos)} cuerpos y el registro público ${num(p25.fiscaliaVsRegistro.registro_victimas)} víctimas: ${num(Math.abs(p25.fiscaliaVsRegistro.diferencia_relativa * 100), 0)}% menos. La base por transparencia además cuenta restos o fragmentos aparte (2,022 solo en 2022), que no se pueden convertir en personas. Aun en la prensa, ${num(p25.conc.prensa_proporcion_amg * 100, 0)}% de los cuerpos está en el área metropolitana.`,
      source: src('Fiscalía del Estado de Jalisco; Plataforma Ciudadana de Fosas', 25),
      table: table(['Año', 'Registro: sitios', 'Registro: víctimas', 'Fiscalía: fosas', 'Fiscalía: cuerpos', 'Prensa: fosas', 'Prensa: cuerpos'], p25.serie.map((x) => [x.y, num(x.regS), num(x.regV), num(x.fisF), num(x.fisC), num(x.preF), `${num(x.preLo)}–${num(x.preHi)}`]), [1, 2, 3, 4, 5, 6]) });

    const iz = p8.sinVictimas.find((x) => mun(x.cv) === 'Teuchitlán');
    return chapter(1, {
      title: 'Fuera del área metropolitana casi no hay búsqueda registrada',
      description: 'El 95% de las víctimas halladas en fosas registradas en Jalisco están en el área metropolitana, donde está el 62% de las personas desaparecidas.',
      lede: `El registro oficial de fosas es un mapa de dónde se ha buscado, no de dónde están las personas. ${num(p8.amg[0], 0)}% de las víctimas halladas están en el área metropolitana, que concentra ${num(p8.amgDes, 0)}% de las personas desaparecidas. En el resto del estado, solo ${p8.fuera.con_fosa} de ${p8.fuera.municipios} municipios tienen algún sitio registrado.`,
      tiles: [
        { value: num(p8.tot.victimas_localizadas), label: `víctimas localizadas en ${num(p8.tot.sitios)} sitios`, note: `${p8.tot.en_proceso} sitios aún en proceso` },
        { value: `${num(p8.ident[0], 0)}%`, label: 'de esas víctimas ha sido identificada' },
        { value: `${p8.fuera.con_fosa} de ${p8.fuera.municipios}`, label: 'municipios fuera del área metropolitana tienen un sitio registrado' },
        { value: String(otros.size), label: 'municipios más con fosas reportadas por prensa o por la fiscalía, sin sitio en el registro' },
      ],
      body: `${mapDefs()}
<section class="sec"><h2>La búsqueda registrada se queda en el área metropolitana</h2><p>La desaparición se reparte por todo el estado casi igual que la población. Las víctimas halladas en fosas, no.</p>${figShare}</section>
<section class="sec"><h2>Lo que el registro deja fuera</h2><p>La falta de búsqueda registrada es de todo el interior del estado, no específica de donde más se desaparece: de 22 municipios del interior con desaparición creíblemente alta, 4 tienen alguna fosa registrada (18%), contra 7 de los otros 93 (7.5%), una diferencia que no es significativa.</p>${figMap}
<div class="callout"><p><b>Rancho Izaguirre figura con 0 víctimas.</b> El sitio aparece en el registro como ${esc(iz ? `${iz.sitio.charAt(0)}${iz.sitio.slice(1).toLowerCase()}` : 'La Estanzuela')}, Teuchitlán (${esc(iz?.inicio || '03/2025')}), la localidad del rancho, ampliamente documentado. Muestra lo que el registro puede dejar fuera aun cuando registra el sitio. Presa Santa Elena, en Ameca, también figura con 0 víctimas.</p></div></section>
<section class="sec"><h2>Identificar lleva años</h2>${figId}</section>
<section class="sec"><h2>Tres fuentes, tres cifras</h2><p>La Plataforma Ciudadana de Fosas reúne lo que reporta la prensa y lo que la Fiscalía entregó por transparencia. Las tres fuentes coinciden en que casi todo lo hallado está en el área metropolitana. Difieren en cuánto se ha hallado y en cuántos municipios del interior aparecen.</p>${figFuentes}</section>`,
      reading: [
        `<b>Fosas = esfuerzo de búsqueda.</b> El registro refleja dónde procesa la Fiscalía y es preliminar: puede registrar un sitio sin contar sus víctimas (${cav(7)}).`,
        '<b>El año del registro es el de inicio del procesamiento</b>, que puede no coincidir con el año del hallazgo que reporta la prensa. Las fuentes se comparan por municipio y año, no sitio por sitio.',
        '<b>La prensa no documenta todos los hallazgos</b> ni evita contar dos veces el mismo; su cota baja y alta difieren hasta en 134 cuerpos en un año.',
        '<b>Para las víctimas localizadas, la cifra de referencia es el registro público</b>, con la advertencia de que la base entregada por transparencia no cuadra con él.'],
    });
  }));
}

// ============================================================ 3. Tendencias
const CLSC = { baja: '--down', 'sin tendencia clara': '--flat', sube: '--up' };
const CLSL = { baja: 'Baja', 'sin tendencia clara': 'Sin tendencia clara', sube: 'Sube' };

export function tendencias() {
  return respond(once('c3', () => {
    const p6 = [...F.p6].sort((a, b) => a.t[0] - b.t[0]);
    const figForest = figure({ id: 'dieciseis-delitos', title: 'Cambio anual promedio de 16 delitos denunciados, 2019–2025',
      sub: 'Tasa por 100 mil habitantes; punto y línea: estimación y su intervalo al 95%. Si el intervalo cruza el cero, no hay tendencia clara.',
      legend: legend([{ label: 'Baja', color: '--down', shape: 'dot' }, { label: 'Sin tendencia clara', color: '--flat', shape: 'dot' }, { label: 'Sube', color: '--up', shape: 'dot' }]),
      body: rows({ min: -30, max: 30, ticks: [-30, -20, -10, 0, 10, 20, 30], zero: 0, fmt: (v) => sgn(v, 0),
        rows: p6.map((d) => ({ label: d.k, v: d.t[0], lo: d.t[1], hi: d.t[2], color: CLSC[d.cls], val: sgn(d.t[0]),
          tip: `${d.k}\n${sgn(d.t[0])} al año\nIC95 ${sgn(d.t[1])} a ${sgn(d.t[2])} · ${CLSL[d.cls]}` })) }),
      note: 'La caída del abuso sexual en 2026 probablemente es una reclasificación del nuevo registro del SESNSP, no una mejora. Narcomenudeo refleja actividad policial más que consumo.',
      source: src('SESNSP, carpetas de investigación del fuero común; CONAPO. Categorías comparables entre metodologías según la nota del SESNSP', 6),
      table: table(['Delito', 'Tasa 2019', 'Tasa 2025', 'Cambio anual', 'IC95', 'Ene–ago 2026 vs 2025'], p6.map((d) => [d.k, num(d.serie['2019'], 1), num(d.serie['2025'], 1), sgn(d.t[0]), `${sgn(d.t[1])} a ${sgn(d.t[2])}`, `×${num(d.r26[0], 2)} [${range(d.r26[1], d.r26[2], 2)}]`]), [1, 2, 3, 4, 5]) });

    const yrs = Object.keys(F.p6[0].serie);
    const byCls = ['baja', 'sin tendencia clara', 'sube'].map((c) => [c, F.p6.filter((d) => d.cls === c)]);
    const figSparks = figure({ id: 'series', cls: 'wide', title: 'La serie de cada delito, 2015–2025',
      sub: 'Tasa por 100 mil habitantes. Cada gráfica tiene su propia escala: sirven para ver la forma, no para comparar niveles entre delitos.',
      body: byCls.map(([c, ds]) => `<h4 class="sub-h">${CLSL[c]} (${ds.length})</h4><div class="sparks">${ds.map((d) => { const v = yrs.map((y) => d.serie[y]);
        return `<div class="spk"><b>${esc(d.k)}</b>${spark(v, { color: CLSC[d.cls], labels: [[4, num(d.serie['2019'], 1)], [10, num(d.serie['2025'], 1)]] })}<small>2015–2025, marcados 2019 y 2025 · ene–ago 2026 frente a 2025: ×${num(d.r26[0], 2)}</small></div>`; }).join('')}</div>`).join(''),
      source: src('SESNSP; CONAPO', 6),
      table: table(['Delito', ...yrs], F.p6.map((d) => [d.k, ...yrs.map((y) => num(d.serie[y], 1))]), yrs.map((_, i) => i + 1)) });

    const hs = homicideSeries();
    const fig23 = figure({ id: 'tres-conteos', title: 'Tres conteos de homicidio que se mueven juntos, hasta donde hay datos',
      sub: 'Víctimas y carpetas de homicidio doloso del SESNSP, y homicidios con certificado de defunción del INEGI, por año de ocurrencia.',
      legend: legend([{ label: 'Víctimas (SESNSP)', color: '--c1', shape: 'line' }, { label: 'Homicidios con certificado (INEGI)', color: '--c2', shape: 'line' }, { label: 'Carpetas (SESNSP)', color: '--flat', shape: 'line' }, { label: 'Dato incompleto', color: '--c2', shape: 'ring' }]),
      body: line({ x: hs.years.map(String), height: 260, fmt: (v) => num(v), max: 3000, notes: [{ i: 10, v: F.p12.victimas['2025'] + 700, text: 'INEGI 2025: pendiente' }],
        series: [{ label: 'Víctimas SESNSP', color: '--c1', vals: hs.vic, end: 'Víctimas' }, { label: 'Homicidios INEGI', color: '--c2', vals: hs.inegi, hollow: [9], end: 'INEGI' },
          { label: 'Carpetas SESNSP', color: '--flat', vals: hs.car, thin: true, end: 'Carpetas' }] }),
      note: `Hasta 2018 el SESNSP registraba un poco menos víctimas que certificados (0.94 por certificado en 2015–2018); desde 2019, más (1.14 en 2019–2023). El SESNSP no se fue quedando corto con el tiempo, pero eso no sustituye la prueba de 2025. INEGI 2024 está incompleto (faltan registros tardíos, +5–8%).`,
      source: src('SESNSP, víctimas y carpetas de homicidio doloso; INEGI, estadísticas de defunciones registradas', 12, 23),
      table: table(['Año', 'Carpetas SESNSP', 'Víctimas SESNSP', 'Homicidios INEGI'], hs.years.map((y, i) => [y, num(hs.car[i]), num(hs.vic[i]), hs.inegi[i] == null ? 'pendiente' : `${num(hs.inegi[i])}${y === 2024 ? ' (parcial)' : ''}`]), [1, 2, 3]) });

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const figMes = figure({ id: 'por-mes', title: 'Los 12 meses de 2025 quedaron por debajo del mismo mes de 2024',
      sub: 'Víctimas de homicidio doloso por mes (SESNSP).',
      legend: legend([{ label: '2024', color: '--flat', shape: 'line' }, { label: '2025', color: '--hom', shape: 'line' }]),
      body: line({ x: meses, height: 220, fmt: (v) => num(v), ticks: [0, 50, 100, 150, 200],
        series: [{ label: '2024', color: '--flat', vals: F.p12.vicMes['2024'], end: '2024' }, { label: '2025', color: '--hom', vals: F.p12.vicMes['2025'], end: '2025' }] }),
      source: src('SESNSP, víctimas de homicidio doloso por mes', 12),
      table: table(['Mes', '2024', '2025'], meses.map((m, i) => [m, num(F.p12.vicMes['2024'][i]), num(F.p12.vicMes['2025'][i])]), [1, 2]) });

    const ay = Object.keys(F.p12.arma);
    const figArma = figure({ id: 'lesiones', title: 'El homicidio con arma de fuego cayó; las lesiones con arma de fuego casi no',
      sub: 'Carpetas de investigación por año.',
      legend: legend([{ label: 'Homicidio doloso con arma de fuego', color: '--c1', shape: 'line' }, { label: 'Lesiones dolosas con arma de fuego', color: '--c2', shape: 'line' }]),
      body: line({ x: ay, height: 220, fmt: (v) => num(v), min: 0, max: 1250, ticks: [0, 250, 500, 750, 1000, 1250],
        series: [{ label: 'Homicidio con arma de fuego', color: '--c1', vals: ay.map((y) => F.p12.arma[y]), end: 'Homicidio' }, { label: 'Lesiones con arma de fuego', color: '--c2', vals: ay.map((y) => F.p12.lesArma[y]), end: 'Lesiones' }] }),
      note: `Por cada lesión con arma de fuego hubo entre 1.32 y 1.60 homicidios con arma de 2019 a 2024, y 1.02 en 2025. Las lesiones bajaron ${num((1 - F.p12.rrLes[0]) * 100, 0)}% (razón ${num(F.p12.rrLes[0], 2)}, IC95 ${range(F.p12.rrLes[1], F.p12.rrLes[2], 2)}): sin diferencia significativa.`,
      source: src('SESNSP, carpetas por modalidad', 12),
      table: table(['Año', 'Homicidio con arma de fuego', 'Lesiones con arma de fuego'], ay.map((y) => [y, num(F.p12.arma[y]), num(F.p12.lesArma[y])]), [1, 2]) });

    const figDes = figure({ id: 'desaparicion-por-homicidio', title: 'Por cada víctima de homicidio, más denuncias de desaparición que nunca desde 2019',
      sub: 'Denuncias de desaparición (REPD) por víctima de homicidio doloso (SESNSP).',
      body: columns(F.p12.desPorHom.map((x) => ({ label: String(x.y), v: x.v[0], color: '--des', dim: x.y !== 2025, val: num(x.v[0], 2), tip: `${x.y}\n${num(x.v[0], 2)} denuncias por víctima\nIC95 ${range(x.v[1], x.v[2], 2)}` })),
        { max: 2.5, ticks: [0, 0.5, 1, 1.5, 2, 2.5], fmt: (v) => num(v, 1), height: 180 }),
      note: `En 2025, ${num((F.p12.desPorHomRR[0] - 1) * 100, 0)}% más que el promedio 2019–2024 (IC95 ${range((F.p12.desPorHomRR[1] - 1) * 100, (F.p12.desPorHomRR[2] - 1) * 100, 0)}%). Las denuncias de desaparición incluyen personas que luego aparecen con vida.`,
      source: src('REPD, denuncias por año; SESNSP, víctimas de homicidio doloso', 12) });

    const figReg = figure({ id: 'regiones', cls: 'wide', title: 'Cambio anual promedio 2019–2025, por región',
      sub: 'Carpetas por 100 mil habitantes, con intervalo al 95%. A la derecha, la tasa de 2019 → 2025.',
      body: `<div class="two">${F.p14.map((d) => `<div><h4 style="margin:6px 0 2px;font-size:.95rem">${esc(d.k)}</h4><p class="fig-note" style="margin:0 0 6px">${d.p < 0.05 ? '<b>Las regiones difieren</b>' : 'Las regiones no difieren'} (F = ${num(d.F, 1)}, p ${d.p < 0.001 ? '< 0.001' : `= ${num(d.p, d.p < 0.01 ? 3 : 2)}`})</p>${rows({ min: -30, max: 30, ticks: [-30, -15, 0, 15, 30], zero: 0, fmt: (v) => sgn(v, 0), valW: '6.5rem', compact: true,
        rows: REGIONS.map((r) => { const x = d.reg[r]; return { label: RG[r], v: x.t[0], lo: x.t[1], hi: x.t[2], color: RGC[r], val: `${num(x.t19, 0)} → ${num(x.t25, 0)}`,
          tip: `${d.k} · ${RG[r]}\n${sgn(x.t[0])} al año\nIC95 ${sgn(x.t[1])} a ${sgn(x.t[2])} · tasa ${num(x.t19, 1)} → ${num(x.t25, 1)}` }; }) })}</div>`).join('')}</div>`,
      source: src('SESNSP, carpetas por municipio agrupadas en cuatro regiones; CONAPO', 14),
      table: table(['Delito', 'Región', 'Tasa 2019', 'Tasa 2025', 'Cambio anual', 'IC95'], F.p14.flatMap((d) => REGIONS.map((r) => [d.k, RG[r], num(d.reg[r].t19, 1), num(d.reg[r].t25, 1), sgn(d.reg[r].t[0]), `${sgn(d.reg[r].t[1])} a ${sgn(d.reg[r].t[2])}`])), [2, 3, 4, 5]) });

    // Municipal trends map with a crime switcher (no JS: first crime).
    const p19 = F.p19;
    const TL = { up: 'Sube creíblemente', down: 'Baja creíblemente', flat: 'Sin cambio claro' };
    const attrs = (c) => p19.map((d, i) => { const m = d.m[c];
      return ` data-c${i}="${m[3]}" data-t${i}="${esc(`${mun(c)} · ${d.k}\n${sgn(m[0])} al año\nIC95 ${sgn(m[1])} a ${sgn(m[2])} · ${TL[m[3]]}\n${num(m[4])} carpetas 2019–2025`)}"`; }).join('');
    const summ = p19.map((d, i) => { const v = Object.values(d.m); const up = v.filter((m) => m[3] === 'up').length, down = v.filter((m) => m[3] === 'down').length;
      return `<p class="fig-note" data-for="m19" data-k="${i}"${i ? ' hidden' : ''}><b>${esc(d.k)}:</b> ${down} municipios bajan y ${up} suben de forma creíble; ${125 - up - down} sin cambio claro. Estado: ${sgn(d.state[0])} al año; municipio típico: ${sgn(d.tipico[0])} (IC95 ${sgn(d.tipico[1])} a ${sgn(d.tipico[2])}).</p>`; }).join('');
    const figMun = figure({ id: 'municipios', cls: 'wide', title: 'Tendencia 2019–2025 en cada municipio',
      sub: 'Modelo jerárquico (binomial negativa): los municipios chicos se acercan a la tendencia típica según lo poco que dicen sus datos. Solo se colorea un cambio cuando su intervalo al 95% excluye el cero.',
      legend: `<div class="seg" data-switch="m19" role="group" aria-label="Delito">${p19.map((d, i) => `<button type="button" data-k="${i}" aria-pressed="${i ? 'false' : 'true'}">${esc(d.k)}</button>`).join('')}</div>` +
        legend([{ label: 'Baja creíblemente', color: '--down' }, { label: 'Sin cambio claro', color: '--mid' }, { label: 'Sube creíblemente', color: '--up' }]),
      body: map({ label: 'Mapa de tendencias municipales', attrs: ' id="m19" data-k="0"', fill: (c) => ({ tip: `${mun(c)} · ${p19[0].k}`, attrs: attrs(c) }) }) + summ,
      note: 'La tendencia "del estado" pondera por población y la dominan los municipios metropolitanos; la del "municipio típico" pesa igual a cada municipio. En robo, el municipio típico no baja: la baja estatal viene de Tonalá, Zapopan, Guadalajara y Tlajomulco.',
      source: src('SESNSP, carpetas 2019–2025 por municipio; CONAPO', 19),
      table: table(['Municipio', ...p19.map((d) => d.k)], Object.keys(F.mun).sort((a, b) => mun(a).localeCompare(mun(b), 'es')).map((c) => [ml(c), ...p19.map((d) => `${sgn(d.m[c][0])} [${sgn(d.m[c][1], 0)}, ${sgn(d.m[c][2], 0)}]`)]), [1, 2, 3, 4, 5]) });

    const ry = Object.keys(F.p21.residual);
    const figOtros = figure({ id: 'otros', title: 'Cada vez más carpetas caen en cajones residuales',
      sub: 'Porcentaje de todas las carpetas del estado que se registran en una categoría "otros …" (sin delito identificable).',
      body: line({ x: ry, height: 200, fmt: (v) => `${num(v)}%`, tipFmt: (v) => `${num(v, 1)}%`, min: 0, max: 16, ticks: [0, 4, 8, 12, 16],
        series: [{ label: 'Categorías "otros"', color: '--c1', vals: ry.map((y) => F.p21.residual[y]) }] }),
      note: `En 2025, una de cada siete carpetas es "otros …" (${num(F.p21.residual['2025'], 1)}%), contra una de cada once en 2019. Además hay rupturas de registro: "otros contra la familia" se partió en 2024, daño a la propiedad cayó a menos de la mitad en 2023 y "otros contra la libertad sexual" se multiplicó en 2021. Algunas bajas son cambios de etiqueta.`,
      source: src('SESNSP, total estatal', 21),
      table: table(['Tipo de delito', '2019', '2025', 'Cambio anual', 'IC95', 'Clase'], F.p21.tipos.map((t) => [esc(t.k), num(t.n19), num(t.n25), sgn(t.t[0]), `${sgn(t.t[1])} a ${sgn(t.t[2])}`, CLSL[t.cls] || t.cls]), [1, 2, 3, 4]) });

    return chapter(2, {
      title: 'Bajaron el homicidio y el robo; no bajaron la violencia familiar ni la sexual',
      description: 'De 2019 a 2025 bajaron en Jalisco el homicidio, el robo y la extorsión denunciados; la violencia familiar no bajó y el abuso sexual se duplicó.',
      lede: 'De 2019 a 2025 bajaron la violencia letal, la callejera y la patrimonial denunciadas. No bajaron la violencia familiar, la violación ni las lesiones; el abuso sexual denunciado se duplicó. El homicidio bajó parejo en las cuatro regiones, pero la baja del robo es metropolitana.',
      tiles: [
        { value: '9 · 4 · 3', label: 'de 16 delitos: bajan · sin tendencia clara · suben' },
        { value: sgn(F.p6.find((d) => d.k === 'Abuso sexual').t[0]), label: 'al año: abuso sexual denunciado, 2019–2025' },
        { value: sgn((F.p12.rr.victimas[0] - 1) * 100, 0), label: 'víctimas de homicidio doloso en 2025', note: 'Falta la prueba de INEGI' },
        { value: `+${num((F.p6.find((d) => d.k === 'Robo de vehículo').r26[0] - 1) * 100, 0)}%`, label: 'robo de vehículo en enero–agosto 2026', note: 'La serie más confiable (21% de cifra negra)' },
      ],
      body: `${mapDefs()}
<section class="sec"><h2>16 delitos: qué bajó y qué no</h2><p>Se comparan tasas por 100 mil habitantes, con las categorías que el SESNSP declara comparables entre su metodología anterior y el registro de 2026.</p>${figForest}${figSparks}</section>
<section class="sec" id="caida-2025"><h2>La caída del homicidio en 2025 es real en los registros, pero más grande que otras señales de violencia</h2><p>No es un hueco del archivo ni un traspaso a homicidio culposo: aparece en carpetas y en víctimas, en los 12 meses, y sigue en 2026. Cinco municipios explican ${num(F.p12.cinco * 100, 0)}% de la caída (Tlajomulco, Guadalajara, Tlaquepaque, Encarnación de Díaz y Zapopan), y en ${F.p12.subieron} municipios el homicidio subió.</p>${figMes}${fig23}${figArma}${figDes}
<div class="callout"><p><b>Tres explicaciones que estos datos no distinguen:</b> una baja real de los asesinatos; un cambio en la letalidad de los ataques; o parte de la violencia letal registrada como desaparición. Hasta que INEGI publique las defunciones de 2025, se puede afirmar una baja del <i>homicidio registrado</i>, no necesariamente de la violencia letal.</p></div></section>
<section class="sec"><h2>El homicidio bajó en todo el estado; el robo, solo en el área metropolitana</h2><p>Fuera del área metropolitana, el robo con violencia y el de vehículo no bajaron, y el resto del estado es la única región donde la violencia familiar sube con significancia. La frase "bajó la violencia patrimonial" describe sobre todo a Guadalajara y su zona conurbada, donde ocurrió 92% del robo con violencia.</p>${figReg}${figMun}</section>
<section class="sec"><h2>Lo que la estadística ya no dice</h2>${figOtros}</section>`,
      reading: [
        `<b>Son denuncias, no delitos ocurridos.</b> Con 92% de cifra negra, una baja puede ser menos denuncia. El robo de vehículo, con 21% de cifra negra porque el seguro exige denunciar, es la tendencia más confiable (${cav(1)}).`,
        `<b>Metodología 2026 del SESNSP.</b> Solo se comparan categorías comparables; tres cifras que parecían noticia eran artefactos: extorsión −100%, violación +109% y la caída del abuso sexual en 2026 (${cav(2)}).`,
        `<b>2025 es "homicidio registrado".</b> La prueba independiente son las defunciones del INEGI de 2025, aún no publicadas (${cav(13)}).`,
        `<b>Tendencias municipales.</b> Las tendencias crudas de municipios chicos son ruido; aquí solo se usa el modelo jerárquico (${cav(18)}).`,
        `<b>Rupturas de registro.</b> En los tipos menores, una baja o una subida puede ser un cambio de etiqueta (${cav(19)}).`],
    });
  }));
}

// ============================================================ 4. Víctimas
export function victimas() {
  return respond(once('c4', () => {
    const p11 = F.p11;
    const SEXUAL = new Set(['Violación', 'Violación a la intimidad sexual', 'Abuso sexual', 'Violencia familiar', 'Acoso sexual', 'Otros delitos que atentan contra la libertad y la seguridad sexual']);
    // Labeled points; anchor follows position (left of the dot past the middle). Values: [anchor or null, dx, dy].
    const SHOW = { 'Abuso sexual': [null, 0, 0], 'Violencia familiar': [null, 0, 2], 'Violación': [null, 0, -15], 'Homicidio': [null, 0, 0], 'Robo': [null, 0, 0], 'Narcomenudeo': [null, 0, 0],
      'Retención o sustracción de menores e incapaces': [null, 0, 0], 'Incumplimiento de obligaciones de asistencia familiar': [null, 0, 0], 'Acoso sexual': [null, 0, 0], 'Lesiones': [null, 0, 0], 'Fraude': ['r', 0, 10] };
    const SHORT = { 'Retención o sustracción de menores e incapaces': 'Sustracción de menores', 'Incumplimiento de obligaciones de asistencia familiar': 'Pensión alimenticia' };
    const figSc = figure({ id: 'sobre-quien', cls: 'wide', title: 'Sobre quién recae cada delito',
      sub: `Víctimas de delitos denunciados en enero–agosto de 2026 (${num(p11.total)}): porcentaje de mujeres y de menores de edad entre las víctimas con sexo o edad registrados.`,
      legend: legend([{ label: 'Delitos sexuales y violencia familiar', color: '--women', shape: 'dot' }, { label: 'Otros delitos', color: '--flat', shape: 'dot' }]),
      body: scatter({ height: 380, xLabel: 'Porcentaje de mujeres entre las víctimas', yLabel: 'Porcentaje de menores de edad',
        points: p11.perfil.map((d) => ({ x: d.muj[0], y: d.men[0], color: SEXUAL.has(d.k) ? '--women' : '--flat', show: !!SHOW[d.k], anchor: SHOW[d.k]?.[0] || undefined, dx: SHOW[d.k]?.[1], dy: SHOW[d.k]?.[2], label: SHORT[d.k] || d.k,
          tip: `${d.k}\n${num(d.muj[0], 0)}% mujeres · ${num(d.men[0], 0)}% menores\n${num(d.n)} víctimas` })) }),
      note: `La violencia sexual contra menores se registra como "abuso sexual"; "violación" describe casi solo a mujeres adultas, y "violación equiparada" registra 0 víctimas. ${num(p11.calidad.sin_edad * 100, 0)}% de las víctimas no tiene edad registrada y ${num(p11.calidad.sin_sexo * 100, 0)}% no tiene sexo.`,
      source: src('SESNSP, víctimas por delito, sexo y edad, municipal, enero–agosto 2026', 11),
      table: table(['Delito', 'Víctimas', '% mujeres', 'IC95', '% menores', 'IC95'], p11.perfil.map((d) => [esc(d.k), num(d.n), pc(d.muj[0]), range(d.muj[1], d.muj[2]), pc(d.men[0]), range(d.men[1], d.men[2])]), [1, 2, 3, 4, 5]) });

    const grp = (k) => { const g = p11.grupos[k]; const tk = niceTicks(0, Math.max(...g.map((x) => x.v[2])), 2);
      return `<div><h4 style="margin:6px 0 6px;font-size:.95rem">${esc(k)}</h4>${rows({ compact: true, min: 0, max: tk.at(-1), ticks: tk, fmt: (v) => num(v), valW: '3.6rem',
        rows: ['Mujer', 'Hombre'].flatMap((s) => g.filter((x) => x.s === s).map((x, i) => ({ label: `${s === 'Mujer' ? 'Mujeres' : 'Hombres'} ${age(x.e)}`, group: i === 0 && s === 'Hombre', v: x.v[0], lo: x.v[1], hi: x.v[2], bar: true,
          color: s === 'Mujer' ? '--women' : '--men', val: num(x.v[0], x.v[0] < 10 ? 1 : 0), tip: `${k} · ${s === 'Mujer' ? 'mujeres' : 'hombres'} ${age(x.e)} años\n${num(x.v[0], 1)} por 100 mil\nIC95 ${range(x.v[1], x.v[2])} · ${num(x.n)} víctimas` }))) })}</div>`; };
    const figG = figure({ id: 'grupos', cls: 'wide', title: 'Víctimas por cada 100 mil personas de cada grupo, enero–agosto 2026',
      sub: 'Cada panel tiene su propia escala. Las mujeres de 13 a 17 años concentran el abuso sexual; las de 18 a 29, la violencia familiar; los hombres jóvenes y adultos, el robo con violencia y el homicidio.',
      legend: legend([{ label: 'Mujeres', color: '--women' }, { label: 'Hombres', color: '--men' }]),
      body: `<div class="two">${['Abuso sexual', 'Violencia familiar', 'Robo con violencia', 'Homicidio doloso'].map(grp).join('')}</div>`,
      note: 'La tasa de abuso sexual de mujeres de 13 a 17 años es 28 veces la de mujeres de 18 a 29 y 22 veces la de adolescentes hombres. En violencia familiar, entre los hombres la tasa más alta es la de mayores de 60: violencia contra personas mayores.',
      source: src('SESNSP, víctimas por sexo y edad; CONAPO 2026', 11),
      table: table(['Delito', 'Grupo', 'Tasa por 100 mil (8 meses)', 'IC95', 'Víctimas'], Object.entries(p11.grupos).flatMap(([k, g]) => g.map((x) => [k, `${x.s} ${age(x.e)}`, num(x.v[0], 1), range(x.v[1], x.v[2]), num(x.n)])), [2, 3, 4]) });

    const vcm = Object.fromEntries(p11.vcm.altos.map((m) => [m.cv, m]));
    const figMap = figure({ id: 'mapa-violencia-mujeres', cls: 'wide', title: `${p11.vcm.altos.length} municipios con violencia familiar o sexual contra mujeres creíblemente por encima del estado`,
      sub: `Mujeres víctimas de violencia familiar o sexual por cada 100 mil mujeres, enero–agosto 2026. Estado: ${num(p11.vcm.tasa)}.`,
      legend: legend([{ label: 'Creíblemente superior a la tasa estatal', color: '--women' }, { label: 'Indistinguible o inferior', color: '--mid' }]),
      body: map({ label: 'Mapa de violencia familiar y sexual contra mujeres', fill: (c) => vcm[c] ? { k: 'vcm', tip: `${mun(c)}\n${num(vcm[c].eb, 0)} por 100 mil mujeres\nIC95 ${range(vcm[c].ic[0], vcm[c].ic[1], 0)} · ${num(vcm[c].n)} víctimas` } : { tip: `${mun(c)}\nNo es creíblemente superior a la tasa estatal` } }),
      note: 'Trece de los 16 están fuera del área metropolitana. Son víctimas denunciadas: un municipio con más denuncias puede tener más violencia o más acceso a denunciar.',
      source: src('SESNSP, víctimas municipales 2026; CONAPO; suavizado bayesiano empírico', 11),
      table: table(['Municipio', 'Tasa por 100 mil mujeres', 'IC95', 'Víctimas'], p11.vcm.altos.map((m) => [ml(m.cv), num(m.eb, 0), range(m.ic[0], m.ic[1], 0), num(m.n)]), [1, 2, 3]) });

    const p15 = F.p15;
    const figLugar = figure({ id: 'donde-matan', title: 'Una de cada cuatro mujeres asesinadas murió en una vivienda, el doble que los hombres',
      sub: `Dónde ocurrió la agresión, entre homicidios con lugar conocido, 2019–2023. En ${num(p15.ignora, 1)}% de los homicidios el lugar se ignora.`,
      legend: legend([{ label: 'Mujeres', color: '--women', shape: 'dot' }, { label: 'Hombres', color: '--men', shape: 'dot' }]),
      body: rows({ min: 0, max: 70, ticks: [0, 10, 20, 30, 40, 50, 60, 70], fmt: (v) => `${v}%`, valW: '7rem',
        rows: p15.lugares.map((l) => ({ label: l.k, val: `${pc(l.m, 0)} · ${pc(l.h, 0)}`, marks: [{ v: l.h, color: '--men', tip: `${l.k} · hombres\n${pc(l.h)}\n${num(l.nh)} homicidios` }, { v: l.m, color: '--women', tip: `${l.k} · mujeres\n${pc(l.m)}\n${num(l.nm)} homicidios` }] })) }),
      source: src('INEGI, defunciones por homicidio, ocurridas 2019–2023', 15),
      table: table(['Lugar', 'Mujeres', 'Hombres'], p15.lugares.map((l) => [l.k, `${pc(l.m)} (${num(l.nm)})`, `${pc(l.h)} (${num(l.nh)})`]), [1, 2]) });
    const figFem = figure({ id: 'feminicidio', title: `${num(p15.fem.p[0], 0)}% de los asesinatos de mujeres se clasifica como feminicidio`,
      sub: 'Mujeres víctimas de homicidio doloso y de feminicidio registradas por el SESNSP, 2019–2023.',
      legend: legend([{ label: 'Feminicidio', color: '--women' }, { label: 'Homicidio doloso', color: '--axis' }]),
      body: stack([{ label: `Mujeres asesinadas (${num(p15.fem.n + p15.fem.dol)})`, parts: [{ v: p15.fem.n, color: '--women', label: 'Feminicidio', extra: `${num(p15.fem.n)} víctimas` }, { v: p15.fem.dol, color: '--axis', text: '--ink', label: 'Homicidio doloso', extra: `${num(p15.fem.dol)} víctimas` }] }]),
      note: `El SESNSP registra más víctimas de feminicidio (${num(p15.vivVsFem.victimas_feminicidio_sesnsp)}) que mujeres asesinadas en una vivienda según el INEGI (${num(p15.vivVsFem.mujeres_asesinadas_en_vivienda_inegi)}): el feminicidio en Jalisco no es solo el asesinato en casa. El certificado casi nunca dice quién las mató: el parentesco no está registrado en ${num(p15.parentesco.no_registrado)} de ${num(p15.vivVsFem.mujeres_asesinadas_en_vivienda_inegi)} casos.`,
      source: src('SESNSP, víctimas estatales; INEGI, defunciones', 15) });

    const a = F.p20.a, b = F.p20.b;
    const regRow = (r, sel, d = 1, fmtv = (v) => num(v, d)) => { const x = a[r], y = b[r];
      return { label: RG[r], sub: y.chico || x.chico ? 'conteo chico' : '', lo: sel(y)[1], hi: sel(y)[2], color: RGC[r], val: `${fmtv(sel(x)[0])} → ${fmtv(sel(y)[0])}`,
        marks: [{ v: sel(x)[0], color: RGC[r], shape: 'ring', tip: `${RG[r]} · 2015–2018\n${fmtv(sel(x)[0])}\nIC95 ${range(sel(x)[1], sel(x)[2], d)}` }, { v: sel(y)[0], color: RGC[r], tip: `${RG[r]} · 2019–2023\n${fmtv(sel(y)[0])}\nIC95 ${range(sel(y)[1], sel(y)[2], d)}` }] }; };
    const figAltos = figure({ id: 'altos-norte', cls: 'wide', title: 'En Altos Norte, los asesinatos de mujeres se triplicaron y las carpetas de feminicidio no',
      sub: 'Círculo: 2015–2018. Punto: 2019–2023, con su intervalo al 95%.',
      legend: legend([{ label: '2015–2018', color: '--ink-2', shape: 'ring' }, { label: '2019–2023', color: '--ink-2', shape: 'dot' }]),
      body: `<div class="two"><div><h4 style="margin:6px 0;font-size:.95rem">Mujeres asesinadas por 100 mil mujeres al año (INEGI)</h4>${rows({ compact: true, min: 0, max: 13, ticks: [0, 4, 8, 12], fmt: (v) => num(v), valW: '6rem', rows: REGIONS.map((r) => regRow(r, (x) => x.tasa)) })}</div>
<div><h4 style="margin:6px 0;font-size:.95rem">Carpetas de feminicidio por mujer asesinada</h4>${rows({ compact: true, min: 0, max: 1.1, ticks: [0, 0.5, 1], fmt: (v) => num(v, 1), valW: '6rem', rows: REGIONS.map((r) => regRow(r, (x) => x.razon, 2)) })}</div></div>`,
      note: `Altos Norte pasó de ${num(a.an.tasa[0], 1)} a ${num(b.an.tasa[0], 1)} mujeres asesinadas por 100 mil al año, casi el doble que el área metropolitana, mientras sus carpetas de feminicidio se quedaron en ${b.an.car}: ${b.an.car} carpetas frente a ${b.an.muj} mujeres asesinadas en cinco años. Con menos de 10 carpetas por región, un solo cambio de clasificación mueve mucho la medida; por eso los Altos no se interpretan por separado y la diferencia entre periodos no es significativa.`,
      source: src('SESNSP, carpetas de feminicidio por municipio; INEGI, mujeres víctimas de homicidio por municipio de ocurrencia', 18, 20),
      table: table(['Región', 'Periodo', 'Carpetas de feminicidio', 'Mujeres asesinadas', 'Carpetas por mujer', 'Tasa por 100 mil'], REGIONS.flatMap((r) => [[RG[r], '2015–2018', a[r]], [RG[r], '2019–2023', b[r]]].map(([n, p, x]) => [n, p, num(x.car), num(x.muj), num(x.razon[0], 2), num(x.tasa[0], 1)])), [2, 3, 4, 5]) });
    const s = F.p20.serie;
    const figSerie = figure({ id: 'feminicidio-serie', title: 'Carpetas de feminicidio por mujer asesinada en Jalisco, 2015–2023',
      sub: 'Banda: intervalo al 95%. Exploratorio: incluye años ya analizados.',
      body: line({ x: s.map((x) => String(x.y)), height: 200, fmt: (v) => num(v, 1), tipFmt: (v) => num(v, 2), min: 0, max: 0.6, ticks: [0, 0.2, 0.4, 0.6],
        series: [{ label: 'Carpetas por mujer asesinada', color: '--women', vals: s.map((x) => x.v[0]), band: s.map((x) => [x.v[1], x.v[2]]) }] }),
      note: 'En 2018, cuando los asesinatos de mujeres casi se duplicaron (de 147 a 264), las carpetas de feminicidio apenas subieron (de 27 a 34).',
      source: src('SESNSP; INEGI', 20),
      table: table(['Año', 'Carpetas', 'Mujeres asesinadas', 'Razón', 'IC95'], s.map((x) => [x.y, num(x.car), num(x.muj), num(x.v[0], 2), range(x.v[1], x.v[2], 2)]), [1, 2, 3, 4]) });

    const as = p11.grupos['Abuso sexual'].find((g) => g.s === 'Mujer' && g.e.startsWith('13'));
    return chapter(3, {
      title: 'La violencia familiar y la sexual recaen sobre mujeres, niñas y adolescentes',
      description: 'En Jalisco, 9 de cada 10 víctimas de violencia familiar son mujeres y 9 de cada 10 víctimas de abuso sexual son menores de edad.',
      lede: 'En 2026, por primera vez el SESNSP publica el sexo y la edad de las víctimas por municipio. Nueve de cada diez víctimas de violencia familiar son mujeres; nueve de cada diez víctimas de abuso sexual son menores de edad, sobre todo adolescentes mujeres. Las mujeres asesinadas mueren en su casa el doble que los hombres, y solo una de cada cuatro se registra como feminicidio.',
      tiles: [
        { value: `${num(p11.perfil.find((d) => d.k === 'Violencia familiar').muj[0], 0)}%`, label: 'de las víctimas de violencia familiar son mujeres' },
        { value: `${num(p11.perfil.find((d) => d.k === 'Abuso sexual').men[0], 0)}%`, label: 'de las víctimas de abuso sexual son menores de edad' },
        { value: num(as.v[0], 0), label: 'víctimas de abuso sexual por 100 mil mujeres de 13 a 17 años', note: 'Enero–agosto 2026' },
        { value: `${num(p15.fem.p[0], 0)}%`, label: 'de los asesinatos de mujeres se registra como feminicidio', note: '2019–2023' },
      ],
      body: `${mapDefs()}
<section class="sec"><h2>Cada delito tiene sus víctimas</h2><p>Arriba a la derecha quedan los delitos que recaen sobre mujeres y menores; abajo a la izquierda, los que recaen sobre hombres adultos.</p>${figSc}${figG}</section>
<section class="sec"><h2>Dónde pesa más la violencia contra las mujeres</h2>${figMap}</section>
<section class="sec"><h2>Dónde matan, y cómo se registra</h2>${figLugar}${figFem}</section>
<section class="sec"><h2>El caso de Altos Norte</h2><p>Entre el área metropolitana y el resto del estado no hay diferencia significativa: en ambos se abre alrededor de una carpeta de feminicidio por cada tres o cuatro mujeres asesinadas. La diferencia viene de los Altos. En 2015–2018 Altos Norte abría una carpeta por cada cuatro o cinco mujeres asesinadas, como el resto del estado; la brecha aparece con la subida de los asesinatos.</p>${figAltos}${figSerie}</section>`,
      reading: [
        `<b>Son víctimas denunciadas.</b> La violencia sexual contra menores probablemente se detecta más que la de mujeres adultas, así que su proporción puede estar sobrerrepresentada (${cav(9)}).`,
        '<b>No hay serie por edad antes de 2026</b> para saber si la duplicación del abuso sexual viene de menores.',
        `<b>El lugar del homicidio se ignora en casi un tercio de los casos</b>, y el parentesco con el agresor casi nunca se registra: la violencia de pareja letal no se puede medir con estos datos (${cav(14)}).`,
        `<b>Feminicidio por región compara carpetas con certificados</b>, dos unidades distintas que no se cruzan caso por caso (${cav(17)}).`],
    });
  }));
}

// ============================================================ 5. Cifra negra
export function cifraNegra() {
  return respond(once('c5', () => {
    const p9 = F.p9.e26, p13 = F.p13, p16 = F.p16, p22 = F.p22;
    const figWaf = figure({ id: 'cifra-negra', title: `De cada 100 delitos, ${num(100 - p9.jal[0], 0)} llegan a una carpeta de investigación`,
      sub: `Delitos ocurridos en Jalisco en 2025 según la encuesta de victimización del INEGI: ${num(p9.est / 1e6, 2)} millones estimados.`,
      body: `<div class="two" style="align-items:center">${waffle(100 - p9.jal[0], { color: '--c1', label: `${num(100 - p9.jal[0], 0)} de cada 100 delitos llegan a una carpeta` })}<div>${legend([{ label: 'Llega a una carpeta', color: '--c1' }, { label: 'No se denuncia, o se denuncia sin carpeta', color: '--wo' }])}
<p>Cifra negra en Jalisco: <b>${pc(p9.jal[0])}</b> (IC95 ${range(p9.jal[1], p9.jal[2])}). En el país: ${pc(p9.nac[0])}.</p><p class="fig-note">Cruce de magnitud: ${num(p9.est / 1e6, 2)} millones × ${num(100 - p9.jal[0], 1)}% ≈ ${num(p9.est * (100 - p9.jal[0]) / 100 / 1000, 0)} mil, contra 114 mil carpetas del SESNSP en 2025.</p></div></div>`,
      source: src('INEGI, ENVIPE 2026 (delitos de 2025), sin vandalismo como en la cifra oficial; el método reproduce el 93.4% nacional publicado', 9) });
    const pd = [...p9.porDelito].sort((x, y) => y.v[0] - x.v[0]);
    const figTipo = figure({ id: 'por-delito', title: 'La violencia sexual es la que menos se denuncia; el robo de vehículo, la que más',
      sub: 'Cifra negra por tipo de delito, Jalisco 2025, con intervalo al 95%. Solo delitos con al menos 30 casos en la muestra.',
      body: rows({ min: 0, max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v) => `${v}%`,
        rows: pd.map((d) => ({ label: d.k, sub: `${d.n} casos en muestra`, v: d.v[0], lo: d.v[1], hi: d.v[2], color: d.k.startsWith('Robo total') ? '--c1' : '--flat', strong: d.k.startsWith('Robo total'), val: pc(d.v[0]),
          tip: `${d.k}\n${pc(d.v[0])} no llega a carpeta\nIC95 ${range(d.v[1], d.v[2])} · ${d.n} casos` })) }),
      note: 'El robo de vehículo es la excepción porque el seguro exige denuncia. Por eso su tendencia en el SESNSP es confiable; la de fraude o amenazas refleja apenas 1 a 5% de lo que ocurre.',
      source: src('INEGI, ENVIPE 2026', 9),
      table: table(['Delito', 'Casos en muestra', 'Cifra negra', 'IC95'], pd.map((d) => [esc(d.k), num(d.n), pc(d.v[0]), range(d.v[1], d.v[2])]), [1, 2, 3]) });

    const figRaz = figure({ id: 'por-que-no', title: 'Dos de cada tres delitos no se denuncian por algo que depende de la autoridad',
      sub: 'Razón principal para no denunciar, delitos no denunciados en Jalisco en 2025. La marca gris es el promedio nacional.',
      legend: legend([{ label: 'Atribuible a la autoridad (agrupación del INEGI)', color: '--c1' }, { label: 'Otra razón', color: '--flat' }, { label: 'Nacional', color: '--ink-3', shape: 'tick' }]),
      body: rows({ min: 0, max: 50, ticks: [0, 10, 20, 30, 40, 50], fmt: (v) => `${v}%`,
        rows: p13.razones.map((r) => ({ label: r.k.replace('Por miedo al (a la) agresor(a)', 'Miedo al agresor').replace('Por miedo a que lo (la) extorsionaran', 'Miedo a ser extorsionado').replace('Por actitud hostil de la autoridad', 'Actitud hostil de la autoridad'), v: r.jal[0], lo: r.jal[1], hi: r.jal[2], bar: true, color: r.auth ? '--c1' : '--flat', ref: r.nac[0], val: pc(r.jal[0]),
          tip: `${r.k}\n${pc(r.jal[0])} en Jalisco\nIC95 ${range(r.jal[1], r.jal[2])} · nacional ${pc(r.nac[0])}` })), refLabel: 'Nacional' }),
      note: `Causas atribuibles a la autoridad: ${pc(p13.atrib.jal[0])} (IC95 ${range(p13.atrib.jal[1], p13.atrib.jal[2])}); en el país, ${pc(p13.atrib.nac[0])}. En la edición anterior Jalisco quedó por debajo del país (${pc(p13.atrib25[0])}), así que lo sostenible es que Jalisco está en torno al promedio nacional. "Pérdida de tiempo" es la primera razón en todos los tipos de delito que se pueden medir:`,
      source: src('INEGI, ENVIPE 2026', 13, 17),
      table: table(['Razón', 'Jalisco', 'IC95', 'Nacional'], p13.razones.map((r) => [r.k, pc(r.jal[0]), range(r.jal[1], r.jal[2]), pc(r.nac[0])]), [1, 2, 3]),
      after: '<h4 style="margin:20px 0 8px;font-size:.92rem">Causas atribuibles a la autoridad por tipo de delito, y peso de "pérdida de tiempo"</h4>' + rows({ compact: true, min: 0, max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v) => `${v}%`, valW: '9rem',
      rows: F.p17.map((t) => ({ label: t.k, v: t.auth[0], lo: t.auth[1], hi: t.auth[2], color: '--c1', val: `${pc(t.auth[0], 0)} · tiempo ${pc(t.tiempo[0], 0)}`, tip: `${t.k}\n${pc(t.auth[0])} atribuible a la autoridad\n"Pérdida de tiempo": ${pc(t.tiempo[0])} · ${t.n} casos` })) }) });

    const conf = [...p13.confianza].sort((x, y) => y.jal[0] - x.jal[0]);
    const figConf = figure({ id: 'confianza', title: 'La policía municipal genera 30 a 35 puntos menos confianza que la Marina y el Ejército',
      sub: 'Adultos con mucha o algo de confianza, entre quienes identifican a la autoridad, Jalisco 2026. La marca gris es el promedio nacional.',
      legend: legend([{ label: 'Jalisco, con IC95', color: '--c1', shape: 'dot' }, { label: 'Nacional', color: '--ink-3', shape: 'tick' }]),
      body: rows({ min: 30, max: 100, ticks: [30, 40, 50, 60, 70, 80, 90, 100], fmt: (v) => `${v}%`,
        rows: conf.map((a) => ({ label: a.k, sub: `La identifica ${pc(a.ident[0], 0)}`, v: a.jal[0], lo: a.jal[1], hi: a.jal[2], ref: a.nac[0], color: '--c1', val: pc(a.jal[0]),
          tip: `${a.k}\n${pc(a.jal[0])} confía\nIC95 ${range(a.jal[1], a.jal[2])} · nacional ${pc(a.nac[0])}` })), refLabel: 'Nacional' }),
      note: 'La confianza en las autoridades de Jalisco no es menor que en el país: es igual o mayor en las civiles y apenas menor en las militares. Solo 30% de los adultos identifica al Ministerio Público y la fiscalía estatal, y 22% a la policía ministerial; su confianza se mide sobre esa minoría.',
      source: src('INEGI, ENVIPE 2026', 13),
      table: table(['Autoridad', 'Confía (Jalisco)', 'IC95', 'Nacional', 'Diferencia', 'La identifica'], conf.map((a) => [a.k, pc(a.jal[0]), range(a.jal[1], a.jal[2]), pc(a.nac[0]), sgn(a.dif[0], 1, ' pts'), pc(a.ident[0])]), [1, 2, 3, 4, 5]) });

    const figNiv = figure({ id: 'percepcion', title: 'La inseguridad se siente "en el estado", lejos de donde uno vive',
      sub: 'Adultos que se sienten inseguros, 2026.',
      legend: legend([{ label: 'Área metropolitana', color: '--amg', shape: 'dot' }, { label: 'Resto del estado', color: '--resto', shape: 'dot' }, { label: 'Nacional', color: '--ink-3', shape: 'tick' }]),
      body: rows({ min: 0, max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v) => `${v}%`, valW: '6.5rem',
        rows: p16.niveles.map((n) => ({ label: n.k, sub: `Jalisco ${pc(n.jal[0])}`, ref: n.nac[0], val: `${pc(n.amg[0], 0)} · ${pc(n.resto[0], 0)}`, marks: [
          { v: n.resto[0], color: '--resto', tip: `${n.k} · resto del estado\n${pc(n.resto[0])}\nIC95 ${range(n.resto[1], n.resto[2])}` },
          { v: n.amg[0], color: '--amg', tip: `${n.k} · área metropolitana\n${pc(n.amg[0])}\nIC95 ${range(n.amg[1], n.amg[2])}` }] })), refLabel: 'Nacional' }),
      note: `Ocho de cada diez adultos se sienten inseguros en su estado, cinco puntos más que en el país. En su municipio y su colonia no se distinguen del promedio nacional. La inseguridad cercana es metropolitana: en la colonia, ${pc(p16.niveles[2].amg[0], 0)} en el área metropolitana contra ${pc(p16.niveles[2].resto[0], 0)} en el resto del estado.`,
      source: src('INEGI, ENVIPE 2026 (levantada de febrero a abril de 2026); reproduce las cifras publicadas por INEGI', 16),
      table: table(['Se siente inseguro…', 'Jalisco', 'Área metropolitana', 'Resto del estado', 'Nacional'], p16.niveles.map((n) => [n.k, pc(n.jal[0]), pc(n.amg[0]), pc(n.resto[0]), pc(n.nac[0])]), [1, 2, 3, 4]) });

    const hom = F.p12.victimas;
    const idx = (a, b) => (b / a) * 100;
    const cambio = [
      { label: 'Víctimas de homicidio doloso (SESNSP)', sub: '2024 → 2025', a: hom['2024'], b: hom['2025'], d: 0, color: '--hom', txt: (v) => num(v) },
      ...[['estado', 'Se siente inseguro en el estado'], ['municipio', 'En su municipio'], ['colonia o localidad', 'En su colonia']].map(([k, l]) => ({ label: l, sub: 'ENVIPE 2025 → 2026', a: p16.cambio[k].a[0], b: p16.cambio[k].b[0], color: '--c2', txt: (v) => pc(v) })),
      { label: 'Dejó de hacer al menos una actividad por temor', sub: 'ENVIPE 2025 → 2026', a: p22.alMenosUna25[0], b: p22.alMenosUna.jalisco[0], color: '--c2', txt: (v) => pc(v) },
    ];
    const figSig = figure({ id: 'no-siguio', title: 'El homicidio registrado cayó un tercio; la sensación de inseguridad no se movió',
      sub: 'Cada medida con su primer valor = 100. Círculo: antes; punto: después.',
      legend: legend([{ label: 'Homicidio registrado', color: '--hom', shape: 'dot' }, { label: 'Percepción y adaptación (encuesta)', color: '--c2', shape: 'dot' }]),
      body: rows({ min: 50, max: 110, ticks: [50, 60, 70, 80, 90, 100, 110], zero: 100, fmt: (v) => num(v), valW: '8rem',
        rows: cambio.map((c) => ({ label: c.label, sub: c.sub, val: `${c.txt(c.a)} → ${c.txt(c.b)}`, marks: [
          { v: 100, color: c.color, shape: 'ring', tip: `${c.label}\n${c.txt(c.a)}\n${c.sub.split(' → ')[0]}` }, { v: idx(c.a, c.b), color: c.color, tip: `${c.label}\n${c.txt(c.b)} (${sgn(idx(c.a, c.b) - 100, 0)})\n${c.sub}` }] })) }),
      note: `Proporción que se siente insegura en el estado, 2026 contra 2025: razón ${num(p16.cambio.estado.rr[0], 2)} (IC95 ${range(p16.cambio.estado.rr[1], p16.cambio.estado.rr[2], 2)}): se descarta una baja de más de 2%. Lo que sí bajó es lo que la gente ve en su colonia: menos personas saben de homicidios, secuestros o disparos cerca de casa. La encuesta compara dos primaveras, no años calendario.`,
      source: src('SESNSP; INEGI, ENVIPE 2025 y 2026', 16, 22) });

    const lug = [...p16.lugares].sort((x, y) => y.jal[0] - x.jal[0]);
    const figLug = figure({ id: 'lugares', title: 'Dónde se sienten inseguros',
      sub: 'Adultos que se sienten inseguros en cada lugar, entre quienes el lugar les aplica. Jalisco 2026; la marca gris es el promedio nacional.',
      body: rows({ compact: true, min: 0, max: 80, ticks: [0, 20, 40, 60, 80], fmt: (v) => `${v}%`,
        rows: lug.map((l) => ({ label: l.k, v: l.jal[0], lo: l.jal[1], hi: l.jal[2], ref: l.nac[0], color: '--c1', val: pc(l.jal[0]), tip: `${l.k}\n${pc(l.jal[0])}\nIC95 ${range(l.jal[1], l.jal[2])} · nacional ${pc(l.nac[0])}` })), refLabel: 'Nacional' }),
      note: 'En 10 de los 12 lugares Jalisco queda por debajo del país. En las colonias de Jalisco se reporta más venta y consumo de droga que en el país, en las dos ediciones.',
      source: src('INEGI, ENVIPE 2026', 16),
      table: table(['Lugar', 'Jalisco', 'IC95', 'Nacional'], lug.map((l) => [l.k, pc(l.jal[0]), range(l.jal[1], l.jal[2]), pc(l.nac[0])]), [1, 2, 3]) });

    const act = [...p22.actividades].sort((x, y) => y.jal[0] - x.jal[0]);
    const figAct = figure({ id: 'que-deja-de-hacer', title: 'Siete de cada diez adultos dejaron de hacer algo por miedo',
      sub: 'Dejó de hacer cada actividad por temor a ser víctima, entre quienes la actividad les aplica. Jalisco 2026; la marca gris es el promedio nacional.',
      body: rows({ compact: true, min: 0, max: 60, ticks: [0, 20, 40, 60], fmt: (v) => `${v}%`,
        rows: act.map((a) => ({ label: a.k, v: a.jal[0], lo: a.jal[1], hi: a.jal[2], bar: true, ref: a.nac[0], color: '--c1', val: pc(a.jal[0]), tip: `${a.k}\n${pc(a.jal[0])}\nIC95 ${range(a.jal[1], a.jal[2])} · nacional ${pc(a.nac[0])}` })), refLabel: 'Nacional' }) +
        `<h4 style="margin:24px 0 8px;font-size:.92rem">Quién deja de hacer cosas</h4>${rows({ min: 0, max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v) => `${v}%`, valW: '6.5rem', rows: [
          { label: 'Dejó de salir de noche', sub: 'Mujeres · hombres', val: `${pc(p22.noche.m[0], 0)} · ${pc(p22.noche.h[0], 0)}`, marks: [{ v: p22.noche.h[0], color: '--men', tip: `Salir de noche · hombres\n${pc(p22.noche.h[0])}` }, { v: p22.noche.m[0], color: '--women', tip: `Salir de noche · mujeres\n${pc(p22.noche.m[0])}` }] },
          { label: 'Dejó de hacer al menos una actividad', sub: 'Área metropolitana · resto', val: `${pc(p22.alMenosUna.amg[0], 0)} · ${pc(p22.alMenosUna.resto_del_estado[0], 0)}`, marks: [{ v: p22.alMenosUna.resto_del_estado[0], color: '--resto', tip: `Resto del estado\n${pc(p22.alMenosUna.resto_del_estado[0])}` }, { v: p22.alMenosUna.amg[0], color: '--amg', tip: `Área metropolitana\n${pc(p22.alMenosUna.amg[0])}` }] },
          { label: 'Tomó alguna medida de protección', sub: 'Área metropolitana · resto', val: `${pc(p22.medida.amg[0], 0)} · ${pc(p22.medida.resto_del_estado[0], 0)}`, marks: [{ v: p22.medida.resto_del_estado[0], color: '--resto', tip: `Resto del estado\n${pc(p22.medida.resto_del_estado[0])}` }, { v: p22.medida.amg[0], color: '--amg', tip: `Área metropolitana\n${pc(p22.medida.amg[0])}` }] },
        ] })}${legend([{ label: 'Mujeres', color: '--women', shape: 'dot' }, { label: 'Hombres', color: '--men', shape: 'dot' }, { label: 'Área metropolitana', color: '--amg', shape: 'dot' }, { label: 'Resto del estado', color: '--resto', shape: 'dot' }])}`,
      note: `Dejar de hacer cosas no cuesta; protegerse, sí: ${pc(p22.medida.jalisco[0], 0)} tomó alguna medida, ${num(p22.alMenosUna.jalisco[0] - p22.medida.jalisco[0], 0)} puntos menos que quienes dejaron de hacer algo. Las medidas son sobre todo reforzar cerraduras, puertas y ventanas; comprar armas es raro (0.4%).`,
      source: src('INEGI, ENVIPE 2026; reproduce el cuadro 5.32 publicado por INEGI (64 de 64 cifras)', 22),
      table: table(['Actividad', 'Jalisco', 'IC95', 'Área metropolitana', 'Resto', 'Nacional'], act.map((a) => [a.k, pc(a.jal[0]), range(a.jal[1], a.jal[2]), pc(a.amg[0]), pc(a.resto[0]), pc(a.nac[0])]), [1, 2, 3, 4, 5]) });

    return chapter(4, {
      title: 'Casi nada llega a las cifras, y el miedo no bajó con el homicidio',
      description: 'En Jalisco, 92 de cada 100 delitos no llegan a una carpeta de investigación; la percepción de inseguridad no cambió cuando cayó el homicidio registrado.',
      lede: 'Todo lo anterior son registros: denuncias, certificados, fichas. La encuesta de victimización del INEGI muestra lo que queda fuera. Alrededor de 92 de cada 100 delitos no llegan a una carpeta, sobre todo porque denunciar se ve como una pérdida de tiempo. Y la vida cotidiana no cambió cuando cayó el homicidio registrado.',
      tiles: [
        { value: pc(p9.jal[0]), label: 'de los delitos de 2025 no llegó a una carpeta' },
        { value: pc(p13.atrib.jal[0], 0), label: 'no se denunció por causas atribuibles a la autoridad' },
        { value: pc(p16.niveles[0].jal[0], 0), label: 'se siente inseguro en el estado', note: `País: ${pc(p16.niveles[0].nac[0], 0)}` },
        { value: pc(p22.alMenosUna.jalisco[0], 0), label: 'dejó de hacer al menos una actividad por temor' },
      ],
      body: `<section class="sec"><h2>La cifra negra</h2>${figWaf}${figTipo}</section>
<section class="sec"><h2>Por qué no se denuncia</h2><p>No es sobre todo miedo al agresor (6%) ni que el delito parezca menor (11%).</p>${figRaz}${figConf}</section>
<section class="sec"><h2>Cómo se vive</h2>${figNiv}${figSig}${figLug}${figAct}</section>`,
      reading: [
        '<b>Es una encuesta.</b> Cada cifra es una estimación con su intervalo; donde el INEGI publica la misma cifra, el cálculo la reproduce exactamente (cifra negra nacional, percepción y actividades cotidianas).',
        `<b>"Resto del estado" no es un dominio planeado de la encuesta</b>, que es representativa por entidad y por el área metropolitana de Guadalajara; sus intervalos son más anchos (${cav(16)}).`,
        `<b>La confianza se pregunta sobre autoridades que la mayoría no identifica</b> y según la entidad de residencia (${cav(15)}).`,
        '<b>Los delitos sexuales y las amenazas no se pueden medir por separado en Jalisco</b>: la muestra no alcanza. Para ellos solo hay cifra nacional.'],
    });
  }));
}
