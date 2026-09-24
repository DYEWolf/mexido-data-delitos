# Stage 2 C06 — REPD-STATS resolution, D1 benchmark and datastore ADR

Date: 2026-09-24 UTC. Method: e2e on real endpoints/Cloudflare; no new automated tests (user decision). Private evidence under `/Users/chris/Documents/seguridad-mexico/` (`s2-c06-repd-stats-20260924T031054Z`, `s2-c06-d1-benchmark`). No personal data in this report or in D1.

## 1. REPD-STATS: the 16,250 vs 16,203 gap

Three aggregate endpoints re-fetched 2026-09-24 (3 GET, ≤1 req/s). Cutoff still `2026-08-31`; values identical to EXP-04 (2026-09-21).

| Source | HOMBRE | MUJER | Total |
|---|---|---|---|
| `desapariciones_con_sin_carpeta` → `Total_Desapariciones` | — | — | **16,250** (13,966 with file + 2,284 without) |
| Year × sex series (2019…2026 + "2018 y anteriores") | 14,446 | 1,804 | **16,250** |
| Map `datos_para_mapa`, all 126 keys | 14,408 | 1,795 | **16,203** |
| of which 125 Jalisco municipalities | | | 16,117 |
| of which `SE IGNORA` (clave 0) | 64 | 22 | 86 |
| **Gap total − map** | **38** | **9** | **47** |

Resolution:
- **Corrected:** the previous model called 16,203 the "mappable municipality sum". It includes 86 persons under `SE IGNORA`, which are not mappable and must never be a municipal-rate numerator. `src/jal-repd-stats/model.cjs` now emits two buckets: 16,117 municipal + 86 unknown-municipality. The gap stays 47.
- **Explained in part:** the total and the year/sex series agree exactly (16,250), so the 47 is specific to the map endpoint: 38 men and 9 women counted in the totals but in no map key (not even `SE IGNORA`).
- **Still unexplained:** why the map omits them. Most plausible hypothesis (not proven): records whose municipality field falls outside the Jalisco catalog and outside `SE IGNORA` (e.g. another state). Public aggregates cannot distinguish this. It remains `unreconciled`, `evidence_status: unexplained`; totals are never forced to match.
- Consequence for Stage 3: publish the state total (16,250) and the municipal map (16,117) with a visible note on the 86 unknown-municipality and 47 not-on-map persons.

## 2. D1 benchmark

Scope as authorized (`authorize-isolated-d1-benchmark-bounded`): ONE new DB `seguridad-jalisco-bench-d1`; the other DB in the account (`mexicanos-dev`) was only listed by name, never queried. Synthetic data at observed cardinality: 10,234 cédulas (IDs `SYN-*`, random hashes, Zipf-skewed over the 125 real INEGI municipality codes), 125 municipalities (synthetic population, CONAPO still pending), 52 suppressions, 2 runs, 125 precomputed stats. Script: `scripts/d1-benchmark.cjs` (cumulative consumption ledger, stops at 90% of any cap).

Consumption: **235,483 / 1,000,000 rows read · 30,507 / 50,000 rows written · 1.5 MiB / 64 MiB stored.** No deploy, no plan change.

Load: 30,507 rows written (≈3 per cédula: row + UNIQUE + partial listing index), 259 ms engine, 3.1 s client.

Queries, 10 repetitions each. *Engine* = D1 `meta.duration` (server-side SQL). *Client* = wall time of a `wrangler d1 execute --remote` call, dominated by CLI start/auth (~0.8 s), **not** representative of Worker→D1 latency (measuring that needs a deploy, not authorized).

| Query (plan §6) | Engine p50 / p95 ms | Rows read/call | Client p50 ms |
|---|---|---|---|
| P1 list publishable by municipality, paged, suppression-aware | 0.61 / 1.88 | 40 | 827 |
| P2 single cédula by source_id | 0.34 / 0.48 | 1 | 825 |
| P3 municipal aggregates, precomputed | 0.73 / 0.99 | 125 | 822 |
| P3b municipal aggregates, live GROUP BY | 1.66 / 3.05 | 9,723 | 880 |
| P4 rates per 100k (stats × population) | 0.70 / 4.40 | 250 | 897 |
| A1 changed since run (no index) | 1.31 / 1.94 | 10,234 | 863 |
| A3 active suppressions joined to records | 0.37 / 0.63 | 104 | 890 |

`EXPLAIN QUERY PLAN` P1: `SEARCH c USING INDEX cedulas_listing (municipio_cvegeo=? AND status=?)` + suppression check by PRIMARY KEY; no full scans on the public path.

Cost reading (official pricing, `developers.cloudflare.com/d1/platform/pricing`): full scans (P3b, A1) cost ~10k rows read each; precomputed stats (P3) cost 125. Public endpoints should read precomputed tables; scans only in admin/batch jobs. At this volume, all of this fits within included quotas.

## 3. GIS question

No query required for Jalisco in plan §6 needs point-in-polygon, intersections, buffers or proximity: cédulas and statistics come already keyed by municipality code, and the map is a municipal choropleth joined by `cvegeo`. Geometry (INEGI Dec 2025, 125 municipalities, ~9 MB raw GeoJSON) should be simplified once and served as a static file from R2/cache, not stored in D1.

## 4. ADR (proposed, pending C07 sign-off)

**Decision: Cloudflare D1 as the primary relational datastore for Stage 3; no Postgres/PostGIS.**

- Evidence: full observed cardinality fits in 1.5 MiB; all representative queries run in ≤ 4.4 ms engine p95; indexes cover the public path; suppression semantics expressible as PK lookups.
- Postgres/PostGIS not justified: no dynamic GIS query and no D1 stress at Jalisco scale. Territorial expansion is not a criterion.
- Conditions: public reads use precomputed tables; raw records/assets stay in private R2 (D1 holds references/hashes only); backup via D1 Time Travel + periodic export to private R2, restore to be rehearsed in Stage 3.
- Open: Worker→D1 latency from a deployed Worker (needs deploy authorization); version growth over many observations (only 2 exist).

Benchmark DB retention: keep, review at 30 days (2026-10-24); no automatic deletion.
