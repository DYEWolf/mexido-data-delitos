# S2-C03 — Jalisco metadata baseline comparison

**Status:** complete for this bounded metadata acquisition and offline comparison; Stage 2 gates remain open.

**Source:** `JAL-REPD-CED`, publication in the Jalisco state registry; no asset bytes acquired.

**Private evidence:** A `/Users/chris/Documents/seguridad-mexico/s2-full-baseline-clean-20260923T193837Z`; B `/Users/chris/Documents/seguridad-mexico/s2-second-baseline-20260923T214140Z`. These directories contain restricted records and must not be copied into Git.

## Acquisition and integrity

| Evidence | A (before) | B (after) |
| --- | ---: | ---: |
| Observed at (UTC) | 2026-09-23T19:38:37.667Z | 2026-09-23T21:49:02.246Z |
| Reported records / normalized records | 10,234 / 10,234 | 10,234 / 10,234 |
| Discovered / completed pages | 853 / 853 | 853 / 853 |
| Page size / first page | 12 / 1 | 12 / 1 |
| Scope | complete within declared scope | complete within declared scope |
| Asset policy | skip | skip |
| Failed pages / schema errors / duplicates | 0 / 0 / 0 | 0 / 0 / 0 |
| Initial vs final bounds | stable | stable |

The capture author recorded one foreground B run from **2026-09-23T21:49:02Z to 22:03:17Z UTC** (14 min 15 s elapsed). Safety cap: 1,000 pages; the observed 853 pages were fully traversed, not truncated by this cap. Transport defaults: at most one request per second, three attempts per request, 20-second deadline and 1 MiB body cap. The independent verifier checked B permissions (directory `0700`, files `0600`) and repeated the offline comparator, which verified snapshot integrity under its checks and the aggregate outcome; it did not repeat the live capture. The capture author checked A's 10,234 normalized IDs and hashes against its manifest in memory and recorded unchanged aggregate byte digests for A's five evidence files before/after the run. These historical timing/digest checks were not independently reconstructed. No raw records, identifiers, media URLs or images are included here.

The observed-at interval is **7,824.579 seconds (2 h 10 min 24.579 s)**. Both observed-at values mark run starts; sequential pagination is not an atomic point-in-time snapshot. Stable page counts and start/end bounds do not rule out churn during either traversal.

## Offline comparison

Command: `node scripts/jal-repd-ced-compare.cjs --before /Users/chris/Documents/seguridad-mexico/s2-full-baseline-clean-20260923T193837Z --after /Users/chris/Documents/seguridad-mexico/s2-second-baseline-20260923T214140Z`

Result: `ok: true`; run status `success`; anomaly codes: none. Aggregate outcomes: **new 0, unchanged 10,234, changed 0, asset_changed 0, source_missing 0, failed 0, suppressed 0**. The comparator reported no required human review and no publication-mutation block; no publication or suppression mutation was performed.

Zero observed differences are a valid real A/B result; synthetic fixtures exercise modeled change, absence and suppression scenarios without presenting them as live events. No real change is required to occur artificially. `source_missing` would denote absence in the later source, never confirmation that a person was located. Asset bytes were skipped, so `asset_changed: 0` says nothing about image changes. The approved next image scope is **up to 100 images** in existing private R2 storage, not full-image acquisition; validation, quarantine and write evidence remain pending. This metadata-only comparison does not close G2/G3/G4 or authorize publication.

## Verification provenance

- `node scripts/jal-repd-ced-baseline.cjs --output-dir /Users/chris/Documents/seguridad-mexico/s2-second-baseline-20260923T214140Z --assets skip --page-size 12 --max-pages 1000 --no-resume`: exit 0; 10,234 records; zero failed pages/schema errors. Executed exactly once with `umask 077` and a 1,800-second foreground timeout.
- Capture-author read-only preflight/postflight: A manifest hashes matched 10,234 records; B coverage and integrity checks passed (5 files, 853/853 pages, 10,234 hashes); author-recorded A file digests unchanged. The independent verifier checked B permissions (`0700`/`0600`), not the historical A before/after digest.
- Offline comparator command above: exit 0, `ok: true`, no anomaly; parent and independent verifier repeated this read-only comparison with the same aggregate outcome. No second live capture was performed.
- Historical offline application tests (independently verified before this acquisition): 75/75 full suite and 31/31 focused. They are not live-data schema tests and were not rerun here. Strict TDD remains on for implementation; this acquisition changed no application behavior and has no RED/GREEN claim.
