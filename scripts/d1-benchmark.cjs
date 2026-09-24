'use strict';
// Isolated D1 benchmark (S2-C06). Authorized scope: ONE database named below, synthetic/aggregate data only
// at observed cardinality, caps 1M rows read / 50k rows written (incl. indexes and DDL) / 64 MiB stored.
// Cumulative consumption persists in the private evidence dir and the run stops before a cap.
// Usage: node scripts/d1-benchmark.cjs --evidence NEW_OR_EXISTING_PRIVATE_DIR --geo GEO_UNITS_JSON [--reps N]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const DB = 'seguridad-jalisco-bench-d1';
const RECORDS = 10234; // B snapshot cardinality
const CAPS = { rowsRead: 1000000, rowsWritten: 50000, bytes: 64 * 1024 * 1024 };
const WRANGLER = path.resolve(__dirname, '../node_modules/.bin/wrangler');
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' };

function fail(code, detail) { const e = new Error(detail ? `${code}: ${detail}` : code); e.code = code; throw e; }
function wrangler(args, timeout = 180000) {
  const started = performance.now();
  const r = spawnSync(WRANGLER, args, { env, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024 });
  const wallMs = Math.round(performance.now() - started);
  if (r.status !== 0) fail('wrangler_failed', (r.stderr || r.stdout || '').slice(0, 600));
  return { stdout: r.stdout, wallMs };
}
function jsonOut(stdout) {
  const start = stdout.indexOf('[');
  if (start < 0) fail('unparseable_output', stdout.slice(0, 300));
  return JSON.parse(stdout.slice(start));
}

// Deterministic synthetic generator (seeded), no personal data.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function synthetic(codes) {
  const rand = rng(20260923);
  // Zipf-like skew over municipalities (rank by code order is arbitrary; only the shape matters).
  const weights = codes.map((_, i) => 1 / (i + 1) ** 1.1);
  const total = weights.reduce((a, b) => a + b, 0);
  const cdf = []; let acc = 0; for (const w of weights) cdf.push((acc += w / total));
  const pick = () => { const r = rand(); return codes[cdf.findIndex((c) => r <= c)] ?? codes.at(-1); };
  const rows = [];
  for (let i = 1; i <= RECORDS; i++) {
    const r = rand();
    rows.push({ id: i, sourceId: `SYN-${String(i).padStart(6, '0')}`, cvegeo: pick(),
      status: r < 0.72 ? 'active' : r < 0.97 ? 'located' : 'unknown', year: 2006 + Math.floor(rand() ** 0.5 * 21),
      publishable: rand() < 0.95 ? 1 : 0, recordHash: crypto.createHash('sha256').update(`syn:${i}`).digest('hex'),
      lastChangedRun: rand() < 0.02 ? 2 : 1 });
  }
  return rows;
}

