'use strict';
// S3-02: build the publishable D1 content from validated private evidence.
// Usage: node scripts/build-publish-db.cjs --output NEW_PRIVATE_DIR --snapshot REPD_SNAPSHOT_DIR --geo GEO_UNITS_JSON
//   --population CONAPO_POPULATION_JSON --sesnsp-2026 CSV --sesnsp-2015 CSV --repd-stats DATOS_PARA_MAPA_JSON
//   [--suppressions LEDGER_DIR] [--map-module src/worker/generated/map.mjs]
// Writes publish.sql (contains names: private, never in Git) and summary.json to --output, and the simplified
// municipal map (public INEGI geography only) to --map-module.
const fs = require('node:fs');
const path = require('node:path');
const { readValidatedSnapshot } = require('../src/jal-repd-ced/compare-baselines.cjs');
const { readLedger, toReconcileInput } = require('../src/jal-repd-ced/suppressions.cjs');
const { assertNewDestination } = require('../src/private-output.cjs');

function fail(code, detail) { const e = new Error(detail ? `${code}: ${detail}` : code); e.code = code; throw e; }
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const clean = (v) => (v === null || v === undefined || v === '' || v === 'None' || v === 'SE IGNORA') ? null : v;
const sq = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

function parseLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out;
}
function* csv(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const header = parseLine(lines[0]);
  for (let i = 1; i < lines.length; i++) if (lines[i]) {
    const c = parseLine(lines[i]); yield Object.fromEntries(header.map((h, j) => [h, c[j]]));
  }
}
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// --- map: equirectangular projection + Douglas-Peucker, rendered to SVG path strings ---
function buildMap(units) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const polys = (g) => g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const u of units) for (const p of polys(u.geometry)) for (const [x, y] of p[0]) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const k = Math.cos(((minY + maxY) / 2) * Math.PI / 180);
  const W = 1000, scale = W / ((maxX - minX) * k), H = Math.round((maxY - minY) * scale);
  const proj = ([x, y]) => [(x - minX) * k * scale, (maxY - y) * scale];
  function dp(pts, tol) {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts.at(-1)]; let idx = -1, max = 0;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len;
      if (d > max) { max = d; idx = i; }
    }
    return max > tol ? [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)] : [a, b];
  }
  const paths = {}; let points = 0;
  for (const u of units) {
    const d = [];
    for (const p of polys(u.geometry)) {
      // Closed ring: first == last, so split at the farthest vertex and simplify both halves.
      const pts = p[0].map(proj).slice(0, -1);
      let far = 0, fd = 0;
      pts.forEach(([x, y], i) => { const d = Math.hypot(x - pts[0][0], y - pts[0][1]); if (d > fd) { fd = d; far = i; } });
      const ring = [...dp(pts.slice(0, far + 1), 0.6).slice(0, -1), ...dp([...pts.slice(far), pts[0]], 0.6)];
      if (ring.length < 4) continue;
      points += ring.length;
      d.push('M' + ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z');
    }
    paths[u.cvegeo] = d.join('');
  }
  return { width: W, height: H, paths, points };
}

