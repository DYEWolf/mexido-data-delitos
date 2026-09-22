'use strict';

/*
 * Preparación segura de EXP-01. Cargar este módulo no abre Chrome ni importa Playwright.
 * No existe adaptador vivo: estas guardas describen una política preparatoria conservadora,
 * no prueban viabilidad del portal ni imponen controles al navegador.
 */

const SOURCE_ENTRY_URL = 'https://version-publica-repd.jalisco.gob.mx/cedulas-de-busqueda';
const SOURCE_ORIGIN = new URL(SOURCE_ENTRY_URL).origin;

const POLICY = Object.freeze({
  maxNavigations: 1,
  maxListingViews: 1,
  // Límite provisional de preparación; no es una afirmación de capacidad del portal.
  maxAuxiliaryRequests: 100,
  maxEvidenceBytes: 5_000_000,
  maxDurationMs: 30 * 60 * 1000,
  chromeExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  usesDiskProfile: false,
  blockedResourceTypes: Object.freeze([
    'image', 'media', 'font', 'download', 'serviceworker', 'popup',
  ]),
  allowedMetadataMimeTypes: Object.freeze([
    'application/json', 'text/html', 'text/plain',
  ]),
  allowedMetadataResourceTypes: Object.freeze(['document', 'fetch', 'xhr']),
});

function parseArgs(argv) {
  const flags = new Set(argv);
  const supported = new Set(['--help', '--offline', '--live', '--confirm-live']);

  if (argv.some((argument) => !supported.has(argument)) || flags.size !== argv.length) {
    return { kind: 'invalid' };
  }
  if (flags.has('--help') && flags.size === 1) return { kind: 'help' };
  if (flags.has('--offline') && flags.size === 1) return { kind: 'offline' };
  if (flags.size === 0) return { kind: 'default' };
  if (flags.has('--live') && flags.has('--confirm-live') && flags.size === 2) {
    return { kind: 'live-requested' };
  }
  if (flags.has('--live') && flags.size === 1) return { kind: 'live-confirmation-required' };
  return { kind: 'invalid' };
}

function safeMetadata(event) {
  const status = Number.isInteger(event?.status) ? event.status : null;
  const remoteBytes = Number.isSafeInteger(event?.bytes) && event.bytes >= 0 ? event.bytes : null;
  const mimeType = typeof event?.mimeType === 'string'
    ? event.mimeType.split(';', 1)[0].trim().toLowerCase()
    : null;
  const resourceType = typeof event?.resourceType === 'string'
    ? event.resourceType.toLowerCase()
    : null;

  if (
    status === null || status < 100 || status > 599 || remoteBytes === null ||
    !POLICY.allowedMetadataMimeTypes.includes(mimeType) ||
    !POLICY.allowedMetadataResourceTypes.includes(resourceType)
  ) {
    return null;
  }

  // Se omiten URL, ruta, query, encabezados, cuerpo y errores de la fuente.
  return { status, mimeType, resourceType, remoteBytes };
}

