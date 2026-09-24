# Stage 2 source resolution — REPD-STATS, SESNSP, INEGI/CONAPO

**Status date:** 2026-09-22  
**Scope:** S2-007/S2-008/S2-009 source/model work for Stage 2 source resolution.  
**Inputs:** `SPEC_JALISCO_STAGE_2.md`, `reports/data-first-stage-status.md`, and source contracts in `sources/`.

## Executive summary

Stage 2 now has repository-facing scaffolds for the three source-resolution blockers without copying raw personal data. REPD-STATS preserves separate source metrics and models the known `16,203` municipality sum vs `16,250` total as an explicit unreconciled/non-mappable gap of `47`. SESNSP is routed through Route B: a manual official-file import contract that records provenance and validates headers locally without fetching remote files. INEGI/CONAPO have a canonical layer for municipal geography and population denominators, including non-municipal bucket detection and guarded rate construction.

## REPD-STATS status

- Implemented: `src/jal-repd-stats/model.cjs`.
- Tests: `tests/jal-repd-stats.test.cjs`.
- Model shape preserves `MetricDefinition` separately from `AggregateObservation`.
- Reconciliation does not manually correct source totals; it emits an `unreconciled` observation when the sum of currently mappable buckets differs from a preserved source total.
- The known Stage 2 discrepancy is represented as:
  - source total: `16,250`
  - mapped municipality sum: `16,203`
  - unreconciled or non-mappable gap: `47`
  - evidence status: `unexplained`

Update 2026-09-24 (see `reports/stage-2-c06-benchmark-adr.md`): the map sum 16,203 includes 86 `SE IGNORA`; municipal-only is 16,117. The 47 gap is 38 men / 9 women present in totals but in no map key. Current conclusion: the discrepancy is modeled but not fully explained. Later evidence can replace the gap with named source buckets only if the source definitions support that mapping.

## SESNSP status

- Implemented: `src/sesnsp/import-contract.cjs` and `scripts/import-sesnsp.cjs`.
- Tests: `tests/sesnsp-import.test.cjs`.
- Route B manual import usage:

```sh
node scripts/import-sesnsp.cjs \
  --file <official-file> \
  --source-url <official-url> \
  --cutoff <YYYY-MM-DD> \
  --contract MX-SESNSP-2015-2025
```

or:

```sh
node scripts/import-sesnsp.cjs \
  --file <official-file> \
  --source-url <official-url> \
  --cutoff <YYYY-MM-DD> \
  --contract MX-SESNSP-RNID-2026
```

The scaffold records filename, local path, byte size, SHA-256, cutoff, official source URL, operator/process, methodology contract, and practical header validation for CSV/TSV/text samples. It intentionally does not fetch remote files. It rejects mixing `MX-SESNSP-2015-2025` and `MX-SESNSP-RNID-2026` unless the caller supplies explicit mapping evidence.

Current conclusion: SESNSP acquisition remains manual official import until an approved automatable official download is available.

## INEGI/CONAPO status

- Implemented: `src/geo/canonical.cjs`.
- Tests: `tests/geo-canonical.test.cjs`.
- `GeoUnit` preserves `cvegeo` as text and expects 125 official Jalisco municipalities.
- Non-municipal buckets are detected for codes/labels including `0`, `14998`, `SE IGNORA`, and `No Especificado`; they are excluded from municipal rates.
- `PopulationObservation` represents sanitized CONAPO denominators by `cvegeo`, year, population, projection status, source, and methodology.
- Rate construction is guarded: numerator and denominator must align by `cvegeo`, year, and explicit methodology.

Current conclusion: the INEGI/CONAPO materialized contract is ready for sanitized import fixtures and later source artifact wiring.

## Remaining work

1. Explain the REPD-STATS gap with source evidence, or keep it explicitly unreconciled in any downstream publication.
2. Run SESNSP manual import against an approved official file outside Git and retain the raw artifact privately with the emitted contract metadata.
3. Wire INEGI/CONAPO helpers to real sanitized import artifacts and preserve source versions/hashes.
4. Keep source contracts separate until an explicit methodology mapping bridges old SESNSP and RNID 2026 structures.
