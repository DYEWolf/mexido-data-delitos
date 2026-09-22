# JAL-REPD-CED offline connector scaffolding

Status: completed

Constraints:
- Do not modify SPEC_JALISCO_DATA_FIRST.md.
- Do not modify package.json or package-lock.json.
- Do not commit, push, or create PR.
- Do not call the live portal; use offline fixtures/input only.
- Do not store personal data in repository fixtures.

Tasks:
- [x] Add offline normalization/schema/manifest modules for JAL-REPD-CED.
- [x] Add inert CLI that reads a local JSON file and writes normalized NDJSON + manifest.
- [x] Add tests with sanitized synthetic fixtures for schema, identity, idempotence, and privacy boundaries.
- [x] Run focused checks and record results.

Evidence:
- Contract source: private EXP-02 evidence supplied by the user; field names/types only, no personal data copied.
- `node --test tests/jal-repd-ced-offline.test.cjs`: passed (6 tests, 0 failures).
- `node --check src/jal-repd-ced/schema.cjs && node --check src/jal-repd-ced/normalize.cjs && node --check src/jal-repd-ced/manifest.cjs && node --check scripts/jal-repd-ced-offline.cjs`: passed.
- Private real-sample dry run: `node scripts/jal-repd-ced-offline.cjs /Users/chris/Documents/seguridad-mexico/exp-02-sample-20260921T170945-0600/sample-page1-raw.json /Users/chris/Documents/seguridad-mexico/exp-02-sample-20260921T170945-0600/offline-output --observed-at 2026-09-21T17:10:00-06:00 --scope sample --source-endpoint <observed-page-1-endpoint>`: passed; produced 12 NDJSON records and manifest warnings `sample_scope`, `reported_count_differs`, `multiple_pages_reported`.
