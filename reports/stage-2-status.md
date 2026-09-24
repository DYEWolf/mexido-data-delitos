# Stage 2 consolidated status

**Status date:** 2026-09-23
**Scope:** S2-011 / S2-018 consolidation for `SPEC_JALISCO_STAGE_2.md`.
**Report type:** sanitized repository report. Private raw evidence remains under `/Users/chris/Documents/seguridad-mexico` and must not be copied into Git.

## 1. Executive summary

Stage 2 now has a repo-safe execution baseline: source contracts exist, the JAL-REPD-CED metadata baseline runner exists with checkpoints/resume/hash/manifest behavior, a complete private metadata-only JAL-REPD-CED baseline succeeded, canonical/reconciliation models exist with synthetic maintenance tests, REPD-STATS is modeled with its known gap preserved, SESNSP has a manual official-file import scaffold, INEGI has a verified real 125-municipality private GeoUnit import (see `reports/stage-2-geo-import.md`), while CONAPO still has only canonical/rate helpers, a Cloudflare-first ADR/benchmark plan is prepared, and Cloudflare staging is deployed with DNS, Access protection for the admin hostname, Turnstile secret storage, and observability active. The full Stage 2 data baseline is **still not complete**: two comparable metadata-only observations succeeded with zero observed differences (see `reports/stage-2-reconciliation.md`), the approved image subset is validated and written to private R2 (89 images, see S2-003), but no current SESNSP official file or real CONAPO projection has been imported. The REPD-STATS gap of `47` is explicitly unexplained and unreconciled, with definitions kept separate rather than forcing totals to match. Synthetic fixtures cover modeled maintenance cases; live changes need not occur to validate the A/B evidence. G2 remains partial; G3 still needs operational checks, G4 is not complete, and G5 remains out of scope.

## 2. Stage 2 task table

