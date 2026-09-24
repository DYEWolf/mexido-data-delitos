# Stage 2 Cloudflare-first architecture ADR and benchmark plan

**Status date:** 2026-09-22  
**Scope:** S2-010 / S2-015 / S2-016 planning artifact for Stage 2.  
**Decision status:** plan prepared; final datastore ADR is intentionally deferred until G2/G3 evidence exists.

## 1. Executive summary

Stage 2 supports a Cloudflare-first operating shape, but it does not yet support a final datastore decision. Workers, R2, Cloudflare Access, and Turnstile preparation are justified now by the source contracts, privacy boundary, and future admin/removal workflow. Workflows are recommended for the baseline and maintenance pipeline because JAL-REPD-CED has hundreds of pages, checkpoints, retries, and final bounds checks; Queues should be added later when asset and record work are decoupled; KV should remain limited to cache or ephemeral configuration, never as source of truth.

La decisión D1 vs Postgres/PostGIS sigue abierta para el producto limitado permanentemente a Jalisco, incluida su publicación final. D1 podría bastar con GeoJSON preprocesado, joins simples y lecturas administrativas acotadas. Postgres/PostGIS solo se justificaría si consultas reales de Jalisco exigen intersecciones, agregaciones espaciales dinámicas entre capas o joins relacionales que D1 no soporte adecuadamente; ambas alternativas requieren benchmark, sin elegir datastore ahora. Las cédulas del registro estatal permanecen en alcance aunque el hecho o la residencia estén fuera de Jalisco: eso no equivale a ampliar la cobertura territorial de indicadores.

## 2. Cloudflare-first decisions supported now

| Area | Current decision | Why it is supported now | Evidence / dependency |
| --- | --- | --- | --- |
| Workers | Use Workers for future API/backend, admin endpoints, controlled serving, and orchestration glue. | The project needs server-side privacy controls, source/provenance status APIs, admin protection, and future Turnstile validation. | `SPEC_JALISCO_STAGE_2.md`; source contracts; no public release yet. |
| R2 | Use R2 for private source snapshots, cédula assets, manifests, quarantine, and future approved derivatives. | Assets and raw evidence must not live in Git; Stage 2 needs durable private object storage and provenance. | `sources/JAL-REPD-CED.md`; `reports/stage-2-cloudflare-readiness.md`; local private storage adapter. |
| Cloudflare Access | Use Access for staging/admin. | Staging/admin must not be public while handling restricted person records and removal workflows. | Stage 2 AC-0 and publication policy constraints. |
| Turnstile | Prepare Turnstile for future public removal/contact forms; require server-side validation. | Future public interaction needs bot resistance, but no widget/secret can be created without credentials. | Stage 2 Fase 0; no current public form. |
| Workflows | Recommend Workflows for baseline/maintenance orchestration. | A single Cron/Worker invocation is a poor fit for 852 observed pages, retries, checkpoints, bounds checks, and resumability. | S2-005 pilot: 3 pages succeeded; full metadata baseline implies 852 pages at observed bounds. |
| Queues | Add later when records/assets are decoupled. | Queue messages should carry IDs and object references, not images or raw personal data. This is useful after baseline/storage policy is finalized. | Asset/R2 policy still blocked. |
| KV | Limit to cache/config/feature flags only. | KV is not appropriate as source of truth for provenance, suppression ledger, manifests, or canonical records. | Stage 2 provenance and reconciliation requirements. |

Target orchestration shape:

```text
Schedule
  -> Workflow sync
      -> discover source bounds
      -> fetch page batches
      -> normalize and hash
      -> write private snapshots/manifests
      -> enqueue/process assets when approved
      -> reconcile canonical records
      -> emit sync status and alerts
```

## 3. Recursos y verificaciones pendientes

La lista siguiente es el inventario histórico de acciones del plan inicial, no una lista de bloqueos vigentes. `reports/stage-2-status.md` registra despliegue de staging, DNS, Access, secreto de Turnstile y observabilidad; esa evidencia reportada no se volvió a verificar aquí. Persisten las tareas de política, escritura de assets/R2, benchmarks y protección de futuros endpoints admin. No repetir las acciones ya completadas por interpretar este inventario como instrucciones actuales.

1. Verify Account ID, zone/domain, and authenticated `wrangler whoami` state.
2. Create Workers `dev` and `staging` environments.
3. Enable R2 and create `seguridad-jalisco-private` and `seguridad-jalisco-public`.
4. Configure least-privilege CI/CD token and secrets.
5. Configure Access policies for staging/admin.
6. Create Turnstile widget and store sitekey/secret outside Git.
7. Enable observability and alert sinks.
8. Run any deployment, mutation, bucket write, secret-bearing command, or account-level check.

El sondeo inicial de `reports/stage-2-cloudflare-readiness.md` no encontró Wrangler ni variables de cuenta/token en aquel shell; no debe interpretarse como ausencia actual de credenciales o despliegue.

## 4. Datastore ADR question

**Question:** should Stage 2/Stage 3 use Cloudflare D1 as the primary relational datastore, or Postgres/PostGIS as the primary datastore accessed from Workers, potentially through Hyperdrive?

**Do not decide yet.** The correct decision depends on measured data volume, query shape, maintenance behavior, spatial requirements, operational constraints, and future publication requirements. A Cloudflare-first architecture does not require forcing D1 if the data model needs PostGIS.

## 5. Benchmark inputs already available

Current measured/pilot inputs:

