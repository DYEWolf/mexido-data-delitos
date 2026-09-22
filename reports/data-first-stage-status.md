# Data-first stage consolidated status — Jalisco seguridad data

**Status date:** 2026-09-22  
**Scope:** consolidation of completed data-first experiments for `SPEC_JALISCO_DATA_FIRST.md`.  
**Report type:** sanitized repository report. Private raw evidence and restricted assets remain outside Git under `/Users/chris/Documents/seguridad-mexico`.

## 1. Executive summary

The data-first stage produced enough evidence to confirm that a cautious, metadata-first Jalisco discovery path is viable, especially for `JAL-REPD-CED` cédulas, INEGI geography, and CONAPO denominators. The work also identified hard limits: the current SESNSP ZIP downloads are blocked by Microsoft authentication in this environment, REPD aggregate statistics have a municipality-total definition mismatch, and maintenance has only second-observation stability plus synthetic checks rather than a real update/removal event. Evidence exists as private sanitized reports, bounded raw artifacts, offline connector code, and synthetic tests; no raw JSON, names, photo URLs, photos, or personal identifiers are copied into this repository report.

## 2. Experiment table

| Experiment | Status | Evidence found | Decision / implication |
|---|---|---|---|
| EXP-01 — REPD access/surface | Complete for bounded discovery | JavaScript-rendered public page works through automated browser; `estado=14` search exposes paginated public cédulas and observed JSON/listing endpoints. | `JAL-REPD-CED` is accessible for controlled public discovery; observed endpoints are implementation endpoints, not declared official API contracts. |
| EXP-02 — sample and asset association | Complete for sample | 30 metadata records sampled; 20/20 planned assets fetched and technically validated privately; all sample records had `id_cedula_busqueda` and `ruta_foto`. | Sample-level cédula + asset association is technically viable; visual/person-level correctness and publication rights are not asserted here. |
| EXP-03 / EXP-03B — pagination, identity, boundaries | Complete for bounded strategy | Page 1/2/repeat stable immediately; page 426 and last page 852 stable immediately; last page size matched `10215 % 12`; page 853 returned `Invalid page`. | Page-number traversal can be treated as `partial` strategy evidence; do not claim full baseline completeness or long-term stability. |
| EXP-04 — REPD statistics | Complete for aggregate discovery, partial for definitions | Fixed aggregate endpoints reproduced; cutoff observed as `2026-08-31`; municipality, sex, status, age, and investigation-file dimensions observed. Municipality sum mismatch remains: map disappeared total 16,203 vs total disappearances 16,250. | Aggregate statistics are feasible, but definitions need reconciliation before G2/G4 claims; do not use cédula counts as statistical totals. |
| EXP-05 — SESNSP incidence | Partial | Official gob.mx catalog and RNID methodology identified; current and 2015–2025 ZIP links route to Microsoft auth in this environment; historical official/mirror Jalisco sample validated for structure. | Incidence source is identified but current ingestion is blocked; DATA-003 needs an official accessible ZIP or approved manual/versioned import. |
| EXP-06 — geography/denominator | Complete | INEGI `wscatgeo` returns 125 official Jalisco municipalities and GeoJSON; CONAPO population projections provide compatible 2020/2025/2026 municipal denominators. | Municipal joins and rates are supportable for 125 official municipalities; `SE IGNORA` / `No Especificado` buckets must be excluded from municipal maps/rates or shown separately. |
| EXP-07 — extraction tool comparison | Skipped by decision | Existing evidence shows direct HTTP/observed JSON plus browser discovery is sufficient for current `JAL-REPD-CED` work; no unresolved value proposition for Firecrawl or a paid/external extractor at this stage. | Skip formal tool comparison for now; revisit only if direct HTTP/browser path fails, coverage cannot be maintained, or a source requires dynamic extraction not solved by simpler methods. |
| EXP-08 — maintenance and second observation | Partial | Second bounded observation matched prior pages by ID/hash; no `ETag`/`Last-Modified` headers observed; offline connector tests passed; private synthetic maintenance checks passed. | G3 is partial: stability and concepts are evidenced, but no live insertion, correction, removal, or end-to-end integrated maintenance suite has been observed. |

## 3. Source fichas and gate-relevant source summary

### JAL-REPD-CED — public cédulas

