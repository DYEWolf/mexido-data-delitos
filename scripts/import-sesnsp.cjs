#!/usr/bin/env node
'use strict';

const { createManualImportContract } = require('../src/sesnsp/import-contract.cjs');

function usage() {
  return 'Usage: node scripts/import-sesnsp.cjs --file <official-file> --source-url <url> --cutoff <date> --contract MX-SESNSP-2015-2025|MX-SESNSP-RNID-2026 [--operator name] [--explicit-mapping]';
}

function cliError(code, message) {
  return { ok: false, error: { code, message } };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--file', '--source-url', '--cutoff', '--contract', '--methodology', '--operator'].includes(argument)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) return cliError('invalid_arguments', `${argument} requires a value.`);
      index += 1;
      if (argument === '--file') options.filePath = value;
      if (argument === '--source-url') options.sourceUrl = value;
      if (argument === '--cutoff') options.cutoff = value;
      if (argument === '--contract') options.contractId = value;
      if (argument === '--methodology') options.methodology = value;
      if (argument === '--operator') options.operator = value;
    } else if (argument === '--explicit-mapping') {
      options.explicitMapping = true;
    } else if (argument === '--help' || argument === '-h') {
      return { ok: true, help: true };
    } else {
      return cliError('invalid_arguments', `Unsupported option: ${argument}`);
    }
  }
  if (!options.filePath || !options.sourceUrl || !options.cutoff || !options.contractId) {
    return cliError('invalid_arguments', usage());
  }
  return { ok: true, ...options };
}

async function runCli(argv, dependencies = {}) {
  const writeStdout = dependencies.writeStdout || ((line) => process.stdout.write(`${line}\n`));
  const writeStderr = dependencies.writeStderr || ((line) => process.stderr.write(`${line}\n`));
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    writeStderr(JSON.stringify(parsed.error));
    return { exitCode: 1, ...parsed };
  }
  if (parsed.help) {
    writeStdout(usage());
    return { exitCode: 0, ok: true };
  }
  try {
    const contract = createManualImportContract(parsed, dependencies);
    writeStdout(JSON.stringify(contract, null, 2));
    return { exitCode: 0, ok: true, contract };
  } catch (error) {
    const response = cliError(error.code || 'sesnsp_import_failed', error.message);
    writeStderr(JSON.stringify(response.error));
    return { exitCode: 1, ...response };
  }
}

if (require.main === module) {
  runCli(process.argv.slice(2)).then((result) => {
    process.exitCode = result.exitCode;
  });
}

module.exports = Object.freeze({ parseArgs, runCli, usage });
