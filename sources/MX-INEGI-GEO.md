# MX-INEGI-GEO source contract

```yaml
source_id: MX-INEGI-GEO
publisher: Instituto Nacional de Estadística y Geografía (INEGI)
entrypoint: INEGI wscatgeo municipal catalog and geometry services
official_status: official_service_observed; suitable_for_jalisco_municipal_join_contract
access_method:
  - official_catalog_service_request
  - official_geometry_service_request
observed_endpoints:
  - url: "https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14"
    type: municipal_catalog
  - url: "https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/14"
    type: municipal_geometry
endpoint_contract_status: acquired_and_materialized_2026-09-23
identity_candidate: not_applicable
pagination: not_applicable
asset_fields:
  - field: geometry
    handling: source_geometry_artifact; not_personal_data
cutoff_semantics:
  type: source_version
  notes: geometry metadata identifies Marco Geoestadístico diciembre de 2025; catalog statistical metadata identifies Censo de Población y Vivienda 2020; retrieval timestamp and hashes are separate; source version is unknown when absent
geographic_keys:
  - field: cvegeo
    type: text
    rule: preserve_leading_zeroes_and_join_by_code_never_name
  - field: state_code
    expected_value: "14"
  - field: municipality_code
    expected_count_for_jalisco: 125
update_signal:
  observed: unknown
  required: compare_source_version_or_retrieval_hash_between_imports
known_failures:
  - municipality_names_are_not_stable_join_keys
  - rates_are_invalid_when_numerator_and_denominator_do_not_match_territory_period_and_definition
privacy_class: public_geographic_reference_data
raw_retention: retain_import_artifact_and_hash_privately_or_in_approved_non_personal_data_storage; repository_keeps_contract_only
last_verified_at: "2026-09-23"
```

## Provenance

- Repository report: `reports/data-first-stage-status.md`
- Stage 2 specification: `SPEC_JALISCO_STAGE_2.md`
- Private evidence reference: `/Users/chris/Documents/seguridad-mexico/exp-06-geo-denominator-20260921-181213/access-report.md`

## Importación offline de C04a

El 2026-09-23 se conservaron ambos originales oficiales y el manifiesto de adquisición en el directorio privado `s2-inegi-import-20260923T221320Z` bajo `/Users/chris/Documents/seguridad-mexico` (0700; archivos 0600). La materialización real se encuentra en su subdirectorio privado `materialized/`; el repositorio no contiene geometrías. El catálogo devuelve `datos`/`metadatos`/`numReg` (125); la geometría devuelve `FeatureCollection`/`metadatos`/`totalReg`/`features` (125 `MultiPolygon`). El servicio no declara `crs` explícito, por lo que el importador conserva `not_explicitly_declared`, sin atribuir EPSG. El metadato vectorial declara `INEGI. Marco Geoestadístico, diciembre de 2025`; el metadato estadístico del catálogo menciona el censo de 2020, **no** una proyección CONAPO 2026.

Uso: `node scripts/import-inegi.cjs --catalog <archivo-local> --geometry <archivo-local> --acquisition <manifiesto-local> --output-dir <directorio-privado-nuevo>`. Sin red interna; los tres insumos son archivos locales. La adquisición por separado exige HTTPS oficial, una solicitud por vez, identidad JSON, límites de 1 MiB/64 MiB, timeout de 20 s y deadline de 120 s por recurso, dos intentos solo por fallo transitorio, sin auth ni evasión; conservar el manifiesto y sus hashes. El importador verifica URL final y de origen, 200/MIME, tamaño, SHA-256, 125 códigos textuales únicos estatales 14 y unión 1:1 por `cvegeo`; rechaza extraños, faltantes, duplicados y geometrías inválidas. Requiere padre privado y se niega a sobrescribir salida. `geo-units.json` y `manifest.json` permanecen privados; el manifiesto registra hashes, bytes, fecha de observación, versión vectorial y estado de CRS sin incluir geometrías. No agrega buckets desconocidos ni calcula tasas o denominadores. Véase `reports/stage-2-geo-import.md` para evidencia saneada y límites.

No asignar geometría municipal a cédulas con hechos o residencia fuera del estado o desconocidos. La materialización INEGI no cierra CONAPO, SESNSP ni las puertas G2/G3/G4.
