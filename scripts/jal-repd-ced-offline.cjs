'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateResponse } = require('../src/jal-repd-ced/schema.cjs');
const { normalizeRecord } = require('../src/jal-repd-ced/normalize.cjs');
const { DEFAULT_SOURCE_ENDPOINT, buildManifest } = require('../src/jal-repd-ced/manifest.cjs');

const SCOPES = new Set(['sample', 'partial', 'complete_within_scope', 'unknown']);

function usage() {
  return 'Usage: node scripts/jal-repd-ced-offline.cjs <local-input.json> <output-directory> --observed-at <ISO-8601> [--scope sample|partial|complete_within_scope|unknown] [--source-endpoint <URL>]';
}

function cliError(code, message) {
  return { ok: false, error: { code, message } };
}

function parseArgs(argv) {
  const positionals = [];
  const options = { scope: 'sample', sourceEndpoint: DEFAULT_SOURCE_ENDPOINT };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--observed-at' || argument === '--scope' || argument === '--source-endpoint') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        return cliError('invalid_arguments', `${argument} requires a value.`);
      }
      index += 1;
      if (argument === '--observed-at') options.observedAt = value;
      if (argument === '--scope') options.scope = value;
      if (argument === '--source-endpoint') options.sourceEndpoint = value;
    } else if (argument.startsWith('--')) {
      return cliError('invalid_arguments', `Unsupported option: ${argument}`);
    } else {
      positionals.push(argument);
    }
  }

  if (positionals.length !== 2 || !options.observedAt) {
    return cliError('invalid_arguments', usage());
  }
  if (/^https?:\/\//i.test(positionals[0])) {
    return cliError('remote_input_rejected', 'Input must be a local JSON file; http(s) inputs are not allowed.');
  }
  if (!SCOPES.has(options.scope)) {
    return cliError('invalid_scope', 'Scope must be sample, partial, complete_within_scope, or unknown.');
  }

  const observedDate = new Date(options.observedAt);
  if (Number.isNaN(observedDate.getTime())) {
    return cliError('invalid_observed_at', 'observedAt must be a valid ISO-8601 timestamp.');
  }

  return {
    ok: true,
    inputPath: positionals[0],
    outputDirectory: positionals[1],
    observedAt: observedDate.toISOString(),
    scope: options.scope,
    sourceEndpoint: options.sourceEndpoint,
  };
}

function runCli(argv, dependencies = {}) {
  const fileSystem = dependencies.fs || fs;
  const writeStdout = dependencies.writeStdout || ((line) => process.stdout.write(`${line}\n`));
  const writeStderr = dependencies.writeStderr || ((line) => process.stderr.write(`${line}\n`));
  const parsed = parseArgs(argv);

  if (!parsed.ok) {
    writeStderr(JSON.stringify(parsed.error));
    return { exitCode: 1, ...parsed };
  }

  let response;
  try {
    response = JSON.parse(fileSystem.readFileSync(parsed.inputPath, 'utf8'));
  } catch {
    const result = cliError('input_read_failed', 'Input could not be read as local JSON.');
    writeStderr(JSON.stringify(result.error));
    return { exitCode: 1, ...result };
  }

  const validation = validateResponse(response);
  if (!validation.valid) {
    const result = { ok: false, error: { code: 'validation_failed', errors: validation.errors } };
    writeStderr(JSON.stringify(result.error));
    return { exitCode: 1, ...result };
  }

  const normalizedRecords = response.results.map(normalizeRecord);
  const manifest = buildManifest({
    response,
    normalizedRecords,
    observedAt: parsed.observedAt,
    sourceEndpoint: parsed.sourceEndpoint,
    scope: parsed.scope,
  });
  const recordsPath = path.join(parsed.outputDirectory, 'records.ndjson');
  const manifestPath = path.join(parsed.outputDirectory, 'manifest.json');

  try {
    fileSystem.mkdirSync(parsed.outputDirectory, { recursive: true });
    fileSystem.writeFileSync(recordsPath, `${normalizedRecords.map(JSON.stringify).join('\n')}\n`, 'utf8');
    fileSystem.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  } catch {
    const result = cliError('output_write_failed', 'Output files could not be written.');
    writeStderr(JSON.stringify(result.error));
    return { exitCode: 1, ...result };
  }

  const result = { exitCode: 0, ok: true, recordCount: normalizedRecords.length, manifest };
  writeStdout(JSON.stringify({ status: 'ok', recordCount: result.recordCount }));
  return result;
}

if (require.main === module) {
  process.exitCode = runCli(process.argv.slice(2)).exitCode;
}

module.exports = Object.freeze({
  parseArgs,
  runCli,
  usage,
});
