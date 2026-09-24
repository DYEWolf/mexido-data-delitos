'use strict';
// C04: import manually downloaded official CONAPO/SESNSP files into a NEW private evidence dir and
// materialize verifiable Jalisco subsets joined to the 125 INEGI municipalities.
// Usage: node scripts/import-official-jalisco.cjs --output NEW_DIR --inegi GEO_UNITS_JSON
//   [--conapo pobproy_quinq1.csv] [--conapo-crosscheck EXP06_TOTALS_CSV]
//   [--sesnsp-2026 CSV [--sesnsp-2026-zip ZIP]] [--sesnsp-2015 CSV [--sesnsp-2015-zip ZIP]] [--extra FILE ...]
// stdout: aggregate checks only. Raw copies are 0600 inside a 0700 dir; nothing goes to Git.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { assertNewDestination } = require('../src/private-output.cjs');
const { createPopulationObservation } = require('../src/geo/canonical.cjs');
const { createManualImportContract, decodeText, CONTRACT_2015_2025, CONTRACT_RNID_2026 } = require('../src/sesnsp/import-contract.cjs');

const SOURCES = {
  conapo: { page: 'https://www.datos.gob.mx/dataset/proyecciones-de-poblacion',
    resource: 'Población a mitad de año por municipio y grupos quinquenales de edad (1990-2040)',
    resourceId: '3c3092be-583e-4490-8c23-67ef9a64b198' },
  sesnsp: { page: 'https://www.gob.mx/sesnsp/acciones-y-programas/datos-abiertos-de-incidencia-delictiva' },
};
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre',
  'Octubre', 'Noviembre', 'Diciembre'];

function fail(code, detail) { const e = new Error(detail ? `${code}: ${detail}` : code); e.code = code; throw e; }
function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// RFC 4180-ish line parser (quotes, doubled quotes); files here have no embedded newlines.
function parseLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
const encodings = {};
function* rows(file) {
  const decoded = decodeText(fs.readFileSync(file));
  encodings[path.basename(file)] = decoded.encoding;
  const text = decoded.text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  const header = parseLine(lines[0]).map((h) => h.trim());
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = parseLine(lines[i]);
    if (cells.length !== header.length) fail('invalid_csv', `line ${i + 1} has ${cells.length} cells, header ${header.length}`);
    yield Object.fromEntries(header.map((h, j) => [h, cells[j]]));
  }
}

function copyRaw(file, rawDir) {
  const bytes = fs.readFileSync(file);
  const stat = fs.statSync(file);
  const dest = path.join(rawDir, path.basename(file));
  fs.writeFileSync(dest, bytes, { mode: 0o600, flag: 'wx' });
  return { file: path.basename(file), bytes: bytes.length, sha256: sha(bytes), sourceMtime: stat.mtime.toISOString() };
}

