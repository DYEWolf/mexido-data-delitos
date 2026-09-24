# SPEC --- Jalisco Seguridad --- Etapa 2

**Objetivo:** convertir la evidencia de la etapa data-first en una carga
inicial completa de metadatos y un subconjunto privado de hasta 100 imágenes,
reproducible y auditable, demostrar reconciliación/mantenimiento y preparar
infraestructura Cloudflare sin adelantar decisiones de arquitectura que todavía
dependen de evidencia. Completa no significa cobertura integral de imágenes.

**Límite del producto:** Jalisco de forma permanente, incluida la
publicación pública final. El filtro `estado=14` delimita el listado del
registro estatal, no el municipio del hecho, reporte o residencia de cada
cédula. Se admiten las cédulas publicadas en ese registro aunque esas
geografías estén fuera de Jalisco, sean desconocidas o carezcan de
municipio; no se exige `14` en todos los campos. Las fuentes federales
SESNSP, INEGI y CONAPO son insumos válidos, pero sus indicadores y
geometrías territoriales deben materializar únicamente el subconjunto de
Jalisco para el producto. Los originales nacionales pueden conservarse
privadamente como procedencia, no como cobertura pública.

## 1. Evidencia de entrada

La etapa anterior confirmó: `JAL-REPD-CED` es accesible mediante
navegador renderizado y endpoints JSON observados; el patrón observado
usa `estado=14&page=<n>&limit=12`; `id_cedula_busqueda` y `ruta_foto`
aparecieron en la muestra; 20/20 assets de prueba se validaron; se
observaron `count=10215` y `total_pages=852` en la etapa anterior. Según
`reports/stage-2-status.md`, después se completó un baseline privado solo de
metadatos (853 páginas, 10,234 registros únicos); los assets se omitieron y
la adquisición acotada de imágenes y los demás gates siguen pendientes.
REPD-STATS tiene corte observado `2026-08-31` y una
discrepancia pendiente de 16,203 vs 16,250. SESNSP está identificado
pero sus ZIP actuales redirigieron a autenticación Microsoft en el
entorno probado. INEGI/CONAPO permiten joins para los 125 municipios. No
se ha observado todavía un alta/cambio/retiro real.

Los endpoints observados se tratarán como **implementation endpoints**,
no como API oficial documentada.

## 2. Definition of Done

Etapa 2 termina cuando:

1.  Existe un baseline declarado y completo de metadatos de `JAL-REPD-CED`,
    con adquisición de un subconjunto privado de hasta 100 imágenes evaluada
    por separado; no se exige descargar todas las imágenes.
2.  Produce manifest, checkpoints, hashes, métricas, errores y
    cobertura.
3.  Es reanudable e idempotente.
4.  Reconciliación distingue `new`, `unchanged`, `changed`,
    `asset_changed`, `source_missing`, `failed` y `suppressed`.
5.  Una ausencia nunca implica automáticamente que la persona fue
    localizada.
6.  Las supresiones sobreviven a reimportaciones.
7.  La discrepancia REPD-STATS queda explicada o modelada explícitamente
    como no reconciliada.
8.  Existe adquisición reproducible del SESNSP vigente: automática
    oficial o importación manual oficial versionada.
9.  INEGI/CONAPO están materializados como contrato estable.
10. Cloudflare dev/staging, storage, secrets y autenticación están
    preparados.
11. Existe ADR de datastore basada en evidencia.
12. Existe suite integrada de mantenimiento.
13. Antes de publicación, la asociación define responsables, campos
    publicables, retiro y retención.

## 3. Gates

**G2 --- Initial usable load:** baseline de metadatos completo, cobertura
separada del subconjunto de imágenes declarado (hasta 100), manifest,
validación/cuarentena de esos assets, idempotencia y provenance. No se cierra
con solo el recorrido de metadatos ni con un piloto previo de imágenes.

**G3 --- Maintenance demonstrated:** dos observaciones completas de
metadatos comparables, reconciliación integrada, fixtures sintéticos y
protección contra falsos retiros. Comparar cambios de bytes de imágenes solo
cuando existan observaciones de esos bytes; no esperar un cambio real en vivo.