| Task | Status | Evidence / rationale |
| --- | --- | --- |
| S2-001 Cloudflare bootstrap + secrets | complete for staging bootstrap; caution remains | `reports/stage-2-cloudflare-readiness.md` records the initial probe, Worker scaffold, and 2026-09-22 staging validation. `TURNSTILE_SECRET_KEY` is stored for staging, `npx wrangler deploy --env staging` was reported successful, DNS is correct for public/admin hostnames, Cloudflare Access protects the admin hostname, and observability is active. Remaining caution: public staging still includes `/admin/*` at the Worker route layer and currently relies on code-level `403`; future admin endpoints must be admin-host-only and/or validate `Cf-Access-Jwt-Assertion`. |
| S2-002 Source contracts | complete | `sources/JAL-REPD-CED.md`, `sources/JAL-REPD-STATS.md`, `sources/MX-SESNSP.md`, `sources/MX-INEGI-GEO.md`, and `sources/MX-CONAPO-POP.md` exist as sanitized contracts. |
| S2-003 R2 private storage adapter | done (C05) | Local/private storage safety exists in `src/jal-repd-ced/storage.cjs`; the up-to-100-image subset was validated/quarantined and written privately: 89 validated images (8,250,929 bytes) written to private R2 `seguridad-jalisco-private` and verified by remote GET/SHA-256; full replay: 89 reused, 0 PUT; ledger `s2-assets-r2-89-v1` has 89/89 `verified`, no lock. 2026-09-23 `--sample 5` run and replay: 5 verified, 0 PUT, ~10-13 s. |
| S2-004 Baseline runner | complete for metadata runner | `src/jal-repd-ced/baseline.cjs` and `scripts/jal-repd-ced-baseline.cjs` implement metadata traversal, checkpoints, hashes, manifest output, and bounds check behavior. Full metadata live baseline has now run successfully. |
| S2-005 Checkpoint/resume | complete for implemented runner and baseline | Tests cover resume behavior; S2-005 private pilot completed 3 pages with 36 unique records and no failures, and the full clean baseline completed 853 pages. |
| S2-006 Manifest + hashing | complete for metadata baseline | `src/jal-repd-ced/manifest.cjs`; baseline tests verify idempotent manifests/hashes. Full metadata-baseline manifest exists privately. |
| S2-007 Full baseline pilot/baseline | complete for metadata-only, assets pending | After a first schema-tightness failure, nullable fields were corrected and the clean full baseline completed 853/853 pages, 10,234 unique records, 0 request failures, 0 schema errors, and 0 duplicates with assets skipped. |
| S2-008 Canonical model/provenance | complete for DB-independent model | `src/jal-repd-ced/canonical.cjs` creates DB-independent provenance objects. It is not yet backed by a production datastore. |
| S2-009 Reconciliation engine | complete for synthetic/model scope | `src/jal-repd-ced/reconcile.cjs` covers new/unchanged/changed/asset_changed/source_missing/failed/suppression behavior in tests. |
| S2-010 Synthetic maintenance suite | complete | `tests/jal-repd-ced-reconcile.test.cjs` exercises synthetic maintenance scenarios, circuit breakers, suppression, restoration, and idempotence. |
| S2-011 Second full observation | complete for metadata-only A/B; assets pending | B completed 853/853 pages, 10,234 records, zero errors/duplicates and stable bounds. Offline comparison found 10,234 unchanged and zero observed differences; synthetic fixtures exercise modeled maintenance scenarios separately. No live change is required, but operational G3 checks remain; see `reports/stage-2-reconciliation.md`. |
| S2-012 REPD-STATS reconciliation | partially explained; unreconciled 47 kept | 2026-09-24 re-fetch (cutoff 2026-08-31): map 16,203 = 16,117 municipal + 86 `SE IGNORA`; total and year/sex series both 16,250; gap 47 = 38 men / 9 women in no map key. Model corrected to split the `SE IGNORA` bucket. See `reports/stage-2-c06-benchmark-adr.md`. |
| S2-013 SESNSP acquisition path | complete (manual official download) | Microsoft login blocks automation, so files are downloaded by the owner and imported offline. RNID 2026 (Jan–Aug, 76,393 incidents) and 2015–2025 (1,471,935 incidents, Latin-1) imported with contracts and Jalisco subsets, 125/125 municipalities each; non-municipal buckets 14998/14999 kept separate. `reports/stage-2-c04-official-imports.md`. |
| S2-014 INEGI/CONAPO canonical layer | complete | INEGI C04a imported. CONAPO `pobproy_quinq1.csv` imported: 125 municipalities × 1990–2040, 6,375 PopulationObservations, 375/375 match EXP-06. `reports/stage-2-c04-official-imports.md`. |
| S2-015 D1 vs Postgres benchmark | done (D1); Postgres not justified | Isolated synthetic D1 `seguridad-jalisco-bench-d1`, 10,234 rows: engine p95 ≤ 4.4 ms on all plan queries; 235k reads / 30.5k writes / 1.5 MiB within authorized caps. No dynamic GIS query identified. `reports/stage-2-c06-benchmark-adr.md`. |
| S2-016 ADR architecture | accepted: D1 primary, no Postgres | `reports/stage-2-c06-benchmark-adr.md` §4, accepted in `reports/stage-2-c07-closure.md`. |
| S2-017 Association publication/retention decisions | done | The owner is the association and holds every owner role. Public fields, image policy, 24 h takedown SLA and retention adopted in `reports/stage-2-c07-closure.md`. |
| S2-018 G2/G3 review | G3 done; G2 data complete | G3 evidenced in `reports/stage-2-g3-maintenance.md`. G2: metadata A/B, 89-image private R2 subset, INEGI, CONAPO and both SESNSP series imported; REPD-STATS 47 kept unreconciled with explicit qualification. |

## 3. Gate status

| Gate | Status | Rationale |
| --- | --- | --- |
| G2 — Initial usable load | done | Metadata A/B (10,234), 89-image private R2 subset, INEGI, CONAPO 1990–2040, SESNSP 2015–2025 and RNID 2026 with hashes and Jalisco subsets. REPD-STATS 47 kept unreconciled with qualification. |
| G3 — Maintenance demonstrated | done | Two comparable observations (10,234 unchanged), reconciliation integrated in the compare CLI with a persistent suppression ledger (write→reload→reimport→backup/restore e2e), false-removal protection, freshness probe and operational recipe. See `reports/stage-2-g3-maintenance.md`. |
| G4 — Architecture justified | done | D1 benchmark + accepted ADR; policies in `reports/stage-2-c07-closure.md`. |
| G5 — Publication operable | out of scope | No public web, admin removal flow, retention policy, accessibility/security publication checks, or association-approved publication process exists in this stage. |

