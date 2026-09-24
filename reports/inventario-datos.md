# Inventario de datos — México Visible · Jalisco

Actualizado: 2026-09-24. Toda la evidencia cruda vive en `/Users/chris/Documents/seguridad-mexico/` (privada, `0700`), con SHA-256 por archivo. Al repo solo llegan agregados.

Leyenda de análisis: 🟢 profundo (hipótesis, intervalos, robustez) · 🟡 descriptivo · 🔴 solo cargado · ⏳ en proceso · ⛔ no disponible.

## Tenemos

| Fuente | Contenido | Periodo | Nivel | Carpeta | Análisis |
|---|---|---|---|---|---|
| REPD Jalisco, cédulas | 10,234 fichas de búsqueda (fuera del sitio por ahora) | ~2019–sep 2026 | persona | `s2-second-baseline-*` | 🟡 |
| REPD Jalisco, estadística | 16,250 desaparecidas; 22,017 localizadas (3,295 sin vida); por año, sexo, edad, municipio, condición, victimización | 2018 y antes → ago 2026 | estado / municipio (acumulado) | `s3-analysis-repd-stats-*` | 🟢 |
| SESNSP incidencia 2015–2025 | 1,471,935 delitos del fuero común, 40 tipos, 55 subtipos | ene 2015 → dic 2025 | municipio × mes | `s2-c04-sesnsp-2015-2025-*` | 🟢 homicidio doloso + 16 categorías comparables (pieza 6); modalidades de homicidio y lesiones (pieza 12); tendencias por región de 5 delitos (pieza 14); carpetas de feminicidio por región 2019–2023 (pieza 18) · 🔴 ~24 tipos menores |
| SESNSP RNID 2026 | 76,393 delitos, 47 tipos, 79 subtipos | ene → ago 2026 | municipio × mes | `s2-c04-official-import-*` | igual que arriba |
| Fosas clandestinas (Fiscalía Especial en Personas Desaparecidas) | 259 sitios, 2,218 víctimas localizadas, 1,174 identificadas (H/M) | oct 2018 → ago 2026 | sitio, municipio | `s3-fosas-*` | 🟢 pieza 8 |
| INEGI defunciones registradas | Microdatos de todas las defunciones; ocurridas en Jalisco: 15,131 homicidios, más suicidios, accidentes y muertes de intención no determinada, con sexo, edad, municipio, arma (CIE-10), lugar | registro 2018–2024 (ocurrencia completa 2018–2023; 2024 parcial) | persona (anónima) | `s3-inegi-defunciones-*` → `jalisco-defunciones-violentas.csv` | 🟢 piezas 7, 10, 12, 15 (lugar de ocurrencia) y 18 (mujeres asesinadas por región) · 🔴 parentesco y violencia familiar: casi sin registro |
| ENVIPE 2025 y 2026 (INEGI) | Victimización, cifra negra, percepción; microdatos con factores de expansión | victimización 2024 y 2025 | estado | `s3-envipe-*` | 🟢 pieza 9 (cifra negra, validada contra INEGI); pieza 13 (`tmod_vic.BP1_23` razón de no denuncia; `tper_vic1.AP5_4_xx` confianza en 10 autoridades); pieza 16 (`tper_vic1.AP4_3_x`, `AP4_4_xx`, `AP4_5_01`–`17`, `AP4_7_2`: percepción de seguridad, lugares, incivilidades y tendencia, Jalisco, AMG y resto del estado); pieza 17 (`BP1_23` por tipo de delito, `BPCOD`) · 🔴 resto del módulo `AP4` (actividades que se dejaron de hacer `AP4_10`, medidas de protección `AP4_11`, gasto `AP4_12`, problemas de la colonia `AP4_8`/`AP4_9`); la percepción aún no se compara con los tabulados publicados por INEGI |
| CONAPO proyecciones | Población por municipio, sexo, edad | 1990–2040 | municipio | `s2-c04-official-import-*` | usado como denominador |
| INEGI Marco Geoestadístico | Límites y claves de 125 municipios | dic 2025 | municipio | `s2-inegi-import-*` | usado en mapa |

## Descargas manuales del dueño (importadas y verificadas 2026-09-24, `s3-extra-import-*`)

| Fuente | Contenido | Verificación | Análisis |
|---|---|---|---|
| SESNSP víctimas municipal ene–ago 2026 | 80,631 víctimas en Jalisco por delito, municipio, sexo y rango de edad | 125 municipios; víctimas de homicidio (550) ≥ carpetas (507) | 🟢 pieza 11 |
| SESNSP víctimas estatal 2015–2025 | Víctimas por delito, sexo y edad, Jalisco | víctimas ≥ carpetas en los 11 años | 🟢 cruce de homicidio (pieza 7); homicidio mes a mes (pieza 12); feminicidio y homicidio de mujeres (pieza 15) |
| CONAPO marginación municipal 2020 | Índice, grado e indicadores (analfabetismo, rezago, ruralidad) | 125 claves INEGI; población = Censo 2020 (8,348,151) | 🟢 pieza 10 |

## No disponible por ahora

| Fuente | Estado |
|---|---|
| RNPDNO (Registro Nacional, CNB) | El tablero solo muestra gráficas generadas con JavaScript; no expone descarga directa |
| Datos abiertos IJCF (necropsias, personas fallecidas sin identificar) | `datos.jalisco.gob.mx` no resuelve DNS hoy |
| Data Cívica "Volver a desaparecer" (reconstrucción 2017–2024) | Sitio caído (error 522) |
| Plataforma Ciudadana de Fosas | En línea; pendiente revisar si ofrece descarga |
| Desaparición por municipio y año | El REPD no la publica |
| Delitos del fuero federal por municipio | No se publica a ese nivel (fuera de alcance) |

