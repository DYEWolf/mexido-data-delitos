#!/usr/bin/env node
// Builds src/worker/generated/findings.mjs from analysis/output/p*.json (public aggregates) and ANALISIS.md.
// The site renders these numbers; it never recomputes statistics. Only selection, joins and unit conversion happen here.
// Stops on any unresolved municipality name or missing field, like the analysis loaders do.
//   node scripts/build-findings.cjs
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'analysis/output');
const TARGET = path.join(ROOT, 'src/worker/generated/findings.mjs');

// Python's json writes NaN/Infinity, which are not JSON.
const load = (p) => JSON.parse(fs.readFileSync(path.join(OUT, `${p}.json`), 'utf8').replace(/\b(-?Infinity|NaN)\b/g, 'null'));
const P = Object.fromEntries([1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((n) => [n, load(`p${n}`)]));
const fail = (msg) => { console.error(`build-findings: ${msg}`); process.exit(1); };
const need = (v, what) => (v === undefined || v === null ? fail(`missing ${what}`) : v);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const pct = (t) => t.map((x) => r1(x * 100)); // [est, lo, hi] proportion -> percent

// Regions: short codes used across the site.
const REGION = { 'Área metropolitana de Guadalajara': 'amg', 'Altos Norte': 'an', 'Altos Sur': 'as', 'Resto del estado': 'resto' };
const reg = (name) => REGION[name] || fail(`unknown region ${name}`);

// Municipality catalog: p19 carries all 125 with INEGI keys.
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const catalog = need(P[19].delitos['Homicidio doloso'].municipios, 'p19 municipios');
if (catalog.length !== 125) fail(`p19 has ${catalog.length} municipalities`);
const byName = new Map(catalog.map((m) => [norm(m.municipio), m.cvegeo]));
const cv = (name) => byName.get(norm(name)) || fail(`municipality not in catalog: ${name}`);

// Geometry: centroid of the largest ring per municipality, and the AMG bounding box for the inset.
async function geometry() {
  const { MAP } = await import(path.join(ROOT, 'src/worker/generated/map.mjs'));
  const cent = {};
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [code, d] of Object.entries(MAP.paths)) {
    let best = null;
    for (const ring of d.split('Z').map((s) => s.trim()).filter(Boolean)) {
      const pts = ring.replace(/^M/, '').split('L').map((p) => p.split(',').map(Number));
      let a = 0, x = 0, y = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        const c = x0 * y1 - x1 * y0; a += c; x += (x0 + x1) * c; y += (y0 + y1) * c;
      }
      if (!best || Math.abs(a) > Math.abs(best.a)) best = { a, x: x / (3 * a), y: y / (3 * a), pts };
    }
    cent[code] = [r1(best.x), r1(best.y)];
    if (catalog.find((m) => m.cvegeo === code)?.region === 'Área metropolitana de Guadalajara') {
      for (const ring of d.split('Z').filter((s) => s.trim())) for (const p of ring.replace(/^\s*M/, '').split('L')) {
        const [px, py] = p.split(',').map(Number);
        box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py); box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], py);
      }
    }
  }
  const pad = 8;
  return { cent, amgBox: [r1(box[0] - pad), r1(box[1] - pad), r1(box[2] - box[0] + 2 * pad), r1(box[3] - box[1] + 2 * pad)] };
}

