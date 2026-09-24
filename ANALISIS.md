# México Visible · Jalisco — Datos y análisis

**Estado al 24 de septiembre de 2026, tras la revisión del mismo día (§9) y las piezas 13–18.** Documento de referencia: qué datos tenemos, de dónde vienen, cómo se verificaron, qué análisis se hizo, qué encontramos, qué no sabemos y cómo reproducirlo todo.

Las imágenes de las cédulas quedan fuera de este documento.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Inventario de datos](#2-inventario-de-datos)
3. [Cómo se obtuvieron y verificaron los datos](#3-cómo-se-obtuvieron-y-verificaron-los-datos)
4. [Método de análisis](#4-método-de-análisis)
5. [Hallazgos por pieza](#5-hallazgos-por-pieza)
6. [Registro de hipótesis](#6-registro-de-hipótesis)
7. [Tesis del sitio](#7-tesis-del-sitio)
8. [Sesgos, límites y cómo leer las cifras](#8-sesgos-límites-y-cómo-leer-las-cifras)
9. [Errores detectados y corregidos](#9-errores-detectados-y-corregidos)
10. [Lo que no tenemos](#10-lo-que-no-tenemos)
11. [Reproducibilidad y archivos](#11-reproducibilidad-y-archivos)

---

## 1. Resumen ejecutivo

Reunimos **12 fuentes oficiales** sobre violencia en Jalisco. Por su tamaño, destacan:

- **1.55 millones** de delitos denunciados.
- **15,131** homicidios con certificado de defunción.
- **38,267** personas reportadas como desaparecidas.
- **259** fosas clandestinas.
- **80,631** víctimas de delitos denunciados en enero–agosto 2026, con campos de sexo y edad (20% sin edad registrada).
- Una encuesta de victimización con diseño muestral.
- Población, geografía y marginación de los 125 municipios.

Cada fuente se comprueba en cada corrida contra totales oficiales, contra una segunda fuente o, cuando no hay otra, contra su propia consistencia interna (§3.2). Quedan diferencias que la fuente no explica, como la brecha de 47 personas del REPD (§8.5).

Con esos datos se hicieron **17 piezas de análisis**, numeradas del 1 al 18 (no existe la 4). Cada una responde una pregunta con **hipótesis declaradas antes de calcular**, intervalos de confianza y pruebas de robustez. De 73 hipótesis, 42 se confirmaron, 22 se refutaron y 9 son exploratorias. Las refutaciones cambiaron la historia para mejor.

**Los seis hallazgos centrales:**

1. **Quienes desaparecen y quienes son asesinados son la misma población** (89% hombres, misma edad), **pero no en los mismos lugares.** El homicidio se concentra en el sur del área metropolitana y en Altos Norte. La desaparición se reparte por todo el estado y, fuera del área metropolitana, pesa más que el homicidio. Hay **12 municipios con homicidio bajo y desaparición alta**, confirmados con dos fuentes de homicidio independientes.
2. **La diferencia es metropolitana, no de pobreza.** La marginación no explica dónde pesa más la desaparición frente al homicidio. La ruralidad parece explicarlo, pero su efecto sale casi todo de comparar el área metropolitana con el resto del estado: sin esos 10 municipios, desaparece. Dentro del resto del estado, los municipios más marginados registran proporcionalmente menos desaparición, lo que es compatible con menos denuncia.
3. **Fuera del área metropolitana casi no hay búsqueda registrada.** El 95% de las víctimas en fosas registradas están en el área metropolitana, que concentra el 62% de las personas desaparecidas. En el resto del estado solo 11 de 115 municipios tienen algún sitio registrado. El sitio de Rancho Izaguirre (Teuchitlán) figura con 0 víctimas. Solo 53% de los cuerpos hallados ha sido identificado.
4. **De 2019 a 2025 bajaron la violencia letal, la callejera y la patrimonial; no bajaron la familiar ni la sexual.** El abuso sexual denunciado se duplicó. El homicidio bajó parejo en las cuatro regiones, pero la baja del robo es metropolitana: fuera del área metropolitana el robo con violencia y el de vehículo no bajaron, y la violencia familiar denunciada sube. En 2026, 9 de cada 10 víctimas de violencia familiar son mujeres y 9 de cada 10 víctimas de abuso sexual son menores de edad, sobre todo adolescentes mujeres (394 por 100 mil en 8 meses). En 2026 el robo de vehículo, la serie más confiable, sube 9%.
5. **El homicidio registrado cayó un tercio en 2025, más que otras señales de violencia.** La caída aparece en carpetas y en víctimas, en los 12 meses del año, y no se pasó a homicidio culposo. Pero las lesiones con arma de fuego apenas bajaron, y por cada víctima de homicidio hubo 24% más denuncias de desaparición que en 2019–2024. Hasta que INEGI publique las defunciones de 2025, se puede afirmar una baja del homicidio registrado, no necesariamente de la violencia letal.
6. **Todo esto es una fracción.** En Jalisco, alrededor de 92 de cada 100 delitos no llegan a una carpeta de investigación. En dos de cada tres delitos no denunciados, la razón es atribuible a la autoridad, sobre todo que denunciar es perder el tiempo. Los casos nuevos de desaparición bajan, pero 16,250 personas siguen sin ser localizadas, 38% de ellas desde 2018 o antes.

---

## 2. Inventario de datos

Toda la evidencia cruda vive fuera del repositorio, en `/Users/chris/Documents/seguridad-mexico/` (carpetas `0700`, archivos `0600`), con SHA-256 por archivo. Al repositorio solo llegan agregados.

### 2.1 Personas desaparecidas y localizadas

| | REPD — cédulas de búsqueda | REPD — estadística oficial |
|---|---|---|
| **Qué es** | Fichas individuales de la versión pública del Registro Estatal de Personas Desaparecidas de Jalisco | Endpoints agregados de la misma plataforma |
| **Contenido** | 10,234 personas: 5,285 desaparecidas, 4,949 localizadas (4,310 con vida, 639 sin vida). Nombre, edad, sexo, municipio, fecha, rasgos, señas, vestimenta | **16,250 siguen desaparecidas** (por año de desaparición, sexo, edad y municipio); **22,017 localizadas** (18,722 con vida, 3,295 sin vida) por sexo y condición de víctima de delito; denuncias por año; mapa municipal |
| **Periodo** | Desapariciones de 1965 a septiembre 2026 (94% desde 2019) | "2018 y antes" hasta el corte del 31 de agosto de 2026 |
| **Nivel** | Persona | Estado; municipio solo acumulado (sin año) |
| **Carpeta** | `s2-second-baseline-20260923T214140Z` (captura completa: 853 páginas, 0 errores) | `s3-analysis-repd-stats-20260924T181640Z` (11 endpoints) |
| **Uso en análisis** | Solo descriptivo; **no sirve para comparar regiones** (cobertura desigual, ver §8) | Base de las piezas 1, 2, 3, 5, 7, 8, 10 |

Además hay una primera captura comparable (A, 2026-09-23 19:38 UTC): de A a B, las 10,234 cédulas quedaron sin cambios.

**Qué mide cada serie del REPD.** Se verificó cruzándolas entre sí:

| Serie | Mide | Total | ¿Se usa? |
|---|---|---|---|
| Personas desaparecidas por año y sexo | Personas que **siguen desaparecidas hoy**, por año en que desaparecieron | 16,250 | Sí |
| Hombres / mujeres por año y rango de edad | La misma población, por edad | 16,250 | Sí |
| Porcentaje de localización por año | **Denuncias recibidas** en el año y localizadas ese año | 28,485 (2019–2026) | Sí |
| Localizadas por condición y victimización | Localizadas con/sin vida, víctimas de delito o no | 22,017 | Sí |
| Mapa (`datos_para_mapa`) | Personas desaparecidas por municipio (acumulado) | 16,203 (16,117 municipales + 86 "se ignora") | Sí |
| Total desapariciones con/sin carpeta | Total estatal | 16,250 | Sí |
| "Del 1 de enero de 2019 al corte" (2 series) | No definido por la fuente; no cuadra con las anteriores | — | **No** |

### 2.2 Delitos denunciados (SESNSP)

| | Incidencia 2015–2025 | Incidencia RNID 2026 | Víctimas municipal 2026 | Víctimas estatal 2015–2025 |
|---|---|---|---|---|
| **Qué mide** | Delitos del fuero común denunciados (carpetas de investigación) | Igual, metodología nueva (RNID) | Víctimas de cada delito | Víctimas de delitos contra la persona |
| **Jalisco** | **1,471,935 delitos**; 135,828 filas | **76,393 delitos** (ene–ago) | **80,631 víctimas** | Homicidio, lesiones, feminicidio, secuestro, extorsión, trata… (**sin** abuso sexual, violencia familiar ni robo) |
| **Categorías** | 7 bienes jurídicos · 40 tipos · 55 subtipos · 59 modalidades | 7 · 47 · 79 · 63 | Igual que RNID + **sexo y rango de edad** | Sexo y menor/adulto |
| **Nivel** | Municipio × mes | Municipio × mes | Municipio × mes | Estado × mes |
| **Codificación** | Latin-1 (el importador lo detecta) | UTF-8 | UTF-8 | Latin-1 |
| **Carpeta** | `s2-c04-sesnsp-2015-2025-20260924T032818Z` | `s2-c04-official-import-20260924T032403Z` | `s3-extra-import-20260924T190235Z` | `s3-extra-import-20260924T190235Z` |

La composición de los delitos de 2025 por tipo y los totales anuales 2015–2026 están en `reports/inventario-datos.md`.

### 2.3 Muertes violentas (INEGI)

| | Estadísticas de defunciones registradas |
|---|---|
| **Qué es** | Microdatos anónimos de todos los certificados de defunción de México |
| **Contenido** | 7 años de registro (2018–2024), ~6.1 millones de defunciones en México. En Jalisco: **15,131 homicidios**, más suicidios, accidentes y muertes de intención no determinada ("se ignora"), con sexo, edad, municipio de ocurrencia, causa CIE-10 (arma), lugar y violencia familiar |
| **Periodo útil** | Ocurrencia 2018–2023 casi completa; 2024 parcial (faltan registros tardíos, +5–8%). 2025 aún no publicado |
| **Carpeta** | `s3-inegi-defunciones-20260924T184755Z` → `jalisco-defunciones-violentas.csv` |

Homicidios ocurridos en Jalisco por año: 2018: 2,676 · 2019: 2,529 · 2020: 2,343 · 2021: 2,241 · 2022: 1,848 · 2023: 1,593 · 2024: 1,685 (parcial).

Muertes de intención no determinada ocurridas en Jalisco: 2018: 513 · 2019: 617 · 2020: 643 · 2021: 650 · 2022: 519 · 2023: 283 · 2024: 146 (parcial).

### 2.4 Fosas clandestinas

| | Registro estatal de sitios de inhumación clandestina |
|---|---|
| **Fuente** | Fiscalía Especial en Personas Desaparecidas de Jalisco, tabla pública (PDF), corte 31-08-2026 |
| **Contenido** | **259 sitios** (20 aún en proceso), **2,218 víctimas localizadas**, **1,174 identificadas** (1,027 hombres, 147 mujeres), en **19 municipios**; fechas de inicio y fin de procesamiento. Dos sitios tienen 0 víctimas: La Estanzuela, Teuchitlán (la localidad de Rancho Izaguirre, 03/2025) y Presa Santa Elena, Ameca (03–07/2025) |
| **Periodo** | Octubre 2018 → agosto 2026. El sitio más antiguo (San Miguel Buena Vista, Lagos de Moreno) aparece en la fuente con el ID "oct-18", antes del sitio 1 |
| **Carpeta** | `s3-fosas-20260924T184227Z` → `fosas-sitios.csv` (convertido del PDF y validado) |
| **Advertencia de la fuente** | Cifras preliminares: el IJCF sigue emitiendo dictámenes |

### 2.5 Encuesta de victimización (ENVIPE, INEGI)

| | ENVIPE 2026 | ENVIPE 2025 |
|---|---|---|
| **Victimización de** | 2025 | 2024 |
| **Módulos usados** | Delitos (`tmod_vic`): tipo de delito (15 códigos), entidad de ocurrencia, denuncia, carpeta, razón principal de no denunciar (`BP1_23`, también por tipo de delito), factor de expansión, estrato y UPM. Personas (`tper_vic1`): identificación y confianza en 10 autoridades (`AP5_3_xx`, `AP5_4_xx`); percepción de seguridad en colonia, municipio y estado (`AP4_3_1`–`AP4_3_3`), en 12 lugares (`AP4_4_xx`), incivilidades en la colonia (`AP4_5_01`–`AP4_5_17`) y tendencia esperada (`AP4_7_2`); entidad y municipio de residencia (`CVE_ENT`, `CVE_MUN`), `FAC_ELE` | Igual. En 2025 la incivilidad 18 significa "ninguna" y no existen la 19 ni la 20; solo se usan las 17 comparables |
| **Jalisco** | 995 delitos en muestra → 1.84 millones estimados; 2,664 personas (1,754 en el área metropolitana) | 1,117 en muestra → 2.15 millones; 2,561 personas (1,707 en el área metropolitana) |
| **Carpeta** | `s3-envipe-20260924T184849Z` | igual |

### 2.6 Población, geografía y marginación

| Fuente | Contenido | Carpeta |
|---|---|---|
| **CONAPO**, proyecciones municipales 1990–2040 (`pobproy_quinq1.csv`) | Población a mitad de año por municipio, sexo y 18 grupos de edad; Jalisco 2026: 8,982,027 | `s2-c04-official-import-20260924T032403Z` |
| **INEGI**, Marco Geoestadístico dic. 2025 | Catálogo y geometría de los 125 municipios | `s2-inegi-import-20260923T221320Z` |
| **CONAPO**, Índice de marginación municipal 2020 | Índice, grado e indicadores (analfabetismo, educación, servicios, hacinamiento, ruralidad, ingreso) | `s3-extra-import-20260924T190235Z` |

### 2.7 Procedencia (SHA-256, primeros 16 caracteres)

La tabla de tamaños y SHA-256 de cada insumo está en `reports/inventario-datos.md`.

Cada corrida del análisis vuelve a calcular el SHA-256 completo de cada insumo que lee y lo guarda en `analysis/output/*.json` (`_procedencia`).

---

## 3. Cómo se obtuvieron y verificaron los datos

### 3.1 Adquisición

| Fuente | Cómo | Por qué así |
|---|---|---|
| REPD cédulas y estadística | Descarga automatizada acotada (1 petición/s, límites de tiempo y tamaño) | Endpoints de la versión pública; tratados como endpoints de implementación, no API oficial |
| INEGI geografía, defunciones, ENVIPE | Descarga automatizada de datos abiertos oficiales | Enlaces directos disponibles |
| Fosas | Descarga automatizada del PDF oficial | Enlace directo en el sitio de la Fiscalía |
| SESNSP (4 archivos), CONAPO población y marginación | **Descarga manual del dueño en navegador** | SESNSP exige inicio de sesión Microsoft; datos.gob.mx bloquea clientes no-navegador (403); enlaces de CONAPO dan 404 tras migrar a gob.mx. No se evadieron controles |

### 3.2 Verificaciones automáticas

El análisis **se detiene** si alguna verificación falla. Cada número de esta tabla se comprueba en cada corrida.

| Fuente | Verificación |
|---|---|
| CONAPO población | 12,750 filas Jalisco (125 municipios × 51 años × 2 sexos); suma de edades = total en cada fila; 375/375 totales municipio-año iguales a una extracción histórica independiente (EXP-06); Jalisco 2026 = 8,982,027 |
| SESNSP delitos | Totales 2025 = 114,418; 2026 = 76,393; 2015–2025 = 1,471,935; 125 municipios en cada serie; 0 celdas no numéricas |
| SESNSP víctimas | 125 municipios; **víctimas de homicidio doloso ≥ carpetas en cada año 2015–2026** (una carpeta tiene al menos una víctima) |
| REPD estadística | Corte 2026-08-31 en cada endpoint; serie por año = serie por edad = 16,250; mapa = 16,203; localizadas = 22,017 |
| INEGI defunciones | Un solo año de registro por archivo; códigos de tipo de muerte validados contra el catálogo de cada año; el código más frecuente debe ser "muerte natural" en el catálogo (así se detectó que el catálogo del ZIP 2022 no corresponde a sus datos, §9); ningún código fuera del catálogo; claves municipales dentro del catálogo INEGI; total 15,131 homicidios. Lugar y sitio de ocurrencia y parentesco: el catálogo de cada ZIP se lee por separado (vienen en UTF-8 o Latin-1, con y sin comillas); las etiquetas de los códigos usados deben ser las esperadas en cada año, ningún código de los datos puede faltar en el catálogo de su año y el código 88 ("no aplica para muerte natural") debe ser menos de 1% de los homicidios |
| Fosas | IDs consecutivos 1..258, más el sitio "oct-18" tal como viene en la fuente (cualquier otro ID no numérico detiene la conversión); municipios en catálogo INEGI; identificadas ≤ localizadas; hombres + mujeres = identificadas |
| Marginación | 2,469 municipios nacionales; 125 claves Jalisco = INEGI; población = Censo 2020 (8,348,151) |
| ENVIPE | Reproduce la cifra negra nacional publicada (93.4%) y el total nacional de delitos (33.8 millones); `BP1_23` tiene respuesta válida en todos los delitos no denunciados y en ninguno denunciado; catálogos de `BP1_23` y `AP5_4` con las etiquetas esperadas y sin códigos fuera de catálogo; catálogos de `AP4_3_x` (seguro/inseguro), `AP4_4_xx` (inseguro, no aplica) y `AP4_7_2` (empeorará) con las etiquetas esperadas en cada ZIP; códigos de `AP4_3_x`, `AP4_4_xx`, `AP4_5_01`–`17` y `AP4_7_2` dentro de catálogo y sin vacíos; `CVE_MUN` de Jalisco dentro del catálogo INEGI; los 14 códigos de `BPCOD` presentes en el catálogo de cada año |

### 3.3 Tres conteos de homicidio que encajan

| Año | Carpetas SESNSP | Víctimas SESNSP | Víctimas INEGI |
|---|---|---|---|
| 2019 | 2,017 | 2,671 | 2,529 |
| 2020 | 1,754 | 2,625 | 2,343 |
| 2021 | 1,816 | 2,370 | 2,241 |
| 2022 | 1,600 | 2,066 | 1,848 |
| 2023 | 1,450 | 1,962 | 1,593 |
| 2024 | 1,439 | 1,797 | 1,685* |
| 2025 | 952 | 1,196 | aún no publicado |

\*Parcial. Las tres fuentes muestran la misma baja de 2019 a 2024. En 2025 las dos series del SESNSP caen un tercio; la prueba con certificados de defunción queda pendiente (pieza 12). Acuerdo municipal INEGI–SESNSP (tasas 2019–2023): Spearman ρ = 0.91.

---

## 4. Método de análisis

**Herramientas.** Python 3.12, pandas, NumPy, SciPy, statsmodels y pdfplumber, con entorno fijado por `uv` (`analysis/uv.lock`).

**Reglas que siguen todas las piezas:**

1. **Una pregunta por pieza**, con hipótesis y criterio de refutación **escritos en el script antes de calcular**. Si una hipótesis falla, se reporta; no se ajusta a posteriori. Excepciones documentadas en §9:
   - Una corrección de alcance en la pieza 9.
   - Dos correcciones de método de la revisión del 24-09-2026: intervalos de la pieza 9 y sobre-dispersión de la pieza 10. Cambiaron dos veredictos, de ✅ a ❌.
   - En la pieza 12, las cifras que ya se habían visto antes de escribir sus hipótesis se reportan como exploratorias.
   - Corrección de método del intervalo del índice de concentración (pieza 5), sin cambio de veredicto. La escala de la distancia de Jensen-Shannon (pieza 7) y el cambio 2024→2025 por región (pieza 14) son exploratorios porque parten de cifras ya vistas.
   - En la pieza 16, el cambio 2025→2026 de las incivilidades (E16g) se añadió después de ver las dos ediciones y es exploratorio. En las piezas 17 y 18 la regla de tamaño mínimo se declaró antes de calcular.

   No existe pieza 4: se conserva la numeración original para no romper las referencias de scripts y resultados.
2. **Incertidumbre siempre.** Tasas con intervalo exacto de Poisson (Garwood) al 95%; proporciones con intervalo de Wilson; razones de conteos con intervalo exacto condicional (Clopper-Pearson); proporciones de encuesta con intervalo en escala logit; correlaciones con intervalo de Fisher; razón de dos razones de conteos (pieza 18) con intervalo exacto condicional de Fisher, y homogeneidad entre regiones con prueba exacta por Monte Carlo condicional a los márgenes.
3. **Municipios pequeños.** Suavizado bayesiano empírico Poisson-Gamma (Marshall 1991). Un municipio es "alto" o "bajo" solo si su intervalo al 95% no incluye la tasa estatal; si lo incluye, es "indistinguible del promedio".
4. **Tendencias.** Regresión de Poisson log-lineal con offset de población y escala de Pearson (sobre-dispersión). Para comparar regiones, interacción región × año con prueba F.
5. **Asociaciones.** Regresión binomial negativa con offset; GLM binomial para proporciones, con errores escalados por la sobre-dispersión (cuasi-binomial); correlación de Spearman.
6. **Concentración.** Curva de Lorenz casos-vs-población; índice de Gini con bootstrap paramétrico (5,000 réplicas) e intervalo básico, que corrige el sesgo del remuestreo.
7. **Encuesta.** Estimador de razón ponderado con el factor de expansión; varianza por linealización de Taylor con estratos y unidades primarias de muestreo; dominio Jalisco sin eliminar UPM del diseño. Las diferencias Jalisco − nacional se linealizan sobre la muestra completa, así que la covarianza entre los dos dominios entra en la varianza. Entre ediciones (muestras independientes) las varianzas se suman, y la razón entre ediciones usa el método delta en escala logarítmica.
8. **Robustez.** Los hallazgos principales se prueban con dos medidas, dos ventanas de tiempo o dos fuentes independientes.
9. **Solo agregados.** Ningún resultado contiene nombres ni datos personales.

---

## 5. Hallazgos por pieza

### Pieza 1 — ¿Contar solo homicidios subestima la violencia letal en buena parte de Jalisco?

**Datos:** personas desaparecidas por municipio (REPD, acumulado) contra homicidio doloso SESNSP 2015–2025 (ventana principal; a nivel estatal hay 0.98 desaparecidas por homicidio, magnitudes comparables) y 2019–2025 (robustez). Robustez adicional con homicidios INEGI 2019–2023 (pieza 7).

**Clasificación de los 125 municipios** (filas = homicidio, columnas = desaparición; "alto/bajo" solo con evidencia estadística):

| | Desaparición alta | Indistinguible | Desaparición baja |
|---|---|---|---|
| **Homicidio alto** | 5 | 5 | 1 |
| **Indistinguible** | 7 | 32 | 9 |
| **Homicidio bajo** | **12** | 30 | 24 |

**Resultados:**
- La relación desaparición/homicidio varía mucho más de lo que explica el azar (χ² = 2,136, 124 gl, p < 10⁻¹⁵).
- **12 municipios con homicidio creíblemente bajo y desaparición creíblemente alta**, idénticos en las dos ventanas SESNSP y **12 de 12 con homicidios INEGI**:
  - Arandas, San Miguel el Alto (Altos Sur)
  - San Juan de los Lagos (Altos Norte)
  - Tala, Atotonilco el Alto, La Barca, Cihuatlán, Casimiro Castillo, Colotlán, Huejuquilla el Alto, San Gabriel, Tuxcacuesco

  Ejemplo: San Miguel el Alto, 105 personas desaparecidas y 22 homicidios en 11 años.
- 42 municipios tienen homicidio bajo y desaparición no baja; 41 están fuera del área metropolitana.
- Correlación municipal entre tasas de homicidio y desaparición: ρ = 0.198 [IC95 0.02–0.36] (SESNSP 2015–2025), 0.186 [0.01–0.35] (2019–2025), 0.216 [0.04–0.38] (INEGI). **Saber cuántos homicidios tiene un municipio dice poco sobre cuántas desapariciones tiene.** La correlación es débil pero positiva; los datos no permiten decir si está un poco por encima o por debajo de 0.2.
- **Alto en ambos:** Encarnación de Díaz, Lagos de Moreno, Guadalajara, Tlajomulco de Zúñiga, Mazamitla. **Solo homicidio alto:** Tlaquepaque, Tonalá, El Salto, San Cristóbal de la Barranca.

**Desaparecidas por cada homicidio, relativo al promedio estatal [IC95]:**

| Región | SESNSP 2015–2025 | SESNSP 2019–2025 | INEGI 2019–2023 |
|---|---|---|---|
| Altos Sur | 2.91 [2.53–3.36] | 3.40 [2.86–4.07] | 3.11 [2.62–3.71] |
| Resto del estado | 1.63 [1.55–1.71] | 1.92 [1.81–2.04] | 1.84 [1.73–1.95] |
| Altos Norte | 1.20 [1.11–1.30] | 1.03 [0.95–1.12] | 0.96 [0.88–1.05] |
| Área metropolitana | 0.81 [0.79–0.84] | 0.80 [0.77–0.82] | 0.81 [0.79–0.84] |

**Lectura:** en el área metropolitana la violencia letal se registra sobre todo como homicidio; fuera de ella, sobre todo como desaparición. Hay municipios que un mapa de homicidios mostraría como tranquilos.

**Límites:**
- La desaparición municipal es acumulada, sin año. El resultado no depende de la ventana de homicidio, pero supone que la antigüedad de los casos no difiere radicalmente entre regiones.
- Las tres comprobaciones de robustez varían solo el lado del homicidio. La desaparición es siempre la misma serie del REPD, y la ventana 2019–2025 está contenida en la de 2015–2025, así que no son independientes.
- Leer la desaparición sin resolver como violencia letal es un supuesto (§8.12).

### Pieza 2 — ¿La desaparición de adolescentes y la de hombres adultos son el mismo fenómeno?

**Datos:** REPD, personas que siguen desaparecidas (2019–2025) por sexo y edad; CONAPO personas-año.

| Edad | Hombres, por 100 mil al año [IC95] | Mujeres [IC95] | Razón H/M |
|---|---|---|---|
| 0–4 | 1.0 [0.7–1.5] | 1.2 [0.8–1.7] | 0.9 |
| 5–9 | 0.8 [0.5–1.3] | 0.9 [0.6–1.4] | 0.9 |
| 10–14 | 1.9 [1.4–2.5] | 1.9 [1.4–2.5] | 1.0 |
| 15–19 | 25.9 [24.0–27.9] | 6.1 [5.2–7.2] | 4.2 |
| 20–24 | 51.4 [48.7–54.2] | 7.5 [6.5–8.6] | 6.9 |
| **25–29** | **56.6** [53.8–59.5] | **8.1** [7.0–9.3] | 7.0 |
| 30–34 | 55.8 [52.8–58.8] | 5.9 [5.0–7.0] | 9.4 |
| 35–39 | 53.1 [50.1–56.3] | 5.0 [4.1–6.0] | 10.6 |
| 40–44 | 47.4 [44.3–50.7] | 4.0 [3.2–5.0] | 11.9 |
| 45–49 | 34.1 [31.4–37.0] | 2.5 [1.8–3.3] | 13.7 |
| 50–54 | 22.0 [19.7–24.4] | 1.8 [1.2–2.6] | 12.2 |
| 55–59 | 14.9 [12.9–17.2] | 1.1 [0.6–1.7] | 14.1 |

De 60 años en adelante los conteos son chicos (tabla completa en `analysis/output/p2.json`).

**Desenlace, todos los años:**

| | Registradas | Siguen desaparecidas | Localizadas sin vida (de las localizadas) |
|---|---|---|---|
| Hombres | 29,608 | **48.8%** [48.2–49.4] | **19.3%** [18.7–20.0] |
| Mujeres | 8,659 | 20.8% [20.0–21.7] | 5.3% [4.8–5.9] |

**Lectura:** en la infancia la desaparición sin resolver es igual para niños y niñas. A partir de los 15 años se separa: los hombres llegan a 7 veces la tasa de las mujeres a los 20–29 y a más de 10 veces después de los 35. Casi la mitad de los hombres reportados no ha aparecido, y de los que aparecieron, 1 de cada 5 fue hallado sin vida.

La hipótesis de que el pico femenino estaba en adolescentes **se refutó**. Ese patrón venía de las cédulas y describe casos que se resuelven, no los que quedan pendientes.

### Pieza 3 — Si cada año desaparecen menos personas, ¿se reduce la deuda pendiente?

- Hoy siguen desaparecidas **16,250** personas; **6,222 (38%)** desaparecieron en 2018 o antes.
- Las denuncias anuales bajan **8.8% por año** [−10.8%, −6.8%], de 4,872 (2019) a 2,647 (2025).
- Cada año sigue sumando personas que no aparecen: 1,681 [1,602–1,763] en 2019 … 910 [852–971] en 2025. Esa aportación baja 7.8% por año [−11.5%, −3.9%].
- De las 16,250 pendientes, 9,459 desaparecieron entre 2019 y 2025.

**Lectura:** la mejora en casos nuevos es real, pero cada año sigue sumando cientos de personas que no aparecen. Las cohortes recientes han tenido menos tiempo para ser localizadas; que aun así aporten menos es evidencia conservadora de que la baja es real.

**Límite:** solo existe el acervo de hoy, no el de cada fecha pasada. Con una sola captura no se puede saber si el total pendiente sube o baja con el tiempo; para eso hacen falta capturas periódicas de la estadística del REPD (§10).

### Pieza 5 — ¿Dónde se concentran las desapariciones?

| | Desaparición (REPD acumulado) | Homicidio doloso 2019–2025 |
|---|---|---|
| Índice de concentración (Gini) [IC95] | **0.159** [0.145–0.162] | **0.325** [0.313–0.331] |
| Casos en el 15% de la población más afectada | 21.5% | 23.7% |
| Población que concentra la mitad de los casos | 42% | 31% |
| Municipios creíblemente sobre la tasa estatal | 24 | 9 |

El IC95 es el intervalo del bootstrap corregido por sesgo (intervalo básico, §9). Remuestrear los conteos con Poisson suma ruido al que ya tienen y empuja el índice hacia arriba: +0.005 en desaparición y +0.003 en homicidio. Por eso la estimación queda cerca del borde superior del intervalo; corregido, el índice de desaparición sería 0.153. H5a no cambia.

Proporción de desapariciones entre proporción de población, por región: Altos Norte 1.65 · Altos Sur 0.99 · área metropolitana 0.97 · resto del estado 0.95.

**Lectura:** la desaparición está repartida por todo el estado; su concentración es la mitad que la del homicidio. Los 24 municipios creíblemente altos son sobre todo rurales y chicos del Norte, la Costa, la Sierra y la Ciénega (Huejúcar, San Martín de Bolaños, La Huerta, Mazamitla, Tala, Tomatlán, Colotlán, Cihuatlán…), más Encarnación de Díaz y Lagos de Moreno.

El suavizado sacó del top 10 a municipios cuyo lugar era ruido (Santa María del Oro). **Teocaltiche no es un foco de homicidio**: tuvo 2–8 homicidios al año, un pico aislado de 32 en 2025 y 0 en enero–agosto 2026, posible problema de registro.

### Pieza 6 — ¿Bajó la violencia en Jalisco, o solo el homicidio?

Tasas por 100 mil habitantes; tendencia 2019–2025; categorías comparables entre metodologías según la nota metodológica del SESNSP.

| | Delito | Tasa 2019 → 2025 | Cambio anual [IC95] | Ene–ago 2026 vs 2025 |
|---|---|---|---|---|
| **Baja** | Homicidio doloso | 23.9 → 10.7 | −10.0% [−13.3, −6.5] | 0.73 [0.65–0.81] |
| | Feminicidio | 0.8 → 0.4 | −12.2% [−18.7, −5.1] | 0.73 [0.37–1.43] |
| | Extorsión | 8.8 → 5.0 | −7.9% [−10.9, −4.8] | 0.55 [0.45–0.67] |
| | Robo con violencia | 326.1 → 123.7 | −14.6% [−16.3, −12.9] | 0.91 [0.88–0.94] |
| | Robo sin violencia | 579.0 → 238.5 | −11.8% [−15.4, −8.0] | 0.88 [0.86–0.91] |
| | Robo de vehículo | 236.3 → 104.0 | −10.7% [−14.9, −6.4] | 1.09 [1.05–1.13] |
| | Robo a casa habitación | 80.5 → 23.7 | −19.3% [−22.4, −16.0] | 0.76 [0.70–0.82] |
| | Robo a negocio | 176.1 → 35.3 | −24.6% [−27.6, −21.4] | 0.79 [0.74–0.84] |
| | Amenazas | 131.1 → 109.3 | −2.4% [−3.6, −1.2] | 1.00 [0.97–1.04] |
| **Sin tendencia** | Violencia familiar | 131.2 → 138.3 | +2.7% [−2.4, 8.1] | 1.02 [0.99–1.05] |
| | Violación | 5.3 → 5.9 | +4.2% [−0.4, 9.0] | 0.94 [0.81–1.10] |
| | Lesiones dolosas | 106.0 → 98.8 | −0.2% [−2.5, 2.2] | 1.07 [1.04–1.11] |
| | Secuestro | 0.2 → 0.2 | −0.9% [−7.5, 6.2] | 1.08 [0.44–2.71] |
| **Sube** | **Abuso sexual** | **28.8 → 60.8** | **+18.3% [11.4, 25.7]** | 0.67 [0.64–0.71]* |
| | Fraude | 91.2 → 119.6 | +7.3% [4.0, 10.8] | 1.01 [0.98–1.05] |
| | Narcomenudeo | 20.6 → 27.4 | +9.6% [0.3, 19.7] | 1.37 [1.28–1.46] |

\*La caída de abuso sexual en 2026 probablemente es reclasificación de la metodología RNID, no una mejora.

**Lectura:** de 2019 a 2025 bajan la violencia letal, la callejera y la patrimonial; no bajan la familiar ni la sexual, y el abuso sexual denunciado se duplicó. Violencia familiar tuvo su máximo en 2023 (193.5 por 100 mil). Narcomenudeo refleja actividad policial más que consumo. La caída de homicidio de 2025 (−34%) se analiza en la pieza 12.

**2026 no sigue del todo la tendencia.** Robo de vehículo, la serie con menor cifra negra (21%, pieza 9) y por eso la más confiable, sube 9% en enero–agosto [5–13%], y lesiones dolosas sube 7% [4–11%]. Ambas son categorías comparables entre metodologías según el SESNSP.

### Pieza 7 — ¿Las personas asesinadas y las que desaparecen son la misma población?

- **Mismo perfil.** Hombres: 89.2% [88.6–89.8] de las víctimas de homicidio (INEGI 2019–2023) y 88.1% [87.5–88.8] de quienes siguen desaparecidos (REPD 2019–2025). Distancia de Jensen-Shannon entre sus distribuciones de edad masculinas: **0.07** (0 = idénticas). Edad media de los hombres: 35.2 y 33.5 años.
- **Escala de esa distancia (E7d, exploratoria: el 0.07 ya se conocía).** Entre la edad de los hombres asesinados y la de la población masculina (CONAPO 2019–2023), la distancia es 0.41 [0.40–0.42]; entre la de los hombres desaparecidos y la población masculina (2019–2025), 0.41 [0.40–0.42]; entre homicidio y desaparición, 0.07 [0.06–0.09]. Asesinados y desaparecidos se parecen entre sí mucho más que a la población: su distancia es un sexto de la que separa a cada grupo de la población general. Intervalos por bootstrap multinomial.
- **Homicidio por sexo y edad (INEGI):** hombres 25–29, **86.1 por 100 mil al año** [81.9–90.4]; hombres 30–34, 80.6; mujeres 25–29, 10.0. La desaparición sin resolver de hombres 25–29 (56.6, pieza 2) equivale a dos tercios de su tasa de homicidio.
- **Robustez de la pieza 1: 12 de 12 municipios se mantienen** con homicidios INEGI.
- **Víctimas de homicidio con edad desconocida** (posible indicador de cuerpos sin identificar): 15.4% en 2018; 5.1–5.8% en 2019–2023; 9.0% en 2024 (año aún incompleto).

### Pieza 8 — ¿Qué dice el registro oficial de fosas, y qué deja fuera?

- **Solo 52.9% de las víctimas halladas fue identificada** [50.9–55.0]. Aun en sitios abiertos en 2019–2023, la identificación se queda en 57–69%: 4 de cada 10 cuerpos siguen sin nombre años después.

  Identificación por año de inicio (sitios cerrados): 2019: 61.6% · 2020: 58.9% · 2021: 68.8% · 2022: 59.1% · 2023: 56.8% · 2024: 31.4% · 2025: 35.1% · 2026: 11.9%.
- Identificadas: 1,027 hombres (87.5%) y 147 mujeres, proporción consistente con el perfil de las personas desaparecidas.
- **95.1% de las víctimas en fosas están en el área metropolitana** [94.1–95.9], que concentra 61.9% de las personas desaparecidas. Tlajomulco (750 víctimas, 99 sitios), Zapopan (538), El Salto (274), Tlaquepaque (176), Tonalá (136).
- **Fuera del área metropolitana casi no hay sitios registrados:** 11 de 115 municipios, con 109 víctimas (4.9%), mientras ahí vive el 38.1% de las personas desaparecidas.
- De 22 municipios fuera del área metropolitana con desaparición creíblemente alta, 4 tienen alguna fosa registrada (18%): Lagos de Moreno, El Arenal, Jocotepec y San Juan de los Lagos. **No es menos que en el resto:** de los otros 93 municipios fuera del área metropolitana, 7 tienen fosa (7.5%; razón de momios 2.7, Fisher p = 0.22). La falta de búsqueda registrada es de todo el interior del estado, no específica de donde más se desaparece.
- Sitios más grandes: Los Sabinos, El Salto (134 víctimas, 2020); Mirador II, Tlajomulco (110); El Saucillo, Juanacatlán (95).
- **Dos sitios registrados con 0 víctimas:** La Estanzuela, Teuchitlán (03/2025), que es la localidad de Rancho Izaguirre, y Presa Santa Elena, Ameca (03–07/2025).

**Lectura:** el registro oficial es un mapa de **dónde se ha buscado**, no de dónde están las personas. Rancho Izaguirre, ampliamente documentado, sí está en el registro, pero cuenta 0 víctimas localizadas. Muestra lo que el registro puede dejar fuera aun cuando registra el sitio.

### Pieza 9 — ¿Qué parte de los delitos nunca llega a las cifras oficiales?

**Definición INEGI:** cifra negra = delitos no denunciados + denunciados sin carpeta de investigación + no especificados, entre el total de delitos (excluye vandalismo, como en la cifra principal de INEGI).

| | Delitos de 2025 (ENVIPE 2026) | Delitos de 2024 (ENVIPE 2025) |
|---|---|---|
| Nacional | 93.4% [93.0–93.8] ✔ igual al publicado | 93.3% [92.8–93.7] |
| **Jalisco** | **92.2% [89.8–94.1]** de 1.84 millones de delitos | 91.7% [89.4–93.6] de 2.15 millones |
| Jalisco, vandalismo (aparte) | 99.3% [94.8–99.9] | 98.0% [92.4–99.5] |

Intervalos en escala logit (§9).

**Por tipo de delito, Jalisco 2025** (todos los delitos con al menos 30 casos en la muestra):

| Delito (ENVIPE) | Casos en muestra | Cifra negra [IC95] |
|---|---|---|
| **Hostigamiento o intimidación sexual, manoseo, exhibicionismo o intento de violación** | 36 | **98.8%** [91.5–99.8] |
| Fraude al consumidor | 112 | 98.6% [94.6–99.7] |
| Amenazas | 105 | 95.8% [90.1–98.3] |
| Fraude bancario | 141 | 94.4% [87.7–97.6] |
| Lesiones | 31 | 94.3% [82.5–98.3] |
| Extorsión | 109 | 94.0% [84.7–97.8] |
| Robo de accesorios de vehículo | 174 | 93.3% [88.3–96.3] |
| Robo en casa | 60 | 88.8% [77.9–94.7] |
| Robo o asalto en calle o transporte | 151 | 87.1% [78.6–92.5] |
| **Robo total de vehículo** | 42 | **21.3%** [11.2–36.8] |

**Lectura:** en Jalisco, alrededor de 8 de cada 100 delitos llegan a una carpeta. Cruce de magnitud: 1.84 millones × 7.8% ≈ 144 mil, contra 114 mil carpetas SESNSP. La violencia sexual que registra la encuesta es la que menos se denuncia: casi ningún caso llega a carpeta.

H9a pedía que el límite inferior del intervalo pasara de 90%. Con el intervalo corregido queda en 89.8% y se refuta por dos décimas; la estimación puntual no cambia. H9b se evaluó solo entre delitos con al menos 100 casos en muestra (87–99%), por eso no incluye robo de vehículo.

La excepción es el robo de vehículo, porque el seguro exige denuncia. Su tendencia en el SESNSP es confiable; la de fraude o amenazas refleja apenas 1–5% de lo que ocurre.

### Pieza 10 — ¿La desaparición sigue a la marginación?

Las tasas se modelan con regresión binomial negativa con offset de población. La proporción desaparecidas/(desaparecidas + homicidios) se modela con GLM binomial con errores escalados por la sobre-dispersión: el estadístico de Pearson entre sus grados de libertad vale 13.6–15.4, así que los errores se multiplican por √13.6–15.4. Índice CONAPO 2020, invertido: en la metodología 2020 un valor mayor significa menos marginación. Homicidio: INEGI, ocurridos 2019–2023. Asociación ecológica, no causal.

| Por 1 desviación estándar | Solo marginación | Marginación + ruralidad |
|---|---|---|
| Tasa de desaparición — marginación | 0.90 [0.81–0.99] | 0.82 [0.72–0.93] |
| Tasa de desaparición — ruralidad | — | 1.13 [1.00–1.27] |
| Tasa de homicidio — marginación | 1.03 [0.90–1.19] | 1.02 [0.86–1.21] |
| Tasa de homicidio — ruralidad | — | 1.02 [0.85–1.21] |
| Desaparecidas / (desaparecidas + homicidios) — marginación | 1.20 [0.99–1.45] | 0.71 [0.52–0.97] |
| Desaparecidas / (desaparecidas + homicidios) — ruralidad | — | 1.80 [1.34–2.42] |
| **Sin los 10 municipios del área metropolitana:** proporción — marginación | 0.71 [0.59–0.87] | 0.70 [0.53–0.92] |
| **Sin los 10 municipios del área metropolitana:** proporción — ruralidad | — | **1.03 [0.81–1.29]** |

**Por grado de marginación** ("Alto" y "Muy alto" suman 5 municipios y se reportan juntos):

| Grado | Municipios | Desaparecidas (acumulado REPD) por 100 mil | Homicidio INEGI por 100 mil al año, 2019–2023 | Desaparecidas acumuladas por homicidio INEGI 2019–2023 |
|---|---|---|---|---|
| Muy bajo | 78 | 183.1 | 25.2 | 1.51 |
| Bajo | 34 | 151.8 | 14.9 | 2.09 |
| Medio | 8 | 214.9 | 19.1 | 2.29 |
| Alto o muy alto | 5 | 74.8 | 22.0 | 0.69 |

La última columna divide un acumulado de todos los años entre 5 años de homicidios, así que no se compara con el 0.98 de la pieza 1 (11 años de carpetas SESNSP).

**Lectura:**
- La marginación no explica la desaparición: la tasa baja ligeramente con ella y el homicidio no cambia.
- El peso relativo de la desaparición sí es mayor donde hay más población rural (1.80), pero ese efecto sale de la diferencia entre el área metropolitana y el resto del estado, que concentra dos tercios de los casos del modelo. Sin los 10 municipios metropolitanos, la ruralidad deja de tener efecto (1.03).
- Dentro del resto del estado, más marginación va con **menos** peso relativo de la desaparición (0.70 [0.53–0.92]). Eso es compatible con que en los municipios más marginados se denuncie menos la desaparición.

**Advertencias:**
- El porcentaje de población en localidades de menos de 5 mil habitantes, la medida de ruralidad, es uno de los nueve indicadores del propio índice de marginación (correlación 0.54). "Controlar por ruralidad" le quita al índice parte de sí mismo.
- Los dos municipios de marginación muy alta (Mezquitic y Bolaños, región wixárika) reportan desaparición muy baja, probablemente por barreras de denuncia.

### Pieza 11 — ¿Sobre quién recae cada delito? Víctimas por sexo y edad, enero–agosto 2026

| Delito | Víctimas | Mujeres [IC95] | Menores 0–17 | Grupo más afectado (tasa en 8 meses) |
|---|---|---|---|---|
| **Abuso sexual** | 2,581 | 91.0% [89.9–92.1] | **90.1%** [88.9–91.2] | **Mujeres 13–17: 394 por 100 mil** [374–415] |
| Violación | 348 | 94.3% | 0.9% | Mujeres 18–29: 17.8 |
| Violación a la intimidad sexual | 428 | 91.1% | 22.6% | — |
| Acoso sexual | 218 | 89.5% | 37.2% | — |
| **Violencia familiar** | 9,045 | **90.5%** [89.9–91.1] | 2.2% | **Mujeres 18–29: 286 por 100 mil** [275–297] |
| Lesiones dolosas | 6,784 | 45.8% | — | Hombres 30–60: 107 |
| Robo con violencia | 7,061 | 27.6% | — | Hombres 18–29: 168 |
| Homicidio doloso | 550 | 8.4% | — | Hombres 30–60: 16.3 |
| Feminicidio | 17 | 100% | — | — |

**Abuso sexual por grupo (por 100 mil en 8 meses):**

| Grupo | Mujeres | Hombres |
|---|---|---|
| 0–12 años | 60.1 | 14.6 |
| **13–17 años** | **394.0** | 17.6 |
| 18–29 años | 14.2 | 0.7 |
| 30–60 años | 5.2 | 0.4 |

**Lectura:**
- La violencia sexual en Jalisco recae sobre todo en niñas y adolescentes. La tasa de mujeres de 13–17 años es 28 veces la de mujeres de 18–29 y 22 veces la de adolescentes hombres.
- **Clasificación:** "violación equiparada" registra 0 víctimas; la violencia sexual contra menores se registra como "abuso sexual", y "violación" describe casi solo a mujeres adultas.
- En violencia familiar, entre hombres la tasa más alta es la de mayores de 60 (48 por 100 mil): violencia contra personas mayores.

**Dónde:** 16 municipios con tasa creíblemente superior a la estatal de mujeres víctimas de violencia familiar o sexual (estatal: 260 por 100 mil mujeres en 8 meses):
- Fuera del área metropolitana: Colotlán (656), Puerto Vallarta (593), El Grullo (553), Gómez Farías, Bolaños, Ameca, Cihuatlán, Mascota, Cocula, Tecolotlán, Tala, Autlán de Navarro, Zapotlán el Grande.
- En el área metropolitana: Tlaquepaque, Guadalajara, Tonalá.

Tres de ellos coinciden con los 12 de la pieza 1, pero con 16 de 125 municipios esperar 1.5 coincidencias por azar hace que 3 no sea significativo.

**Calidad de datos:** 20.3% de las víctimas no tiene edad y 7.3% no tiene sexo. Sin edad: falsificación 75%, despojo 36%, abuso de confianza 33%, daño a la propiedad 27%, fraude 26%, suplantación 25%.

**Límite:** son víctimas denunciadas. La violencia sexual contra menores probablemente se detecta más que la de mujeres adultas. No hay serie por edad antes de 2026 para saber si la duplicación del abuso sexual viene de menores.

### Pieza 12 — ¿La caída del homicidio en 2025 es real, o es reclasificación?

**Datos:** SESNSP carpetas por municipio, mes y modalidad; SESNSP víctimas estatales por mes; denuncias de desaparición del REPD; INEGI defunciones con las muertes de intención no determinada ("se ignora").

**Transparencia:** los totales anuales 2024–2025, el cambio por región y los conteos de "se ignora" ya se habían visto en la revisión antes de escribir las hipótesis; esos resultados se reportan como exploratorios. Las cuatro hipótesis confirmatorias usan cortes que no se habían calculado.

**La caída:**

| | 2024 | 2025 | Razón de tasas [IC95] |
|---|---|---|---|
| Carpetas de homicidio doloso | 1,439 | 952 | 0.66 [0.60–0.71] |
| Víctimas de homicidio doloso | 1,797 | 1,196 | 0.66 [0.61–0.71] |
| Homicidio doloso con arma de fuego (carpetas) | 877 | 606 | −31% |
| **Lesiones dolosas con arma de fuego (carpetas)** | 643 | 596 | **0.92 [0.82–1.03]** |

**Pruebas:**

| | Resultado |
|---|---|
| H12a. ¿Es general en el año? | ✅ Los 12 meses de 2025 están por debajo del mismo mes de 2024 |
| H12b. ¿Pasó a homicidio culposo con arma? | ✅ No: de 0 a 2 carpetas. El homicidio culposo subió 103 (969 → 1,072), pero 101 son accidentes de tránsito. "Otros delitos contra la vida" bajó de 177 a 126 y feminicidio quedó igual (39 → 40) |
| H12c. ¿Baja también la violencia armada no letal? | ❌ Las lesiones con arma de fuego bajan 8%, sin diferencia significativa |
| H12d. ¿Las muertes de intención no determinada tienen perfil de homicidio? | ✅ En parte: 78.1% hombres [76.5–79.7] (homicidio: 89.2%), pero edad mediana de 38 años (homicidio: 32) y solo 9.7% con arma de fuego (homicidio: 59.5%); 13.3% por ahorcamiento y 74% por otros medios |

**Exploratorio:**

- **Homicidios con arma de fuego por cada lesión con arma de fuego:** 1.32–1.60 entre 2019 y 2024; **1.02 en 2025**. En 2025 el homicidio con arma bajó mucho más que las lesiones con arma.
- **Denuncias de desaparición por víctima de homicidio:** 1.62–1.95 entre 2019 y 2024; **2.21 [2.07–2.37] en 2025**, 24% más que el promedio 2019–2024 [15–33%].
- **Muertes de intención no determinada (INEGI):** su peso entre homicidio + "se ignora" subió de 16.1% (2018) a 22.5% (2021) y bajó a 15.1% (2023). Sumarlas al homicidio no cambia la tendencia 2019–2023: −11.5% anual [−14.3, −8.5] solo homicidio; −12.1% [−16.6, −7.3] con ellas.
- **Dónde:** el área metropolitana bajó 33% (1,131 → 758), Altos Norte 49% (146 → 75) y el resto del estado 24%. Cinco municipios explican 78% de la caída: Tlajomulco (271 → 144), Guadalajara (232 → 150), Tlaquepaque (280 → 205), Encarnación de Díaz (59 → 7) y Zapopan (153 → 107). En 31 municipios el homicidio subió.
- **2026:** las carpetas de enero–agosto siguen bajando (0.73 [0.65–0.81], pieza 6). Las víctimas dan 0.60 [0.54–0.67], pero comparan archivos de dos metodologías con distinta razón de víctimas por carpeta (1.26 en 2024–2025, 1.08 en 2026), así que la comparación de carpetas es la más segura.

**Lectura:** la caída de 2025 no es un hueco del archivo ni un traspaso a homicidio culposo: aparece en carpetas y en víctimas, en los 12 meses, y sigue en 2026. Pero es más grande que la de otras señales de violencia. Las lesiones con arma de fuego casi no bajaron, y por cada víctima de homicidio hubo más denuncias de desaparición que en cualquier año desde 2019. Eso es compatible con tres explicaciones que estos datos no distinguen:
- una baja real de los asesinatos;
- un cambio en la letalidad de los ataques;
- parte de la violencia letal registrada como desaparición.

Las muertes de intención no determinada no explican la baja de 2019–2023: sumadas al homicidio, la tendencia es la misma.

**Límites:** INEGI todavía no publica las defunciones de 2025, que son la prueba independiente. Las denuncias de desaparición incluyen personas que luego aparecen con vida. La concentración en cinco municipios hace que la cifra estatal dependa mucho de lo que pase en ellos.

### Pieza 13 — ¿Por qué no se denuncia en Jalisco, y cuánto se confía en las autoridades?

**Datos:** ENVIPE 2026 (delitos de 2025; confianza medida en 2026), réplica con ENVIPE 2025. Motivos: `tmod_vic.BP1_23`, razón principal de no denunciar, en los delitos no denunciados ocurridos en la entidad (sin vandalismo, como en la pieza 9). Confianza: `tper_vic1.AP5_4_xx`, personas de 18 años y más residentes en la entidad que identifican a la autoridad. Mismo estimador que la pieza 9 (razón ponderada, linealización de Taylor, IC95 en escala logit); las diferencias con el país se linealizan sobre la muestra completa.

**Por qué no se denuncia** (871 delitos no denunciados en muestra, 1.67 millones estimados):

| Razón principal | Jalisco [IC95] | Nacional [IC95] |
|---|---|---|
| **Pérdida de tiempo** | **38.7%** [34.1–43.6] | 35.8% [34.3–37.2] |
| Desconfianza en la autoridad | 12.8% [9.8–16.6] | 13.0% [12.1–14.0] |
| Delito de poca importancia | 11.2% [8.5–14.6] | 14.5% [13.7–15.4] |
| No tenía pruebas | 8.7% [6.1–12.1] | 9.1% [8.4–9.7] |
| Trámites largos y difíciles | 8.6% [6.2–11.7] | 8.3% [7.7–8.9] |
| Otra | 7.6% [5.2–10.9] | 9.3% [8.1–10.7] |
| Miedo al agresor | 5.7% [4.1–7.9] | 6.0% [5.4–6.5] |
| Actitud hostil de la autoridad | 3.7% [2.2–6.0] | 2.7% [2.3–3.2] |
| Miedo a que lo extorsionaran | 2.5% [1.2–5.0] | 1.0% [0.8–1.4] |
| **Causas atribuibles a la autoridad** (agrupación INEGI) | **66.3%** [61.9–70.4] | 60.8% [59.4–62.2] |

**Confianza en autoridades** (mucha o algo de confianza, entre quienes identifican a la autoridad; 2,664 personas en muestra):

| Autoridad | Jalisco [IC95] | Nacional | Diferencia [IC95] |
|---|---|---|---|
| Marina | 87.7% [85.4–89.7] | 89.5% | −1.8 [−3.9, 0.2] |
| Ejército | 84.9% [82.9–86.8] | 87.0% | **−2.1 [−4.0, −0.3]** |
| Guardia Nacional | 77.6% [75.4–79.7] | 79.4% | −1.8 [−3.8, 0.3] |
| Policía ministerial o de investigación | 66.6% [62.5–70.4] | 60.4% | **+6.1 [2.3, 10.0]** |
| Fiscalía General de la República | 66.0% [61.7–70.1] | 64.6% | +1.4 [−2.6, 5.4] |
| Jueces | 62.8% [58.1–67.2] | 58.3% | **+4.5 [0.1, 8.9]** |
| Policía estatal | 62.0% [59.1–64.7] | 58.6% | **+3.4 [0.7, 6.1]** |
| MP y fiscalía estatal | 61.1% [57.6–64.4] | 58.4% | +2.7 [−0.6, 6.0] |
| Policía preventiva municipal | 56.1% [53.4–58.7] | 57.1% | −1.0 [−3.6, 1.5] |
| Policía de tránsito municipal | 45.7% [43.1–48.4] | 45.8% | −0.1 [−2.6, 2.4] |

Solo 30% de los adultos de Jalisco identifica al MP y la fiscalía estatal, y 22% a la policía ministerial; la confianza en ellos se mide sobre esa minoría.

| | Resultado |
|---|---|
| H13a. La mayoría no denuncia por causas atribuibles a la autoridad | ✅ 66.3% [61.9–70.4] |
| H13b. "Pérdida de tiempo" es la razón más frecuente | ✅ 38.7%, tres veces la siguiente |
| H13c. Jalisco no se aparta del país en más de ±5 puntos en causas atribuibles a la autoridad | ❌ +5.5 [+1.2, +9.7] |
| H13d. La confianza en al menos 3 de 5 autoridades civiles locales es menor en Jalisco que en el país | ❌ 0 de 5; la policía estatal y la ministerial generan **más** confianza que en el país |
| H13e. Marina y Ejército superan a la policía preventiva municipal por más de 20 puntos | ✅ +35.0 [31.3–38.8] y +32.3 [29.0–35.5] |

**Réplica con ENVIPE 2025** (delitos de 2024): causas atribuibles a la autoridad 61.1% [56.3–65.7] en Jalisco y 63.0% en el país (diferencia −1.9 [−6.5, +2.7]); pérdida de tiempo sigue primera (31.4%); Marina y Ejército superan a la preventiva municipal por 34 y 32 puntos; la confianza en la policía ministerial vuelve a ser mayor que en el país (+4.6 [0.4, 8.8]).

**Lectura:**
- Dos de cada tres delitos no denunciados en Jalisco no se denuncian por algo que depende de la autoridad, sobre todo porque denunciar se ve como pérdida de tiempo. Eso ayuda a leer la cifra negra de la pieza 9: no es sobre todo miedo al agresor (6%) ni delitos menores (11%).
- La diferencia con el país en ENVIPE 2026 (+5.5 puntos) no se repite en ENVIPE 2025 (−1.9). Con dos ediciones que se contradicen, lo sostenible es que Jalisco está en torno al promedio nacional.
- La confianza en las autoridades de Jalisco no es menor que en el país: es igual o mayor en las civiles y apenas menor en las militares. La desconfianza que importa es la de siempre: la policía municipal genera 30–35 puntos menos confianza que las Fuerzas Armadas.

**Límites:** motivo y confianza son percepciones de quienes responden; la confianza se pregunta sobre la entidad de residencia y sobre autoridades que la mayoría no identifica. El módulo de percepción de seguridad sigue sin analizar (§10).

### Pieza 14 — ¿La baja de la violencia es igual en todo Jalisco? Tendencias 2019–2025 por región

**Datos:** SESNSP carpetas 2019–2025 por municipio, agrupadas en cuatro regiones (las de las piezas 1, 5 y 12); población CONAPO por región. Tendencia: Poisson log-lineal con offset de población y escala de Pearson, como en la pieza 6. Para comparar regiones: modelo con interacción región × año y prueba F.

**Cambio anual 2019–2025 [IC95]:**

| Delito | Área metropolitana | Altos Norte | Altos Sur | Resto del estado | ¿Difieren? (F, p) |
|---|---|---|---|---|---|
| **Homicidio doloso** | −9.3% [−12.7, −5.7] | −11.7% [−23.2, 1.5] | −16.3% [−21.4, −11.0] | −12.7% [−18.5, −6.6] | No (0.42; 0.74) |
| **Robo con violencia** | **−16.0%** [−17.9, −14.1] | +0.6% [−12.2, 15.2] | −1.9% [−9.4, 6.2] | **+1.2%** [−2.1, 4.6] | **Sí** (13.1; < 0.001) |
| **Robo de vehículo** | **−13.2%** [−17.6, −8.6] | +3.2% [−8.8, 16.8] | −7.9% [−11.8, −3.8] | **+1.8%** [−2.0, 5.8] | **Sí** (6.2; 0.004) |
| Violencia familiar | +2.3% [−3.9, 8.9] | −0.2% [−9.7, 10.3] | −1.4% [−5.1, 2.5] | **+5.8%** [2.4, 9.4] | No (0.41; 0.75) |
| Abuso sexual | **+21.7%** [12.9, 31.2] | −3.8% [−6.5, −1.1] | +0.3% [−2.7, 3.5] | **+15.7%** [13.1, 18.3] | No (2.6; 0.08) |

Tasas por 100 mil, 2019 → 2025: homicidio doloso, área metropolitana 28.6 → 13.4, Altos Norte 39.3 → 17.2, Altos Sur 8.9 → 2.1, resto 13.0 → 4.6. Robo con violencia, área metropolitana 492.5 → 172.3; resto 33.4 → 37.1.

| | Resultado |
|---|---|
| H14a. La baja del homicidio difiere entre regiones | ❌ F = 0.42, p = 0.74: la baja es pareja |
| H14b. El homicidio baja en al menos 3 de 4 regiones | ✅ 3 (Altos Norte: −11.7% [−23.2, 1.5], sin significancia por conteos chicos) |
| H14c. La violencia familiar no baja en ninguna región | ✅ en el resto del estado sube 5.8% anual |
| H14d. El abuso sexual sube en al menos 3 de 4 regiones | ❌ sube en 2: área metropolitana y resto; en Altos Norte baja, en Altos Sur no cambia |
| H14e. La baja del robo es sobre todo metropolitana | ✅ robo con violencia: el resto del estado cambia 1.21 [1.12–1.30] veces por año respecto del AMG; robo de vehículo, 1.17 [1.08–1.28] |

**Exploratorio (E14f), 2025 contra 2024:** el homicidio bajó en las cuatro regiones, aunque en Altos Sur sin significancia (0.53 [0.21–1.25]); esto ya se había visto en la pieza 12. Robo con violencia y robo de vehículo bajaron en las cuatro regiones (en Altos Sur, el robo de vehículo sin significancia), con la mayor caída en Altos Norte (0.49 y 0.54). Violencia familiar bajó en el área metropolitana (0.78 [0.75–0.80]) y no en el resto del estado (1.05 [1.00–1.10]).

**Lectura:**
- **La baja del homicidio sí es de todo el estado.** Las cuatro regiones bajan a un ritmo que no se distingue.
- **La baja del robo es metropolitana.** El robo con violencia cayó a un tercio en el área metropolitana y no cambió en el resto del estado; lo mismo el robo de vehículo, la serie más confiable (pieza 9). La frase "bajó la violencia callejera y patrimonial" (pieza 6) describe sobre todo al área metropolitana, donde ocurrieron 92% de los robos con violencia y 82% de los robos de vehículo de 2019–2025.
- **Fuera del área metropolitana crecen la violencia familiar y el abuso sexual denunciados.** El resto del estado es la única región donde la violencia familiar sube con significancia, y el abuso sexual sube 16% por año.

**Límites:** son denuncias; la cifra negra puede ser distinta entre regiones (la ENVIPE no permite desagregar por región). Los delitos con municipio no especificado (clave 14998) quedan fuera de toda región: 8% del abuso sexual en 2019 y 2.1% o menos en los demás delitos y años. Por eso, el abuso sexual se recalculó en 2020–2025 como sensibilidad, con el mismo resultado (área metropolitana +23.8%, resto +17.4%).

### Pieza 15 — ¿Dónde ocurren los homicidios, y cuántas mujeres asesinadas en su casa se cuentan como feminicidio?

**Datos:** INEGI defunciones, homicidios ocurridos en Jalisco en 2019–2023: `lugar_ocur` (dónde ocurrió la lesión), `sitio_ocur` (dónde ocurrió la muerte), `vio_fami`, `par_agre`, validados código por código contra el catálogo de cada ZIP. SESNSP víctimas de feminicidio y de homicidio doloso por sexo, 2019–2023.

**Dónde ocurrió la agresión** (entre homicidios con lugar conocido):

| Lugar | Hombres (6,549) | Mujeres (763) |
|---|---|---|
| Calle o carretera | 63.0% | 43.9% |
| **Vivienda particular** | 11.1% | **24.5%** |
| Otro | 21.6% | 26.0% |
| Granja, rancho o parcela | 2.8% | 3.1% |
| Área comercial o de servicios | 0.8% | 2.0% |

**En 30.5% de los homicidios el lugar es "se ignora"**; la tabla describe solo el resto.

| | Resultado |
|---|---|
| H15a. Las mujeres mueren en vivienda mucho más que los hombres (razón > 1.5) | ✅ 2.22 [1.92–2.56] |
| H15b. Las mujeres asesinadas en vivienda (INEGI) son más que las víctimas de feminicidio (SESNSP) | ❌ 187 contra 300: razón 0.62 [0.52–0.75]. Con "hogar" como sitio de la muerte, 0.57 [0.47–0.69] |
| H15c. El SESNSP clasifica como feminicidio menos de 1 de cada 4 asesinatos de mujeres | ❌ 24.0% [21.7–26.4]: la estimación está por debajo de 25%, pero el intervalo no lo descarta |

**Exploratorio:**
- **E15d.** Entre las 187 mujeres asesinadas en vivienda, el certificado casi nunca dice quién las mató: el parentesco con el agresor no está registrado en 178, y la violencia familiar solo se contestó en 7 de 156 (los 7 con "sí"). Estas variables no sirven para medir violencia de pareja en Jalisco.
- **E15e.** Serie anual: mujeres asesinadas en vivienda (INEGI) 44, 43, 40, 31, 29; víctimas de feminicidio (SESNSP) 67, 72, 79, 43, 39; mujeres víctimas de homicidio doloso (SESNSP) 218, 209, 196, 178, 150 (2019–2023).

**Lectura:**
- Una de cada cuatro mujeres asesinadas con lugar conocido murió en una vivienda, el doble de la proporción de los hombres. Aun así, la mayoría de las mujeres fueron asesinadas en la calle.
- La hipótesis de que el feminicidio se queda corto frente a los asesinatos de mujeres en casa **se refutó**: el SESNSP registra más víctimas de feminicidio (300) que mujeres asesinadas en vivienda según INEGI (187). Ni repartiendo proporcionalmente el 33% de mujeres con lugar ignorado (unas 278) se llega a 300. El feminicidio en Jalisco no es solo el asesinato en casa.
- Aun así, solo 24% de los asesinatos de mujeres que registra el SESNSP son feminicidio; el resto se clasifica como homicidio doloso. Con el intervalo, no se puede decir si está por encima o por debajo de 25%.

**Límites:** INEGI y SESNSP no se cruzan caso por caso. El lugar de la agresión se ignora en casi un tercio de los homicidios. El feminicidio es una clasificación jurídica, no un lugar.

### Pieza 16 — ¿Qué tan inseguro se siente Jalisco, y la percepción sigue la baja del homicidio registrado?

**Datos:** ENVIPE 2026 (percepción medida en marzo–abril de 2026), réplica con ENVIPE 2025 (marzo–abril de 2025). Módulo `AP4` de `tper_vic1`: seguridad en la colonia, el municipio y el estado (`AP4_3_1`–`AP4_3_3`), en 12 lugares (`AP4_4_xx`), incivilidades en la colonia (`AP4_5_01`–`AP4_5_17`, las comparables entre ediciones) y tendencia esperada (`AP4_7_2`). Personas de 18 años y más por entidad y municipio de residencia: 2,664 en Jalisco (1,754 en el área metropolitana y 910 en el resto del estado). Mismo estimador que las piezas 9 y 13; "no sabe / no responde" queda en el denominador. Las dos ediciones son muestras independientes, así que sus varianzas se suman.

**Cuántos se sienten inseguros** (ENVIPE 2026):

| Se siente inseguro en su… | Jalisco [IC95] | Nacional [IC95] | Diferencia [IC95] | Área metropolitana | Resto del estado |
|---|---|---|---|---|---|
| **Estado** | **78.9%** [77.0–80.7] | 74.0% [73.6–74.4] | **+4.9** [+3.2, +6.7] | 81.7% [79.4–83.8] | 73.9% [70.4–77.1] |
| Municipio | 59.8% [57.3–62.3] | 60.9% [60.3–61.4] | −1.0 [−3.5, +1.4] | 71.1% [68.5–73.6] | 39.4% [35.1–43.8] |
| Colonia o localidad | 35.0% [32.7–37.4] | 35.9% [35.4–36.5] | −1.0 [−3.2, +1.3] | **43.4%** [40.1–46.7] | **19.9%** [16.9–23.2] |

**¿Siguió la baja del homicidio?** Proporción que se siente insegura, ENVIPE 2025 → 2026:

| Nivel | Jalisco | Razón 2026/2025 [IC95] | Nacional, razón [IC95] | Cambio de Jalisco menos cambio nacional [IC95] |
|---|---|---|---|---|
| **Estado** | 77.4% → 78.9% | **1.02** [0.98–1.06] | 0.98 [0.97–0.99] | +3.1 puntos [+0.1, +6.1] |
| Municipio | 61.3% → 59.8% | 0.98 [0.92–1.04] | 0.94 [0.93–0.95] | +2.4 [−1.5, +6.2] |
| Colonia o localidad | 37.2% → 35.0% | 0.94 [0.86–1.04] | 0.89 [0.87–0.91] | +2.3 [−1.2, +5.8] |

El cambio de Jalisco y el nacional se tratan como independientes aunque Jalisco es parte del país. Eso agranda un poco el intervalo de la última columna, así que es conservador.

**Dónde** (Jalisco 2026, entre quienes el lugar les aplica): cajero automático en la vía pública 66.5% [63.8–69.0], carretera 58.2%, transporte público 55.8%, banco 52.5%, calle 52.2%, parque 43.8%, mercado 37.0%, centro comercial 35.1%, automóvil 33.1%, escuela 31.1% (178 personas), trabajo 22.5%, casa 11.3% [10.0–12.8]. En 10 de los 12 lugares Jalisco queda por debajo del país con significancia (la mayor diferencia, mercado: −10.2 [−12.6, −7.8]); en escuela y trabajo, sin significancia.

**Qué se ve en la colonia** (Jalisco 2026, sabe que ocurre; diferencia con el país [IC95]): consumo de alcohol en la calle 59.1% (−2.9 [−5.3, −0.5]), **consumo de droga 56.8%** (+6.1 [+3.7, +8.5]), **venta de droga 43.8%** (+8.2 [+5.8, +10.7]), robos o asaltos frecuentes 38.7% (+0.1 [−2.4, +2.6]), disparos frecuentes 25.6% (−4.0 [−6.3, −1.7]), homicidios 20.5% (−0.6 [−2.5, +1.4]), extorsiones o cobro de piso 19.9% (+1.6 [−0.2, +3.3]), secuestros 12.2% (+1.7 [+0.2, +3.2]). La venta y el consumo de droga por encima del país se repiten en ENVIPE 2025 (+6.5 y +6.6 puntos). En el área metropolitana se reportan mucho más disparos (32.6% [29.5–35.8] contra 12.9% [10.1–16.3] en el resto del estado), homicidios (26.3% contra 10.2%) y robos frecuentes (50.2% contra 17.8%).

| | Resultado |
|---|---|
| H16a. La mayoría se siente insegura en su estado | ✅ 78.9% [77.0–80.7] |
| H16b. Jalisco dentro de ±5 puntos del país en inseguridad en el estado | ❌ +4.9 [+3.2, +6.7]: el límite superior pasa de 5 por 1.7 puntos. En ENVIPE 2025, +1.8 [−0.3, +3.9] |
| H16c. Estado > municipio > colonia | ✅ +19.1 [16.8–21.4] y +24.8 [22.5–27.1] puntos |
| H16d. La percepción en el estado no sigue la baja del homicidio (razón 2026/2025 > 0.90) | ✅ 1.02 [0.98–1.06]: se descarta una baja de más de 2% |
| H16e. Más inseguridad en la colonia en el área metropolitana que en el resto del estado | ✅ +23.5 [18.8–28.2]; en ENVIPE 2025, +28.2 [23.6–32.9] |
| H16f. El cajero automático en la vía pública es el lugar más inseguro | ✅ 66.5%; le sigue la carretera (58.2%). Primero también en ENVIPE 2025 (69.8%) |

**Exploratorio (E16g; se añadió después de ver las dos ediciones).** De 2025 a 2026 bajó en Jalisco la proporción de adultos que sabe que en su colonia hay homicidios (26.1% → 20.5%; razón 0.79 [0.69–0.90]), secuestros (0.69 [0.58–0.81]), robos o asaltos frecuentes (0.85 [0.77–0.93]) y disparos frecuentes (0.85 [0.75–0.96]). En el país también bajaron las cuatro. De las 17 incivilidades comparables, 6 bajan con significancia en Jalisco y ninguna sube con significancia.

**Lectura:**
- Ocho de cada diez adultos de Jalisco se sienten inseguros en su estado, cinco puntos más que en el país. Pero en su municipio y su colonia no se distinguen del promedio nacional, y en 10 de 12 lugares concretos se sienten menos inseguros que el país. La inseguridad de Jalisco se percibe sobre todo "en el estado", lejos de donde uno vive.
- **La percepción no acompañó la baja del homicidio registrado.** Entre la ENVIPE 2025 y la 2026, el homicidio registrado cayó un tercio (pieza 12) y la proporción que se siente insegura en el estado no cambió (1.02 [0.98–1.06]). En el país bajó un poco (0.98), así que Jalisco quedó por arriba: +3.1 puntos respecto del cambio nacional [+0.1, +6.1]. Lo que sí bajó es lo que la gente ve en su colonia: menos personas saben de homicidios, secuestros o disparos cerca de casa (E16g, exploratorio).
- La inseguridad cercana es metropolitana: en el área metropolitana 43% se siente insegura en su colonia, contra 20% en el resto del estado. Esa diferencia coincide con dónde se concentra el robo (pieza 14).
- En las colonias de Jalisco se reporta más venta y consumo de droga que en el país, en las dos ediciones.

**Límites:** es percepción, no victimización. Las dos ediciones se levantaron en marzo–abril: comparan la primavera de 2025 con la de 2026, no años calendario. La ENVIPE se diseña para ser representativa por entidad y por área urbana de interés (Guadalajara), no por región: "resto del estado" es un dominio no planeado, con más varianza. Las cifras de percepción no se compararon con las que publica INEGI, porque esas publicaciones no están en la evidencia; la validación del estimador es la de la pieza 9, que usa el mismo diseño.

### Pieza 17 — ¿Las razones para no denunciar cambian según el delito?

**Datos:** ENVIPE 2026 (delitos de 2025), réplica con ENVIPE 2025. Razón principal de no denunciar (`BP1_23`) por tipo de delito (`BPCOD`), con las definiciones de la pieza 13. **Regla de tamaño, declarada antes de calcular:** solo se reportan tipos con al menos 100 delitos no denunciados en la muestra. En Jalisco pasan 5 tipos; quedan fuera amenazas (95), robo en casa (51) y los delitos sexuales (34 + 5). En el país pasan 12 de 14 (quedan fuera secuestro y violación).

**Jalisco, delitos de 2025:**

| Delito | No denunciados en muestra | Causas atribuibles a la autoridad [IC95] | Pérdida de tiempo [IC95] | Segunda razón |
|---|---|---|---|---|
| Robo de accesorios de vehículo | 161 | 76.4% [68.2–83.0] | 50.4% [41.0–59.8] | Desconfianza en la autoridad, 12.2% |
| Fraude al consumidor | 107 | 76.1% [65.0–84.6] | 53.3% [40.6–65.6] | No tenía pruebas, 10.7% |
| Robo o asalto en calle o transporte | 131 | 70.6% [61.8–78.1] | 37.2% [27.9–47.6] | Desconfianza en la autoridad, 11.9% |
| Fraude bancario | 126 | 65.9% [54.8–75.5] | 37.9% [27.8–49.2] | Otra, 18.7% |
| Extorsión | 100 | 61.8% [51.2–71.5] | 32.3% [21.2–45.9] | Desconfianza en la autoridad, 19.3% |

**Miedo al agresor, país** (delitos de 2025): otros delitos 16.3% [8.6–28.7], robo total de vehículo 16.0% [9.9–24.9], lesiones 13.0% [10.1–16.6], **delitos sexuales 12.4%** [10.0–15.4], amenazas 11.8% [10.0–14.0], robo en calle 7.4%, robo en casa 7.3%, **extorsión 4.9%** [4.0–5.9], fraude bancario 0.5%. En la extorsión, la segunda razón es "delito de poca importancia" (18.4% [15.9–21.1]).

| | Resultado |
|---|---|
| H17a. En Jalisco, "pérdida de tiempo" es la primera razón en cada tipo | ✅ en los 5 tipos, y también en los 5 de ENVIPE 2025 y en los 12 del país en las dos ediciones |
| H17b. En Jalisco, las causas atribuibles a la autoridad varían ≥15 puntos entre tipos | ❌ 14.6 puntos [2.1, 27.0] entre robo de accesorios y extorsión; refutada por 0.4 puntos. En ENVIPE 2025, 24.1 [11.9, 36.4] |
| H17c. En el país, el miedo al agresor pesa más en la extorsión que en el resto | ❌ pesa **menos**: −1.4 puntos [−2.5, −0.3]. En ENVIPE 2025, 0.0 [−1.2, +1.3] |
| H17d. En el país, el miedo al agresor pesa más en los delitos sexuales que en el resto | ✅ +6.9 puntos [4.2, 9.6]; en ENVIPE 2025, +5.4 [2.9, 8.0] |
| H17e. En el país, la primera razón en la extorsión es "delito de poca importancia" | ❌ es "pérdida de tiempo" (32.5% [27.9–37.4]); "poca importancia" es segunda (18.4%) |

**Lectura:**
- "Pérdida de tiempo" es la primera razón para no denunciar en todos los tipos de delito que se pueden medir, en Jalisco y en el país y en las dos ediciones. La primera razón no cambia con el delito.
- El peso de la autoridad sí cambia algo entre delitos: es mayor en el robo de accesorios de vehículo y en el fraude al consumidor (tres de cada cuatro) que en la extorsión (seis de cada diez). La diferencia no alcanzó los 15 puntos declarados en 2026 (14.6) y sí en 2025 (24.1).
- La extorsión que capta la encuesta no se deja de denunciar por miedo. En el país, el miedo al agresor pesa en ella menos que en el resto de los delitos. Una explicación posible, que aquí no se midió, es que la mayoría sean intentos a distancia; es compatible con que "delito de poca importancia" sea su segunda razón. El miedo al agresor sí pesa más en los delitos sexuales (+6.9 puntos sobre el resto), y también es alto en lesiones (13.0%) y amenazas (11.8%), aunque esas dos no se probaron.

**Límites:** en Jalisco no se pueden medir los delitos sexuales (39 no denunciados en muestra) ni las amenazas (95); para ellos solo hay cifra nacional. La razón es la principal que declara la víctima; no se capturan razones múltiples.

### Pieza 18 — ¿La proporción de asesinatos de mujeres que se registra como feminicidio cambia entre regiones?

**Datos:** carpetas de feminicidio del SESNSP por municipio, 2019–2023 (las víctimas del SESNSP por sexo solo existen a nivel estatal antes de 2026), contra mujeres víctimas de homicidio según INEGI, por municipio de ocurrencia, 2019–2023 (las de la pieza 15). Medida: carpetas de feminicidio por cada mujer asesinada. No es una proporción de casos, porque carpetas y certificados no se cruzan, pero permite comparar regiones. **Regla de tamaño, declarada antes de calcular:** las regiones con menos de 10 carpetas o menos de 30 mujeres asesinadas se marcan como conteo chico y no se interpretan por separado.

| Región | Carpetas de feminicidio | Mujeres asesinadas (INEGI) | Carpetas por mujer asesinada [IC95 exacto] | Mujeres asesinadas por 100 mil mujeres al año [IC95] |
|---|---|---|---|---|
| Área metropolitana | 215 | 803 | 0.27 [0.23–0.31] | 5.8 [5.4–6.3] |
| Resto del estado | 64 | 196 | 0.33 [0.24–0.44] | 3.4 [2.9–3.9] |
| Altos Norte (conteo chico) | 7 | 112 | 0.06 [0.03–0.13] | **10.2** [8.4–12.3] |
| Altos Sur (conteo chico) | 6 | 22 | 0.27 [0.09–0.69] | 2.0 [1.3–3.1] |
| **Jalisco** | 292 | 1,133 | 0.26 [0.23–0.29] | |

Ninguna carpeta de feminicidio de 2019–2023 tiene municipio no especificado; 2 mujeres asesinadas según INEGI no tienen municipio.

| | Resultado |
|---|---|
| H18a. Fuera del área metropolitana se registra como feminicidio una parte menor de los asesinatos de mujeres | ❌ 0.87 [0.64–1.17]: sin significancia. Sin los Altos, el resto del estado queda en 1.22 [0.87–1.69] |
| H18b. La medida difiere entre las cuatro regiones | ✅ χ² = 18.6, 3 gl, p = 0.0005 (prueba exacta por Monte Carlo) |

**Lectura:**
- Entre el área metropolitana y el resto del estado no hay diferencia significativa: en ambos se abre alrededor de una carpeta de feminicidio por cada tres o cuatro mujeres asesinadas.
- La diferencia entre regiones viene de los Altos, donde hay muy pocas carpetas (7 y 6) y por regla no se interpretan por separado. Aun así, el caso de Altos Norte merece revisión: tiene la tasa más alta de mujeres asesinadas del estado (10.2 por 100 mil al año, casi el doble que el área metropolitana) y solo 7 carpetas de feminicidio frente a 112 mujeres asesinadas en cinco años.

**Límites:** son carpetas, no víctimas (en el estado, 292 carpetas contra 300 víctimas de feminicidio en 2019–2023). El municipio del SESNSP y el de ocurrencia de INEGI no tienen por qué coincidir en cada caso. Con 7 carpetas, un solo cambio de clasificación mueve mucho la medida de Altos Norte.

---

## 6. Registro de hipótesis

| Pieza | Hipótesis | Resultado |
|---|---|---|
| 1 | H1a: la razón desaparición/homicidio varía más que el azar | ✅ |
| | H1b: ≥10 municipios con homicidio bajo y desaparición no baja, mayoría fuera del AMG | ✅ (42; 41 fuera) |
| | H1c: correlación de tasas entre 0.2 y 0.7 | ❌ ρ = 0.198 [0.02–0.36]: se refuta por 0.002; el dato no distingue 0.198 de 0.2 |
| | H1d: H1b y H1c se mantienen en la otra ventana | ❌ (H1b sí; H1c: ρ = 0.186 [0.01–0.35]) |
| 2 | H2a: pico masculino entre 20 y 39 años | ✅ (25–29) |
| | H2b: pico femenino en adolescentes | ❌ también 25–29 |
| | H2c: peor desenlace en hombres | ✅ |
| 3 | H3a: las denuncias bajan | ✅ −8.8%/año |
| | H3b: cada año aporta personas que siguen desaparecidas | ✅ |
| | H3c: ≥1/3 del acervo es anterior a 2019 | ✅ 38% |
| 5 | H5a: Gini > 0.20 | ❌ 0.159 [0.145–0.162]: repartida (IC con corrección de sesgo, §9) |
| | H5b: el 15% más afectado tiene ≥25% de casos | ❌ 21.5% |
| | H5c: ≥5 municipios creíblemente altos | ✅ 24 |
| 6 | H6a: ≥5 de 16 delitos no bajan | ✅ 7 |
| | H6b: violencia familiar no baja | ✅ |
| | H6c: narcomenudeo sube 2020–2025 | ✅ |
| 7 | H7a: mismo perfil de sexo y edad | ✅ |
| | H7b: pieza 1 robusta con INEGI (≥9 de 12) | ✅ 12 de 12 |
| | H7c: edad desconocida | exploratoria |
| | E7d: escala de la distancia de Jensen-Shannon frente a la población masculina | exploratoria |
| 8 | H8a: <60% identificadas | ✅ 52.9% |
| | H8b: fosas mucho más concentradas en el AMG que la desaparición | ✅ 95% vs 62% |
| | H8c: <25% de municipios fuera del AMG con desaparición alta tienen fosa | ✅ 4 de 22, pero sin comparación de base: en el resto fuera del AMG es 7 de 93 |
| 9 | H9a: cifra negra Jalisco >90% (límite inferior del IC) | ❌ 92.2% [89.8–94.1]; era ✅ con el intervalo anterior (§9) |
| | H9b: ≥20 puntos de diferencia entre delitos con ≥100 casos | ❌ 87–99% |
| | H9c: el método reproduce el 93.4% nacional | ✅ tras corregir alcance (§9) |
| 10 | H10a: la desaparición aumenta con la marginación | ❌ baja ligeramente |
| | H10b: el homicidio no aumenta con la marginación | ✅ |
| | H10c: la proporción desaparición/violencia letal aumenta con la marginación | ❌ 1.20 [0.99–1.45] con sobre-dispersión corregida; era ✅ (§9) |
| | H10d: se mantiene al controlar ruralidad | ❌ se invierte (0.71); la ruralidad, a su vez, solo separa al AMG del resto |
| 11 | H11a: delitos sexuales ≥80% mujeres | ✅ 90% |
| | H11b: ≥40% de víctimas de abuso sexual son menores | ✅ 90% |
| | H11c: violencia familiar ≥70% mujeres | ✅ 90.5% |
| | H11d: homicidio doloso ≥85% hombres | ✅ 91.6% |
| | H11e: tasa más alta de abuso sexual en mujeres de 13–17 | ✅ |
| | H11f: ≥3 delitos con >25% sin edad | ✅ |
| 12 | H12a: la caída de 2025 es general (≥10 de 12 meses, razón < 0.85) | ✅ 12 de 12; 0.66 [0.61–0.71] |
| | H12b: el culposo con arma compensa <10% de la caída | ✅ 0.4% |
| | H12c: las lesiones con arma de fuego también bajan | ❌ 0.92 [0.82–1.03] |
| | H12d: las muertes "se ignora" son ≥75% hombres | ✅ 78.1% [76.5–79.7] |
| | E12e: tendencia de homicidio + "se ignora" | exploratoria |
| | E12f: denuncias de desaparición por víctima de homicidio | exploratoria |
| | E12g: dónde ocurrió la caída | exploratoria |
| 13 | H13a: la mayoría no denuncia por causas atribuibles a la autoridad | ✅ 66.3% [61.9–70.4] |
| | H13b: "pérdida de tiempo" es la razón más frecuente | ✅ 38.7% |
| | H13c: Jalisco dentro de ±5 puntos del país en causas atribuibles a la autoridad | ❌ +5.5 [+1.2, +9.7]; en ENVIPE 2025, −1.9 |
| | H13d: menos confianza que en el país en ≥3 de 5 autoridades civiles locales | ❌ 0 de 5 |
| | H13e: Marina y Ejército superan a la policía preventiva municipal por >20 puntos | ✅ +35 y +32 |
| 14 | H14a: la baja del homicidio difiere entre regiones | ❌ p = 0.74 |
| | H14b: el homicidio baja en ≥3 de 4 regiones | ✅ 3 |
| | H14c: la violencia familiar no baja en ninguna región | ✅ |
| | H14d: el abuso sexual sube en ≥3 de 4 regiones | ❌ 2 |
| | H14e: la baja del robo con violencia y del robo de vehículo es sobre todo metropolitana | ✅ 1.21 y 1.17 |
| | E14f: cambio 2024→2025 por región | exploratoria |
| 15 | H15a: las mujeres mueren en vivienda más que los hombres (razón > 1.5) | ✅ 2.22 [1.92–2.56] |
| | H15b: mujeres asesinadas en vivienda (INEGI) > víctimas de feminicidio (SESNSP) | ❌ 0.62 [0.52–0.75] |
| | H15c: feminicidio < 25% de los asesinatos de mujeres (SESNSP) | ❌ 24.0% [21.7–26.4] |
| | E15d: violencia familiar y parentesco en mujeres asesinadas en vivienda | exploratoria |
| | E15e: serie anual vivienda contra feminicidio | exploratoria |
| 16 | H16a: la mayoría se siente insegura en su estado | ✅ 78.9% [77.0–80.7] |
| | H16b: Jalisco dentro de ±5 puntos del país en inseguridad en el estado | ❌ +4.9 [+3.2, +6.7]; en ENVIPE 2025, +1.8 |
| | H16c: estado > municipio > colonia | ✅ +19.1 y +24.8 puntos |
| | H16d: la percepción en el estado no sigue la baja del homicidio (razón 2026/2025 > 0.90) | ✅ 1.02 [0.98–1.06] |
| | H16e: más inseguridad en la colonia en el AMG que en el resto del estado | ✅ +23.5 [18.8–28.2] |
| | H16f: el cajero automático en la vía pública es el lugar más inseguro | ✅ 66.5% |
| | E16g: cambio 2025→2026 de las incivilidades en la colonia | exploratoria |
| 17 | H17a: "pérdida de tiempo" es la primera razón en cada tipo de delito (Jalisco) | ✅ 5 de 5 |
| | H17b: las causas atribuibles a la autoridad varían ≥15 puntos entre tipos (Jalisco) | ❌ 14.6 [2.1, 27.0]; en ENVIPE 2025, 24.1 |
| | H17c: el miedo al agresor pesa más en la extorsión que en el resto (país) | ❌ −1.4 [−2.5, −0.3]: pesa menos |
| | H17d: el miedo al agresor pesa más en los delitos sexuales que en el resto (país) | ✅ +6.9 [4.2, 9.6] |
| | H17e: la primera razón en la extorsión es "delito de poca importancia" (país) | ❌ es "pérdida de tiempo" |
| 18 | H18a: fuera del AMG se registra como feminicidio una parte menor de los asesinatos de mujeres | ❌ 0.87 [0.64–1.17] |
| | H18b: la medida difiere entre las cuatro regiones | ✅ p = 0.0005; la diferencia viene de los Altos (conteos chicos) |

**Total:** 73 hipótesis: 42 confirmadas, 22 refutadas, 9 exploratorias. Cinco refutaciones son por décimas y no dicen nada por sí mismas: H1c, H1d, H9a, H15c y H17b.

---

## 7. Tesis del sitio

> **En Jalisco, la violencia letal tiene dos caras: quienes son asesinados y quienes desaparecen son las mismas personas, pero no en los mismos lugares, y fuera del área metropolitana la desaparición pesa más y casi no se busca.** El homicidio bajó en todo el estado y el robo solo en el área metropolitana; la violencia familiar no bajó en ninguna región, y el abuso sexual, que recae sobre todo en niñas y adolescentes, subió dentro y fuera del área metropolitana. La caída reciente del homicidio registrado todavía no demuestra que haya menos muertes violentas. Todo lo que registran las cifras oficiales es una fracción de lo que ocurre.

Las cifras que sostienen cada frase están en §1 y §5 (la diferencia entre regiones, en la pieza 14).

---

## 8. Sesgos, límites y cómo leer las cifras

1. **El SESNSP mide denuncias, no delitos ocurridos.** Con 92% de cifra negra, una baja puede ser menos denuncia. El robo de vehículo (21% de cifra negra) es la tendencia más confiable.
2. **Cambio de metodología 2026 (RNID).** Solo se comparan categorías que el SESNSP declara comparables, con sus reagrupaciones: tentativas nuevas excluidas; pornografía infantil con trata; privación ilegal y retención de menores con "otros contra la libertad personal"; violación a la intimidad sexual con delitos sexuales; discriminación, suplantación, tortura y delitos contra la administración de justicia con sus categorías "otros".

   Tres cifras parecían noticia y eran artefactos: extorsión −100% (el subtipo cambió de nombre; real −44%), violación +109% (incluía la categoría nueva; real −5%) y la caída de abuso sexual en 2026.
3. **Municipio "no especificado".** Cédulas: 58. REPD: 86 "se ignora". SESNSP: clave 14998 hasta 2025 (27,785 delitos 2015–2024, 0 en 2025); en 2026 la clave es 14999 y suma 0 delitos en enero–agosto. Nunca entran en tasas municipales.
4. **REPD sin municipio por año.** La desaparición municipal es acumulada; compararla con homicidio de una ventana supone antigüedad similar de los casos entre regiones.
5. **REPD, brecha de 47.** El total estatal (16,250) supera la suma del mapa (16,203) en 47 personas (38 hombres, 9 mujeres) que no aparecen en ninguna clave del mapa. La fuente no lo explica y no se corrige.
6. **Cédulas ≠ total.** Solo 1 de cada 3 personas desaparecidas tiene cédula pública: 45% en Altos Norte, 36% en el área metropolitana, 25% en Altos Sur, 22% en el resto del estado. Las cédulas no sirven para comparar regiones ni para calcular localización por año (sesgo de publicación: casi no hay cédulas de localizados antes de 2020).
7. **Fosas = esfuerzo de búsqueda.** El registro refleja dónde procesa la Fiscalía; es preliminar y puede registrar un sitio sin contar sus víctimas (Rancho Izaguirre figura con 0).
8. **INEGI defunciones.** El año de registro no es el año de ocurrencia; el último año disponible está incompleto.
9. **Víctimas denunciadas.** La proporción de menores en delitos sexuales puede estar sobrerrepresentada porque su violencia se detecta más.
10. **Asociaciones ecológicas.** Las relaciones municipio a municipio (marginación, ruralidad) no se aplican a personas ni implican causa.
11. **Sin lectura causal entre fuentes.** SESNSP, REPD e INEGI se comparan en magnitud y patrón, nunca como causa y efecto.
12. **Desaparición no es muerte.** Las piezas 1, 5 y 10 leen la desaparición sin resolver como indicador de violencia letal. Es un supuesto: de las 22,017 personas localizadas, 85% aparecieron con vida. Para quienes siguen desaparecidas, la proporción sin vida es desconocida y probablemente mayor, sobre todo en hombres jóvenes con años sin aparecer.
13. **2025: homicidio registrado.** La caída de 2025 está en los registros del SESNSP, pero es más grande que la de las lesiones con arma de fuego y que la de las denuncias de desaparición (pieza 12). Hasta tener INEGI 2025, conviene decir "bajó el homicidio registrado".
14. **Lugar del homicidio.** En 30.5% de los homicidios INEGI 2019–2023 el lugar de la agresión es "se ignora", y el parentesco con el agresor y la violencia familiar casi nunca se registran (pieza 15).
15. **Confianza (ENVIPE).** Se pregunta sobre autoridades que la mayoría no identifica (30% identifica al MP y la fiscalía estatal) y según la entidad de residencia, no la de ocurrencia.
16. **Percepción (ENVIPE).** Mide lo que la gente siente y sabe de su colonia, no delitos. Se levanta en marzo–abril, así que dos ediciones comparan primaveras, no años calendario. La encuesta es representativa por entidad y por el área urbana de Guadalajara, no por región: el "resto del estado" es un dominio no planeado, con intervalos más anchos (pieza 16).
17. **Feminicidio por región.** Antes de 2026 el SESNSP solo publica víctimas por sexo a nivel estatal; por región se comparan carpetas de feminicidio con certificados de defunción de mujeres, dos unidades distintas. En los Altos hay menos de 10 carpetas por región en cinco años (pieza 18).

---

## 9. Errores detectados y corregidos

| Error | Cómo se detectó | Corrección |
|---|---|---|
| El modelo REPD llamaba "suma municipal" a 16,203, que incluye 86 "se ignora" | Revisión de claves del mapa | Separado: 16,117 municipales + 86 sin municipio |
| Código "no especificado" distinto por metodología (14998 vs 14999) | Importación SESNSP 2026 | Ambos tratados como bucket no municipal |
| Afirmación de que las series 2015–2025 y 2026 "no son comparables" | Lectura de la nota metodológica del SESNSP | Corregida: son comparables con reagrupaciones documentadas |
| Archivo SESNSP 2015–2025 en Latin-1 | Encabezado ilegible | Detección UTF-8 / Latin-1 en el importador |
| INEGI renombró columnas en 2022 (`presunto` → `tipo_defun`) y cambió el significado del código 4 (de "se ignora" a "muerte natural") | La verificación detuvo el proceso | El importador lee el catálogo de cada año y mapea por etiqueta |
| El ZIP de INEGI 2022 trae el catálogo viejo aunque sus datos ya usan la codificación nueva: 51,797 muertes naturales quedaban como "se ignora" y las 550 de intención no determinada, como naturales. El homicidio no se afectaba (códigos 1–3 iguales) | Revisión del 24-09-2026: 51,797 "se ignora" en 2022 contra 550–650 en otros años. Antes, §9 decía que el cambio de código era de 2024 | El código más frecuente debe ser "muerte natural" en el catálogo; si no, se usa la codificación vigente y ningún código puede quedar fuera del catálogo. Filas de homicidio, suicidio y accidente idénticas tras la corrección |
| Cifra negra nacional 93.75% vs 93.4% publicado | Validación H9c falló | Se identificó que INEGI excluye vandalismo; con esa exclusión reproduce 93.41% y 33.8 millones |
| Índice de marginación CONAPO 2020 invertido (mayor = menos marginado) | Tabulación índice vs grado | Se usa −z(IM) |
| Sonda de frescura REPD: `total_pages` cambia con el tamaño de página | Clasificó "cambió" sin cambios | La sonda usa el tamaño de página de la referencia |
| Ranking de homicidio 2025 ponía a Teocaltiche en primer lugar | Revisión por año con intervalos | Pico aislado; se usan ventanas multianuales y suavizado |
| Primera versión de la pieza 1 comparaba acumulado contra un año y confiaba en cédulas | Cobertura de cédulas por región | Rehecha con razón exacta, dos ventanas y dos fuentes |
| "Teuchitlán (Rancho Izaguirre) no aparece en el registro de fosas" | Revisión del 24-09-2026: listado de sitios con 0 víctimas | Sí aparece: La Estanzuela, Teuchitlán, 03/2025, 0 víctimas. La pieza 8 lista los sitios sin víctimas |
| Sitio de fosas con ID "oct-18" fuera de la verificación de IDs; periodo reportado desde dic 2018 | Revisión del 24-09-2026 | El ID viene así en el PDF. La verificación lo admite de forma explícita y detiene cualquier otro ID no numérico. Periodo: desde oct 2018 |
| Intervalos de cifra negra con límites superiores de hasta 101%, y tabla por tipo sin hostigamiento sexual (98.8%) ni lesiones | Revisión del 24-09-2026 | Intervalos en escala logit; tabla completa con casos en muestra. **H9a pasa de ✅ a ❌** (límite inferior 89.8%) |
| La proporción desaparición/(desaparición + homicidio) de la pieza 10 no corregía la sobre-dispersión (Pearson/gl ≈ 14) | Revisión del 24-09-2026: comparación con la heterogeneidad de la pieza 1 | Errores escalados (cuasi-binomial) y sensibilidad sin el AMG. **H10c pasa de ✅ a ❌.** "No es la pobreza, es lo rural" pasa a "la diferencia es metropolitana" |
| H8c ("donde más se desaparece, menos se busca") no tenía comparación de base | Revisión del 24-09-2026 | Comparación con los demás municipios fuera del AMG: 18% contra 7.5%. El hallazgo pasa a "fuera del AMG casi no hay búsqueda registrada" |
| Afirmaciones que los datos no sostienen: "la deuda crece", "nunca aparece", "baja la patrimonial" sin la subida de 2026 en robo de vehículo | Revisión del 24-09-2026 | Reescritas en §1, §5 y §7 |
| §8.3 decía que en 2026 el municipio no especificado usa la clave 14999, como si tuviera delitos | Contraste con la bitácora y con `mvj.data.sesnsp()` | La clave 14999 existe en 2026 pero suma 0 delitos en enero–agosto; 14998 suma 0 en 2025 |
| El IC95 del índice de concentración (pieza 5) era el percentil del bootstrap y no quedaba centrado: 0.159 en [0.155–0.172]. El remuestreo Poisson suma ruido y sesga el índice hacia arriba (89% de las réplicas quedaban por encima de la estimación) | Pendiente registrado en §10 | Intervalo básico del bootstrap, que corrige ese sesgo: desaparición 0.159 [0.145–0.162], homicidio 0.325 [0.313–0.331]. No se usó el BC de Efron porque, con ese sesgo, su límite inferior cae en el percentil 0.0005% y no es estable con 5,000 réplicas. **H5a no cambia (❌)**: la hipótesis pedía un límite inferior mayor a 0.20 |

---

## 10. Lo que no tenemos

| Dato | Estado |
|---|---|
| RNPDNO (Registro Nacional, CNB) | El tablero no expone descarga |
| IJCF: necropsias y personas fallecidas sin identificar | `datos.jalisco.gob.mx` no resuelve DNS |
| Data Cívica "Volver a desaparecer" | Sitio caído (522) |
| Plataforma Ciudadana de Fosas | En línea; falta revisar si ofrece descarga |
| Desaparición por municipio **y** año | El REPD no la publica |
| Víctimas por edad antes de 2026 para delitos sexuales y familiares | El SESNSP no las registraba |
| Delitos del fuero federal por municipio | No se publican a ese nivel (fuera de alcance) |
| Defunciones INEGI 2025 | INEGI aún no las publica; son la prueba independiente de la caída de 2025 (pieza 12) |
| Acervo de desaparecidas en distintas fechas | Solo hay una captura de la estadística REPD. Para saber si la deuda crece o baja hay que capturarla periódicamente (por ejemplo, cada mes) |

**Análisis pendiente, con datos que ya tenemos:**
- Unos 24 tipos de delito menores (despojo, falsificación, abuso de confianza, delitos de servidores públicos…) solo tienen perfil descriptivo.
- Tendencias por municipio: la pieza 14 llega a región; con municipios chicos haría falta un modelo jerárquico (Poisson con efectos aleatorios por municipio).
- Motivos de no denuncia de los delitos sexuales y las amenazas en Jalisco: no llegan a 100 casos no denunciados en una edición (pieza 17). Juntar ENVIPE 2025 y 2026 los acercaría al umbral (sexuales: 39 + 60).
- Feminicidio en los Altos: con 7 y 6 carpetas en 2019–2023, la pieza 18 no los puede interpretar por separado. Una ventana más larga (2015–2023) o el cruce con la clasificación de la Fiscalía ayudaría a revisar Altos Norte, que tiene la tasa más alta de mujeres asesinadas y 7 carpetas de feminicidio frente a 112 mujeres asesinadas.
- Percepción (pieza 16): las cifras no se han comparado con las que publica INEGI para Jalisco y el país; conviene descargar los tabulados y hacerlo, como se hizo con la cifra negra (H9c).
- INEGI: el parentesco con el agresor y la violencia familiar casi nunca se registran en los homicidios de mujeres (pieza 15), así que la violencia de pareja letal no se puede medir con estos datos.

Resueltos el 24-09-2026: intervalo con corrección de sesgo en la pieza 5; punto de comparación para la distancia de Jensen-Shannon (pieza 7); motivos para no denunciar y confianza en autoridades (pieza 13); tendencias por región (pieza 14); lugar de ocurrencia y feminicidio (pieza 15); percepción de seguridad (pieza 16); motivos de no denuncia por tipo de delito (pieza 17); feminicidio contra asesinatos de mujeres por región (pieza 18).

---

## 11. Reproducibilidad y archivos

**Recalcular todo** (alrededor de un minuto: las piezas 16 y 17 toman unos 21 segundos cada una y la 13, unos 12; las tres usan la linealización de la ENVIPE):

```
cd analysis
uv sync
uv run python run.py            # todas las piezas
uv run python run.py p1 p7      # solo algunas
```

La pieza 8 lee `analysis/output/p5.json`: si cambia la pieza 5, hay que correr la 8 después.

**Reconvertir insumos** (solo si cambian los originales):

```
uv run python -m ingest.fosas /…/s3-fosas-*/tabla-publica-agosto-2026.pdf
uv run python -m ingest.defunciones /…/s3-inegi-defunciones-*
uv run python -m ingest.extra
```

| Ruta | Contenido |
|---|---|
| `ANALISIS.md` | Este documento |
| `reports/analisis-datos-jalisco.md` | Bitácora detallada del análisis, pieza por pieza |
| `reports/inventario-datos.md` | Inventario vivo de fuentes y su nivel de análisis |
| `reports/stage-2-*.md` | Reportes de adquisición y validación de la Etapa 2 |
| `analysis/mvj/data.py` | Cargadores con verificación de totales y registro de SHA-256 |
| `analysis/mvj/stats.py` | Intervalos de Poisson, suavizado bayesiano empírico, Lorenz/Gini con bootstrap |
| `analysis/pieces/p*.py` | Una pieza por pregunta, con hipótesis declaradas en el encabezado |
| `analysis/ingest/*.py` | Conversión y validación de fosas, defunciones INEGI y descargas manuales |
| `analysis/output/p*.json` | Resultados agregados con procedencia de insumos |
| `sources/*.md` | Contratos de fuente (REPD, SESNSP, INEGI, CONAPO) |
