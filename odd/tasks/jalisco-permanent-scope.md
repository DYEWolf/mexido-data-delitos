# Alcance permanente de Jalisco

## Objetivo y decisión
Jalisco es el límite permanente del producto, incluida su etapa pública final; no es un piloto para expandirse a otros estados. Para cédulas, la pertenencia se determina por publicación en el registro estatal de Jalisco, no por lugar del hecho o residencia. Pueden incluirse hechos fuera del estado, distinguiendo esos papeles geográficos. Las fuentes federales siguen siendo insumos válidos para obtener el subconjunto territorial de Jalisco.

## Autorización y límites
El usuario autorizó corregir especificaciones, contratos de fuentes y plan de arquitectura, sin cambiar código ni ejecutar nuevas descargas. No ejecutar baseline, importar datos, acceder a evidencia privada, desplegar, publicar, hacer commit ni modificar configuración. Preservar todos los cambios preexistentes. No declarar implementadas restricciones que hoy solo son requisitos.

## Superficies
- `SPEC_JALISCO_DATA_FIRST.md`
- `SPEC_JALISCO_STAGE_2.md`
- `reports/stage-2-architecture-adr-plan.md`
- `sources/JAL-REPD-CED.md`
- `sources/JAL-REPD-STATS.md`
- `sources/MX-SESNSP.md`
- `sources/MX-INEGI-GEO.md`
- `sources/MX-CONAPO-POP.md`

## Tareas
- [x] JAL-SCOPE-01 — Corregir de forma coherente los documentos autorizados. Estado: completado. Ruta: gentle-ai-worker; disparador: edición sustantiva de varios documentos. Ocho documentos corregidos; comprobaciones documentales del autor aprobadas.
- [x] JAL-SCOPE-02 — Verificar alcance, consistencia y límites de la corrección documental. Estado: completado. Ruta: gentle-ai-verify; revisión independiente aprobada sin contradicciones sustantivas en los ocho documentos. Evaluación nativa no disponible por archivos no rastreados.

## Aceptación y comprobaciones
- Sin expansión nacional/multiestado como objetivo presente o futuro.
- Cédulas del registro estatal admitidas aunque el hecho o residencia estén fuera; no confundir jurisdicción de la fuente con geografía del hecho.
- SESNSP, INEGI y CONAPO conservados como fuentes federales; cobertura del producto limitada a Jalisco.
- PostGIS solo como alternativa sujeta a evidencia de consultas/GIS de Jalisco y benchmark; no elegido anticipadamente.
- Distinguir requisitos documentales de validaciones pendientes en código; conservar pendientes de Etapa 2.
- Revisión estructural de los textos y `git diff --check` sobre documentos autorizados; considerar explícitamente los archivos no rastreados.

## Verificación y entrega
TDD: no aplicable a esta corrección exclusivamente documental; no se resuelve ni modifica la configuración TDD del proyecto. Runner de pruebas y harness runtime: no aplicables porque no cambia comportamiento ejecutable. No se volverá a afirmar 52/52 como resultado actual.
Presupuesto previsto: aproximadamente 100–220 líneas añadidas/eliminadas; estrategia ask-on-risk. Commits: no autorizados; no se crearán ni se agruparán cambios previos del usuario. Revisión nativa: evaluación no disponible por archivos no rastreados; plan devuelto exige verificación independiente. No se obtuvo cierre de revisión nativa. Rollback: revertir únicamente las ediciones de esta tarea en las ocho superficies; no descartar archivos completos ni trabajo previo.

## Evidencia y próximo paso
Auditoría de solo lectura completada: existen referencias a ámbito inicial, adaptadores de otros estados y expansión interestatal como motivo para PostGIS; los conectores todavía no imponen completamente el alcance. Decisión de inclusión de cédulas confirmada por el usuario (opción 1). JAL-SCOPE-01 completado por gentle-ai-worker: las ocho superficies reflejan el alcance acordado; `git diff --check` y revisión estructural/espacios de los ocho archivos aprobados según el autor. No se ejecutaron pruebas de aplicación ni validación en vivo. Solo DATA_FIRST está rastreado (6 adiciones/6 eliminaciones frente a HEAD); las diferencias de los otros siete documentos preexistentes no rastreados no pueden atribuirse usando HEAD. Verificación independiente gentle-ai-verify aprobada: lectura de los ocho documentos, contraste con el estado registrado y `git diff --check` sin errores. El padre repitió `git diff --check` y revisó el diff rastreado, también sin errores. No se revalidaron infraestructura, datos privados ni pruebas de aplicación; no se obtuvo cierre nativo. Corrección documental terminada. Próximo paso fuera de esta autorización: decidir la implementación de las restricciones geográficas pendientes o continuar los pendientes de Etapa 2.
