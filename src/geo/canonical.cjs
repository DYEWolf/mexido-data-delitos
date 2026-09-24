'use strict';

const GEO_MODEL_VERSION = '1';
const JALISCO_STATE_CODE = '14';
const JALISCO_MUNICIPALITY_COUNT = 125;
// SESNSP 2015-2025 files use 14998 and RNID 2026 files use 14999 for "no especificado".
const NON_MUNICIPAL_CODES = new Set(['0', '00', '000', '14998', '14999']);
const NON_MUNICIPAL_LABELS = ['SE IGNORA', 'NO ESPECIFICADO', 'NO ESPECIFICADA'];

function geoError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function text(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw geoError('invalid_geo_record', `${name} must be present.`);
  }
  return String(value).trim();
}

function optionalText(value) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  return String(value).trim();
}

function pick(record, names) {
  for (const name of names) {
    if (record[name] !== undefined && record[name] !== null && String(record[name]).trim() !== '') return record[name];
  }
  return undefined;
}

function deriveStateCode(record, cvegeo) {
  return optionalText(pick(record, ['state_code', 'cve_ent', 'CVE_ENT', 'Clave_Ent'])) || cvegeo.slice(0, 2);
}

function deriveMunicipalityCode(record, cvegeo) {
  return optionalText(pick(record, ['municipality_code', 'cve_mun', 'CVE_MUN', 'Cve. Municipio'])) || cvegeo.slice(-3);
}

function isNonMunicipalBucket(record = {}) {
  const cvegeo = optionalText(pick(record, ['cvegeo', 'CVEGEO', 'geo_code', 'Cve. Municipio'])) || '';
  const name = (optionalText(pick(record, ['name', 'municipality', 'Municipio', 'NOMGEO'])) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return NON_MUNICIPAL_CODES.has(cvegeo) || NON_MUNICIPAL_LABELS.some((label) => name.includes(label));
}

function createGeoUnit(record = {}) {
  if (isNonMunicipalBucket(record)) {
    return Object.freeze({
      kind: 'GeoUnit',
      modelVersion: GEO_MODEL_VERSION,
      cvegeo: optionalText(pick(record, ['cvegeo', 'CVEGEO', 'geo_code', 'Cve. Municipio'])) || null,
      name: optionalText(pick(record, ['name', 'municipality', 'Municipio', 'NOMGEO'])) || 'Non-municipal bucket',
      level: 'non_municipal_bucket',
      isMunicipality: false,
      excludeFromMunicipalRates: true,
      bucketReason: 'non_municipal_or_unspecified',
    });
  }

  const cvegeo = text(pick(record, ['cvegeo', 'CVEGEO', 'geo_code']), 'cvegeo');
  const stateCode = deriveStateCode(record, cvegeo);
  const municipalityCode = deriveMunicipalityCode(record, cvegeo);
  return Object.freeze({
    kind: 'GeoUnit',
    modelVersion: GEO_MODEL_VERSION,
    cvegeo,
    stateCode,
    municipalityCode,
    name: text(pick(record, ['name', 'municipality', 'Municipio', 'NOMGEO']), 'name'),
    geometry: record.geometry,
    sourceVersion: optionalText(pick(record, ['source_version', 'sourceVersion'])) || 'unknown',
    source: optionalText(record.source) || 'MX-INEGI-GEO',
    level: 'municipality',
    isMunicipality: true,
    excludeFromMunicipalRates: false,
  });
}

function createPopulationObservation(record = {}) {
  if (isNonMunicipalBucket(record)) {
    throw geoError('non_municipal_denominator', 'Population denominators must be municipal GeoUnit observations, not non-municipal buckets.');
  }
  const population = Number(pick(record, ['population', 'poblacion', 'Poblacion']));
  const year = Number(pick(record, ['year', 'anio', 'Año']));
  if (!Number.isInteger(year)) throw geoError('invalid_population_observation', 'year must be an integer.');
  if (!Number.isFinite(population) || population < 0) throw geoError('invalid_population_observation', 'population must be a non-negative number.');
  const cvegeo = text(pick(record, ['cvegeo', 'CVEGEO', 'geo_code']), 'cvegeo');
  return Object.freeze({
    kind: 'PopulationObservation',
    modelVersion: GEO_MODEL_VERSION,
    cvegeo,
    year,
    population,
    projectionStatus: optionalText(pick(record, ['projection_status', 'projectionStatus'])) || 'projection',
    source: optionalText(record.source) || 'MX-CONAPO-POP',
    methodology: optionalText(record.methodology) || 'CONAPO municipal projection',
  });
}

function validateJaliscoMunicipalitySet(geoUnits) {
  const municipalities = geoUnits.filter((unit) => unit.isMunicipality && unit.stateCode === JALISCO_STATE_CODE);
  const uniqueCodes = new Set(municipalities.map((unit) => unit.cvegeo));
  return Object.freeze({
    ok: municipalities.length === JALISCO_MUNICIPALITY_COUNT && uniqueCodes.size === JALISCO_MUNICIPALITY_COUNT,
    expected: JALISCO_MUNICIPALITY_COUNT,
    actual: municipalities.length,
    unique: uniqueCodes.size,
    missingOrExtra: municipalities.length - JALISCO_MUNICIPALITY_COUNT,
  });
}

function assertRateAlignment({ numerator, denominator }) {
  if (!numerator || !denominator) throw geoError('invalid_rate_inputs', 'numerator and denominator are required.');
  const numeratorCode = numerator.cvegeo || numerator.geoCode;
  if (numeratorCode !== denominator.cvegeo) throw geoError('rate_alignment_failed', 'Rate numerator and denominator cvegeo do not align.');
  if (Number(numerator.year) !== Number(denominator.year)) throw geoError('rate_alignment_failed', 'Rate numerator and denominator year do not align.');
  const numeratorMethodology = numerator.methodology || numerator.definition;
  if (!numeratorMethodology || !denominator.methodology) throw geoError('rate_alignment_failed', 'Rate numerator and denominator methodology must be explicit.');
  return true;
}

function createRateObservation({ numerator, denominator, per = 100000 } = {}) {
  assertRateAlignment({ numerator, denominator });
  if (denominator.population <= 0) throw geoError('invalid_rate_inputs', 'denominator population must be positive.');
  return Object.freeze({
    kind: 'RateObservation',
    modelVersion: GEO_MODEL_VERSION,
    cvegeo: denominator.cvegeo,
    year: denominator.year,
    numeratorValue: numerator.value,
    denominatorPopulation: denominator.population,
    per,
    value: (numerator.value / denominator.population) * per,
    methodology: numerator.methodology || numerator.definition,
  });
}

module.exports = Object.freeze({
  GEO_MODEL_VERSION,
  JALISCO_MUNICIPALITY_COUNT,
  JALISCO_STATE_CODE,
  assertRateAlignment,
  createGeoUnit,
  createPopulationObservation,
  createRateObservation,
  isNonMunicipalBucket,
  validateJaliscoMunicipalitySet,
});