## SESNSP: composición y totales

### Composición de los delitos denunciados en Jalisco, 2025 (114,418)

| Tipo | Delitos | % |
|---|---|---|
| Robo (todas las modalidades) | 32,242 | 28.2 |
| Lesiones | 13,918 | 12.2 |
| Otros delitos del fuero común | 13,785 | 12.0 |
| Violencia familiar | 12,315 | 10.8 |
| Fraude | 10,646 | 9.3 |
| Amenazas | 9,734 | 8.5 |
| Abuso sexual | 5,415 | 4.7 |
| Narcomenudeo | 2,443 | 2.1 |
| Daño a la propiedad | 2,175 | 1.9 |
| Homicidio (doloso y culposo) | 2,024 | 1.8 |
| Otros 30 tipos | 9,721 | 8.5 |

### Totales anuales de delitos denunciados en Jalisco (SESNSP)

2015: 95,331 · 2016: 136,820 · 2017: 166,599 · 2018: 162,756 · 2019: 156,654 · 2020: 126,599 · 2021: 128,588 · 2022: 128,399 · 2023: 131,687 · 2024: 124,084 · 2025: 114,418 · 2026 (ene–ago): 76,393.

## Procedencia (SHA-256, primeros 16 caracteres)

| Archivo | Bytes | SHA-256 |
|---|---|---|
| INEGI catálogo municipal | 24,311 | `e5e35a99b9dac7d3` |
| INEGI geometría municipal | 8,998,897 | `cd824b39b99a92cd` |
| CONAPO `pobproy_quinq1.csv` | 36,658,654 | `1a8f07be08de082a` |
| SESNSP delitos RNID 2026 (CSV) | 44,411,803 | `875a2f3ae95e52a9` |
| SESNSP delitos 2015–2025 (CSV) | 378,855,307 | `8d92458007768a47` |
| SESNSP víctimas municipal 2026 (ZIP) | 1,687,484 | `6a16da052ceceb45` |
| SESNSP víctimas estatal 2015–2025 (ZIP) | 660,760 | `adfb8dda8dd35d7e` |
| CONAPO marginación 2020 | 559,021 | `9725794248f2c2ae` |
| Fosas, tabla pública ago-2026 (PDF) | 802,420 | `2c7f8f14c5f6ad6d` |
| ENVIPE 2026 (ZIP) | 20,258,782 | `dd79f589eb6ed7d3` |
| ENVIPE 2025 (ZIP) | 17,600,019 | `8a7a99fd90ce9d03` |
| INEGI defunciones 2018 · 2019 · 2020 · 2021 | 23.6 · 28.0 · 39.0 · 40.5 MB | `3af26a3b13caa0df` · `ba58d2e57504f55d` · `79e3236a0b821bd0` · `20b6a0eb7dbd9dbe` |
| INEGI defunciones 2022 · 2023 · 2024 | 32.1 · 34.2 · 31.0 MB | `bd6b76a32a681cd7` · `527b69dcd62e3c61` · `74667c1b7dc2d922` |

Cada corrida del análisis vuelve a calcular el SHA-256 completo de cada insumo que lee y lo guarda en `analysis/output/*.json` (`_procedencia`).

## Advertencias de cobertura conocidas

- **Fosas:** 95% de las víctimas registradas están en el área metropolitana (236 de 259 sitios; 19 municipios). Refleja dónde la Fiscalía procesa, no necesariamente dónde hay fosas. Rancho Izaguirre sí aparece (La Estanzuela, Teuchitlán, 03/2025), pero con 0 víctimas. Fuera del área metropolitana solo 11 de 115 municipios tienen algún sitio. Cifras preliminares según la propia fuente.
- **Cédulas:** cubren 1 de cada 3 personas desaparecidas, y menos en zonas rurales (22–25%) que en Altos Norte (45%).
- **SESNSP:** mide carpetas de investigación, no delitos ocurridos; cambio de metodología en 2026. Municipio no especificado: clave 14998 hasta 2025 (27,785 delitos 2015–2024, 0 en 2025) y 14999 en 2026 (0 delitos en enero–agosto; verificado 2026-09-24).
- **INEGI defunciones:** año de registro ≠ año de ocurrencia; el último año se completa con registros tardíos (+5–8%). INEGI cambió nombres de columna en 2022 (`presunto` → `tipo_defun`) y el significado del código 4 (de "se ignora" a "muerte natural"). El ZIP de 2022 trae el catálogo viejo aunque sus datos usan el nuevo; el procesador lo detecta porque el código más frecuente debe ser "muerte natural". 8.5% de los homicidios tiene edad desconocida (1,282), posible señal de cuerpos sin identificar.
- **INEGI, lugar de ocurrencia:** en 30.5% de los homicidios ocurridos en 2019–2023 el lugar de la agresión es "se ignora". Los catálogos de lugar, sitio y parentesco vienen en UTF-8 o Latin-1, con y sin comillas, según el año; la pieza 15 los valida código por código. El significado del código 88 de `par_agre` cambia ("no aplica" → "no hubo violencia").
- **ENVIPE, confianza:** solo se pregunta a quien identifica a la autoridad (en Jalisco, 30% identifica al MP y la fiscalía estatal) y según la entidad de residencia.
- **Homicidio, dos fuentes:** INEGI (víctimas por certificado de defunción) cuenta 10–34% más que SESNSP (carpetas); ambas muestran la misma tendencia a la baja 2019–2024.