function main(args) {
  const o = {};
  for (let i = 0; i < args.length; i += 2) o[args[i].replace(/^--/, '')] = args[i + 1];
  for (const k of ['output', 'snapshot', 'geo', 'population', 'sesnsp-2026', 'sesnsp-2015', 'repd-stats']) if (!o[k]) fail('invalid_arguments', k);
  process.umask(0o077);
  const snap = readValidatedSnapshot(o.snapshot);
  const units = JSON.parse(fs.readFileSync(o.geo, 'utf8')).filter((u) => u.isMunicipality);
  if (units.length !== 125) fail('invalid_geo');
  const byName = new Map(units.map((u) => [norm(u.name), u.cvegeo]));
  const suppressed = new Set(o.suppressions ? toReconcileInput(readLedger(o.suppressions)).filter((s) => s.status === 'active').map((s) => s.sourceId) : []);

  // Cédulas: publication rules from SPEC_JALISCO_STAGE_3 §3.
  const counts = { total: snap.records.length, notDisappeared: 0, notAuthorized: 0, suppressed: 0, published: 0, unknownMunicipality: 0 };
  const cedulas = [];
  const perMun = {};
  for (const { internalRecord: r } of snap.records) {
    if (r.estatus_persona_desaparecida !== 'PERSONA DESAPARECIDA') { counts.notDisappeared++; continue; }
    if (r.autorizacion_informacion_publica !== 'SI') { counts.notAuthorized++; continue; }
    if (suppressed.has(r.id_cedula_busqueda)) { counts.suppressed++; continue; }
    const cvegeo = byName.get(norm(r.municipio)) ?? null;
    if (!cvegeo) counts.unknownMunicipality++;
    else perMun[cvegeo] = (perMun[cvegeo] || 0) + 1;
    const senas = (r.descripcion_sena_particular || []).map((s) => ({ tipo: clean(s.tipo_sena), parte: clean(s.parte_cuerpo),
      general: clean(s.especificacion_general), descripcion: clean(s.descripcion) }));
    const ropa = (r.descripcion_vestimenta || []).map((v) => ({ prenda: clean(v.prenda), color: clean(v.color), marca: clean(v.marca),
      material: clean(v.material), talla: clean(v.talla), descripcion: clean(v.descripcion) }));
    cedulas.push([r.id_cedula_busqueda, clean(r.nombre_completo), norm(r.nombre_completo), r.edad_momento_desaparicion ?? null,
      clean(r.sexo), clean(r.genero), clean(r.fecha_desaparicion) ?? '', cvegeo, clean(r.municipio), clean(r.nacionalidad),
      r.estatura ?? null, clean(r.complexion), clean(r.tez), clean(r.cabello), clean(r.ojos_color),
      JSON.stringify(senas), JSON.stringify(ropa)]);
    counts.published++;
  }

  // Population (CONAPO).
  const pop = {};
  for (const p of JSON.parse(fs.readFileSync(o.population, 'utf8'))) if (p.year === 2025 || p.year === 2026) (pop[p.cvegeo] ??= {})[p.year] = p.population;

  // SESNSP: total incidence 2025 (2015-2025 methodology) and Jan-Aug 2026 (RNID); homicidio doloso (comparable per SESNSP note).
  const ses = {}; const sesBuckets = {};
  const addSes = (file, yearWanted, prefix) => {
    for (const r of csv(file)) {
      if (r['Año'] !== yearWanted) continue;
      const code = String(r['Cve. Municipio']).padStart(5, '0');
      const n = MONTHS.reduce((a, m) => a + (Number(r[m]) || 0), 0);
      const target = units.some((u) => u.cvegeo === code) ? (ses[code] ??= {}) : (sesBuckets[code] ??= {});
      target[`${prefix}_total`] = (target[`${prefix}_total`] || 0) + n;
      if (r['Subtipo de delito'] === 'Homicidio doloso') target[`${prefix}_homicidio`] = (target[`${prefix}_homicidio`] || 0) + n;
    }
  };
  addSes(o['sesnsp-2015'], '2025', 's2025');
  addSes(o['sesnsp-2026'], '2026', 's2026');

  // REPD-STATS map endpoint (aggregates by municipality code).
  const repd = {}; let repdUnknown = null;
  for (const [, v] of Object.entries(JSON.parse(fs.readFileSync(o['repd-stats'], 'utf8')))) {
    const c = v.clave_geoestadistica_municipal;
    const row = { des: v['TOTAL CASOS']?.['PERSONA DESAPARECIDA'] || 0, loc: v['TOTAL CASOS']?.['PERSONA LOCALIZADA'] || 0 };
    if (Number.isInteger(c) && c >= 1 && c <= 125) repd[`14${String(c).padStart(3, '0')}`] = row; else repdUnknown = row;
  }

  const sql = [
    'DROP TABLE IF EXISTS cedulas;', 'DROP TABLE IF EXISTS municipios;', 'DROP TABLE IF EXISTS meta;', 'DROP TABLE IF EXISTS buckets;',
    'DROP TABLE IF EXISTS cedula_counts;',
    'CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;',
    `CREATE TABLE cedulas (id TEXT PRIMARY KEY, nombre TEXT, nombre_norm TEXT NOT NULL, edad INTEGER, sexo TEXT, genero TEXT,
      fecha TEXT NOT NULL, municipio_cvegeo TEXT, municipio_nombre TEXT, nacionalidad TEXT, estatura REAL, complexion TEXT, tez TEXT,
      cabello TEXT, ojos TEXT, senas TEXT NOT NULL, vestimenta TEXT NOT NULL, foto_key TEXT) WITHOUT ROWID;`,
    // (fecha, id) indexes back keyset pagination: each page reads ~25 rows instead of OFFSET scans.
    'CREATE INDEX cedulas_fecha ON cedulas (fecha, id);',
    'CREATE INDEX cedulas_mun ON cedulas (municipio_cvegeo, fecha, id);',
    'CREATE INDEX cedulas_sexo ON cedulas (sexo, fecha, id);',
    `CREATE TABLE municipios (cvegeo TEXT PRIMARY KEY, nombre TEXT NOT NULL, poblacion_2025 INTEGER, poblacion_2026 INTEGER,
      cedulas_desaparecidas INTEGER NOT NULL, repd_desaparecidas INTEGER, repd_localizadas INTEGER,
      sesnsp_2025_total INTEGER, sesnsp_2025_homicidio INTEGER, sesnsp_2026_total INTEGER, sesnsp_2026_homicidio INTEGER) WITHOUT ROWID;`,
    'CREATE TABLE buckets (key TEXT PRIMARY KEY, value INTEGER, note TEXT NOT NULL) WITHOUT ROWID;',
    // Precomputed filter counts so the wall never COUNTs the whole cedulas table (D1 bills rows read).
    `CREATE TABLE cedula_counts (municipio TEXT NOT NULL, sexo TEXT NOT NULL, anio TEXT NOT NULL, n INTEGER NOT NULL,
      PRIMARY KEY (municipio, sexo, anio)) WITHOUT ROWID;`,
    // Operational tables survive rebuilds.
    'CREATE TABLE IF NOT EXISTS suppressions (id TEXT PRIMARY KEY, reason TEXT NOT NULL, created_at TEXT NOT NULL) WITHOUT ROWID;',
    `CREATE TABLE IF NOT EXISTS takedown_requests (id INTEGER PRIMARY KEY, cedula_id TEXT, reason TEXT NOT NULL, relation TEXT,
      contact TEXT, message TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', resolved_at TEXT);`,
  ];
  const meta = { snapshot_observed_at: snap.manifest.observedAt, snapshot_count: String(snap.manifest.count), built_at: new Date().toISOString(),
    repd_stats_cutoff: '2026-08-31', sesnsp_2026_through: 'agosto 2026', conapo_version: 'Proyecciones municipales 1990-2040',
    inegi_version: units[0].sourceVersion, published: String(counts.published) };
  const agg = {}; const yearCounts = {};
  for (const r of cedulas) {
    const key = [r[7] ?? '', r[4] ?? '', r[6] ? r[6].slice(0, 4) : ''];
    agg[key.join('|')] = (agg[key.join('|')] || 0) + 1;
    if (r[6]) yearCounts[r[6].slice(0, 4)] = (yearCounts[r[6].slice(0, 4)] || 0) + 1;
  }
  meta.years = JSON.stringify(Object.keys(yearCounts).sort().reverse());
  meta.totals = JSON.stringify({ repd_mun: Object.values(repd).reduce((a, r) => a + r.des, 0),
    s2026: Object.values(ses).reduce((a, x) => a + (x.s2026_total || 0), 0), h2025: Object.values(ses).reduce((a, x) => a + (x.s2025_homicidio || 0), 0) });
  sql.push(`INSERT INTO meta VALUES ${Object.entries(meta).map(([k, v]) => `(${sq(k)},${sq(v)})`).join(',')};`);
  for (let i = 0; i < cedulas.length; i += 40) {
    sql.push(`INSERT INTO cedulas (id,nombre,nombre_norm,edad,sexo,genero,fecha,municipio_cvegeo,municipio_nombre,nacionalidad,estatura,complexion,tez,cabello,ojos,senas,vestimenta) VALUES ${
      cedulas.slice(i, i + 40).map((r) => `(${r.map(sq).join(',')})`).join(',')};`);
  }
  sql.push(`INSERT INTO municipios VALUES ${units.map((u) => { const s = ses[u.cvegeo] || {}, rp = repd[u.cvegeo] || {};
    return `(${[u.cvegeo, u.name, pop[u.cvegeo]?.[2025], pop[u.cvegeo]?.[2026], perMun[u.cvegeo] || 0, rp.des ?? null, rp.loc ?? null,
      s.s2025_total ?? 0, s.s2025_homicidio ?? 0, s.s2026_total ?? 0, s.s2026_homicidio ?? 0].map(sq).join(',')})`; }).join(',')};`);
  const buckets = [
    ['cedulas_municipio_no_especificado', counts.unknownMunicipality, 'Cédulas de personas desaparecidas sin municipio (SE IGNORA o vacío).'],
    ['repd_se_ignora_desaparecidas', repdUnknown?.des ?? null, 'Estadística REPD: personas desaparecidas en el bucket SE IGNORA del mapa.'],
    ['repd_fuera_de_mapa', 47, 'Estadística REPD: personas en el total estatal (16,250) que no aparecen en ninguna clave del mapa (38 hombres, 9 mujeres).'],
    ['sesnsp_2025_no_especificado', sesBuckets['14998']?.s2025_total ?? 0, 'SESNSP 2025: delitos con municipio no especificado (clave 14998).'],
    ['sesnsp_2026_no_especificado', sesBuckets['14999']?.s2026_total ?? 0, 'SESNSP 2026 (RNID): delitos con municipio no especificado (clave 14999).'],
  ];
  const aggRows = Object.entries(agg).map(([k, n]) => [...k.split('|'), n]);
  for (let i = 0; i < aggRows.length; i += 200) sql.push(`INSERT INTO cedula_counts VALUES ${aggRows.slice(i, i + 200).map((r) => `(${r.map(sq).join(',')})`).join(',')};`);
  sql.push(`INSERT INTO buckets VALUES ${buckets.map((b) => `(${b.map(sq).join(',')})`).join(',')};`);

  assertNewDestination(o.output);
  fs.mkdirSync(o.output, { mode: 0o700 });
  fs.writeFileSync(path.join(o.output, 'publish.sql'), sql.join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  const map = buildMap(units);
  const mapModule = o['map-module'] || path.resolve(__dirname, '../src/worker/generated/map.mjs');
  fs.mkdirSync(path.dirname(mapModule), { recursive: true });
  fs.writeFileSync(mapModule, `// Generated by scripts/build-publish-db.cjs from INEGI Marco Geoestadístico (public geography). Do not edit.\n` +
    `export const MAP = ${JSON.stringify({ width: map.width, height: map.height, paths: map.paths })};\n`);
  const summary = { ok: true, counts, municipalitiesWithCedulas: Object.keys(perMun).length, suppressedActive: suppressed.size,
    sqlBytes: fs.statSync(path.join(o.output, 'publish.sql')).size, mapBytes: fs.statSync(mapModule).size, mapPoints: map.points,
    jalisco: { sesnsp2025: Object.values(ses).reduce((a, s) => a + (s.s2025_total || 0), 0), sesnsp2026: Object.values(ses).reduce((a, s) => a + (s.s2026_total || 0), 0),
      repdDesaparecidasMunicipal: Object.values(repd).reduce((a, r) => a + r.des, 0) }, buckets: Object.fromEntries(buckets.map((b) => [b[0], b[1]])) };
  fs.writeFileSync(path.join(o.output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

try { main(process.argv.slice(2)); } catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, reason: e.code || 'error', detail: e.message }) + '\n'); process.exitCode = 1;
}
