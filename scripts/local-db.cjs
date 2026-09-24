'use strict';
// Loads the newest private publish build (s3-publish-*/publish.sql) into the LOCAL D1 used by `npm run dev`.
// Usage: npm run db:local [-- /path/to/publish.sql]
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EVIDENCE = '/Users/chris/Documents/seguridad-mexico';
let file = process.argv[2];
if (!file) {
  const dirs = fs.readdirSync(EVIDENCE).filter((d) => d.startsWith('s3-publish-')).sort();
  if (!dirs.length) { console.error('No hay builds s3-publish-* en', EVIDENCE); process.exit(1); }
  file = path.join(EVIDENCE, dirs.at(-1), 'publish.sql');
}
console.log('Cargando en D1 local:', file);
const r = spawnSync(path.resolve(__dirname, '../node_modules/.bin/wrangler'),
  ['d1', 'execute', 'seguridad-jalisco', '--local', '--file', file, '--yes'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