## 4. Explicit blockers

1. **Cloudflare staging caution:** staging deployment, DNS, `TURNSTILE_SECRET_KEY`, admin Access, and observability are now in place. Remaining caution: public staging still routes `/admin/*` to Worker code and returns `403`; future admin endpoints must be admin-host-only and/or validate `Cf-Access-Jwt-Assertion`.
2. **Operational maintenance:** real metadata A/B produced zero observed differences, which is valid; synthetic fixtures exercise modeled scenarios separately. G3 still needs repeatable runs, cache/origin freshness verification, persistent exclusions across reimport/restore, and cadence/scoped limits/metrics. Stable counts do not prove no churn within sequential pagination.
3. **Approved image subset/R2 writes:** up to 100 images may be processed in existing private R2, accessible only to the owner and authorized automations, with a retention review at 30 days, no publication and no automatic recursive deletions. Pipeline validation, quarantine and private-write evidence are complete (S2-003). Assets must never be stored in Git.
4. **SESNSP current official file:** current official ZIP acquisition was blocked in the tested environment; the manual import scaffold exists but no approved current official file has been imported.
5. **REPD-STATS downstream qualification:** the `16,203` municipality sum vs `16,250` total has an unexplained, formally unreconciled gap of `47`. Keep definitions separate; do not assign `47` to a municipality or assert that the total reconciles. Qualify downstream use rather than requiring an explanation as an automatic G2 blocker.
6. **Association public policy decisions:** provisional private-image handling is approved, but publication owner, correction/takedown/retention/incident owners, public fields and images, takedown SLA, final retention, backup/restore and publication policies remain undecided for Stage 3.

## 5. Evidence index

### Repository files

- `SPEC_JALISCO_STAGE_2.md`
- `reports/data-first-stage-status.md`
- `reports/stage-2-cloudflare-readiness.md`
- `reports/stage-2-sources-resolution.md`
- `reports/stage-2-architecture-adr-plan.md`
- `reports/stage-2-status.md`
- `reports/stage-2-reconciliation.md`
- `reports/stage-2-geo-import.md`
- `src/geo/inegi-import.cjs`
- `scripts/import-inegi.cjs`
- `tests/inegi-import.test.cjs`
- `sources/JAL-REPD-CED.md`
- `sources/JAL-REPD-STATS.md`
- `sources/MX-SESNSP.md`
- `sources/MX-INEGI-GEO.md`
- `sources/MX-CONAPO-POP.md`
- `src/jal-repd-ced/storage.cjs`
- `src/jal-repd-ced/baseline.cjs`
- `src/jal-repd-ced/manifest.cjs`
- `src/jal-repd-ced/canonical.cjs`
- `src/jal-repd-ced/reconcile.cjs`
- `src/jal-repd-stats/model.cjs`
- `src/sesnsp/import-contract.cjs`
- `src/geo/canonical.cjs`
- `scripts/jal-repd-ced-baseline.cjs`
- `scripts/import-sesnsp.cjs`
- `tests/*.test.cjs`

### Private evidence paths

- S2-005 private pilot: `/Users/chris/Documents/seguridad-mexico/s2-005-baseline-pilot-20260922T014554Z/access-report.md`
- S2 full metadata baseline, first attempt partial: `/Users/chris/Documents/seguridad-mexico/s2-full-baseline-20260923T192749Z/access-report.md`
- S2 full metadata baseline, clean complete run: `/Users/chris/Documents/seguridad-mexico/s2-full-baseline-clean-20260923T193837Z/access-report.md`
- S2-C03 second metadata baseline and comparison input: `/Users/chris/Documents/seguridad-mexico/s2-second-baseline-20260923T214140Z`
- S2-C04a official INEGI originals, acquisition and private 125-unit materialization: `/Users/chris/Documents/seguridad-mexico/s2-inegi-import-20260923T221320Z`
- Data-first discovery and sample evidence listed in `reports/data-first-stage-status.md`, including EXP-01 through EXP-08 private paths.

