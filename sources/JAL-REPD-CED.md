# JAL-REPD-CED source contract

```yaml
source_id: JAL-REPD-CED
publisher: Registro estatal de personas desaparecidas de Jalisco
entrypoint: Public cédulas search page for the Jalisco state registry
official_status: public_page_observed; implementation_api_not_documented_as_official
access_method:
  - browser_rendered_public_page_discovery
  - observed_json_endpoint_pattern_for_state_search
observed_endpoints:
  - pattern: "state-filtered cédula listing JSON with estado=14, page=<n>, limit=12"
    notes: "Documented only as an observed implementation endpoint pattern; exact URLs are intentionally omitted."
endpoint_contract_status: observed
identity_candidate:
  field: id_cedula_busqueda
  status: candidate
  evidence: present_and_unique_in_sample; update_behavior_not_yet_proven
pagination:
  type: page_number
  observed_parameters:
    estado: "14"
    page: positive_integer
    limit: 12
  observed_metadata:
    count: 10215
    total_pages: 852
  boundary_behavior: page_after_last_returned_invalid_page_in_bounded_probe
  contract_rule: discover_count_and_total_pages_at_run_start_and_run_end; never_hardcode_last_page
asset_fields:
  - field: ruta_foto
    handling: private_asset_reference_only; do_not_store_exact_url_or_photo_in_git
    validation_observed: 20_of_20_initial_pilot_assets_technically_validated_privately
cutoff_semantics:
  type: not_applicable
  notes: cédula listing is an operational listing; no source-wide cutoff timestamp observed
geographic_keys:
  - field: estado
    observed_value: "14"
    meaning: filtro del listado del registro estatal; no restringe el lugar del hecho, reporte o residencia de cada cédula
  - field: event_report_residence_geography
    status: papeles_y_categorias_pendientes_de_perfilado
    rule: admitir_cedulas_publicadas_en_registro_estatal_aunque_hecho_reporte_o_residencia_sean_externos_desconocidos_o_sin_municipio; no_exigir_14_en_todos_los_campos
  - field: municipality_fields
    status: pendiente_perfilado_de_papel_y_categorias_no_municipales
update_signal:
  observed: none
  notes: second bounded observation was stable; no ETag, Last-Modified, live insertion, correction, image replacement, or withdrawal observed
known_failures:
  - adquisicion_del_subconjunto_privado_de_hasta_100_imagenes_pendiente; baseline_privado_solo_metadatos_completo_segun_stage_2_status
  - observed_endpoints_are_not_official_api_contracts
  - identity_is_candidate_until_real_update_behavior_is_observed
  - asset_failure_must_not_drop_record
  - absence_must_not_be_interpreted_as_localized_without_human_review
privacy_class: restricted_person_record_with_private_asset_references
raw_retention: private_raw_snapshots_and_assets_only; review_at_30_days_not_TTL_or_automatic_deletion; never_commit_raw_json_names_exact_media_urls_or_photos
last_verified_at: "2026-09-22"
```

## Provenance

- Repository report: `reports/data-first-stage-status.md`
- Stage 2 specification: `SPEC_JALISCO_STAGE_2.md`
- Private evidence references:
  - `/Users/chris/Documents/seguridad-mexico/exp-01-agent-browser-20260921T170240-0600/access-report.md`
  - `/Users/chris/Documents/seguridad-mexico/exp-02-sample-20260921T170945-0600/access-report.md`
  - `/Users/chris/Documents/seguridad-mexico/exp-03-pagination-20260921T172028-0600/access-report.md`
  - `/Users/chris/Documents/seguridad-mexico/exp-03b-boundaries-20260921T173015-0600/access-report.md`
  - `/Users/chris/Documents/seguridad-mexico/exp-02-full-sample-20260921T175047-0600/access-report.md`
  - `/Users/chris/Documents/seguridad-mexico/exp-08-maintenance-20260921T181853-0600/access-report.md`

Este contrato omite deliberadamente datos personales, nombres, URL exactas de archivos, fotografías y registros sin sanear. `reports/stage-2-status.md` registra 853/853 páginas y 10,234 registros únicos en el baseline privado solo de metadatos; A/B son `metadata_only`/`skip` y no acreditan adquisición ni cambios de bytes de imágenes.

**Adquisición C05:** un subconjunto determinista de hasta 100 registros con `ruta_foto` utilizable: ordenar `(source_id, id_cedula_busqueda)` como texto y tomar los primeros del baseline completo validado. Su manifest privado congela identidad/versión del baseline, regla, IDs seleccionados, totales de metadatos, referencias utilizables, ausentes y no seleccionadas, y resultados esperados/descargados/fallidos/en cuarentena solo del subconjunto; pendientes se distinguen de fallos. La selección no es representativa ni integral. Falta implementar y demostrar MIME/tamaño/hash, cuarentena, replay y readback privado R2.

**Límites y decisiones pendientes:** descargas con tasa/timeout/bytes acotados y perfil privado previo; no se aprobaron 5/15 GiB. Se usa solo el R2 privado existente para el dueño y automatizaciones autorizadas, previa comprobación de privacidad/lifecycle, con revisión de conservación a 30 días sin TTL ni borrado automático. Publicación, campos públicos y política de imagen esperan decisión de la asociación antes de Etapa 3. La pertenencia de la cédula procede de su publicación en el registro estatal de Jalisco, no de una inferencia a partir de su residencia o lugar del hecho. La regla de admisión anterior es un requisito, no una garantía de que el conector actual ya la imponga.
