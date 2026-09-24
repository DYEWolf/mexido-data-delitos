# Stage 2 C04 — official CONAPO and SESNSP imports

Date: 2026-09-24 UTC. Method: manual browser download by the project owner (datos.gob.mx returns 403 to non-browser clients; SESNSP files sit behind Microsoft login), then offline import with `scripts/import-official-jalisco.cjs`. Private evidence: `/Users/chris/Documents/seguridad-mexico/s2-c04-official-import-20260924T032403Z` (`0700` dir, `0600` files: raw copies, acquisition manifest with SHA-256/size/mtime, Jalisco subsets, SESNSP import contract, summary). No raw files in Git.

## CONAPO — MX-CONAPO-POP

- Resource: "Población a mitad de año por municipio y grupos quinquenales de edad (1990-2040)", `pobproy_quinq1.csv`, 36,658,654 bytes (same size/version as the 2026-09-22 HEAD: Last-Modified 2025-07-12), SHA-256 `1a8f07be08de082a…`.
- Jalisco subset: 12,750 rows = 125 municipalities × 51 years (1990–2040) × 2 sexes; 0 missing/extra vs INEGI; 0 rows where age groups ≠ `POB_TOTAL`.
- 6,375 `PopulationObservation` (municipality × year, both sexes) via `src/geo/canonical.cjs`.
- Cross-check with EXP-06 historical derivatives: 375/375 municipality-year totals identical.
- Jalisco totals: 2020 8,507,662 · 2025 8,903,326 · 2026 8,982,027.

## SESNSP — MX-SESNSP-RNID-2026

- File: "Enero - agosto 2026 (Fuero común - Delitos). Incidencia delictiva municipal", `RNID-Delitos_Municipal-2026-ago2026.csv` (44,411,803 bytes, SHA-256 `875a2f3ae95e52a9…`) plus its original ZIP (2,184,391 bytes, `923b74969d91dcff…`).
- Jalisco subset: 14,364 rows; all 125 INEGI municipalities present; one non-municipal bucket `14999` with 0 incidents (kept separate, never a rate numerator); 0 non-numeric/empty cells.
- Cutoff: data through August 2026. Jalisco total Jan–Aug 2026: **76,393** (monthly 8,643 · 8,172 · 10,204 · 9,847 · 9,978 · 9,829 · 10,217 · 9,503).
- Import contract (`MX-SESNSP-RNID-2026`) emitted with provenance and header validation.
- Supporting docs retained: 2015–2025 data dictionary, RNID historical-comparison methodology note (PDF).

## SESNSP — MX-SESNSP-2015-2025

- File: "2015 - 2025 (Fuero Común - Delitos). Incidencia delictiva municipal", consolidated `Municipal-Delitos-2015-2025_ago2026.csv` (378,855,307 bytes, SHA-256 `8d92458007768a47…`, **Latin-1 encoded**, the importer now detects UTF-8 vs Latin-1) plus original ZIP (132,308,218 bytes, `5f8c297aba046b6f…`) and the official read-first PDF. The per-year XLSX in the same package duplicate the CSV and were not imported. Evidence: `s2-c04-sesnsp-2015-2025-20260924T032818Z`.
- Jalisco subset: 135,828 rows, years 2015–2025, all 125 municipalities, 0 non-numeric/empty cells.
- Non-municipal bucket `14998` ("no especificado"): **27,785** incidents; shown separately, never a municipal-rate numerator.
- Jalisco yearly totals: 2015 95,331 · 2016 136,820 · 2017 166,599 · 2018 162,756 · 2019 156,654 · 2020 126,599 · 2021 128,588 · 2022 128,399 · 2023 131,687 · 2024 124,084 · 2025 114,418 (total 1,471,935).
- Official note (PDF): the CSV must not be opened in spreadsheet software (truncates); we parse it programmatically, row counts above are complete.

## Cross-methodology findings

- The "no especificado" code differs: `14998` in 2015–2025, `14999` in RNID 2026. `src/geo/canonical.cjs` now treats both as non-municipal buckets.
- Both series keep separate contracts. Per SESNSP's official note "Comparación histórica de la incidencia delictiva RNID" (read 2026-09-24), RNID was designed to be comparable with 2015–2025 **after these regroupings** (to be implemented as the explicit mapping before any cross-series chart):
  - Directly comparable: homicidio doloso, feminicidio (slight variation: now explicitly includes transfeminicidios), narcomenudeo and extorsión at subtype/type level (new modalidades only comparable aggregated).
  - Tipo "Homicidio" → exclude subtipo "Tentativa de homicidio doloso"; tipo "Feminicidio" → exclude "Tentativa de feminicidio"; tipo "Extorsión" → exclude both "Tentativa de extorsión" subtypes.
  - Those attempts go back into "Otros delitos que atentan contra la vida y la integridad corporal" / "…contra el patrimonio".
  - Trata de personas += Pornografía infantil; Otros contra la libertad personal += Retención y sustracción de menores e incapaces + Privación ilegal de la libertad; Otros contra la libertad sexual + Violencia de género (no familiar) + Violación a la intimidad sexual are summed together; Otros contra la sociedad += Discriminación; Otros del fuero común += Suplantación y usurpación de identidad; Delitos por servidores públicos += Contra la administración de justicia + Tortura.

C04 complete: INEGI (C04a), CONAPO, SESNSP 2015–2025 and RNID 2026 all imported with private raw copies, hashes and verifiable Jalisco subsets.
