#!/usr/bin/env node
'use strict';

const { importInegi } = require('../src/geo/inegi-import.cjs');
const usage = 'Usage: node scripts/import-inegi.cjs --catalog <local-file> --geometry <local-file> --acquisition <local-manifest> --output-dir <new-private-directory>';
function runCli(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { console.log(usage); return 0; }
  const flags = { '--catalog': 'catalogPath', '--geometry': 'geometryPath', '--acquisition': 'acquisitionPath', '--output-dir': 'outputDir' };
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!flags[args[i]] || !args[i + 1] || Object.hasOwn(options, flags[args[i]])) {
      console.error(JSON.stringify({ ok: false, error: 'invalid_arguments' })); return 1;
    }
    options[flags[args[i]]] = args[i + 1];
  }
  if (Object.keys(options).length !== 4) { console.error(JSON.stringify({ ok: false, error: 'invalid_arguments' })); return 1; }
  try {
    console.log(JSON.stringify({ ok: true, ...importInegi(options) }));
    return 0;
  } catch (error) {
    const allowed = new Set(['invalid_input', 'invalid_acquisition', 'invalid_catalog', 'invalid_geometry', 'private_parent_required', 'output_exists']);
    console.error(JSON.stringify({ ok: false, error: allowed.has(error.message) ? error.message : 'import_failed' }));
    return 1;
  }
}
if (require.main === module) process.exitCode = runCli(process.argv.slice(2));
module.exports = Object.freeze({ runCli, usage });