function buildSql(codes, names, rows) {
  const q = (v) => typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
  const out = [
    'CREATE TABLE municipios (cvegeo TEXT PRIMARY KEY, name TEXT NOT NULL, population INTEGER NOT NULL) WITHOUT ROWID;',
    'CREATE TABLE runs (run_id INTEGER PRIMARY KEY, observed_at TEXT NOT NULL, status TEXT NOT NULL);',
    'CREATE TABLE cedulas (id INTEGER PRIMARY KEY, source_id TEXT NOT NULL UNIQUE, municipio_cvegeo TEXT NOT NULL, status TEXT NOT NULL, year INTEGER NOT NULL, publishable INTEGER NOT NULL, record_hash TEXT NOT NULL, last_changed_run INTEGER NOT NULL);',
    'CREATE INDEX cedulas_listing ON cedulas (municipio_cvegeo, status, year DESC) WHERE publishable = 1;',
    'CREATE TABLE suppressions (source_id TEXT PRIMARY KEY, reason TEXT NOT NULL, active INTEGER NOT NULL) WITHOUT ROWID;',
    'CREATE TABLE municipio_stats (cvegeo TEXT PRIMARY KEY, publishable_count INTEGER NOT NULL, active_count INTEGER NOT NULL) WITHOUT ROWID;',
  ];
  // Population is synthetic (CONAPO original not yet acquired); plausible magnitude only.
  const rand = rng(14);
  out.push(`INSERT INTO municipios VALUES ${codes.map((c, i) => `(${q(c)},${q(names[i])},${Math.round(2000 + rand() * 1500000 / (i + 1))})`).join(',')};`);
  out.push("INSERT INTO runs VALUES (1,'2026-09-23T19:38:37Z','success'),(2,'2026-09-23T21:49:02Z','success');");
  for (let i = 0; i < rows.length; i += 500) {
    out.push(`INSERT INTO cedulas VALUES ${rows.slice(i, i + 500).map((r) =>
      `(${r.id},${q(r.sourceId)},${q(r.cvegeo)},${q(r.status)},${r.year},${r.publishable},${q(r.recordHash)},${r.lastChangedRun})`).join(',')};`);
  }
  out.push(`INSERT INTO suppressions VALUES ${rows.filter((_, i) => i % 200 === 7).map((r) => `(${q(r.sourceId)},'takedown_request',1)`).join(',')};`);
  out.push("INSERT INTO municipio_stats SELECT municipio_cvegeo, SUM(publishable), SUM(publishable AND status='active') FROM cedulas GROUP BY municipio_cvegeo;");
  return out.join('\n') + '\n';
}

const QUERIES = {
  'P1 list publishable by municipality (paged, suppression-aware)': (c) =>
    `SELECT c.id, c.source_id, c.year FROM cedulas c WHERE c.municipio_cvegeo='${c}' AND c.status='active' AND c.publishable=1 AND NOT EXISTS (SELECT 1 FROM suppressions s WHERE s.source_id=c.source_id AND s.active=1) ORDER BY c.year DESC LIMIT 20 OFFSET 20`,
  'P2 single cedula by source_id': () => "SELECT id, source_id, municipio_cvegeo, status, year FROM cedulas WHERE source_id='SYN-004242'",
  'P3 municipal aggregates, precomputed': () => 'SELECT cvegeo, publishable_count, active_count FROM municipio_stats',
  'P3b municipal aggregates, live GROUP BY': () => 'SELECT municipio_cvegeo, COUNT(*) FROM cedulas WHERE publishable=1 GROUP BY municipio_cvegeo',
  'P4 rates per 100k (stats x population)': () => 'SELECT m.cvegeo, s.active_count * 100000.0 / m.population AS rate FROM municipio_stats s JOIN municipios m USING (cvegeo)',
  'A1 changed since run (no index)': () => 'SELECT COUNT(*) FROM cedulas WHERE last_changed_run >= 2',
  'A3 active suppressions joined to records': () => 'SELECT COUNT(*) FROM suppressions s JOIN cedulas c USING (source_id) WHERE s.active=1',
};