**G4 --- Architecture justified:** después de G2/G3 se congela
datastore, jobs, versionado, publicación y backup/retención.

**G5 --- Publication operable:** queda fuera de esta etapa.

## 4. Fase 0 --- Desbloquear credenciales e infraestructura

Hacer esto primero para que ningún paso posterior espere keys.

### Cloudflare

-   Verificar Account ID y dominio/zone.
-   Crear entornos Workers `dev` y `staging`.
-   Verificar el R2 privado existente y su acceso/lifecycle efectivo antes de subir.
-   Usar solo el bucket privado existente `seguridad-jalisco-private` para C05.
-   Posponer cualquier bucket público y derivados hasta una decisión de publicación
    de la asociación.
-   Crear token CI/CD de privilegio mínimo.
-   Configurar secrets con Wrangler/Cloudflare; nunca Git.
-   Configurar Cloudflare Access para staging/admin.
-   Crear Turnstile widget y guardar sitekey/secret para el futuro
    formulario de retiro.
-   Habilitar observabilidad.
-   Documentar owner, propósito y rotación de cada credential.

R2 (rutas privadas de C05; ningún bucket público se habilita ahora):

``` text
seguridad-jalisco-private/
  source-snapshots/
  cedula-assets/
  manifests/
  quarantine/
```

`.env.example` solo contiene nombres:

