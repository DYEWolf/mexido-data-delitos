// D1 queries. D1 bills rows read, so every public query is index-bounded:
// - totals, years and filter counts are precomputed at build time (meta, cedula_counts);
// - the wall uses keyset pagination on (fecha, id), ~25 rows per page, never OFFSET scans;
// - suppressions are excluded at read time, so a takedown is effective before the next rebuild.
const NOT_SUPPRESSED = 'id NOT IN (SELECT id FROM suppressions)';
export const PAGE_SIZE = 24;

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const CURSOR = /^(\d{4}-\d{2}-\d{2}|)~([A-Za-z0-9_-]{1,64})$/;

export function parseFilters(url) {
  const p = url.searchParams;
  const q = norm(p.get('q')).slice(0, 80);
  const municipio = /^14\d{3}$|^ne$/.test(p.get('municipio') || '') ? p.get('municipio') : '';
  const sexo = ['HOMBRE', 'MUJER'].includes(p.get('sexo')) ? p.get('sexo') : '';
  const anio = /^(19|20)\d{2}$/.test(p.get('anio') || '') ? p.get('anio') : '';
  const despues = CURSOR.exec(p.get('despues') || ''), antes = CURSOR.exec(p.get('antes') || '');
  return { q, municipio, sexo, anio, despues: despues && [despues[1], despues[2]], antes: !despues && antes ? [antes[1], antes[2]] : null };
}

function filterSql(f, prefix = '') {
  const where = []; const args = [];
  if (f.q) for (const word of f.q.split(' ').slice(0, 5)) { where.push(`${prefix}nombre_norm LIKE ?`); args.push(`%${word}%`); }
  if (f.municipio === 'ne') where.push(`${prefix}municipio_cvegeo IS NULL`);
  else if (f.municipio) { where.push(`${prefix}municipio_cvegeo = ?`); args.push(f.municipio); }
  if (f.sexo) { where.push(`${prefix}sexo = ?`); args.push(f.sexo); }
  if (f.anio) { where.push(`${prefix}fecha >= ? AND ${prefix}fecha < ?`); args.push(`${f.anio}-01-01`, `${Number(f.anio) + 1}-01-01`); }
  return { where, args };
}

async function countCedulas(db, f) {
  const { where, args } = filterSql(f, 'c.');
  if (f.q) {
    // Name search has no precomputed count; cap the scan.
    const r = await db.prepare(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM cedulas c WHERE ${[...where, 'c.' + NOT_SUPPRESSED].join(' AND ')} LIMIT 1001)`).bind(...args).first();
    return { n: Math.min(r.n, 1000), capped: r.n > 1000 };
  }
  const cw = []; const ca = [];
  if (f.municipio) { cw.push('municipio = ?'); ca.push(f.municipio === 'ne' ? '' : f.municipio); }
  if (f.sexo) { cw.push('sexo = ?'); ca.push(f.sexo); }
  if (f.anio) { cw.push('anio = ?'); ca.push(f.anio); }
  const [total, supp] = await db.batch([
    db.prepare(`SELECT COALESCE(SUM(n), 0) AS n FROM cedula_counts${cw.length ? ` WHERE ${cw.join(' AND ')}` : ''}`).bind(...ca),
    db.prepare(`SELECT COUNT(*) AS n FROM suppressions s JOIN cedulas c ON c.id = s.id${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`).bind(...args),
  ]);
  return { n: total.results[0].n - supp.results[0].n, capped: false };
}

export async function listCedulas(db, f) {
  const { where, args } = filterSql(f);
  where.push(NOT_SUPPRESSED);
  const back = !!f.antes;
  if (f.despues) { where.push('(fecha, id) < (?, ?)'); args.push(...f.despues); }
  if (f.antes) { where.push('(fecha, id) > (?, ?)'); args.push(...f.antes); }
  const [rowsRes, count] = await Promise.all([
    db.prepare(`SELECT id, nombre, edad, sexo, fecha, municipio_nombre, foto_key FROM cedulas WHERE ${where.join(' AND ')}
      ORDER BY fecha ${back ? 'ASC' : 'DESC'}, id ${back ? 'ASC' : 'DESC'} LIMIT ${PAGE_SIZE + 1}`).bind(...args).all(),
    countCedulas(db, f),
  ]);
  let rows = rowsRes.results;
  const more = rows.length > PAGE_SIZE;
  rows = rows.slice(0, PAGE_SIZE);
  if (back) rows.reverse();
  const cursor = (r) => (r ? `${r.fecha}~${r.id}` : null);
  return { rows, total: count.n, capped: count.capped,
    next: (back || more) && rows.length ? cursor(rows.at(-1)) : null,
    prev: (f.despues || (back && more)) && rows.length ? cursor(rows[0]) : null };
}

export async function getCedula(db, id) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  return db.prepare(`SELECT * FROM cedulas WHERE id = ? AND ${NOT_SUPPRESSED}`).bind(id).first();
}

export async function municipios(db) {
  return (await db.prepare('SELECT * FROM municipios ORDER BY nombre').all()).results;
}

export async function overview(db) {
  const [meta, buckets, supp] = await db.batch([
    db.prepare('SELECT key, value FROM meta'),
    db.prepare('SELECT key, value, note FROM buckets'),
    db.prepare('SELECT COUNT(*) AS n FROM suppressions s JOIN cedulas c ON c.id = s.id'),
  ]);
  const m = Object.fromEntries(meta.results.map((r) => [r.key, r.value]));
  const totals = JSON.parse(m.totals || '{}');
  return { meta: m, buckets: Object.fromEntries(buckets.results.map((r) => [r.key, r])),
    totals: { ...totals, cedulas: Number(m.published) - supp.results[0].n }, years: JSON.parse(m.years || '[]') };
}
