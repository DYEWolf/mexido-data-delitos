# MX-CONAPO-POP source contract

```yaml
source_id: MX-CONAPO-POP
publisher: Consejo Nacional de Población (CONAPO) / datos.gob.mx
entrypoint: CONAPO municipal population projection datasets
official_status: official_dataset_identified; suitable_for_jalisco_denominator_contract
access_method:
  - official_dataset_download_or_catalog_access
  - bounded_profile_for_jalisco_municipal_denominators
observed_endpoints:
  - pattern: "CONAPO/datos.gob.mx population projection dataset access"
    notes: "Official dataset access pattern; exact URL omitted."
endpoint_contract_status: documented
identity_candidate: not_applicable
pagination: not_applicable
asset_fields: not_applicable
cutoff_semantics:
  type: projection_year
  observed_years:
    - 2020
    - 2025
    - 2026
  projection_range_note: values_for_2021_2040_are_projections
geographic_keys:
  - field: cvegeo
    type: text
    rule: join_to_INEGI_GeoUnit_by_code_never_name
  - field: state_code
    expected_value: "14"
  - level: municipality
    expected_count_for_jalisco: 125
update_signal:
  observed: unknown
  required: dataset_version_or_artifact_hash_comparison_between_imports
known_failures:
  - denominator_must_not_be_used_when_numerator_territory_period_or_definition_does_not_align
  - non_municipal_REPD_or_SESNSP_buckets_must_be_excluded_from_municipal_rates_or_shown_separately
privacy_class: public_aggregate_population_reference_data
raw_retention: retain_official_dataset_artifact_hash_and_version_metadata; repository_keeps_contract_only
last_verified_at: "2026-09-22"
```

## Provenance

- Repository report: `reports/data-first-stage-status.md`
- Stage 2 specification: `SPEC_JALISCO_STAGE_2.md`
- Private evidence reference: `/Users/chris/Documents/seguridad-mexico/exp-06-geo-denominator-20260921-181213/access-report.md`

Requisito de Etapa 2: materializar denominadores territoriales solo para Jalisco aunque el artefacto federal original se conserve privadamente para procedencia; calcular tasas únicamente si numerador y denominador coinciden en municipio, periodo y metodología. Las categorías de numerador sin municipio permanecen separadas y no reciben una tasa municipal inventada. Según `reports/stage-2-status.md`, hay helpers canónicos, pero aún no importación ni versionado de artefactos CONAPO reales; no afirmar que el filtro o las tasas finales ya se apliquen.