``` text
ENVIRONMENT=
CF_ACCOUNT_ID=
PRIVATE_ASSETS_BUCKET=
PUBLIC_DERIVATIVES_BUCKET=
DATABASE_URL=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

**AC-0:** un desarrollador autorizado puede desplegar dev/staging sin
pedir nuevas credenciales; staging está protegido; R2 privado no permite
lectura anónima; no existen secretos en Git.

## 5. Fase 1 --- Source contracts

Crear fichas versionadas:

``` text
sources/JAL-REPD-CED.md
sources/JAL-REPD-STATS.md
sources/MX-SESNSP.md
sources/MX-INEGI-GEO.md
sources/MX-CONAPO-POP.md
```

Contrato:

``` yaml
source_id:
publisher:
entrypoint:
official_status:
access_method:
observed_endpoints:
endpoint_contract_status: observed | documented
identity_candidate:
pagination:
asset_fields:
cutoff_semantics:
geographic_keys:
update_signal:
known_failures:
privacy_class:
raw_retention:
last_verified_at:
```

## 6. Fase 2 --- Baseline completo de metadatos JAL-REPD-CED y subconjunto de imágenes

El baseline de metadatos ya registrado no acredita la adquisición de imágenes
ni la publicación. Las observaciones A/B existentes son `metadata_only` con
assets `skip`; conservarlas comparables y sin atribuirles hashes o fallos de
imágenes. La adquisición de imágenes es una ejecución y evidencia separada.
Declarar cada run:

``` yaml
source: JAL-REPD-CED
estado: "14"
page_size: 12
first_page: 1
last_page: discovered_total_pages
connector_version:
started_at:
```

Nunca hardcodear 852 como límite permanente.

Pipeline:

1.  Obtener metadata inicial.
2.  Registrar `count` y `total_pages`.
3.  Recorrer páginas.
4.  Validar status/schema.
5.  Normalizar.
6.  Deduplicar.
7.  Seleccionar y obtener únicamente los assets del subconjunto declarado,
    en una ejecución separada de las observaciones de metadatos.
8.  Calcular hashes.
9.  Guardar checkpoints.
10. Persistir provenance.
11. Generar manifest.
12. Volver a consultar límites al finalizar.
13. Comparar inicio/fin.

Checkpoint mínimo:

``` json
{"run_id":"...","last_successful_page":123,"records_seen":1476,"unique_ids_seen":1476,"failed_pages":[]}
```

Identidad provisional: `(source_id, id_cedula_busqueda)`. Sigue siendo
candidata hasta observar comportamiento real de actualización.

Hashes separados:

``` text
source_payload_hash
normalized_record_hash
asset_content_hash
```

**Selección privada de imágenes (C05):** a partir del baseline completo y
validado de metadatos, separar los registros sin `ruta_foto` utilizable,
ordenar por `(source_id, id_cedula_busqueda)` como texto de forma estable y
seleccionar los primeros hasta 100 con referencia utilizable. Congelar en el
manifest privado la identidad y versión del baseline, la regla/orden de
selección, el límite, los IDs seleccionados y los denominadores: registros
únicos de metadatos, registros con referencia utilizable, sin referencia y con
referencia no seleccionados. Una reanudación usa la selección congelada; un
nuevo baseline requiere una nueva selección versionada. La regla es
reproducible, no aleatoria ni representativa, y no pretende cubrir todas las
imágenes. `ruta_foto` sigue siendo referencia privada; ni URLs exactas ni
fotos entran en Git.

Descargar con tasa, timeout, reintentos y bytes acotados, controles de host y
circuit breakers; perfilar privadamente tamaño/formato/orígenes antes de fijar
los topes técnicos. No se aprobaron presupuestos de 5/15 GiB: si los límites
conservadores no alcanzan, pausar y revisar, no ampliarlos tácitamente. Los
originales admitidos van solo al R2 privado existente, con acceso del dueño y
automatizaciones autorizadas; comprobar privacidad/lifecycle efectivos antes
de subir y lectura privada con hash después. Nunca Git ni bucket público.
Validar MIME real, tamaño y hash; los inválidos van a `quarantine` privada y
se contabilizan. Manifest, checkpoint/resume y replay deben demostrar
selección, resultado y asociación registro–asset, sin eliminar metadatos por
fallos o falta de URL. Estas validaciones, la cuarentena, el replay y el
readback R2 **siguen pendientes de implementación y evidencia**.

Manifest:

``` yaml
run_id:
source_count_start:
source_pages_start:
source_count_end:
source_pages_end:
pages_expected:
pages_successful:
pages_failed:
records_received:
records_unique:
duplicate_ids:
assets_expected:
assets_downloaded:
assets_failed:
schema_errors:
quarantined_records:
coverage_status:
```

En el manifest privado de assets, `assets_expected` es el número seleccionado
(≤100), no el total de metadatos ni de referencias disponibles;
`assets_downloaded`, `assets_failed` y el conteo de assets en `quarantine`
se refieren a ese mismo subconjunto. Registrar explícitamente intentos,
pendientes y resultados para conciliarlo, sin contar los no seleccionados o
sin URL como fallos de descarga. Conservar por separado denominadores y
estado de completitud de metadatos, selección y adquisición; no presentar
`assets_expected` como el universo de fotografías. En runs `metadata_only` /
`skip`, los conteos de assets no acreditan adquisición.

**AC-2:** cobertura explícita de metadatos y del subconjunto de imágenes,
resume funcional, rerun idempotente, duplicados cuantificados y cero fallos
silenciosos. G2/G3/G4 permanecen abiertos hasta reunir su evidencia restante.

## 7. Fase 3 --- Modelo canónico y provenance

Modelo conceptual, aún independiente de DB:

``` text
Source
SourceRun
SourceRecord
Cedula
CedulaVersion
Asset
AssetVersion
Suppression
ReconciliationEvent
AggregateObservation
GeoUnit
PopulationObservation
ImportArtifact
```

`Cedula`: `internal_id`, `source_id`, `source_record_id`,
`first_seen_at`, `last_seen_at`, `last_confirmed_at`,
`publication_state`, `current_version_id`.

`CedulaVersion`: `cedula_id`, `observed_at`, `normalized_hash`,
`source_payload_hash`, `normalized_payload`, `run_id`.

Toda observación debe responder de qué fuente, run, conector y artefacto
provino.

## 8. Fase 4 --- Reconciliación

Estados:

``` text
discovered
eligible_for_review
published
suppressed
source_missing
quarantined
retired
```

`source_missing != localized`.

Diff:

``` text
new_ids        = B - A
missing_ids    = A - B
changed_ids    = common where normalized_hash differs
changed_assets = common where asset_hash differs
```

Una ausencia requiere un run completo exitoso y evidencia de que el
rango fue consultado. Después se marca `source_missing`; no se borra
automáticamente.

### Circuit breaker

Si hay caída brusca de count, páginas vacías, schema inesperado, fallo
generalizado de assets o HTML de login/error donde se esperaba JSON:

``` text
run_status = anomalous
publication_mutations = blocked
human_review_required = true
```

### Suppression ledger

``` text
source_id
source_record_id
reason_code
created_at
created_by
expires_at nullable
notes_private
```

Una reimportación nunca reactiva automáticamente un registro suprimido.

**AC-3:** fixtures para alta, cambio, asset cambiado, ausencia, página
fallida, caída anómala, supresión, reimportación, restauración
deliberada e idempotencia.

## 9. Fase 5 --- Resolver REPD-STATS

Discrepancia conocida: `16,203` municipal vs `16,250` total; diferencia
`47`.

Experimentos: reproducir mismo corte; buscar `SE IGNORA`/nulos/no
mapeables; comparar dimensiones; comprobar unidades; documentar
definiciones; repetir en otro corte si es posible.

Si se explica, modelar buckets. Si no, conservar ambos indicadores
separados con sus definiciones. Prohibido corregir manualmente.

Contrato agregado:

``` text
metric_id
source_id
source_metric_name
definition
cutoff
geo_level
geo_code nullable
value
unit
run_id
```

## 10. Fase 6 --- SESNSP

**Ruta A:** descarga oficial automatizable; conservar URL, timestamp,
filename, tamaño, SHA-256, headers, metodología y raw artifact.

**Ruta B:** si sigue el bloqueo, importación manual oficial:

``` text
import-sesnsp --file <official-file> --source-url <url> --cutoff <date>
```

Debe registrar hash, nombre original, URL, fecha, operador/proceso,
contrato y validación de columnas.

Mantener contratos separados:

``` text
MX-SESNSP-2015-2025
MX-SESNSP-RNID-2026
```

No evadir autenticación ni mezclar metodologías sin mapping explícito.
El archivo federal original puede retenerse privadamente con su
procedencia; el importador del producto debe materializar solo las
observaciones territoriales de Jalisco, conservando por separado
categorías no municipales o no especificadas sin asignarlas a un
municipio. Esta es una exigencia documental, no una validación ya
demostrada por el importador.

## 11. Fase 7 --- INEGI + CONAPO

`GeoUnit`:

``` text
cvegeo TEXT
state_code TEXT
municipality_code TEXT
name
geometry
source_version
```

Join por código, nunca nombre. `cvegeo` permanece texto. Se esperan 125
municipios de Jalisco: los artefactos federales pueden retenerse como
procedencia, pero el producto debe materializar solo el subconjunto
territorial de Jalisco. `SE IGNORA`/`No Especificado` quedan fuera de
tasas/mapa municipal y se muestran aparte; no desaparecen del alcance
por carecer de municipio. La importación y el versionado de artefactos
INEGI/CONAPO reales siguen pendientes según `reports/stage-2-status.md`.

`PopulationObservation`: `cvegeo`, `year`, `population`,
`projection_status`, `source`.

Una tasa solo existe si numerador y denominador coinciden territorial,
temporal y metodológicamente.

## 12. Fase 8 --- ADR Cloudflare-first

Decisiones que ya pueden tomarse:

-   **Workers: sí.** API/backend futuro, admin, serving controlado y
    coordinación.
-   **R2: sí.** Snapshots, assets privados, manifests, quarantine y
    derivados futuros.
-   **Cloudflare Access: sí.** Staging/admin.
-   **Turnstile: sí.** Prepararlo ahora; validación server-side
    obligatoria.
-   **Workflows: recomendado.** El baseline tiene cientos de páginas,
    retries y checkpoints; no conviene una sola invocación Cron.
-   **Queues: sí cuando se desacoplen assets/registros.** Los mensajes
    llevan IDs/referencias, no imágenes.
-   **KV: solo cache/config efímera.** Nunca source of truth.

Orquestación objetivo:

``` text
Schedule
  -> Workflow sync
      -> discover bounds
      -> fetch page batches
      -> normalize
      -> enqueue/process assets
      -> reconcile
      -> manifest
      -> sync status
