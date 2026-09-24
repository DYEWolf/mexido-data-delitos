# Stage 2 C07 — policies, owners and closure

Date: 2026-09-24. The association is the project owner, sole operator and maintainer. This is a standing decision: every present and future owner role is the owner, with no separate sign-off step.

## Owners (SPEC §15)

| Role | Owner |
|---|---|
| publication_owner | project owner |
| correction_owner | project owner |
| takedown_owner | project owner |
| retention_owner | project owner |
| incident_response_owner | project owner |

## Policies adopted (conservative defaults; the owner may change them at any time)

Nothing is public yet. These rules apply from the first Stage 3 publication.

**Which cédulas are public:** only records with `autorizacion_informacion_publica` true and status "desaparecida". Located persons (`condicion_localizacion` set / status located) leave the public wall on the next complete run and count only in aggregates. Active suppressions always win.

**Public fields:** `id_cedula_busqueda` (with a link to the official cédula), `nombre_completo`, `edad_momento_desaparicion`, `sexo`, `genero`, `fecha_desaparicion`, `municipio`, `estado`, `nacionalidad`, `estatura`, `complexion`, `tez`, `cabello`, `ojos_color`, `descripcion_sena_particular`, `descripcion_vestimenta`, photo (derivative only).
**Never public:** `colonia` (location too precise), `ruta_foto` (raw source URL), `condicion_localizacion` detail, raw snapshots, hashes, internal IDs, logs.

**Images:** originals stay in private R2 (`seguridad-jalisco-private`). Public use only through a derivative (resized, metadata stripped) in `seguridad-jalisco-public`, removed in the same run as the record leaves the public wall. No bulk image uploads planned: the 89-image subset was a one-time load.

**Takedown SLA:** a request is suppressed in the ledger (`scripts/jal-repd-ced-suppressions.cjs`) within **24 h**; the same run removes the public record, API response, derivative image and purges controllable caches (SPEC §15). Records removed at the source disappear after the next complete successful run (daily cadence); incomplete/anomalous runs never unpublish (false-removal protection).

**Retention:**
| Data | Keep | Note |
|---|---|---|
| Suppression ledger | forever | needed to prevent re-publication; backed up after every change + weekly |
| Raw metadata snapshots | 12 months | private evidence |
| Official source imports (INEGI/CONAPO/SESNSP) | while in use + 1 prior version | private, with hashes |
| Private image originals | review 2026-10-24 (30-day review) | no automatic deletion |
| Worker/observability logs | 30 days | no personal data in logs |
| D1 backups | Time Travel + weekly export to private R2, keep 8 | restore rehearsal in Stage 3 |
| Benchmark D1 | review 2026-10-24 | synthetic only |

**Incidents:** the owner can switch the public site to read-only or suppress records immediately; cause and actions are recorded in the ops log.

## Architecture (G4)

ADR in `reports/stage-2-c06-benchmark-adr.md` §4 is **accepted**: D1 as the primary datastore, no Postgres/PostGIS, precomputed public tables, raw data/assets in private R2, simplified static GeoJSON.

## Stage 2 gate status

| Gate | Status | Evidence |
|---|---|---|
| G2 Initial usable load | done | metadata A/B, 89-image private R2 subset, INEGI, CONAPO, SESNSP 2015–2025 + RNID 2026 (`stage-2-c04-official-imports.md`) |
| G3 Maintenance demonstrated | done | `stage-2-g3-maintenance.md` |
| G4 Architecture justified | done | ADR accepted above |
| Owner/policy decisions | done | this document |

**Stage 2 closed.** Stage 3 (product-first) may start. Carry-over items, none blocking:
- Measure Worker→D1 latency from a deployed Worker (first Stage 3 deploy).
- Implement the SESNSP RNID ↔ 2015–2025 regrouping rules before any cross-series chart.
- REPD-STATS: publish 16,250 total and 16,117 municipal map with a visible note on the 86 unknown-municipality and 47 not-on-map persons.
- Run the operational cadence (probe 6 h, full capture daily) and confirm it over real days.