function main(args) {
  const o = {};
  for (let i = 0; i < args.length; i += 2) o[args[i]] = args[i + 1];
  const evidence = o['--evidence'], geo = o['--geo'], reps = Number(o['--reps'] || 10);
  if (!evidence || !geo || !Number.isSafeInteger(reps) || reps < 1 || reps > 20) fail('invalid_arguments');
  process.umask(0o077);
  if (!fs.existsSync(evidence)) fs.mkdirSync(evidence, { mode: 0o700 });
  const ledgerFile = path.join(evidence, 'consumption.json');
  const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8'))
    : { db: DB, caps: CAPS, rowsRead: 0, rowsWritten: 0, maxBytes: 0, calls: [] };
  const save = () => fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + '\n', { mode: 0o600 });
  function account(label, meta, wallMs) {
    ledger.rowsRead += meta.rows_read || 0; ledger.rowsWritten += meta.rows_written || 0;
    ledger.maxBytes = Math.max(ledger.maxBytes, meta.size_after || 0);
    ledger.calls.push({ label, rowsRead: meta.rows_read, rowsWritten: meta.rows_written, durationMs: meta.duration, wallMs });
    save();
    if (ledger.rowsRead > CAPS.rowsRead * 0.9 || ledger.rowsWritten > CAPS.rowsWritten * 0.9 || ledger.maxBytes > CAPS.bytes * 0.9) fail('cap_reached', JSON.stringify(ledger));
  }

  // 1. Create exactly one isolated DB (reuse if this benchmark already created it).
  const list = jsonOut(wrangler(['d1', 'list', '--json']).stdout);
  if (!list.some((d) => d.name === DB)) {
    if (ledger.created) fail('db_missing_after_create');
    wrangler(['d1', 'create', DB]);
    ledger.created = new Date().toISOString(); save();
  }

  // 2. Load schema + synthetic data once.
  const units = JSON.parse(fs.readFileSync(geo, 'utf8'));
  const codes = units.map((u) => u.cvegeo), names = units.map((u) => u.name);
  if (codes.length !== 125) fail('invalid_geo');
  if (!ledger.loaded) {
    const sqlFile = path.join(evidence, 'load.sql');
    fs.writeFileSync(sqlFile, buildSql(codes, names, synthetic(codes)), { mode: 0o600 });
    const load = wrangler(['d1', 'execute', DB, '--remote', '--file', sqlFile, '--yes', '--json'], 600000);
    const metas = jsonOut(load.stdout).map((r) => r.meta || {});
    const meta = metas.reduce((a, m) => ({ rows_read: a.rows_read + (m.rows_read || 0), rows_written: a.rows_written + (m.rows_written || 0),
      duration: a.duration + (m.duration || 0), size_after: Math.max(a.size_after, m.size_after || 0) }), { rows_read: 0, rows_written: 0, duration: 0, size_after: 0 });
    ledger.load = { ...meta, wallMs: load.wallMs, rawMeta: metas };
    account('load', meta, load.wallMs);
    ledger.loaded = new Date().toISOString(); save();
  }

  // 3. Queries: engine duration (meta.duration) vs client wall time (includes wrangler CLI start + auth + network).
  const results = {};
  for (const [name, sql] of Object.entries(QUERIES)) {
    const samples = [];
    for (let i = 0; i < reps; i++) {
      const r = wrangler(['d1', 'execute', DB, '--remote', '--command', sql(codes[i % 10]), '--json']);
      const out = jsonOut(r.stdout)[0];
      account(name, out.meta, r.wallMs);
      samples.push({ engineMs: out.meta.duration, wallMs: r.wallMs, rowsRead: out.meta.rows_read, rows: out.results.length });
    }
    const sorted = (k) => samples.map((s) => s[k]).sort((a, b) => a - b);
    const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.ceil(p * arr.length) - 1)];
    results[name] = { reps, engineMsP50: pct(sorted('engineMs'), 0.5), engineMsP95: pct(sorted('engineMs'), 0.95),
      wallMsP50: pct(sorted('wallMs'), 0.5), wallMsP95: pct(sorted('wallMs'), 0.95),
      rowsReadPerCall: samples[0].rowsRead, rowsReturned: samples[0].rows };
  }
  const explain = jsonOut(wrangler(['d1', 'execute', DB, '--remote', '--command', `EXPLAIN QUERY PLAN ${QUERIES['P1 list publishable by municipality (paged, suppression-aware)'](codes[0])}`, '--json']).stdout)[0];
  account('explain P1', explain.meta, 0);
  const summary = { ok: true, db: DB, records: RECORDS, load: { rowsWritten: ledger.load.rows_written, engineMs: ledger.load.duration,
    wallMs: ledger.load.wallMs, sizeBytes: ledger.maxBytes }, results, explainP1: explain.results.map((r) => r.detail),
    consumption: { rowsRead: ledger.rowsRead, rowsWritten: ledger.rowsWritten, maxBytes: ledger.maxBytes, caps: CAPS } };
  fs.writeFileSync(path.join(evidence, `results-${Date.now()}.json`), JSON.stringify(summary, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

try { main(process.argv.slice(2)); } catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, reason: e.code || 'error', detail: e.message }) + '\n');
  process.exitCode = 1;
}
