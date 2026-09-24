const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const wranglerPath = path.join(repoRoot, 'wrangler.jsonc');
const workerPath = path.join(repoRoot, 'src/worker/index.mjs');

function stripJsonComments(input) {
  let output = '';
  let inString = false;
  let stringQuote = '';
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (i < input.length && input[i] !== '\n') i += 1;
      output += '\n';
      continue;
    }

    if (char === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function readWranglerConfig() {
  return JSON.parse(stripJsonComments(fs.readFileSync(wranglerPath, 'utf8')));
}

function bindingMap(config) {
  return new Map(config.r2_buckets.map((binding) => [binding.binding, binding.bucket_name]));
}

const expectedVars = {
  PRIVATE_ASSETS_BUCKET: 'seguridad-jalisco-private',
  PUBLIC_DERIVATIVES_BUCKET: 'seguridad-jalisco-public',
  TURNSTILE_SITE_KEY: '0x4AAAAAAE_dq8-rpvXJN1SP',
  PUBLIC_HOSTNAME: 'mexicovisible.com',
  ADMIN_HOSTNAME: 'admin.mexicovisible.com',
  CF_ZONE_NAME: 'mexicovisible.com',
};

test('wrangler config declares safe Worker entrypoint and observability', () => {
  const config = readWranglerConfig();

  assert.equal(config.name, 'mexico-data-seguridad-api');
  assert.equal(config.main, 'src/worker/index.mjs');
  assert.match(config.compatibility_date, /^20\d{2}-\d{2}-\d{2}$/);
  assert.equal(Object.hasOwn(config, 'compatibility_flags'), false);
  assert.equal(config.workers_dev, false);
  assert.equal(config.observability.enabled, true);
  assert.equal(config.observability.logs.enabled, true);
  assert.equal(config.observability.traces.enabled, true);
});

test('wrangler config includes R2 bindings and no staging environment', () => {
  const config = readWranglerConfig();
  const bindings = bindingMap(config);
  assert.equal(bindings.get('PRIVATE_ASSETS'), 'seguridad-jalisco-private');
  assert.equal(bindings.get('PUBLIC_DERIVATIVES'), 'seguridad-jalisco-public');
  assert.equal(Object.hasOwn(config, 'env'), false);
});

test('wrangler config includes only non-secret vars and no Turnstile secret value', () => {
  const config = readWranglerConfig();
  const serialized = JSON.stringify(config);

  for (const [key, value] of Object.entries(expectedVars)) {
    assert.equal(config.vars[key], value);
  }

  assert.equal(config.vars.ENVIRONMENT, 'production');
  assert.equal(Object.hasOwn(config.vars, 'TURNSTILE_SECRET_KEY'), false);
  assert.equal(serialized.includes('TURNSTILE_SECRET_KEY'), false);
});

test('Worker health endpoints are safe by default', async () => {
  const worker = (await import(pathToFileURL(workerPath))).default;
  const env = { ENVIRONMENT: 'staging' };

  const publicHealth = await worker.fetch(new Request('https://staging.mexicovisible.com/health'), env);
  assert.equal(publicHealth.status, 200);
  assert.deepEqual(await publicHealth.json(), { ok: true, environment: 'staging' });

  const adminHealth = await worker.fetch(new Request('https://admin-staging.mexicovisible.com/admin/health'), env);
  assert.equal(adminHealth.status, 403);
  const adminBody = await adminHealth.json();
  assert.equal(adminBody.ok, false);
  assert.equal(adminBody.error, 'forbidden');
  assert.equal(JSON.stringify(adminBody).includes('TURNSTILE'), false);

  const missing = await worker.fetch(new Request('https://staging.mexicovisible.com/missing'), env);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { ok: false, error: 'not_found' });
});
