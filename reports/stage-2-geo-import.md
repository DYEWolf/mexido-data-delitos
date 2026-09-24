# S2-C04a — INEGI Jalisco municipal import

**Result (2026-09-23):** 125 official catalog members joined 1:1 by textual `cvegeo` to 125 official `MultiPolygon` features; 125 private GeoUnits materialized, zero missing/extra/duplicate/foreign codes. This is INEGI geography only, not a population denominator or a completed Stage 2 gate.

Official source documentation: https://www.inegi.org.mx/servicios/catalogounico.html . Acquisition was serial over TLS from the two exact official endpoints, with `Accept: application/json`, identity encoding, no auth, a 1 MiB catalog cap and 64 MiB geometry cap, 20 s socket timeout, 120 s deadline per resource and at most two attempts for transient network/5xx errors with at least 1 s spacing. Both succeeded in one attempt; no redirect. Raw artifacts and acquisition manifest are retained only at `/Users/chris/Documents/seguridad-mexico/s2-inegi-import-20260923T221320Z` (directory 0700, files 0600); resulting `materialized/` is 0700 and files 0600.

| Artifact | Exact URL | Observed UTC | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| Catalog | https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14 | 2026-09-23T22:16:56.772697Z | 24,311 | `e5e35a99b9dac7d33128403adc8400bfeabee28334333c04a269c88c95ee1a38` |
| Geometry | https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/14 | 2026-09-23T22:17:30.304756Z | 8,998,897 | `cd824b39b99a92cd337dccf6cfdb2764fb605fd6bee1870b4005b35009c65a93` |

Both final URLs equaled source URLs, returned HTTP 200 `application/json`; neither supplied ETag or Last-Modified. Catalog metadata identifies `INEGI. Censo de Población y Vivienda, 2020`; geometry vector metadata identifies **`INEGI. Marco Geoestadístico, diciembre de 2025`** as its source version, separate from observation times. Neither collection declares an explicit CRS; no EPSG or transformation is asserted. Collection metadata, source geometries, and per-feature `numReg` are preserved in private output. The materialized `geo-units.json` is 9,009,167 bytes with SHA-256 `54c4abac24f3e5e49ed7980838a6f3a202a9ce2583f6db0c33e7eaee24622b97`; independently reread bytes, hash, private modes and catalog/feature/unit sets match the manifest. Geometry itself is never logged or committed. A second offline run into the new private `materialized-verify/` subdirectory after final validation changes produced byte-identical `geo-units.json` (same 9,009,167 bytes and SHA-256); no refetch occurred.

Command executed:

```sh
node scripts/import-inegi.cjs --catalog /Users/chris/Documents/seguridad-mexico/s2-inegi-import-20260923T221320Z/catalog.json --geometry /Users/chris/Documents/seguridad-mexico/s2-inegi-import-20260923T221320Z/geometry.json --acquisition /Users/chris/Documents/seguridad-mexico/s2-inegi-import-20260923T221320Z/acquisition-manifest.json --output-dir /Users/chris/Documents/seguridad-mexico/s2-inegi-import-20260923T221320Z/materialized
```

Output: `{"ok":true,"count":125,"sourceVersion":"INEGI. Marco Geoestadístico, diciembre de 2025","crsStatus":"not_explicitly_declared"}`. Import is offline and refuses existing output; sanitized error codes omit local paths and coordinates. Synthetic tests exercise invalid catalogs, joins, provenance, geometry and CLI behavior separately; they are not evidence that any invented code sequence is an official municipality roster. No municipality is inferred by name or order. No unknown/nonmunicipal bucket is assigned a municipality; INEGI catalog population is **not** a CONAPO 2026 projection.

**Open:** C04 still requires a current official SESNSP artifact (official download blocked by auth in prior work) and real CONAPO evidence/import. G2 remains partial (including up-to-100-image validation/quarantine/private R2 evidence, source imports, costs and unreconciled REPD-STATS gap 47); G3 operational freshness/exclusion/cadence checks and G4 benchmark/ADR remain open. No Cloudflare write or publication occurred.
