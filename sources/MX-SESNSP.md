# MX-SESNSP source contract

```yaml
source_id: MX-SESNSP
publisher: Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública (SESNSP)
entrypoint: gob.mx open data catalog for crime incidence and RNID methodology
official_status: official_catalog_identified; current_zip_download_blocked_in_test_environment
access_method:
  - official_catalog_review
  - methodology_review
  - attempted_official_zip_download
  - historical_official_or_mirror_sample_structure_validation
observed_endpoints:
  - pattern: "official catalog ZIP links for current and historical incidence datasets"
    notes: "Observed links redirected to Microsoft authentication in the tested environment; exact URLs omitted."
endpoint_contract_status: documented
identity_candidate: not_applicable
pagination: not_applicable
asset_fields: not_applicable
cutoff_semantics:
  type: monthly_periods
  notes: RNID 2026 methodology differentiates crimes and victims; territoriality is by place of facts
geographic_keys:
  - field: state
    expected_value: Jalisco
  - field: municipality
    join_rule: use official geographic code when available; do_not_join_by_name_only
  - special_bucket: "No Especificado"
    example_code: "14998"
    handling: exclude_from_municipal_rates_or_show_separately
update_signal:
  observed: unknown
  required_for_stage_2: versioned_official_file_import_or_automatable_official_download_with_hash_timestamp_filename_size_and_headers
known_failures:
  - current_and_historical_zip_links_redirected_to_microsoft_authentication_in_test_environment
  - no_authentication_evasion_or_credentialed_access_attempted
  - maintain_2015_2025_and_2026_RNID_as_separate_contracts_until_downloaded_profiled_and_mapped
privacy_class: aggregate_public_statistics
raw_retention: retain_official_raw_file_privately_with_sha256_source_url_filename_cutoff_and_import_metadata; repository_keeps_contract_only
last_verified_at: "2026-09-22"
```

## Provenance

- Repository report: `reports/data-first-stage-status.md`
- Stage 2 specification: `SPEC_JALISCO_STAGE_2.md`
- Private evidence reference: `/Users/chris/Documents/seguridad-mexico/exp-05-incidence-20260922T000410Z/access-report.md`

La Etapa 2 debe admitir descarga oficial automatizable cuando sea posible o importación manual autorizada del archivo oficial con procedencia, hash, corte y validación. Un archivo federal puede conservarse completo como artefacto privado de origen, pero el producto debe materializar solo observaciones territoriales de Jalisco según la geografía del hecho definida por SESNSP. `No Especificado` y otras categorías sin municipio se conservan como tales, fuera de tasas municipales, no se asignan ni eliminan silenciosamente. `reports/stage-2-status.md` indica que existe un scaffold de importación manual, pero no una importación del archivo oficial vigente; no está demostrada la aplicación de este filtro.
