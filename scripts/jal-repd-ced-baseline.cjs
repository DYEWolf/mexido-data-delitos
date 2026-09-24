#!/usr/bin/env node
'use strict';

const { runBaseline, SOURCE_ENDPOINT, validateSource } = require('../src/jal-repd-ced/baseline.cjs');
const { createJsonClient } = require('../src/jal-repd-ced/http-client.cjs');

const DEFAULT_BASELINE_SOURCE_ENDPOINT = SOURCE_ENDPOINT;
function usage() {
  return 'Usage: node scripts/jal-repd-ced-baseline.cjs --output-dir /private/path [--max-pages N] [--page-size N] [--start-page N] [--dry-run] [--assets metadata_only|skip] [--source-endpoint URL]';
}
function cliError(code) { return { ok: false, error: { code, message: code } }; }
function parseArgs(argv) {
  const options = { sourceEndpoint: SOURCE_ENDPOINT, assets: 'metadata_only' };
  const values = { '--output-dir': 'outputDirectory', '--max-pages': 'maxPages',
    '--page-size': 'pageSize', '--start-page': 'startPage', '--source-endpoint': 'sourceEndpoint',
    '--assets': 'assets', '--observed-at': 'observedAt' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (Object.hasOwn(values, argument)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) return cliError('invalid_arguments');
      const key = values[argument];
      if (['maxPages', 'pageSize', 'startPage'].includes(key)) {
        if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return cliError('invalid_arguments');
        options[key] = Number(value);
      } else options[key] = value;
    } else if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--no-resume') options.resume = false;
    else if (argument === '--allow-repo-output-for-tests') options.allowRepoOutputForTests = true;
    else if (argument === '--help' || argument === '-h') return { ok: true, help: true };
    else return cliError('invalid_arguments');
  }
  if (!options.outputDirectory || !['metadata_only', 'skip'].includes(options.assets)) {
    return cliError('invalid_arguments');
  }
  if (options.observedAt) {
    const observed = new Date(options.observedAt);
    if (Number.isNaN(observed.getTime()) || observed.toISOString() !== options.observedAt) {
      return cliError('invalid_observed_at');
    }
  }
  try { validateSource(options.sourceEndpoint, options.pageSize || 100); }
  catch (_) { return cliError('invalid_source'); }
  return { ok: true, ...options };
}
function buildEndpointUrl(sourceEndpoint, { page, pageSize }) {
  validateSource(sourceEndpoint, pageSize);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error('invalid_options');
  }
  const url = new URL(sourceEndpoint);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(pageSize));
  return url;
}
function makeLiveFetch(sourceEndpoint, settings) {
  const client = createJsonClient(settings);
  return ({ page, pageSize }) => client.get(buildEndpointUrl(sourceEndpoint, { page, pageSize }));
}
async function runCli(argv, dependencies = {}) {
  const writeStdout = dependencies.writeStdout || ((line) => process.stdout.write(`${line}\n`));
  const writeStderr = dependencies.writeStderr || ((line) => process.stderr.write(`${line}\n`));
  const parsed = parseArgs(argv);
  if (!parsed.ok) { writeStderr(JSON.stringify(parsed.error)); return { exitCode: 1, ...parsed }; }
  if (parsed.help) { writeStdout(usage()); return { exitCode: 0, ok: true }; }
  try {
    const result = await runBaseline({
      outputDirectory: parsed.outputDirectory,
      fetchPage: dependencies.fetchPage || makeLiveFetch(parsed.sourceEndpoint),
      maxPages: parsed.maxPages, pageSize: parsed.pageSize, startPage: parsed.startPage,
      dryRun: parsed.dryRun, resume: parsed.resume, observedAt: parsed.observedAt,
      sourceEndpoint: parsed.sourceEndpoint, assets: parsed.assets,
      storageOptions: { allowRepoOutputForTests: parsed.allowRepoOutputForTests,
        cwd: dependencies.cwd, fs: dependencies.fs, worktreeRoot: dependencies.worktreeRoot },
    });
    writeStdout(JSON.stringify({ status: result.ok ? 'ok' : 'incomplete',
      recordCount: result.records ? result.records.length : 0,
      failedPageCount: result.failedPages ? result.failedPages.length : 0,
      schemaErrorCount: result.schemaErrors ? result.schemaErrors.length : 0,
      dryRun: !!result.dryRun }));
    return { exitCode: result.ok ? 0 : 2, ok: result.ok, result };
  } catch (error) {
    const allowed = new Set(['invalid_options', 'invalid_source', 'invalid_checkpoint',
      'failed_resume_unsupported', 'existing_output', 'repo_output_rejected',
      'discovery_validation_failed', 'body_too_large', 'request_timeout', 'network_failed',
      'retry_wait_exceeded', 'redirect_rejected', 'invalid_json', 'invalid_content_type',
      'http_rejected', 'http_retryable']);
    const response = cliError(allowed.has(error.code) ? error.code : 'baseline_failed');
    writeStderr(JSON.stringify(response.error));
    return { exitCode: 1, ...response };
  }
}
if (require.main === module) {
  runCli(process.argv.slice(2)).then((result) => { process.exitCode = result.exitCode; });
}
module.exports = Object.freeze({ DEFAULT_BASELINE_SOURCE_ENDPOINT, buildEndpointUrl,
  makeLiveFetch, parseArgs, runCli, usage });
