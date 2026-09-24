'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const SOURCE_ID = 'MX-SESNSP';
const CONTRACT_2015_2025 = 'MX-SESNSP-2015-2025';
const CONTRACT_RNID_2026 = 'MX-SESNSP-RNID-2026';
const IMPORT_CONTRACT_VERSION = '1';

const REQUIRED_COLUMNS = Object.freeze({
  [CONTRACT_2015_2025]: ['Año', 'Clave_Ent', 'Entidad', 'Cve. Municipio', 'Municipio'],
  [CONTRACT_RNID_2026]: ['Año', 'Clave_Ent', 'Entidad', 'Cve. Municipio', 'Municipio'],
});

function importError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw importError('invalid_sesnsp_import', `${name} must be a non-empty string.`);
  }
  return value.trim();
}

function assertValidContract(contractId) {
  if (![CONTRACT_2015_2025, CONTRACT_RNID_2026].includes(contractId)) {
    throw importError('unknown_sesnsp_contract', `Unsupported SESNSP contract: ${contractId}`);
  }
  return contractId;
}

function assertNoMixedContracts(contractId, options = {}) {
  const declared = new Set([contractId, ...(options.inputContracts || [])].filter(Boolean));
  if (declared.size > 1 && !options.explicitMapping) {
    throw importError('mixed_sesnsp_contracts', 'Do not mix MX-SESNSP-2015-2025 and MX-SESNSP-RNID-2026 without explicit mapping.');
  }
}

function parseDelimitedHeader(line) {
  const text = String(line || '').replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  const delimiter = text.includes('\t') ? '\t' : text.includes('|') ? '|' : ',';
  return text.split(delimiter).map((column) => column.trim().replace(/^"|"$/g, ''));
}

function readHeaderSample(filePath, dependencies = {}) {
  if (dependencies.headerSample !== undefined) return dependencies.headerSample;
  const readFileSync = dependencies.readFileSync || fs.readFileSync;
  const extension = path.extname(filePath).toLowerCase();
  if (!['.csv', '.txt', '.tsv'].includes(extension)) return '';
  const buffer = readFileSync(filePath);
  return decodeText(buffer).text.split(/\r?\n/, 1)[0] || '';
}

// SESNSP publishes some CSVs in UTF-8 and others in Latin-1 (e.g. 2015-2025 municipal): try strict UTF-8 first.
function decodeText(buffer) {
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(buffer), encoding: 'utf-8' }; }
  catch { return { text: buffer.toString('latin1'), encoding: 'latin1' }; }
}

function validateHeaderSample(headerSample, contractId) {
  const columns = Array.isArray(headerSample) ? headerSample : parseDelimitedHeader(headerSample);
  if (columns.length === 0) {
    return { ok: true, skipped: true, reason: 'header_sample_unavailable_or_binary_xlsx' };
  }
  const normalized = new Set(columns.map((column) => column.trim().toLowerCase()));
  const missing = REQUIRED_COLUMNS[contractId].filter((column) => !normalized.has(column.toLowerCase()));
  return { ok: missing.length === 0, columns, missing };
}

function hashFile(filePath, dependencies = {}) {
  const readFileSync = dependencies.readFileSync || fs.readFileSync;
  const buffer = readFileSync(filePath);
  return {
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sizeBytes: buffer.length,
  };
}

function createManualImportContract(options = {}, dependencies = {}) {
  const filePath = requireString(options.filePath || options.file, 'filePath');
  const sourceUrl = requireString(options.sourceUrl, 'sourceUrl');
  const cutoff = requireString(options.cutoff, 'cutoff');
  const methodology = requireString(options.methodology || options.contractId || options.contract, 'methodology');
  const contractId = assertValidContract(options.contractId || options.contract || methodology);
  assertNoMixedContracts(contractId, { inputContracts: options.inputContracts, explicitMapping: options.explicitMapping });

  const statSync = dependencies.statSync || fs.statSync;
  const stats = statSync(filePath);
  if (!stats.isFile()) throw importError('not_a_file', `${filePath} is not a file.`);

  const fileHash = hashFile(filePath, dependencies);
  const headerValidation = validateHeaderSample(readHeaderSample(filePath, dependencies), contractId);
  if (!headerValidation.ok) {
    throw importError('missing_required_columns', `Missing required SESNSP columns: ${headerValidation.missing.join(', ')}`);
  }

  return Object.freeze({
    kind: 'SesnspManualImportContract',
    contractVersion: IMPORT_CONTRACT_VERSION,
    sourceId: SOURCE_ID,
    contractId,
    methodology,
    sourceUrl,
    cutoff,
    fileName: path.basename(filePath),
    filePath,
    sha256: fileHash.sha256,
    sizeBytes: fileHash.sizeBytes,
    validation: {
      requiredColumns: REQUIRED_COLUMNS[contractId],
      header: headerValidation.columns || [],
      skipped: !!headerValidation.skipped,
      reason: headerValidation.reason,
    },
    acquisition: 'manual_official_file',
    networkFetched: false,
    operator: options.operator || 'manual-import',
  });
}

module.exports = Object.freeze({
  CONTRACT_2015_2025,
  decodeText,
  CONTRACT_RNID_2026,
  IMPORT_CONTRACT_VERSION,
  REQUIRED_COLUMNS,
  SOURCE_ID,
  createManualImportContract,
  parseDelimitedHeader,
  validateHeaderSample,
});
