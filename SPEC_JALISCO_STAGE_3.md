# SPEC — Jalisco Stage 3: product MVP (mexicovisible.com)

Status: in progress (started 2026-09-24). Owner: project owner (sole operator; holds every owner role).
Builds on the closed Stage 2 pipeline (`reports/stage-2-c07-closure.md`). Method: e2e validation, no new automated tests.

## 1. Goal

A public site for Jalisco that helps find disappeared persons and explains the numbers honestly:

1. **Cédula wall**: search/filter disappeared persons from the state registry (REPD).
2. **Cédula page**: public fields only, link to the official source.
3. **Municipal map**: choropleth for Jalisco's 125 municipalities (cédulas, REPD statistics, SESNSP incidence, rates with CONAPO).
4. **Methodology**: sources, cutoffs, gaps (REPD-STATS 86 + 47, SESNSP 14998/14999, methodology break 2026).
5. **Takedown request**: public form protected by Turnstile; suppression within 24 h.
6. **Admin** (admin hostname, Cloudflare Access): takedown queue, suppress/restore, last run status.

Out of scope for the MVP: other states, user accounts, per-crime-type SESNSP explorer, bulk photo acquisition.

## 2. Architecture (ADR accepted in Stage 2)

- One Cloudflare Worker, server-rendered HTML + small vanilla JS; JSON API under `/api/*`.
- D1 `seguridad-jalisco` holds only publishable, precomputed data (no raw records, no hashes, no colonia, no source photo URLs).
- Build step `scripts/build-publish-db.cjs` (local, private): latest validated REPD snapshot + suppression ledger + INEGI + CONAPO + SESNSP + REPD-STATS → SQL → D1. Output SQL contains names and stays in private evidence, never in Git.
- Map: municipal geometry simplified once at build time, rendered as inline SVG (no map library, no tiles).
- Photos: only derivatives in `seguridad-jalisco-public`; otherwise a placeholder and the official-source link.

## 3. Publication rules (from Stage 2 C07)

- Wall shows status `PERSONA DESAPARECIDA` with `autorizacion_informacion_publica = SI`, minus active suppressions.
- Public fields: id, name, age at disappearance, sex, gender, date, municipality, nationality, height, build, skin tone, hair, eyes, distinguishing marks, clothing, photo derivative.
- Municipality join: normalized name (accents/case) → INEGI `cvegeo`; `SE IGNORA`/empty → "municipio no especificado" bucket, never on the map.
- Takedown: request stored; owner suppresses via admin; suppressed IDs are excluded by the build and by the Worker at read time.

## 4. Milestones

| ID | Deliverable | Done when |
|---|---|---|
| S3-01 | Spec + task file | this file |
| S3-02 | Publish-DB build + D1 schema | local D1 loaded, counts match snapshot rules |
| S3-03 | Worker pages + API (wall, cédula, map, methodology) | `wrangler dev` e2e with real data locally |
| S3-04 | Takedown form + admin queue + suppression at read time | e2e locally: request → suppress → gone |
| S3-05 | Production deploy (no staging, owner decision) | done 2026-09-24: mexicovisible.com live |
| S3-06 | Operations: scheduled probe/capture/rebuild | cron running in production |
| S3-07 | Production launch | merged into S3-05 |
