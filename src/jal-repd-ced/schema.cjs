'use strict';

const RECORD_FIELDS = Object.freeze([
  'autorizacion_informacion_publica',
  'cabello',
  'colonia',
  'complexion',
  'condicion_localizacion',
  'descripcion_sena_particular',
  'descripcion_vestimenta',
  'edad_momento_desaparicion',
  'estado',
  'estatura',
  'estatus_persona_desaparecida',
  'fecha_desaparicion',
  'genero',
  'id_cedula_busqueda',
  'municipio',
  'nacionalidad',
  'nombre_completo',
  'ojos_color',
  'ruta_foto',
  'sexo',
  'tez',
]);

const RECORD_FIELD_SET = new Set(RECORD_FIELDS);
const RESPONSE_FIELDS = new Set(['count', 'total_pages', 'results']);
const ARRAY_FIELDS = new Set([
  'descripcion_sena_particular',
  'descripcion_vestimenta',
]);

function typeName(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function error(path, code, expected, actual) {
  return { path, code, expected, actual: typeName(actual) };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateRecord(record, path = 'record') {
  const errors = [];
  if (!isPlainObject(record)) {
    return { valid: false, errors: [error(path, 'invalid_type', 'object', record)] };
  }

  for (const field of RECORD_FIELDS) {
    const fieldPath = `${path}.${field}`;
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      errors.push({ path: fieldPath, code: 'missing_field', expected: 'present', actual: 'missing' });
      continue;
    }

    const value = record[field];
    if (ARRAY_FIELDS.has(field)) {
      if (!Array.isArray(value)) errors.push(error(fieldPath, 'invalid_type', 'array', value));
    } else if (field === 'edad_momento_desaparicion') {
      if (!Number.isInteger(value)) errors.push(error(fieldPath, 'invalid_type', 'integer', value));
    } else if (field === 'estatura') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(error(fieldPath, 'invalid_type', 'finite number', value));
      }
    } else if (field === 'nacionalidad') {
      if (value !== null && typeof value !== 'string') {
        errors.push(error(fieldPath, 'invalid_type', 'string or null', value));
      }
    } else if (typeof value !== 'string') {
      errors.push(error(fieldPath, 'invalid_type', 'string', value));
    }
  }

  for (const field of Object.keys(record)) {
    if (!RECORD_FIELD_SET.has(field)) {
      errors.push({ path: `${path}.${field}`, code: 'unexpected_field', expected: 'one of the 21 observed fields', actual: 'present' });
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateResponse(response) {
  const errors = [];
  if (!isPlainObject(response)) {
    return { valid: false, errors: [error('response', 'invalid_type', 'object', response)] };
  }

  for (const field of RESPONSE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(response, field)) {
      errors.push({ path: `response.${field}`, code: 'missing_field', expected: 'present', actual: 'missing' });
    }
  }

  if (Object.prototype.hasOwnProperty.call(response, 'count') &&
      (typeof response.count !== 'number' || !Number.isFinite(response.count))) {
    errors.push(error('response.count', 'invalid_type', 'finite number', response.count));
  }
  if (Object.prototype.hasOwnProperty.call(response, 'total_pages') &&
      (typeof response.total_pages !== 'number' || !Number.isFinite(response.total_pages))) {
    errors.push(error('response.total_pages', 'invalid_type', 'finite number', response.total_pages));
  }
  if (Object.prototype.hasOwnProperty.call(response, 'results') && !Array.isArray(response.results)) {
    errors.push(error('response.results', 'invalid_type', 'array', response.results));
  }

  if (Array.isArray(response.results)) {
    response.results.forEach((record, index) => {
      const result = validateRecord(record, `response.results[${index}]`);
      errors.push(...result.errors);
    });
  }
  for (const field of Object.keys(response)) {
    if (!RESPONSE_FIELDS.has(field)) {
      errors.push({ path: `response.${field}`, code: 'unexpected_field', expected: 'count, total_pages, or results', actual: 'present' });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = Object.freeze({
  RECORD_FIELDS,
  validateRecord,
  validateResponse,
});
