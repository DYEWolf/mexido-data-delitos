'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createGeoUnit,
  createPopulationObservation,
  createRateObservation,
  isNonMunicipalBucket,
  validateJaliscoMunicipalitySet,
} = require('../src/geo/canonical.cjs');

test('GeoUnit preserves cvegeo as text and validates 125 Jalisco municipalities', () => {
  const units = Array.from({ length: 125 }, (_, index) => createGeoUnit({
    cvegeo: `14${String(index + 1).padStart(3, '0')}`,
    name: `Municipality ${index + 1}`,
    source_version: 'synthetic-inegi',
  }));

  assert.equal(units[0].cvegeo, '14001');
  assert.equal(typeof units[0].cvegeo, 'string');
  assert.deepEqual(validateJaliscoMunicipalitySet(units), {
    ok: true,
    expected: 125,
    actual: 125,
    unique: 125,
    missingOrExtra: 0,
  });
});

test('non-municipal buckets are detected and excluded from municipal rates', () => {
  assert.equal(isNonMunicipalBucket({ cvegeo: '0', name: 'SE IGNORA' }), true);
  assert.equal(isNonMunicipalBucket({ 'Cve. Municipio': '14998', Municipio: 'No Especificado' }), true);

  const bucket = createGeoUnit({ cvegeo: '0', name: 'SE IGNORA' });
  assert.equal(bucket.level, 'non_municipal_bucket');
  assert.equal(bucket.excludeFromMunicipalRates, true);
});

test('PopulationObservation is created from sanitized records and rejects non-municipal buckets', () => {
  const population = createPopulationObservation({
    cvegeo: '14039',
    year: '2026',
    population: '1500000',
    projection_status: 'projection',
    methodology: 'CONAPO 2026 projection',
  });

  assert.equal(population.cvegeo, '14039');
  assert.equal(population.year, 2026);
  assert.equal(population.population, 1500000);
  assert.throws(() => createPopulationObservation({ cvegeo: '14998', name: 'No Especificado', year: 2026, population: 1 }), /non-municipal/);
});

test('rates are allowed only when cvegeo, year, and methodology align', () => {
  const denominator = createPopulationObservation({
    cvegeo: '14039',
    year: 2026,
    population: 100000,
    methodology: 'CONAPO 2026 projection',
  });
  const numerator = {
    cvegeo: '14039',
    year: 2026,
    value: 25,
    methodology: 'SESNSP RNID 2026 municipal victims by place of facts',
  };

  const rate = createRateObservation({ numerator, denominator });
  assert.equal(rate.value, 25);
  assert.throws(() => createRateObservation({ numerator: { ...numerator, cvegeo: '14040' }, denominator }), /cvegeo do not align/);
  assert.throws(() => createRateObservation({ numerator: { ...numerator, year: 2025 }, denominator }), /year do not align/);
});
