# Stage 3 execution

Status: in_progress — started 2026-09-24
Source spec: `SPEC_JALISCO_STAGE_3.md`

Method: e2e only (no new automated tests). Owner = user for every decision (do not ask about ownership).
Real names only reach a public hostname after explicit owner confirmation (S3-05).

- [x] S3-01 — Spec and task file.
- [x] S3-02 — Publish-DB build + D1 schema (local). `scripts/build-publish-db.cjs`; build `s3-publish-20260924T033751Z`: 5,285 publicadas (de 10,234; 4,949 localizadas fuera), 58 sin municipio, mapa 125 municipios 162 KB.
- [x] S3-03 — Worker pages + API. `src/worker/{index,ui,data,pages}.mjs`: muro con filtros, cédula, mapa SVG con 5 capas + tasas CONAPO, metodología, API JSON. E2E local <25 ms por página, sin campos prohibidos, sin overflow móvil.
- [x] S3-04 — Takedown form + admin + read-time suppression. Turnstile, admin con verificación JWT de Access; e2e: solicitud → retirar → 404 inmediato → restaurar. Admin 403 sin JWT/con JWT falso/en host público.
- [x] S3-05 — Deploy a producción (sin staging, decisión del dueño). D1 `seguridad-jalisco` (2970ef1c…) 5,285 cédulas; Worker en mexicovisible.com + admin.mexicovisible.com (custom domains); Turnstile secret cargado; Access movido a admin.mexicovisible.com y validado con AUD; Worker staging borrado. Prueba real de retiro recibida en admin.
- [x] S3-05b — Incidente 2026-09-24: límite gratuito D1 de 5M filas leídas/día excedido (10.7M en 24h, ~4k filas por consulta: COUNT/GROUP BY sobre toda la tabla y paginación OFFSET, multiplicado por crawlers). Corrección: totales/años/conteos precalculados (`cedula_counts`, meta), paginación keyset por índices (fecha,id) (~25 filas/página, recorrido completo 221 páginas = 5,285 únicas, 0 duplicados), caché de borde 10 min, robots.txt. Datos recargados (`s3-publish-20260924T174043Z`); falta deploy de código por el dueño.
- [ ] S3-06 — Scheduled operations.
- [x] S3-08 — Reestructura del sitio alrededor del análisis (local, sin desplegar, 2026-09-25). Portada con la tesis y seis hallazgos; cinco capítulos (`/violencia-letal`, `/busqueda`, `/tendencias`, `/victimas`, `/cifra-negra`); explorador `/mapa` con capas del análisis (clasificación creíble, tendencias jerárquicas, fosas), fichas `/municipio/:cvegeo` para los 125 municipios; metodología con fuentes, las 20 advertencias y el registro de 111 hipótesis. Muro de cédulas movido a `/cedulas` (fuera de la navegación, con la cobertura de la pieza 24); `/?filtros` redirige. Datos: `npm run findings` genera `src/worker/generated/findings.mjs` desde `analysis/output/*.json` y ANALISIS.md, sin D1. Gráficas SVG/HTML propias (`src/worker/charts.mjs`), paleta validada, tabla de datos en cada figura. E2E local: 15 páginas sin errores de consola, sin desbordamiento a 390 px, modo claro y oscuro; `npm test` 120/120.
- [x] S3-07 — Production launch (fusionado con S3-05 al eliminar staging).