- JAL-REPD-CED observed source bounds: `count=10,215`, `total_pages=852`, page size `12`.
- S2-005 private pilot: 3 pages, 36 unique records, 0 duplicate records, 0 page failures, 0 schema errors, unchanged start/end bounds.
- REPD-STATS current modeled gap: `16,203` mappable municipality sum vs `16,250` total; unreconciled gap `47`.
- INEGI/CONAPO contract: 125 Jalisco municipalities, code-based joins, municipal rates only when numerator/denominator align.
- Current automated test suite: `node --test tests/*.test.cjs` passed 46/46.

El reporte `reports/stage-2-status.md` registra un baseline privado solo de metadatos completado: 853/853 páginas, 10,234 registros únicos, sin fallos de solicitud, esquema ni duplicados; assets omitidos. No se comprobó de nuevo aquí. Insumos aún requeridos:

- Tamaño en bytes del baseline de metadatos y métricas utilizables para el benchmark.
- Number and size distribution of private assets if asset acquisition is approved.
- Normalized record/hash sizes.
- Version growth after a second comparable full observation.
- Suppression ledger volume and retention expectations.
- Import artifact sizes for SESNSP and INEGI/CONAPO.

## 6. Representative queries to benchmark

### Public/API read queries

1. List currently publishable cédulas with filters by municipality, status, year/period where supported, and pagination.
2. Fetch a single cédula public view by internal ID/source record ID without exposing restricted raw fields.
3. Return map-ready municipality aggregates for Jalisco using precomputed counts and INEGI `cvegeo`.
4. Return rate observations per municipality where numerator and CONAPO denominator align.
5. Return methodology/provenance metadata for a displayed aggregate.

### Admin and maintenance queries

1. Find records changed since a specific `run_id`.
2. Find records whose source record is missing only after a complete successful run.
3. Apply suppression lookup during reconciliation and public listing.
4. Show reconciliation events by source ID and run.
5. List failed pages/schema errors/asset failures for a run.
6. Comparar dos manifiestos completos equivalentes y resumir new/changed/asset_changed/source_missing/suppressed/failed. La segunda observación sigue pendiente.

### Geospatial / PostGIS-discriminating queries

1. Unir conteos de indicadores municipales de Jalisco con geometría mediante `cvegeo`, sin asignar a un municipio cédulas cuyo campo de hecho/residencia sea externo o desconocido.
2. Servir GeoJSON municipal preprocesado de Jalisco con métricas compatibles y categorías no municipales aparte.
3. Determinar si alguna consulta exigida para Jalisco necesita punto-en-polígono, intersecciones, buffers, proximidad o agregación espacial dinámica entre sus capas; documentar el caso y datos representativos.
4. Comparar latencia, costo y operación de D1 con geometrías preprocesadas frente a PostGIS para las consultas dinámicas justificadas; no usar una expansión interestatal hipotética como criterio.

## 7. Benchmark method

1. Construir fixtures saneados del piloto privado y, con aprobación, del baseline de metadatos ya registrado; no usar assets ni evidencia personal en artefactos de Git.
2. Load equivalent schemas into D1 and Postgres/PostGIS.
3. Keep raw personal data and private assets out of benchmark artifacts committed to Git.
4. Measure query latency, load/import time, index needs, schema migration complexity, operational complexity, local development ergonomics, backup/restore, and failure modes.
5. Run the same representative queries with small pilot data and later full baseline data.
6. Record explain plans and measured results in a future private-safe report.
7. Close the ADR only when the evidence below is present.

## 8. Success criteria

A datastore option is acceptable only if it satisfies all of the following:

- Supports the current full baseline plus expected version growth without fragile limits.
- Serves public/API queries within the product latency target chosen for Stage 3.
- Supports reconciliation/admin queries without manual data exports.
- Preserves provenance and suppression semantics.
- Keeps private/raw assets in R2/private storage, not in the relational database unless only references/hashes are stored.
- Has a clear backup/restore story matching retention policy.
- Can be operated by the association or project maintainers with available credentials and cost controls.

A D1 decision additionally requires evidence that no dynamic GIS-heavy operations are needed. A Postgres/PostGIS decision requires evidence that its extra operational cost is justified by GIS or relational complexity that D1 would make fragile.

## 9. Evidence that closes the ADR

The ADR can close when these artifacts exist:

1. Approved full metadata baseline manifest for JAL-REPD-CED.
2. Second comparable observation or maintenance run summary sufficient for version-growth estimates.
3. Asset/R2 policy decision and, if approved, private asset size metrics.
4. SESNSP current official import evidence or explicit scope exclusion for the MVP.
5. INEGI/CONAPO real import/version evidence.
6. D1 benchmark results for representative queries.
7. Postgres/PostGIS benchmark results if any GIS-heavy or D1-stress query remains in scope.
8. Operational comparison: cost, credentials, backups, restore, migration, monitoring, and maintainer burden.

Until then, G4 is **not complete**; this file is the benchmark/ADR plan, not the final architecture decision.


## 10. 2026-09-22 staging deployment note

Cloudflare staging infrastructure is now beyond the earlier planning-only state: the staging Worker deployment was reported successful, DNS is correct for the public and admin hostnames, Cloudflare Access protects `admin-staging.mexicovisible.com`, `TURNSTILE_SECRET_KEY` is stored for staging, and observability is active. Esto no cierra la ADR ni G4: el baseline privado solo de metadatos ya consta en `reports/stage-2-status.md`, pero siguen pendientes los assets/escrituras R2, la importación SESNSP vigente, la segunda observación y los benchmarks. Future admin endpoints should remain admin-host-only and/or validate `Cf-Access-Jwt-Assertion`; the public staging hostname currently returns only a code-level `403` for `/admin/*`.