```

## 13. ADR pendiente --- D1 vs Postgres/PostGIS

No forzar D1 solo por ser Cloudflare.

D1 puede servir si los mapas usan GeoJSON preprocesado, joins simples y
no requieren GIS avanzado.

Postgres/PostGIS será candidato si consultas reales del producto de
Jalisco requieren intersecciones, agregaciones espaciales dinámicas
entre capas del estado o joins relacionales que D1 no resuelva con
suficiente robustez. La necesidad debe demostrarse con consultas
representativas y benchmark comparativo; no se elige datastore ahora.
Si se evalúa Postgres externo desde Workers, considerar Hyperdrive.

Antes de decidir:

1.  medir tamaño real del baseline;
2.  estimar crecimiento de versiones;
3.  enumerar queries del producto;
4.  probar consultas representativas en D1;
5.  probar Postgres/PostGIS si requieren GIS;
6.  comparar complejidad, costo y operación.

Esta ADR no bloquea las fases anteriores.

## 14. Automatización

Principio:

``` text
cheap change detection
  -> changed?
      no  -> stop
      yes -> durable sync
```

No depender de `ETag`/`Last-Modified`: Etapa 1 no los observó para REPD.

Cédulas: sync periódico + reconciliación completa. Stats: comprobar
cutoff y no duplicar versiones idénticas. SESNSP: importar releases
nuevos.

## 15. Privacidad, retiro y retención

Antes de publicación la asociación debe designar:

``` text
publication_owner
correction_owner
takedown_owner
retention_owner
incident_response_owner
```

Y aprobar campos públicos, política de imágenes, SLA de retiro,
retención de raw/assets/browser traces/logs/backups/suppressions y
restauración. Para la evidencia privada C05, revisar conservación a los 30
días; esto no es TTL ni autoriza borrado automático o recursivo. El acceso
privado existente no autoriza publicar: campos públicos y política de imagen
requieren decisión de la asociación antes de Etapa 3.

Un retiro debe invalidar estado público, API, páginas, derivados, R2
público y caches controlables.

## 16. Observabilidad

Métricas por run:

``` text
source_count
pages_expected
pages_success
pages_failed
records_received
records_unique
new_records
changed_records
missing_records
suppressed_records
assets_success
assets_failed
schema_errors
duration
run_status
```

Alertar por páginas fallidas, schema desconocido, caída anómala del
universo, fallos masivos de assets o ejecución incompleta.

## 17. Orden de implementación

``` text
S2-001 Cloudflare bootstrap + secrets
S2-002 Source contracts
S2-003 R2 private storage adapter
S2-004 Baseline runner
S2-005 Checkpoint/resume
S2-006 Manifest + hashing
S2-007 Full baseline pilot
S2-008 Canonical model/provenance
S2-009 Reconciliation engine
S2-010 Synthetic maintenance suite
S2-011 Second full observation
S2-012 REPD-STATS reconciliation
S2-013 SESNSP acquisition path
S2-014 INEGI/CONAPO canonical layer
S2-015 D1 vs Postgres benchmark
S2-016 ADR architecture
S2-017 Association publication/retention decisions
S2-018 G2/G3 review
```

Dependencias:

``` text
001 -> 003
002 -> 004
003 + 004 -> 005 -> 006 -> 007
007 -> 008 -> 009 -> 010 -> 011
002 -> 012
002 -> 013
002 -> 014
007 + 014 -> 015 -> 016
017 + G2/G3 -> siguiente spec de producto
```

## 18. Criterio para iniciar Etapa 3

No empezar la web pública por calendario. Empezarla cuando:

-   G2 esté aprobado;
-   G3 tenga reconciliación demostrada;
-   ADR de datastore esté cerrada;
-   R2/Access/secrets estén operables;
-   la asociación haya aprobado campos públicos, imágenes, publicación,
    retiro y retención; la revisión privada a 30 días no sustituye esa decisión;
-   las fuentes que alimentarán el MVP tengan provenance y actualización
    reproducibles.

La siguiente especificación ya podrá ser **product-first**: muro de
cédulas, mapa municipal, metodología, admin y retiro, construidos sobre
un pipeline de datos demostrado.