function build(geo) {
  const F = { built: new Date().toISOString().slice(0, 10) };
  F.mun = Object.fromEntries(catalog.map((m) => [m.cvegeo, { n: m.municipio, r: reg(m.region), pob: m.pob_2025, c: geo.cent[m.cvegeo] }]));
  F.amgBox = geo.amgBox;

  // P1: homicide x disappearance classification (main window 2015-2025) + regional ratios in three windows/sources.
  const w = P[1].resultados['2015-2025'];
  const twelve = P[7].robustez_pieza1_con_inegi.de_los_12_se_mantienen;
  const robust = new Set(P[23].H23c_violencia_oculta_inegi_2015_2018.de_los_12_se_mantienen.map(cv));
  if (twelve.length !== 12 || w.cuadricula_homicidio_x_desaparicion.bajo.alto !== 12) fail('p1 hidden-violence cell is not 12');
  const oculta = new Map(w.violencia_oculta.map((m) => [cv(m.municipio), m]));
  const cls = {};
  const list12 = twelve.map((name) => {
    const c = cv(name); const m = oculta.get(c) || fail(`p1: ${name} not in violencia_oculta`);
    cls[c] = robust.has(c) ? 'oculta' : 'oculta_p';
    return { cv: c, des: m.desaparecidas, hom: m.homicidios, razon: m.razon_rel, ic: m.razon_ic95, robust: robust.has(c) };
  }).sort((a, b) => b.razon - a.razon);
  for (const m of w.alto_en_ambos) cls[cv(m.municipio)] = 'ambos';
  for (const m of w.solo_homicidio_alto) cls[cv(m.municipio)] = 'hom';
  const regionRows = (arr) => Object.fromEntries(arr.map((x) => [reg(x.region), [x.razon_rel, ...(x.ic95)]]));
  F.p1 = {
    grid: w.cuadricula_homicidio_x_desaparicion, estatal: w.desaparecidas_por_homicidio_estatal, cls, list12, rho: [w.spearman.rho, ...w.spearman.ic95],
    nNoBaja: w.violencia_oculta.length, nNoBajaFuera: w.violencia_oculta_fuera_amg,
    ambos: w.alto_en_ambos.map((m) => cv(m.municipio)), soloHom: w.solo_homicidio_alto.map((m) => cv(m.municipio)),
    regions: { s1525: regionRows(w.por_region), s1925: regionRows(P[1].resultados['2019-2025'].por_region), inegi: regionRows(P[7].robustez_pieza1_con_inegi.por_region) },
    ejemplo: w.violencia_oculta.find((m) => m.municipio === 'San Miguel el Alto'),
  };

  // P2: unresolved disappearance rate by sex and age (2019-2025), and outcome by sex.
  const ages = [...new Set(P[2].tasas.map((t) => t.age))];
  const rate = (sexo, age) => { const t = P[2].tasas.find((x) => x.sexo === sexo && x.age === age); return [t.rate, t.lo, t.hi, t.n]; };
  F.p2 = {
    rates: ages.map((a) => ({ age: a, h: rate('HOMBRE', a), m: rate('MUJER', a) })),
    outcome: P[2].desenlace_por_sexo_todos_los_años.map((o) => ({ sexo: o.sexo, reg: o.registradas, siguen: o.siguen_desaparecidas,
      vida: o.localizadas_con_vida, sinVida: o.localizadas_sin_vida, pSiguen: pct(o.p_desaparecidas), pSinVida: pct(o.p_sin_vida_de_localizadas) })),
  };

  // P3: stock by year of disappearance and yearly reports.
  F.p3 = {
    total: P[3].acervo_total_hoy, antes2019: P[3].anteriores_2019,
    cohortes: P[3].por_cohorte.map((c) => ({ y: c['año'], n: c.siguen_desaparecidas, ic: c.ic95.map(Math.round) })),
    denuncias: P[3].denuncias_por_año.map((d) => ({ y: d.anio, rep: d.desaparecidas_reportadas_mismo_anio, loc: d.localizadas_mismo_anio })),
    tendDen: P[3].tendencia_denuncias_anual_pct, tendSig: P[3].tendencia_aun_desaparecidas_anual_pct,
  };

  // P5: concentration. Lorenz curves thinned to ~40 points each (monotone, endpoints kept).
  const thin = (l) => { const step = Math.max(1, Math.floor(l.x.length / 40)); const out = [];
    for (let i = 0; i < l.x.length; i += step) out.push([r3(l.x[i]), r3(l.y[i])]);
    const last = [r3(l.x.at(-1)), r3(l.y.at(-1))]; if (out.at(-1)[0] !== last[0]) out.push(last); return out; };
  const conc = (k) => ({ gini: k.gini, ic: k.gini_ic95, top15: k.casos_en_municipios_con_15pct_poblacion_mas_afectada, half: k.poblacion_necesaria_para_50pct_casos,
    tasa: k.tasa_estatal, lorenz: thin(k.lorenz), altos: k.creiblemente_superiores.map((m) => ({ cv: cv(m.municipio), casos: m.casos, eb: m.tasa_eb, ic: m.ic95_eb })) });
  F.p5 = { des: conc(P[5].desaparicion), hom: conc(P[5].homicidio_2019_2025),
    regions: Object.fromEntries(P[5].por_region.map((x) => [reg(x.region), { casos: x.pct_casos, pob: x.pct_pob, desap: x.desap }])) };

  // P6: 16 comparable crimes.
  F.p6 = P[6].delitos.map((d) => ({ k: d.delito, cls: d.clase, t: d.tendencia_2019_2025_pct_anual, r26: d.razon_tasas_2026_vs_2025,
    serie: d.serie_tasa, n25: d.n_2025, max: d.maximo }));

  // P7: male age distributions (homicide INEGI 2019-2023 vs still-disappeared REPD 2019-2025) + male population (CONAPO person-years, from p2).
  const dist = P[7].distribucion_edad_hombres_pct;
  const popPy = ages.map((a) => P[2].tasas.find((x) => x.sexo === 'HOMBRE' && x.age === a).person_years);
  const popTot = popPy.reduce((a, b) => a + b, 0);
  F.p7 = { ages, hom: ages.map((a) => dist.homicidio[a]), des: ages.map((a) => dist.desaparicion[a]), pop: popPy.map((v) => r1((v / popTot) * 100)),
    hombres: { hom: pct(P[7].hombres.homicidio_inegi_2019_2023), des: pct(P[7].hombres.siguen_desaparecidas_2019_2025) },
    meanAge: P[7].edad_media_hombres, js: P[7].E7d_escala_jensen_shannon, edadDesc: P[7].edad_desconocida_por_año };

  // P8: registered clandestine graves.
  F.p8 = { tot: P[8].totales, ident: pct(P[8].proporcion_identificada), sexo: P[8].identificadas_por_sexo,
    porAnio: P[8].identificacion_por_año_de_inicio_sitios_cerrados.map((x) => ({ y: x.anio_inicio, loc: x.localizadas, id: x.identificadas, pct: x.pct })),
    amg: pct(P[8].proporcion_victimas_fosas_en_amg), amgDes: r1(P[8].proporcion_desaparecidas_en_amg * 100), fuera: P[8].fuera_amg,
    mun: P[8].por_municipio.map((m) => ({ cv: cv(m.municipio), sitios: m.sitios, loc: m.localizadas, id: m.identificadas })),
    sinVictimas: P[8].sitios_sin_victimas.map((s) => ({ sitio: s.sitio, cv: cv(s.municipio), inicio: s.inicio })) };

  // P9: dark figure.
  const shortCrime = { '01': 'Robo total de vehículo', '02': 'Robo de accesorios de vehículo', '04': 'Robo en casa', '05': 'Robo o asalto en calle o transporte',
    '07': 'Fraude bancario', '08': 'Fraude al consumidor', '09': 'Extorsión', '10': 'Amenazas', '11': 'Lesiones', '13': 'Hostigamiento, manoseo, exhibicionismo o intento de violación' };
  const cn = (y) => { const r = P[9].resultados[y]; return { jal: pct(r.jalisco), nac: pct(r.nacional), est: r.jalisco_delitos_estimados, n: r.jalisco_casos_muestra,
    porDelito: r.por_delito.map((d) => ({ k: shortCrime[d.codigo] || fail(`p9 code ${d.codigo}`), n: d.casos_muestra, v: pct(d.cifra_negra) })) }; };
  F.p9 = { e26: cn('2026'), e25: cn('2025') };

  // P10: marginalization groups.
  F.p10 = P[10].por_grado_de_marginacion.map((g) => ({ g: g.grupo, n: g.municipios, desap: g.desap_acumuladas_100k, hom: g.homicidio_inegi_100k_anual_2019_2023, razon: g.desap_acumuladas_por_homicidio_inegi_2019_2023 }));

  // P11: victims by sex and age, Jan-Aug 2026.
  const groups = (k) => P[11].delitos_clave[k].tasas_por_100k_8_meses.map((t) => ({ s: t.sexo, e: t.edad, v: [t.rate, t.lo, t.hi], n: t.n }));
  F.p11 = { total: P[11].total_victimas, calidad: P[11].calidad,
    perfil: P[11].perfil_por_delito.map((d) => ({ k: d.delito, n: d.victimas, muj: pct(d.mujeres), men: pct(d.menores_0_17) })),
    grupos: Object.fromEntries(['Abuso sexual', 'Violencia familiar', 'Robo con violencia', 'Homicidio doloso'].map((k) => [k, groups(k)])),
    vcm: { tasa: P[11].violencia_contra_mujeres_municipios.tasa_estatal, victimas: P[11].violencia_contra_mujeres_municipios.victimas,
      altos: P[11].violencia_contra_mujeres_municipios.creiblemente_superiores.map((m) => ({ cv: cv(m.municipio), n: m.victimas, eb: m.tasa_eb, ic: m.ic95 })) } };

  // P12: the 2025 homicide drop.
  const h = P[12].homicidio_doloso;
  F.p12 = { vicMes: h.victimas_por_mes, carpetas: h.carpetas_por_año, victimas: h.victimas_por_año, arma: h.con_arma_de_fuego_carpetas,
    lesArma: P[12].lesiones_dolosas_arma_de_fuego.carpetas_por_año, rr: h.razon_tasas_2025_vs_2024, rrLes: P[12].lesiones_dolosas_arma_de_fuego.razon_tasas_2025_vs_2024,
    desPorHom: P[12].desaparicion_por_victima_de_homicidio.por_año.map((x) => ({ y: x['año'], v: x.razon })), desPorHomRR: P[12].desaparicion_por_victima_de_homicidio.razon_2025_vs_2019_2024,
    regiones: P[12].donde_bajo_2024_2025.por_region.map((x) => ({ r: reg(x.region), a: x['2024'], b: x['2025'], pct: x.cambio_pct })),
    top: P[12].donde_bajo_2024_2025.municipios_que_mas_bajaron, cinco: P[12].donde_bajo_2024_2025.proporcion_de_la_caida_en_5_municipios,
    subieron: P[12].donde_bajo_2024_2025.municipios_que_subieron, culposo: P[12].sustitucion,
    inegi: Object.fromEntries(Object.entries(P[12].inegi_ocurrencia.por_año).map(([y, x]) => [y, x.homicidio])) };

  // P13: reasons not to report and trust.
  const m26 = P[13].resultados['2026'];
  const AUTH = new Set(['02', '04', '05', '06', '08']); // INEGI grouping: causes attributable to the authority
  F.p13 = { atrib: { jal: pct(m26.motivos_no_denuncia.atribuibles_autoridad.jalisco), nac: pct(m26.motivos_no_denuncia.atribuibles_autoridad.nacional) },
    razones: m26.motivos_no_denuncia.por_razon.filter((r) => r.codigo !== '99').map((r) => ({ k: r.razon, auth: AUTH.has(r.codigo), jal: pct(r.jalisco), nac: pct(r.nacional) })),
    confianza: m26.confianza.autoridades.map((a) => ({ k: a.autoridad, jal: pct(a.confia.jalisco), nac: pct(a.confia.nacional), dif: pct(a.confia.diferencia_jalisco_menos_nacional), ident: pct(a.identifica.jalisco) })),
    atrib25: pct(P[13].resultados['2025'].motivos_no_denuncia.atribuibles_autoridad.jalisco) };

  // P14: trends by region.
  F.p14 = Object.entries(P[14].delitos).map(([k, d]) => ({ k, F: d.interaccion_region_año.F, p: d.interaccion_region_año.p,
    reg: Object.fromEntries(Object.entries(d.por_region).map(([r, x]) => [reg(r), { t19: x.tasa_2019, t25: x.tasa_2025, n19: x.n_2019, n25: x.n_2025, t: x.tendencia_2019_2025_pct_anual }])) }));

  // P15: where homicides happen.
  const L = P[15].lugar_por_sexo_pct;
  const lugares = [['CALLE O CARRETERA VIA PUBLICA', 'Calle o carretera'], ['VIVIENDA PARTICULAR', 'Vivienda particular'], ['OTRO', 'Otro lugar'],
    ['GRANJA RANCHO O PARCELA', 'Granja, rancho o parcela'], ['AREA COMERCIAL O DE SERVICIOS', 'Área comercial o de servicios']];
  F.p15 = { lugares: lugares.map(([k, label]) => ({ k: label, h: L.HOMBRE[k], m: L.MUJER[k], nh: P[15].lugar_por_sexo_n.HOMBRE[k], nm: P[15].lugar_por_sexo_n.MUJER[k] })),
    ignora: P[15].homicidios.lugar_se_ignora_pct, total: P[15].homicidios.total, razonViv: P[15].H15a_vivienda.razon_mujeres_hombres,
    fem: { n: P[15].H15c_feminicidio_entre_asesinatos_de_mujeres.feminicidio, dol: P[15].H15c_feminicidio_entre_asesinatos_de_mujeres.homicidio_doloso_mujeres, p: pct(P[15].H15c_feminicidio_entre_asesinatos_de_mujeres.proporcion) },
    vivVsFem: P[15].H15b_vivienda_vs_feminicidio, parentesco: P[15].E15d.parentesco_agresor };

  // P18 + P20: feminicide files per murdered woman, by region and period.
  const femReg = (t) => Object.fromEntries(Object.entries(t).map(([r, x]) => [reg(r), { car: x.carpetas_feminicidio, muj: x.mujeres_asesinadas_inegi,
    razon: x.feminicidio_por_mujer_asesinada, tasa: x.tasa_mujeres_asesinadas_100mil_año, chico: x.conteo_chico }]));
  F.p20 = { a: femReg(P[20].resultados['2015_2018'].tabla), b: femReg(P[18].por_region), estatalA: P[20].resultados['2015_2018'].estatal, estatalB: P[18].estatal.feminicidio_por_mujer_asesinada,
    serie: Object.entries(P[20].E20c_serie_anual_estatal).map(([y, x]) => ({ y: Number(y), car: x.carpetas, muj: x.mujeres_asesinadas, v: x.razon })) };

  // P16: perception.
  const e16 = P[16].resultados['2026'];
  const NIV = [['estado', 'En el estado'], ['municipio', 'En su municipio'], ['colonia o localidad', 'En su colonia o localidad']];
  F.p16 = { niveles: NIV.map(([k, label]) => { const x = e16.inseguro[k]; return { k: label, jal: pct(x.jalisco), nac: pct(x.nacional), amg: pct(x.amg), resto: pct(x.resto_del_estado) }; }),
    cambio: Object.fromEntries(NIV.map(([k]) => [k, { a: pct(P[16].resultados['2025'].inseguro[k].jalisco), b: pct(e16.inseguro[k].jalisco), rr: P[16].cambio_2025_a_2026[k].jalisco_2026_vs_2025.razon,
      nacA: pct(P[16].resultados['2025'].inseguro[k].nacional), nacB: pct(e16.inseguro[k].nacional) }])),
    lugares: e16.lugares.map((l) => ({ k: l.lugar, jal: pct(l.jalisco), nac: pct(l.nacional), n: l.personas_muestra_jalisco })),
    incivilidades: e16.incivilidades.map((l) => ({ k: l.incivilidad, jal: pct(l.jalisco), nac: pct(l.nacional), amg: pct(l.amg), resto: pct(l.resto_del_estado) })),
    muestra: e16.personas_muestra };

  // P17: reasons by crime type (Jalisco, types with >= 100 unreported in sample).
  F.p17 = P[17].resultados['2026'].jalisco.tipos.map((t) => ({ k: t.delito, n: t.no_denunciados_muestra, auth: pct(t.atribuibles_autoridad),
    tiempo: pct(t.razones.find((r) => r.codigo === '04').p) }));

  // P19: municipal trends, hierarchical negative binomial.
  F.p19 = Object.entries(P[19].delitos).map(([k, d]) => ({ k, state: d.tendencia_estatal_pct_anual, tipico: d.binomial_negativa.tendencia_tipica_pct_anual,
    m: Object.fromEntries(d.municipios.map((m) => { const [e, lo, hi] = m.jerarquico;
      return [m.cvegeo, [e, lo, hi, lo > 0 ? 'up' : hi < 0 ? 'down' : 'flat', m.carpetas, m.se_aparta_jer ? 1 : 0]]; })) }));

  // P21: minor crime types.
  F.p21 = { residual: P[21].H21a_participacion_residual.participacion_pct, residualT: P[21].H21a_participacion_residual.cambio_anual_pct,
    tipos: Object.entries(P[21].tipos).filter(([, t]) => !t.conteo_chico).map(([k, t]) => ({ k, n19: t.n_2019, n25: t.n_2025, t: t.tendencia_2019_2025_pct_anual, cls: t.clase, residual: t.residual, serie: t.serie }))
      .sort((a, b) => b.n25 - a.n25),
    rupturas: P[21].E21f_rupturas_de_registro.rupturas };

  // P22: what people stop doing.
  const e22 = P[22].resultados['2026'];
  F.p22 = { actividades: e22.actividades.map((a) => ({ k: a.actividad, jal: pct(a.jalisco), nac: pct(a.nacional), amg: pct(a.amg), resto: pct(a.resto_del_estado) })),
    alMenosUna: Object.fromEntries(Object.entries(e22.al_menos_una_actividad).map(([k, v]) => [k, pct(v)])),
    alMenosUna25: pct(P[22].resultados['2025'].al_menos_una_actividad.jalisco), rr: P[22].cambio_2025_2026_al_menos_una.jalisco.razon,
    medida: Object.fromEntries(Object.entries(e22.alguna_medida).map(([k, v]) => [k, pct(v)])),
    noche: { m: pct(e22.salir_de_noche_por_sexo.mujeres), h: pct(e22.salir_de_noche_por_sexo.hombres) },
    medidas: e22.medidas.map((m) => ({ k: m.medida, jal: pct(m.jalisco), nac: pct(m.nacional) })) };

  // P23: SESNSP vs INEGI annual series.
  F.p23 = { serie: Object.entries(P[23].E23d_serie_anual).map(([y, x]) => ({ y: Number(y), dol: x.victimas_sesnsp_homicidio_doloso, vic: x.victimas_sesnsp_homicidio_doloso + x.victimas_sesnsp_feminicidio,
    car: x.carpetas_sesnsp_homicidio_doloso, inegi: x.homicidios_inegi, razon: x.razon_victimas_sesnsp_inegi })),
    rr: P[23].H23a_razon_2015_2018_vs_2019_2023 };

  // P24: public search records coverage.
  F.p24 = { total: P[24].total, porAnio: Object.entries(P[24].H24c_por_año.cobertura).map(([y, x]) => ({ y: y === '2018 y anteriores' ? '≤2018' : y, ced: x.cedulas, des: x.desaparecidas, cob: r1(x.cobertura * 100) }))
      .sort((a, b) => (a.y === '≤2018' ? -1 : b.y === '≤2018' ? 1 : a.y.localeCompare(b.y))),
    sexo: P[24].H24a_sexo, edad: P[24].H24b_edad };

  // P25: other sources on graves.
  F.p25 = { serie: Object.entries(P[25].E25d_serie_anual).map(([y, x]) => ({ y: Number(y), regV: x.registro_victimas, regS: x.registro_sitios, fisC: x.fiscalia_cuerpos, fisF: x.fiscalia_fosas,
    preLo: x.prensa_cuerpos, preHi: x.prensa_cuerpos_alto, preF: x.prensa_fosas })),
    muns: Object.fromEntries(Object.entries(P[25].E25d_municipios_con_fosas_2019_2024).map(([k, list]) => [k, list.map(cv)])),
    prensaSinRegistro: P[25].H25a_prensa_fuera_amg_sin_sitio_en_registro.sin_ningun_sitio_en_registro.map(cv),
    fiscaliaVsRegistro: P[25].H25c_fiscalia_plataforma_vs_registro, conc: P[25].H25b_concentracion };
  // Municipalities outside the AMG with graves reported by press or by the prosecutor's office (transparency) and no site in the public registry.
  const inRegistry = new Set(F.p8.mun.map((m) => m.cv));
  F.p25.fueraSinRegistro = [...new Set([...F.p25.muns.prensa, ...F.p25.muns.fiscalia])].filter((c) => F.mun[c].r !== 'amg' && !inRegistry.has(c)).sort();
  if (F.p25.fueraSinRegistro.length !== 8) fail(`p25: expected 8 municipalities outside AMG without registry site, got ${F.p25.fueraSinRegistro.length}`);

  return F;
}

