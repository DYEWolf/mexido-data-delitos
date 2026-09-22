'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const modulePath = require.resolve('../scripts/exp-01.cjs');

function loadFresh() {
  delete require.cache[modulePath];
  return require('../scripts/exp-01.cjs');
}

function sourceRequest(exp, resourceType = 'xhr') {
  return { url: exp.SOURCE_ENTRY_URL, resourceType };
}

function syntheticMetadata(bytes = 0) {
  return {
    status: 200,
    mimeType: 'application/json; charset=utf-8',
    resourceType: 'xhr',
    bytes,
    url: 'https://example.invalid/?personal=data',
  };
}

test('import is inert and does not load Playwright', () => {
  const originalLoad = require('node:module')._load;
  let playwrightLoaded = false;
  require('node:module')._load = function guardedLoad(request, parent, isMain) {
    if (request === 'playwright-core') playwrightLoaded = true;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const exp = loadFresh();
    assert.equal(playwrightLoaded, false);
    assert.equal(typeof exp.runCli, 'function');
  } finally {
    require('node:module')._load = originalLoad;
    delete require.cache[modulePath];
  }
});

test('default, offline, and help commands remain inert', () => {
  const exp = loadFresh();
  const output = [];

  assert.deepEqual(exp.runCli([], { write: (line) => output.push(line) }), {
    status: 'not_run', mode: 'preparation',
  });
  assert.deepEqual(exp.runCli(['--offline'], { write: (line) => output.push(line) }), {
    status: 'not_run', mode: 'offline',
  });
  assert.deepEqual(exp.runCli(['--help'], { write: (line) => output.push(line) }), {
    status: 'not_run', mode: 'help',
  });
  assert.match(output[2], /Estado: not_run/);
  assert.match(output[2], /no implementan control del navegador/);
  assert.doesNotMatch(output[2], /https?:\/\//);
});

test('invalid and incomplete CLI combinations are blocked without echoing input', () => {
  const exp = loadFresh();

  assert.deepEqual(exp.runCli(['--unsafe=https://personal.example/?name=Ada'], { write() {} }), {
    status: 'blocked', code: 'invalid_arguments',
  });
  assert.deepEqual(exp.runCli(['--live'], { write() {} }), {
    status: 'blocked', code: 'live_confirmation_required',
  });
  assert.deepEqual(exp.runCli(['--offline', '--confirm-live'], { write() {} }), {
    status: 'blocked', code: 'invalid_arguments',
  });
});

test('live flags do not launch a browser because live navigation is unavailable', () => {
  const exp = loadFresh();
  let browserLaunches = 0;

  const result = exp.runCli(['--live', '--confirm-live'], {
    write() {},
    launchBrowser() { browserLaunches += 1; },
  });

  assert.deepEqual(result, { status: 'not_run', mode: 'live_unavailable' });
  assert.equal(browserLaunches, 0);
});

test('only the fixed listing is admitted once and every detail is denied', () => {
  const exp = loadFresh();
  const guard = exp.createRunGuard();

  assert.deepEqual(guard.allowNavigation({
    url: exp.SOURCE_ENTRY_URL,
    kind: 'detail',
    humanConfirmed: true,
  }), { allowed: false, code: 'detail_boundary_unavailable' });
  assert.deepEqual(guard.allowNavigation({
    url: exp.SOURCE_ENTRY_URL,
    kind: 'listing',
  }), { allowed: true, code: 'allowed' });
  assert.deepEqual(guard.allowNavigation({
    url: exp.SOURCE_ENTRY_URL,
    kind: 'listing',
  }), { allowed: false, code: 'listing_limit_reached' });
  assert.deepEqual(guard.allowNavigation({
    url: 'https://example.invalid/',
    kind: 'listing',
  }), { allowed: false, code: 'navigation_not_allowed' });
});

test('policy collections are immutable and auxiliary requests are limited', () => {
  const exp = loadFresh();
  assert.equal(Object.isFrozen(exp.POLICY), true);
  assert.equal(Object.isFrozen(exp.POLICY.allowedMetadataMimeTypes), true);
  assert.equal(Object.isFrozen(exp.POLICY.allowedMetadataResourceTypes), true);
  assert.throws(() => exp.POLICY.allowedMetadataMimeTypes.push('image/jpeg'), TypeError);

  const guard = exp.createRunGuard();
  for (let index = 0; index < exp.POLICY.maxAuxiliaryRequests; index += 1) {
    assert.deepEqual(guard.allowRequest(sourceRequest(exp)), { allowed: true, code: 'allowed' });
  }
  assert.deepEqual(guard.allowRequest(sourceRequest(exp)), {
    allowed: false, code: 'request_limit_reached',
  });
  assert.deepEqual(guard.allowRequest(sourceRequest(exp, 'image')), {
    allowed: false, code: 'request_not_allowed',
  });
  assert.deepEqual(guard.allowRequest({ url: 'https://example.invalid/', resourceType: 'xhr' }), {
    allowed: false, code: 'request_not_allowed',
  });
});

test('the exact deadline blocks requests and metadata storage', () => {
  const exp = loadFresh();
  const clock = { now: 1_000 };
  const guard = exp.createRunGuard({ clock: () => clock.now });

  assert.deepEqual(guard.allowRequest(sourceRequest(exp)), { allowed: true, code: 'allowed' });
  clock.now += exp.POLICY.maxDurationMs;
  assert.deepEqual(guard.checkTime(), { allowed: false, code: 'time_limit_reached' });
  assert.deepEqual(guard.allowRequest(sourceRequest(exp)), {
    allowed: false, code: 'time_limit_reached',
  });
  assert.deepEqual(guard.recordMetadata(syntheticMetadata()), {
    accepted: false, code: 'time_limit_reached',
  });
  assert.equal(guard.canStoreEvidence(0), false);
});

test('metadata storage charges the serialized allowlisted representation, not remote bytes', () => {
  const exp = loadFresh();
  const guard = exp.createRunGuard();
  const accepted = guard.recordMetadata(syntheticMetadata(99_999_999));

  assert.equal(accepted.accepted, true);
  assert.deepEqual(accepted.metadata, {
    status: 200, mimeType: 'application/json', resourceType: 'xhr', remoteBytes: 99_999_999,
  });
  assert.equal(accepted.storageBytes, Buffer.byteLength(accepted.serialization, 'utf8'));
  assert.equal(accepted.serialization, `${JSON.stringify(accepted.metadata)}\n`);
  assert.doesNotMatch(accepted.serialization, /example\.invalid|personal/);
});

test('synthetic metadata exhausts the private-evidence budget without payload capture', () => {
  const exp = loadFresh();
  const guard = exp.createRunGuard();
  let result;
  let acceptedCount = 0;

  do {
    result = guard.recordMetadata(syntheticMetadata(0));
    if (result.accepted) acceptedCount += 1;
  } while (result.accepted);

  assert.ok(acceptedCount > 1);
  assert.deepEqual(result, { accepted: false, code: 'evidence_limit_reached' });
});
