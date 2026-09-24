# Stage 2 G3 — maintenance, suppressions and freshness

Date: 2026-09-23 (runs 2026-09-24 UTC). Method: e2e on real private evidence; no new automated tests by user decision (TDD off). No raw records, IDs, URLs or images in this report.

## What G3 required and where the evidence is

| Requirement (SPEC §2 G3 / S2-G3) | Evidence | Status |
|---|---|---|
| Two comparable complete metadata observations | A `s2-full-baseline-clean-20260923T193837Z`, B `s2-second-baseline-20260923T214140Z`; see `reports/stage-2-reconciliation.md` | done (C03) |
| Integrated reconciliation | `scripts/jal-repd-ced-compare.cjs` validates both snapshots and runs `reconcileCedulas`; A→B: 10,234 unchanged, 0 new/changed/missing | done |
| Protection against false removals | Engine marks absences `failed` (not `source_missing`) on incomplete/anomalous runs and blocks publication mutations; comparator rejects incomplete snapshots before comparing | done (C01/C03) |
| Durable, persisted exclusions | New `src/jal-repd-ced/suppressions.cjs` + `scripts/jal-repd-ced-suppressions.cjs`, wired into compare via `--suppressions` | done (this unit) |
| write → reload → reimport → backup/restore | E2E run below | done |
| Bounded freshness probe with header provenance | New `scripts/jal-repd-ced-freshness.cjs`, real run below | done |
| Operational recipe with cadence, caps, metrics | Section below (proposed, not longitudinally proven) | done |

## Suppression ledger

Private append-only NDJSON (`0700` dir / `0600` file). An entry holds only: action (`suppress`/`restore`), random `suppressionId`, `sourceId`, fixed reason code (`takedown_request`, `family_request`, `correction`, `privacy`, `legal`, `other`) and timestamp. No free text, names or URLs. Restores append; nothing is rewritten. Backups go to a new private dir with a SHA-256 manifest; restoring a backup always creates a new ledger dir and refuses on hash mismatch.

E2E on real A/B, with one real record suppressed (ID never printed), ledger `s2-g3-suppressions-e2e-20260924T030643Z`:

| Step | Result |
|---|---|
| Compare A→B, no ledger | 10,234 unchanged, 0 suppressed |
| suppress, then repeat | same `suppressionId`, `alreadyActive: true` (idempotent) |
| Compare with ledger (reload from disk) | 10,233 unchanged, **1 suppressed**, `humanReviewRequired: true` |
| backup → restore-backup into new dir | identical SHA-256 (183 bytes) |
| Compare with restored ledger | 1 suppressed (reimport equivalent) |
| restore the record | back to 10,234 unchanged, 0 suppressed; summary 2 entries, 0 active, 1 restored |
| Tampered backup | refused `backup_mismatch` |
| init over existing ledger | refused `output_exists` |

This is an audited, deliberate test restoration inside a test ledger; it did not change A/B or anything public. Production ledger path is to be chosen when Stage 3 defines the takedown owner (SPEC §15).

## Freshness probe

One GET of page 1 with the reference snapshot's page size (`limit=12`), no redirects, 20 s timeout, 1 MiB cap. It records status, timings, count/total_pages and cache headers to a new private dir.

Real run 2026-09-24T03:07Z, `s2-g3-freshness-*`: HTTP 200, 10,234 records / 853 pages = B, ~0.6 s → `no_change_detected`.

Findings:
- **The origin sends no `ETag`, `Last-Modified`, `Cache-Control` or `Age`** (only `Date`, `Vary`, `Content-Type`). Conditional requests cannot detect change; freshness can only be inferred from counts plus a periodic full capture.
- **`total_pages` depends on page size.** With no `limit` the server uses 10/page (1,024 pages); the baseline used 12 (853). The first probe misclassified as `changed` for this reason; fixed by always probing with the reference page size.
- Equal counts do not prove no change (simultaneous add+remove, field edits). Hence the result is `no_change_detected`, never "fresh". HTTP errors/unparseable bodies → `unknown`, exit 3, escalate.

## Operational recipe (proposed cadence, not longitudinally proven)

| Job | Cadence | Cost / caps | Trigger |
|---|---|---|---|
| Freshness probe | every 6 h | 1 request, ~0.6 s, ≤1 MiB | if `changed` → run full capture now; if `unknown` twice in a row → alert |
| Full metadata capture + compare (+ `--suppressions`) | daily, and on `changed` | ~853 requests at ≤1 req/s, ~14–15 min, cap 1,000 pages | any `source_missing` or anomaly → human review, publication blocked |
| Suppression ledger backup | after every suppress/restore, plus weekly | a few KB | verify SHA on restore |
| Images | not scheduled | one-time 89-image subset only | `--sample N` for smoke runs |

Per-run metrics to keep (SPEC §16): source_count, pages_expected/success/failed, records_received/unique, new/changed/missing/suppressed, anomalyCodes, elapsed time, probe classification.

## Not covered

- No real add/change/removal has been observed yet at the origin; behavior on real churn is proven only through the engine's rules and this suppression e2e.
- Cadence is a proposal; it has not been run over days.
- Takedown/retention owners and SLA remain association decisions (SPEC §15, C07).