function importConapo(file, codes, crosscheckFile, outDir) {
  const byKey = new Map(); const rowsOut = []; const years = new Set(); let badSums = 0;
  const ages = (r) => Object.keys(r).filter((k) => /^POB_\d/.test(k));
  for (const r of rows(file)) {
    if (Number(r.CLAVE_ENT) !== 14) continue;
    const cvegeo = String(r.CLAVE).padStart(5, '0');
    const total = Number(r.POB_TOTAL);
    const ageSum = ages(r).reduce((a, k) => a + Number(r[k]), 0);
    if (ageSum !== total) badSums++;
    years.add(Number(r.ANO));
    const key = `${cvegeo}:${r.ANO}`;
    const acc = byKey.get(key) || { cvegeo, year: Number(r.ANO), sexes: new Set(), total: 0 };
    if (acc.sexes.has(r.SEXO)) fail('duplicate_row', key + r.SEXO);
    acc.sexes.add(r.SEXO); acc.total += total; byKey.set(key, acc);
    rowsOut.push(r);
  }
  const found = new Set([...byKey.values()].map((v) => v.cvegeo));
  const missing = codes.filter((c) => !found.has(c)), extra = [...found].filter((c) => !codes.includes(c));
  const yearList = [...years].sort((a, b) => a - b);
  const incompleteSex = [...byKey.values()].filter((v) => v.sexes.size !== 2).length;
  const observations = [...byKey.values()].map((v) => createPopulationObservation({ cvegeo: v.cvegeo, year: v.year,
    population: v.total, methodology: 'CONAPO Reconstrucción y proyecciones municipales 1990-2040 (pobproy_quinq1.csv)' }));
  fs.writeFileSync(path.join(outDir, 'conapo-jalisco-population.json'), JSON.stringify(observations) + '\n', { mode: 0o600, flag: 'wx' });
  const header = Object.keys(rowsOut[0]);
  fs.writeFileSync(path.join(outDir, 'conapo-jalisco-subset.csv'), [header.join(','), ...rowsOut.map((r) =>
    header.map((h) => /[",]/.test(r[h]) ? `"${r[h].replace(/"/g, '""')}"` : r[h]).join(','))].join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  const stateTotal = (y) => observations.filter((o) => o.year === y).reduce((a, o) => a + o.population, 0);
  let crosscheck = null;
  if (crosscheckFile) {
    let compared = 0, mismatched = 0;
    const index = new Map(observations.map((o) => [`${o.cvegeo}:${o.year}`, o.population]));
    for (const r of rows(crosscheckFile)) {
      compared++;
      if (index.get(`${r.cvegeo}:${r.year}`) !== Number(r.population_total)) mismatched++;
    }
    crosscheck = { source: 'EXP-06 derived municipal totals 2020/2025/2026', compared, mismatched };
  }
  const ok = missing.length === 0 && extra.length === 0 && badSums === 0 && incompleteSex === 0 &&
    yearList[0] === 1990 && yearList.at(-1) === 2040 && yearList.length === 51 && (!crosscheck || crosscheck.mismatched === 0);
  return { ok, rows: rowsOut.length, municipalities: found.size, missing, extra, years: [yearList[0], yearList.at(-1), yearList.length],
    rowsWithAgeSumMismatch: badSums, municipalityYearsWithoutBothSexes: incompleteSex, observations: observations.length,
    stateTotals: { 2020: stateTotal(2020), 2025: stateTotal(2025), 2026: stateTotal(2026) }, crosscheck };
}

function importSesnsp(file, codes, outDir, label, contractId) {
  const found = new Map(); const out = []; const byMonth = Array(12).fill(0);
  let nonNumeric = 0, emptyCells = 0; const years = new Set(); const byYear = {};
  let header;
  for (const r of rows(file)) {
    header ??= Object.keys(r);
    if (Number(r.Clave_Ent) !== 14) continue;
    years.add(r['Año']);
    const code = String(r['Cve. Municipio']).padStart(5, '0');
    let rowTotal = 0;
    MONTHS.forEach((m, i) => {
      if (!(m in r)) return;
      const v = r[m].trim();
      if (v === '') { emptyCells++; return; }
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) { nonNumeric++; return; }
      byMonth[i] += n; rowTotal += n; byYear[r['Año']] = (byYear[r['Año']] || 0) + n;
    });
    found.set(code, (found.get(code) || 0) + rowTotal);
    out.push(r);
  }
  if (!out.length) fail('no_jalisco_rows', label);
  const missing = codes.filter((c) => !found.has(c));
  const nonMunicipal = [...found.keys()].filter((c) => !codes.includes(c));
  const lastMonthWithData = byMonth.reduce((last, v, i) => v > 0 ? i : last, -1);
  fs.writeFileSync(path.join(outDir, `sesnsp-${label}-jalisco-subset.csv`), [header.join(','), ...out.map((r) =>
    header.map((h) => /[",]/.test(r[h]) ? `"${r[h].replace(/"/g, '""')}"` : r[h]).join(','))].join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  const year = [...years].sort().at(-1);
  const contract = createManualImportContract({ filePath: file, sourceUrl: SOURCES.sesnsp.page,
    cutoff: `${year}-${String(lastMonthWithData + 1).padStart(2, '0')}-01`, contractId, operator: 'owner manual browser download' });
  fs.writeFileSync(path.join(outDir, `sesnsp-${label}-contract.json`), JSON.stringify(contract, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  return { ok: missing.length === 0 && nonNumeric === 0, years: [...years].sort(), rows: out.length, municipalities: found.size - nonMunicipal.length,
    missing, nonMunicipalCodes: nonMunicipal.map((c) => ({ code: c, total: found.get(c) })), nonNumericCells: nonNumeric,
    emptyCells, lastMonthWithData: lastMonthWithData >= 0 ? MONTHS[lastMonthWithData] : null,
    monthlyTotals: Object.fromEntries(MONTHS.slice(0, lastMonthWithData + 1).map((m, i) => [m, byMonth[i]])),
    yearlyTotals: byYear, total: byMonth.reduce((a, b) => a + b, 0), contractId };
}

function main(args) {
  const o = { extra: [] };
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i], v = args[i + 1];
    if (!k?.startsWith('--') || !v) fail('invalid_arguments');
    if (k === '--extra') o.extra.push(v); else o[k.slice(2)] = v;
  }
  if (!o.output || !o.inegi) fail('invalid_arguments');
  process.umask(0o077);
  const codes = JSON.parse(fs.readFileSync(o.inegi, 'utf8')).filter((u) => u.isMunicipality).map((u) => u.cvegeo).sort();
  if (codes.length !== 125) fail('invalid_inegi');
  assertNewDestination(o.output);
  fs.mkdirSync(o.output, { mode: 0o700 });
  const rawDir = path.join(o.output, 'raw');
  fs.mkdirSync(rawDir, { mode: 0o700 });
  const inputs = ['conapo', 'sesnsp-2026', 'sesnsp-2026-zip', 'sesnsp-2015', 'sesnsp-2015-zip'].filter((k) => o[k]);
  const acquisition = { version: 1, importedAt: new Date().toISOString(), method: 'manual browser download by project owner; official sources block automated clients',
    sources: SOURCES, files: Object.fromEntries([...inputs.map((k) => [k, copyRaw(o[k], rawDir)]),
      ...o.extra.map((f, i) => [`extra-${i + 1}`, copyRaw(f, rawDir)])]) };
  fs.writeFileSync(path.join(o.output, 'acquisition-manifest.json'), JSON.stringify(acquisition, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  const result = { ok: true, output: path.basename(o.output), files: Object.fromEntries(Object.entries(acquisition.files).map(([k, v]) => [k, { bytes: v.bytes, sha256: v.sha256.slice(0, 16) }])) };
  if (o.conapo) result.conapo = importConapo(o.conapo, codes, o['conapo-crosscheck'], o.output);
  if (o['sesnsp-2026']) result.sesnsp2026 = importSesnsp(o['sesnsp-2026'], codes, o.output, '2026', CONTRACT_RNID_2026);
  if (o['sesnsp-2015']) result.sesnsp2015 = importSesnsp(o['sesnsp-2015'], codes, o.output, '2015-2025', CONTRACT_2015_2025);
  result.encodings = encodings;
  result.ok = ['conapo', 'sesnsp2026', 'sesnsp2015'].every((k) => !result[k] || result[k].ok);
  fs.writeFileSync(path.join(o.output, 'import-summary.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.ok) process.exitCode = 2;
}

try { main(process.argv.slice(2)); } catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, reason: e.code || 'error', detail: e.message }) + '\n');
  process.exitCode = 1;
}
