'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { BUCKET, MAX_BODY } = require('./private-r2-upload.cjs');
const WRANGLER = path.resolve(__dirname, '../../node_modules/.bin/wrangler');
// Installed 4.136.1 UserError renderer: esbuild error, console.error newline, then explicit-log notice.
const MISSING_ERROR = '\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m \x1b[1mThe specified key does not exist.\x1b[0m\n\n\n';
function fail(code, consumed = 0) { const e = new Error(code); e.code = code; e.consumed = consumed; throw e; }
function preflightLines(output, progress) {
  if (typeof output !== 'string' || output.length > 65536 || /\x1b|\r|\0/.test(output)) fail('unsafe_bucket');
  const lines = output.replace(/^\n+|\n+$/g, '').split('\n');
  if (/^ ⛅️ wrangler 4\.136\.1(?: \(update available \d+\.\d+\.\d+\))?$/.test(lines[0])) {
    // Wrangler's installed banner prints a separator of exactly the title's JS string length.
    if (lines[1] !== '─'.repeat(lines[0].length)) fail('unsafe_bucket');
    lines.splice(0, 2);
  }
  if (progress && lines[0] === progress) lines.shift();
  return lines;
}
function parsePreflight(dev, domains, lifecycle) {
  const bucket = 'seguridad-jalisco-private';
  if (preflightLines(dev).join('\n') !== 'Public access via the r2.dev URL is disabled.' ||
    preflightLines(domains, `Listing custom domains connected to bucket '${bucket}'...`).join('\n') !==
      'There are no custom domains connected to this bucket.') fail('unsafe_bucket');
  // Each lifecycle field must be the sole known safe value; an additional line/rule is not safe.
  const lines = preflightLines(lifecycle, `Listing lifecycle rules for bucket '${bucket}'...`);
  if (lines.length !== 4 ||
    !/^name:\s+Default Multipart Abort Rule$/i.test(lines[0]) ||
    !/^enabled:\s+Yes$/i.test(lines[1]) ||
    !/^prefix:\s+\(all prefixes\)$/i.test(lines[2]) ||
    !/^action:\s+Abort incomplete multipart uploads after 7 days$/i.test(lines[3])) fail('unsafe_bucket');
  return true;
}
// Bounded streaming collector, no shell, detached process group and close awaited after kill.
async function runProcess(command, args, { input, timeoutMs = 30000, maxBytes = MAX_BODY,
  stderrLimit = 65536, env = process.env, cwd } = {}) {
  if (timeoutMs < 1 || timeoutMs > 30000 || maxBytes < 1 || maxBytes > MAX_BODY ||
    stderrLimit < 1 || stderrLimit > 65536) fail('invalid_arguments');
  return new Promise((resolve) => {
    let child, reason, consumed = 0, errorBytes = 0;
    const output = [], errors = [];
    try { child = spawn(command, args, { env, cwd, detached: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch { resolve({ code: 'process_failed', consumed: 0 }); return; }
    const kill = (code) => {
      reason ??= code;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
    };
    const timer = setTimeout(() => kill('process_timeout'), timeoutMs);
    child.stdout.on('data', (chunk) => {
      consumed += chunk.length;
      if (consumed > maxBytes) { kill('process_oversize'); return; }
      output.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      errorBytes += chunk.length;
      if (errorBytes > stderrLimit) { kill('process_oversize'); return; }
      errors.push(chunk);
    });
    child.on('error', () => { reason ??= 'process_failed'; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: reason || (code === 0 ? 'ok' : 'process_failed'),
        exitCode: code, consumed, stdout: Buffer.concat(output), stderr: Buffer.concat(errors) });
    });
    if (input) { child.stdin.on('error', () => {}); child.stdin.end(input); }
    else child.stdin.end();
  });
}
function makeWrangler(ledgerDir, { now = Date.now, run = runProcess } = {}) {
  if (typeof now !== 'function' || typeof run !== 'function') fail('invalid_arguments');
  const log = path.join(ledgerDir, 'wrangler.log');
  // Explicit .log avoids Wrangler's default maintenance of historical logs.
  const env = { ...process.env, WRANGLER_LOG_PATH: log, WRANGLER_LOG_SANITIZE: 'true',
    WRANGLER_SEND_METRICS: 'false', CI: '1' };
  function timeoutFor(deadlineMs) {
    if (deadlineMs === undefined) return 30000;
    if (!Number.isSafeInteger(deadlineMs)) fail('invalid_arguments');
    const remaining = deadlineMs - now();
    if (remaining <= 0) fail('deadline_exceeded');
    return Math.min(30000, remaining);
  }
  async function command(args, { deadlineMs, ...options } = {}) {
    const r = await run(WRANGLER, args, { ...options, timeoutMs: timeoutFor(deadlineMs), env, cwd: ledgerDir });
    if (deadlineMs !== undefined && now() >= deadlineMs) fail('deadline_exceeded', r.consumed);
    if (r.code !== 'ok') fail(r.code, r.consumed);
    return r;
  }
  async function preflight(bucket, deadlineMs) {
    if (bucket !== BUCKET) fail('invalid_arguments');
    const dev = await command(['r2', 'bucket', 'dev-url', 'get', BUCKET], { maxBytes: 65536, deadlineMs });
    const domains = await command(['r2', 'bucket', 'domain', 'list', BUCKET], { maxBytes: 65536, deadlineMs });
    const lifecycle = await command(['r2', 'bucket', 'lifecycle', 'list', BUCKET], { maxBytes: 65536, deadlineMs });
    return parsePreflight(dev.stdout.toString(), domains.stdout.toString(), lifecycle.stdout.toString());
  }
  function target(key) {
    if (typeof key !== 'string' || !/^jal-repd-ced\/c05c\/[a-f0-9]{64}\/[a-f0-9]{64}$/.test(key)) fail('invalid_arguments');
    return `${BUCKET}/${key}`;
  }
  return {
    preflight,
    async get(key, deadlineMs) {
      const r = await run(WRANGLER, ['r2', 'object', 'get', target(key), '--pipe', '--remote'],
        { maxBytes: MAX_BODY, timeoutMs: timeoutFor(deadlineMs), env, cwd: ledgerDir });
      if (deadlineMs !== undefined && now() >= deadlineMs) fail('deadline_exceeded', r.consumed);
      if (!Number.isSafeInteger(r.consumed) || r.consumed < 0 || r.consumed > MAX_BODY ||
        !Buffer.isBuffer(r.stdout) || !Buffer.isBuffer(r.stderr) || r.stdout.length !== r.consumed) {
        fail('remote_uncertain', r.consumed);
      }
      if (r.code === 'ok' && r.exitCode === 0) return { status: 'found', bytes: r.stdout, consumed: r.consumed };
      const expected = Buffer.from(MISSING_ERROR + `🪵  Logs were written to "${log}"\n`);
      const control = r.consumed === 0 || (r.consumed === 1 && r.stdout[0] === 10);
      if (r.code === 'process_failed' && r.exitCode === 1 && control && r.stderr.equals(expected)) {
        return { status: 'missing', consumed: r.consumed, controlBytes: r.consumed };
      }
      fail('remote_uncertain', r.consumed);
    },
    async put(key, bytes, mime, deadlineMs) {
      if (!Buffer.isBuffer(bytes) || bytes.length > MAX_BODY ||
        !['image/jpeg', 'image/png'].includes(mime)) fail('invalid_arguments');
      await command(['r2', 'object', 'put', target(key), '--pipe', '--content-type', mime, '--remote'],
        { input: bytes, maxBytes: 65536, deadlineMs });
      return { ok: true, consumed: bytes.length };
    },
  };
}
module.exports = Object.freeze({ parsePreflight, runProcess, makeWrangler });