// ANALISIS.md §6 (hypothesis register) and §8 (how to read the numbers).
function fromAnalysis() {
  const md = fs.readFileSync(path.join(ROOT, 'ANALISIS.md'), 'utf8');
  const sec = (start, end) => { const a = md.indexOf(start); const b = md.indexOf(end, a); if (a < 0 || b < 0) fail(`ANALISIS.md section ${start}`); return md.slice(a, b); };
  const hyp = [];
  let piece = null;
  for (const line of sec('## 6. Registro de hipótesis', '**Total:**').split('\n')) {
    const m = line.match(/^\|\s*(\d*)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/);
    if (!m || m[2] === 'Hipótesis' || /^-+$/.test(m[2])) continue;
    if (m[1]) piece = Number(m[1]);
    const [, id, text] = m[2].match(/^([HE]\d+[a-z]):\s*(.+)$/) || fail(`hypothesis row: ${line}`);
    const res = m[3].startsWith('✅') ? 'ok' : m[3].startsWith('❌') ? 'no' : m[3].startsWith('exploratoria') ? 'exp' : fail(`result: ${m[3]}`);
    hyp.push({ p: piece, id, text, res, detail: m[3].replace(/^(✅|❌|exploratoria)\s*/, '') });
  }
  const counts = hyp.reduce((a, h) => ({ ...a, [h.res]: (a[h.res] || 0) + 1 }), {});
  if (hyp.length !== 111) fail(`expected 111 hypotheses, parsed ${hyp.length}`);
  const caveats = [];
  for (const line of sec('## 8. Sesgos, límites', '\n---').split('\n')) {
    const m = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*(.*)$/);
    if (m) caveats.push({ n: Number(m[1]), title: m[2].replace(/\.$/, ''), text: m[3] });
    else if (/^\s{3}\S/.test(line) && caveats.length) caveats.at(-1).text += `\n\n${line.trim()}`;
  }
  if (caveats.length !== 20) fail(`expected 20 caveats, parsed ${caveats.length}`);
  const pieces = Object.fromEntries([...md.matchAll(/^### Pieza (\d+) — (.+)$/gm)].map((m) => [m[1], m[2].trim()]));
  if (Object.keys(pieces).length !== 24) fail(`expected 24 pieces, parsed ${Object.keys(pieces).length}`);
  return { hyp, hypCounts: counts, caveats, pieces };
}

(async () => {
  const F = { ...build(await geometry()), ...fromAnalysis() };
  const body = JSON.stringify(F);
  fs.writeFileSync(TARGET, `// Generated by scripts/build-findings.cjs from analysis/output/*.json and ANALISIS.md (public aggregates). Do not edit.\nexport const F = ${body};\n`);
  console.log(JSON.stringify({ ok: true, bytes: body.length, hypotheses: F.hypCounts, caveats: F.caveats.length, p1: Object.keys(F.p1.cls).length, amgBox: F.amgBox }));
})();