### Historical offline tests (not rerun for C03 report corrections)

```sh
node --test tests/*.test.cjs
```

Earlier result after Cloudflare scaffold and schema nullability update: **passed 52/52**, failed 0, skipped 0. Later C02 implementation was independently verified at **75/75** full and **31/31** focused before the live C03 capture; these are not new test executions or live-data schema tests.

## 6. Recommended next actions in order

1. Use completed real metadata A/B and synthetic fixtures as distinct G3 evidence; verify repeatability, cache/origin freshness, exclusions through reimport/restore and maintenance cadence/limits with metrics. Do not wait for artificial live changes.
2. Done (S2-003): validation, quarantine and private R2 writes for the approved image subset; review retention at 30 days, with no publication or automatic recursive deletion. Update the source spec's subset wording in C05, not in this report-only correction.
3. Harden future admin behavior: keep admin functionality on the Access-protected hostname and/or validate `Cf-Access-Jwt-Assertion` before enabling real admin endpoints.
4. Preserve the unexplained REPD-STATS `47` as formally unreconciled, keep metric definitions separate and qualify downstream use; investigate further if evidence becomes available without forcing equality.
5. Acquire/import the current official SESNSP file through an approved official path and retain raw artifact/hash privately.
6. Preserve the completed INEGI real private import and acquire/import actual CONAPO municipal projection evidence with version/hash; do not treat INEGI's census population metadata as a 2026 denominator.
7. Execute the D1 vs Postgres/PostGIS benchmark plan using measured baseline and maintenance metrics.
8. Collect association public publication/retention/removal decisions before any Stage 3 product work.

## 7. 2026-09-22 Cloudflare Worker scaffold update

Historical note: the repository added a non-mutating Wrangler/Worker scaffold for the planned staging hostnames before the live staging deployment. `wrangler.jsonc`, `src/worker/index.mjs`, and `tests/worker-config.test.cjs` validate the Worker entrypoint, R2 binding names, non-secret vars, Turnstile secret absence, and safe health endpoint behavior.

Validation completed at that point:

```sh
node --test tests/worker-config.test.cjs
node --test tests/*.test.cjs
npx wrangler deploy --dry-run --env staging
```

Result: Worker config tests passed 5/5, full Node tests passed 51/51, and Wrangler staging dry-run exited before deployment. The later staging validation below supersedes the earlier deploy/DNS/Access/secrets blockers for staging.


## 8. 2026-09-22 Cloudflare staging validation

Cloudflare staging is now deployed and protected according to safe external checks and operator-reported configuration. `TURNSTILE_SECRET_KEY` is stored for staging, `npx wrangler deploy --env staging` succeeded, DNS resolves correctly for `staging.mexicovisible.com` and `admin-staging.mexicovisible.com`, Cloudflare Access protects the admin hostname through app `71cbb3d9-ce33-4eea-b6e5-0e98761db5f1`, and observability is active.

Safe HTTP checks run without secrets:

| Check | Status | Notes |
| --- | --- | --- |
| Public health | `200` | `https://staging.mexicovisible.com/health` returned `{"ok":true,"environment":"staging"}`. |
| Public admin health | `403` | `https://staging.mexicovisible.com/admin/health` remains code-blocked on the public hostname. |
| Public missing route | `404` | `https://staging.mexicovisible.com/noexiste` returned not found. |
| Admin health, no redirects | `302` | `https://admin-staging.mexicovisible.com/health` redirects to Cloudflare Access. |

Reported complementary admin-host checks for `/admin/health`, `/`, and `/cualquier/cosa` also return `302` to Access. The main remaining Cloudflare caution is intentional: public staging includes the `/admin/*` route surface at the Worker layer, so future admin endpoints must be restricted to the admin hostname and/or validate `Cf-Access-Jwt-Assertion`; the current public response is only a code-level `403`.