function createRunGuard({ clock = () => performance.now() } = {}) {
  const startedAt = clock();
  let navigations = 0;
  let listingViews = 0;
  let auxiliaryRequests = 0;
  let evidenceBytes = 0;

  function checkTime() {
    return clock() - startedAt >= POLICY.maxDurationMs
      ? { allowed: false, code: 'time_limit_reached' }
      : { allowed: true, code: 'allowed' };
  }

  function allowNavigation({ url, kind }) {
    // No se conoce una frontera segura de ficha; toda navegación de detalle queda cerrada.
    if (kind === 'detail') return { allowed: false, code: 'detail_boundary_unavailable' };
    if (checkTime().allowed === false) return { allowed: false, code: 'time_limit_reached' };
    if (url !== SOURCE_ENTRY_URL || kind !== 'listing') {
      return { allowed: false, code: 'navigation_not_allowed' };
    }
    if (listingViews >= POLICY.maxListingViews) {
      return { allowed: false, code: 'listing_limit_reached' };
    }
    if (navigations >= POLICY.maxNavigations) {
      return { allowed: false, code: 'navigation_limit_reached' };
    }

    navigations += 1;
    listingViews += 1;
    return { allowed: true, code: 'allowed' };
  }

  function allowRequest({ url, resourceType }) {
    if (checkTime().allowed === false) return { allowed: false, code: 'time_limit_reached' };
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return { allowed: false, code: 'request_not_allowed' };
    }
    const category = typeof resourceType === 'string' ? resourceType.toLowerCase() : '';
    if (
      parsed.origin !== SOURCE_ORIGIN ||
      POLICY.blockedResourceTypes.includes(category) ||
      !POLICY.allowedMetadataResourceTypes.includes(category)
    ) {
      return { allowed: false, code: 'request_not_allowed' };
    }
    if (auxiliaryRequests >= POLICY.maxAuxiliaryRequests) {
      return { allowed: false, code: 'request_limit_reached' };
    }

    auxiliaryRequests += 1;
    return { allowed: true, code: 'allowed' };
  }

  function canStoreEvidence(bytes) {
    return checkTime().allowed && Number.isSafeInteger(bytes) && bytes >= 0 &&
      evidenceBytes + bytes <= POLICY.maxEvidenceBytes;
  }

  function recordMetadata(event) {
    if (checkTime().allowed === false) return { accepted: false, code: 'time_limit_reached' };
    const metadata = safeMetadata(event);
    if (!metadata) return { accepted: false, code: 'metadata_not_allowed' };

    // El campo remoto bytes es solamente metadato; se cobra exactamente lo que se guardaría.
    const serialization = `${JSON.stringify(metadata)}\n`;
    const storageBytes = Buffer.byteLength(serialization, 'utf8');
    if (!canStoreEvidence(storageBytes)) {
      return { accepted: false, code: 'evidence_limit_reached' };
    }

    evidenceBytes += storageBytes;
    return { accepted: true, metadata, serialization, storageBytes };
  }

  return Object.freeze({
    checkTime,
    allowNavigation,
    allowRequest,
    canStoreEvidence,
    recordMetadata,
  });
}

function helpText() {
  return [
    'EXP-01 preparación segura — Estado: not_run.',
    'Sin argumentos y --offline son inertes: no abren navegador, no usan red ni directorio privado.',
    'Una sesión futura autorizada requerirá --live --confirm-live y confirmación humana interactiva.',
    'Esta versión mantiene la navegación viva no disponible; no inventa rutas ni selectores de fichas.',
    'El tope auxiliar de 100 solicitudes es una política preparatoria provisional, no una conclusión sobre el portal.',
    'No existe escritor y las guardas no implementan control del navegador, descargas totales, límite de caché ni garantía de evidencia persistida.',
    'El límite de 5 MB cobra solo la representación de metadatos aceptada; la caché o archivos temporales no quedan garantizados.',
  ].join('\n');
}

function runCli(argv, { write = (line) => process.stdout.write(`${line}\n`) } = {}) {
  const parsed = parseArgs(argv);
  let result;

  switch (parsed.kind) {
    case 'default':
      result = { status: 'not_run', mode: 'preparation' };
      break;
    case 'offline':
      result = { status: 'not_run', mode: 'offline' };
      break;
    case 'help':
      write(helpText());
      return { status: 'not_run', mode: 'help' };
    case 'live-confirmation-required':
      result = { status: 'blocked', code: 'live_confirmation_required' };
      break;
    case 'live-requested':
      result = { status: 'not_run', mode: 'live_unavailable' };
      break;
    default:
      result = { status: 'blocked', code: 'invalid_arguments' };
      break;
  }

  write(JSON.stringify(result));
  return result;
}

if (require.main === module) {
  runCli(process.argv.slice(2));
}

module.exports = Object.freeze({
  POLICY,
  SOURCE_ENTRY_URL,
  createRunGuard,
  parseArgs,
  runCli,
  safeMetadata,
});