- **Publisher / entrypoint:** Registro estatal de personas desaparecidas de Jalisco, public cédulas page.
- **Verification state:** `sample_extracted` / `partial` traversal evidence.
- **Access method:** rendered page discovery plus observed JSON endpoint pattern for `estado=14&page=<n>&limit=12`.
- **Observed shape:** top-level response includes `count`, `total_pages`, `results`; sample records shared 21 fields.
- **Identity candidate:** `id_cedula_busqueda`, present and unique in sampled records; still a candidate until long-term update behavior is proven.
- **Assets:** sample `ruta_foto` assets privately downloaded and technically validated; no photos or URLs copied into repo.
- **Coverage:** `count=10215`, `total_pages=852` observed consistently in bounded probes; coverage remains `partial`/`unknown` until a declared baseline run completes.
- **Maintenance:** second observation stable for sampled pages; no real update/removal event observed.

### REPD-STATS — disappearance statistics

- **Publisher / entrypoint:** REPD Jalisco statistics page.
- **Verification state:** aggregate endpoint discovery complete; definitions partially unresolved.
- **Access method:** page HTML + bundled JS inspection + four bounded aggregate endpoint replays.
- **Dimensions observed:** municipality, sex, status/localization condition, year/cutoff, age ranges, investigation-file status.
- **Cutoff observed:** `2026-08-31` in reproduced chart endpoints.
- **Primary blocker:** map municipality disappeared total did not reconcile exactly with total disappearances endpoint; this may be a non-mappable bucket, endpoint-definition difference, or other definition issue.
- **Use rule:** explain what each endpoint measures before publishing; do not silently correct local totals.

### SESNSP incidence

- **Publisher / entrypoint:** SESNSP gob.mx open data catalog for incidence.
- **Verification state:** official catalog and methodology identified; current ZIP access blocked in this environment.
- **Methodology:** RNID 2026 differentiates delitos and víctimas; period is monthly; territoriality is by place of facts; hierarchy includes bien jurídico, tipo, subtipo, modalidad.
- **Sample evidence:** historical official/mirror municipal delitos sample for Jalisco validated structure, keys, periods, zeros, and category hierarchy.
- **Blocker:** current and historical ZIP links from gob.mx redirect to Microsoft authentication instead of delivering ZIP files in this environment.
- **Use rule:** treat 2015–2025 and 2026 RNID as separate contracts until current ZIPs are actually downloaded and profiled.

### INEGI / CONAPO geography and denominator

- **Publisher / entrypoints:** INEGI `wscatgeo` municipal catalog/geometries; CONAPO/datos.gob.mx population projections.
- **Verification state:** complete for municipal joins and denominator suitability.
- **Geography:** 125 official Jalisco municipalities from INEGI; GeoJSON available; keys must remain text (`cvegeo`).
- **Denominator:** CONAPO municipal population supports 2020, 2025, and 2026 by municipality, sex, and age; values for 2021–2040 are projections.
- **Join rule:** join by code, not by name. REPD `0 SE IGNORA` and SESNSP `14998 No Especificado` are non-municipal buckets.
- **Use rule:** rates are possible only where numerator and denominator align by municipality, period, and definition.

## 4. Gate assessment G0–G5

| Gate | Assessment | Rationale |
|---|---|---|
| G0 — Prepared to test | Complete, with governance caveat | Scope, sources, limits, private storage, and evidence rules were established and followed. Named publication/responsibility decisions for the association remain pending and block product publication, not data discovery. |
| G1 — Source understood in a sample | Partial-to-complete by source | `JAL-REPD-CED` sample evidence is strong; `REPD-STATS` aggregate shape is understood but definitions need reconciliation; SESNSP current ZIP is blocked; INEGI/CONAPO are understood enough for municipal joins. Do not mark project-wide G1 as fully complete for every source. |
| G2 — Initial usable load | Partial / not reached project-wide | Offline connector and sample manifest behavior exist for cédulas, and geography/denominator joins are ready. No full declared cédula baseline, no current SESNSP baseline, and no fully reconciled REPD statistics baseline exist yet. |
| G3 — Maintenance demonstrated | Partial | A second real observation was stable and synthetic checks cover update/removal concepts, but no live update/removal was observed, no conditional caching support was found, and integrated maintenance tests are incomplete. |
| G4 — Architecture justified | Not reached | ADRs and production architecture decisions must wait for resolved G2/G3 evidence, especially maintenance, retention, delivery, and SESNSP import path. |
| G5 — Publication operable | Not reached | No public web, admin removal flow, retention policy, accessibility/security publication checks, or approved responsible publication process exists. |

## 5. Explicit unresolved blockers

