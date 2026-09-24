# JAL-REPD-STATS source contract

```yaml
source_id: JAL-REPD-STATS
publisher: Registro estatal de personas desaparecidas de Jalisco
entrypoint: Public Jalisco registry statistics page
official_status: public_statistics_page_observed; endpoint_definitions_partially_unresolved
access_method:
  - public_page_html_review
  - bundled_javascript_inspection
  - bounded_aggregate_endpoint_replay
observed_endpoints:
  - pattern: "aggregate statistics endpoint for municipality/map counts"
    notes: "Observed implementation endpoint pattern; exact URL omitted."
  - pattern: "aggregate statistics endpoint for total disappearances"
    notes: "Observed implementation endpoint pattern; exact URL omitted."
  - pattern: "aggregate statistics endpoints for sex, status/localization condition, age range, and investigation-file dimensions"
    notes: "Observed implementation endpoint patterns; exact URLs omitted."
endpoint_contract_status: observed
identity_candidate: not_applicable
pagination: not_applicable
asset_fields: not_applicable
cutoff_semantics:
  observed_cutoff: "2026-08-31"
  status: observed_in_replayed_chart_endpoints
  rule: preserve_each_endpoint_definition_and_cutoff; do_not_manually_correct_mismatches
geographic_keys:
  - level: municipality
    status: observed
    notes: municipality totals did not reconcile exactly with overall disappearance total
  - special_bucket: "SE IGNORA"
    status: possible_non_mappable_or_definition_gap_to_investigate
update_signal:
  observed: cutoff_value_in_aggregate_responses
  missing: no_independent_change_notification_observed
known_failures:
  - municipality_disappeared_total_16203_does_not_reconcile_with_total_disappearances_16250
  - definition_gap_may_be_non_mappable_bucket_endpoint_difference_or_other_source_semantics
  - not_suitable_as_cédula_count_or_person_record_baseline
privacy_class: aggregate_public_statistics
raw_retention: private_raw_endpoint_captures_only_if_needed; repository_keeps_sanitized_contract_and_counts_only
last_verified_at: "2026-09-22"
```

## Provenance

- Repository report: `reports/data-first-stage-status.md`
- Stage 2 specification: `SPEC_JALISCO_STAGE_2.md`
- Private evidence reference: `/Users/chris/Documents/seguridad-mexico/exp-04-statistics-20260922T000024Z/access-report.md`

El desfase 16,203 vs 16,250 conserva semántica no resuelta: no redistribuir la diferencia ni descartar silenciosamente `SE IGNORA` u otras categorías sin municipio. La jurisdicción del registro estatal no demuestra que cada observación describa el municipio del hecho o de residencia; documentar el papel geográfico de cada endpoint antes de unirlo a geometrías de Jalisco. Mantener medidas separadas hasta explicar la diferencia. Estas son reglas documentales; `reports/stage-2-status.md` mantiene pendiente su conciliación.
