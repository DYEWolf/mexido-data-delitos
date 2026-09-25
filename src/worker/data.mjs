// D1 queries. D1 bills rows read, so public pages read only small precomputed tables (municipios, meta, buckets).
export async function municipios(db) {
  return (await db.prepare('SELECT * FROM municipios ORDER BY nombre').all()).results;
}

export async function overview(db) {
  const [meta, buckets] = await db.batch([
    db.prepare('SELECT key, value FROM meta'),
    db.prepare('SELECT key, value, note FROM buckets'),
  ]);
  return { meta: Object.fromEntries(meta.results.map((r) => [r.key, r.value])), buckets: Object.fromEntries(buckets.results.map((r) => [r.key, r])) };
}