1. **SESNSP ZIP authentication:** current official ZIPs route to Microsoft authentication in this environment; no evasion or credentialed access was attempted.
2. **REPD stats definition mismatch:** reproduced aggregate endpoints show a municipality-total mismatch that must be explained before publishing reconciled statistics.
3. **G3 real update not observed:** sampled pages stayed stable; no live insertion, correction, image replacement, withdrawal, or explicit source timestamp was observed.
4. **Publication and retention policy pending:** association decisions are still needed for responsible publication, fields allowed, takedown handling, retention, backups, restoration, and responsible contacts.
5. **No commit/publish authorization:** this consolidation did not commit, push, publish, create a PR, deploy, or authorize public release.

## 6. Next recommended tasks

### Technical tasks, minimal order

1. **Consolidate repo-facing source fichas** for `JAL-REPD-CED`, `REPD-STATS`, `MX-SESNSP`, `MX-INEGI-GEO`, and `MX-POP` using only sanitized fields and private evidence references.
2. **Promote the offline connector checks into a baseline-pilot plan** for `JAL-REPD-CED`: declared scope, manifest, checkpoint, idempotence, and no public asset exposure.
3. **Resolve REPD statistics definitions** by comparing additional bounded aggregate endpoints and documenting the non-mappable or definition gap behind the 16,203 vs 16,250 mismatch.
4. **Decide SESNSP acquisition path technically:** retry from an approved environment, obtain files manually from official catalog, or register a versioned manual import process with URL, filename, hash, and cutoff.
5. **Integrate maintenance tests in-repo with synthetic fixtures** for new record, changed record, failed page, anomalous drop, suppression, and reimport/restoration behavior.
6. **Prepare ADR inputs only after the above:** access mechanism, identity/versioning, storage/retention, sync/reconciliation, geography/denominator, and eventual web architecture.

### Association / policy decisions

1. Designate responsible owners for publication, corrections, removals, retention, and incident response.
2. Approve allowed public fields and whether public cédula images are served directly, proxied, or linked with restrictions.
3. Define retention periods for private raw data, assets, browser traces, logs, and suppression records.
4. Define takedown SLA, backup-restore behavior, and antigüedad máxima before suspending stale cédulas.
5. Approve whether manual official-file import is acceptable for SESNSP if automated current ZIP access remains blocked.

## 7. Evidence index

### Private evidence paths

- EXP-01 access/surface: `/Users/chris/Documents/seguridad-mexico/exp-01-agent-browser-20260921T170240-0600/access-report.md`
- EXP-02 controlled sample: `/Users/chris/Documents/seguridad-mexico/exp-02-sample-20260921T170945-0600/access-report.md`
- EXP-03 pagination: `/Users/chris/Documents/seguridad-mexico/exp-03-pagination-20260921T172028-0600/access-report.md`
- EXP-03B boundaries/resume: `/Users/chris/Documents/seguridad-mexico/exp-03b-boundaries-20260921T173015-0600/access-report.md`
- Consolidated early discovery: `/Users/chris/Documents/seguridad-mexico/discovery-consolidated-20260921T173229-0600/jal-repd-ced-discovery-status.md`
- EXP-02 full sample/assets: `/Users/chris/Documents/seguridad-mexico/exp-02-full-sample-20260921T175047-0600/access-report.md`
- EXP-04 REPD statistics: `/Users/chris/Documents/seguridad-mexico/exp-04-statistics-20260922T000024Z/access-report.md`
- EXP-05 SESNSP incidence: `/Users/chris/Documents/seguridad-mexico/exp-05-incidence-20260922T000410Z/access-report.md`
- EXP-06 geography/denominator: `/Users/chris/Documents/seguridad-mexico/exp-06-geo-denominator-20260921-181213/access-report.md`
- EXP-08 maintenance: `/Users/chris/Documents/seguridad-mexico/exp-08-maintenance-20260921T181853-0600/access-report.md`

### Sanitized repository artifact

- `reports/data-first-stage-status.md`

### Repository implementation/test evidence

- `src/jal-repd-ced/schema.cjs`
- `src/jal-repd-ced/normalize.cjs`
- `src/jal-repd-ced/manifest.cjs`
- `scripts/jal-repd-ced-offline.cjs`
- `tests/jal-repd-ced-offline.test.cjs`

## 8. Privacy note

Raw JSON, browser captures, names, exact media URLs, downloaded photos/assets, and any personal identifiers remain restricted under `/Users/chris/Documents/seguridad-mexico` and must not be committed. This repository report intentionally includes only sanitized counts, endpoint patterns, gate status, and private evidence paths so reviewers can locate evidence without exposing personal data in Git.
