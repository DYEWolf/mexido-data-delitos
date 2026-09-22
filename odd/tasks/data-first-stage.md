# Data-first stage execution

Status: completed

Source spec: `SPEC_JALISCO_DATA_FIRST.md`

Operating constraints:
- Work autonomously through obvious next steps; do not ask for repeated yes/no confirmations.
- Do not initialize SDD.
- Do not commit, push, publish, deploy, or create PR unless explicitly authorized.
- Do not modify `SPEC_JALISCO_DATA_FIRST.md` without explicit authorization.
- Keep raw/personal evidence under `/Users/chris/Documents/seguridad-mexico`.
- Do not put names, photos, raw HAR with personal data, or raw personal records in Git.
- Use synthetic/sanitized fixtures in repository tests.
- Stop for destructive actions, external paid providers, secrets/credentials, publication policy decisions, or irreversible privacy decisions.

Current validated evidence:
- EXP-01 access/surface: completed with `agent-browser`; listing and one card observed.
- EXP-02 minimal JSON sample: completed for 12 records.
- EXP-02 controlled sample/assets: completed for 30 records and 20 private assets.
- EXP-03 pagination probe: completed pages 1/2/repeat.
- EXP-03B boundary/resume: completed pages 426/852/853/repeat.
- EXP-04 REPD statistics: completed through bounded HTML/JS/API aggregate discovery.
- EXP-05 SESNSP incidence: completed partially; official catalog/methodology identified, current ZIP blocked by Microsoft auth, historical Jalisco structure validated.
- EXP-06 geography/denominator: completed; INEGI confirms 125 municipalities and geometry, CONAPO provides compatible 2020/2025/2026 denominators.
- EXP-08 maintenance: completed partially; second observation stable, offline tests pass, synthetic maintenance checks pass, no real update/removal event observed.
- Offline connector scaffold: implemented and verified with synthetic tests and private EXP-02 sample.

Autonomous execution queue:
- [x] Complete EXP-02 to spec: 30 metadata records and up to 20 controlled assets, with private manifest and manual/technical validation notes.
- [x] Promote EXP-03 from micro-probe to bounded coverage strategy report without full baseline unless justified.
- [x] Execute EXP-04 for REPD statistics: inspect rendered/stat endpoints, sample aggregates, definitions, and at least two query reproductions if available.
- [x] Execute EXP-05 for SESNSP incidence: identify official current file/catalog, download/process bounded Jalisco sample, record unit/methodology.
- [x] Execute EXP-06 for INEGI geography and candidate population denominator: fetch Jalisco municipality catalog/geometry sample and evaluate denominator availability.
- [x] Execute EXP-07 only where alternatives remain relevant; current hypothesis: HTTP/agent-browser is sufficient for JAL-REPD-CED, Firecrawl remains unnecessary. Decision: skipped/deferred because direct HTTP plus agent-browser already met current needs and no unresolved extractor comparison remains.
- [x] Execute EXP-08 bounded: second observation real for JAL-REPD-CED plus synthetic change/retry/removal fixtures/tests.
- [x] Consolidate source fichas, run manifests, observed dictionaries, findings, limits, and G0/G1/G2/G3 gate status.

Evidence log:
- EXP-02 controlled sample/assets: `/Users/chris/Documents/seguridad-mexico/exp-02-full-sample-20260921T175047-0600/access-report.md` — 30 private records, 20/20 assets downloaded and technically validated, total 3,229,687 bytes.
- EXP-04 REPD statistics: `/Users/chris/Documents/seguridad-mexico/exp-04-statistics-20260922T000024Z/access-report.md` — fixed aggregate endpoints observed; cutoff `2026-08-31`; municipality/sex/status/age/investigation-file dimensions; municipality total mismatch remains an uncertainty.
- EXP-05 SESNSP incidence: `/Users/chris/Documents/seguridad-mexico/exp-05-incidence-20260922T000410Z/access-report.md` — gob.mx catalog and RNID methodology identified; current ZIPs blocked by Microsoft auth; historical official/mirror Jalisco sample validated for keys, periods, zeros and category hierarchy.
- EXP-06 geography/denominator: `/Users/chris/Documents/seguridad-mexico/exp-06-geo-denominator-20260921-181213/access-report.md` — INEGI wscatgeo gives 125 official Jalisco municipalities and GeoJSON; CONAPO projections give compatible municipal denominators for 2020/2025/2026; REPD/SESNSP 126th buckets are non-municipal.
- EXP-08 maintenance: `/Users/chris/Documents/seguridad-mexico/exp-08-maintenance-20260921T181853-0600/access-report.md` — second observation stable for pages 1/426/852/repeat; no conditional caching headers; offline tests 6/6; synthetic maintenance concepts pass; G3 remains partial.
- Consolidated sanitized final report: `reports/data-first-stage-status.md` — executive summary, EXP-01/02/03/03B/04/05/06/08 table, EXP-07 skip rationale, source fichas, G0-G5 assessment, unresolved blockers, next tasks, evidence index, and privacy note.
