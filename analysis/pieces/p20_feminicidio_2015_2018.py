"""Pieza 20 — ¿Lo que se vio en los Altos en 2019-2023 se repite en 2015-2018? Feminicidio frente a asesinatos de mujeres.

Datos: INEGI defunciones, mujeres víctimas de homicidio ocurridas en Jalisco por municipio de ocurrencia (misma
selección que las piezas 15 y 18). Para ocurrencias 2015-2018 se suman los años de registro 2015-2017 (carpeta
s3-inegi-defunciones-2015-2017-*, extraídos con ingest.defunciones) y 2018-2024 (la extracción de siempre). SESNSP
carpetas de feminicidio 2015-2018 por municipio. Regiones y medida (carpetas de feminicidio por mujer asesinada), las de
la pieza 18.

Transparencia. Se conocen los resultados de la pieza 18 (2019-2023): Altos Norte 7 carpetas contra 112 mujeres
asesinadas (0.06 [0.03-0.13]), Altos Sur 6 contra 22, área metropolitana 0.27, resto del estado 0.33, Jalisco 0.26
[0.23-0.29] (292 contra 1,133). No se había visto ningún conteo de 2015-2018: ni carpetas de feminicidio por municipio
o región, ni homicidios de mujeres de INEGI. Antes de escribir estas hipótesis solo se revisó la estructura de los ZIP
2015-2017 (columnas y catálogo de presunto, con los mismos códigos 1-3 que los años posteriores).

Hipótesis (declaradas el 25-09-2026 antes de importar los datos de 2015-2017 y de calcular nada de 2015-2018):
  H20a. Réplica fuera de muestra de lo visto en Altos Norte: en 2015-2018, la medida en Altos Norte es menor que en el
        resto de Jalisco sin los Altos (área metropolitana + resto del estado): razón (Altos Norte ÷ resto sin Altos)
        con IC95 exacto condicional (Fisher, como H18a) superior < 1. Refutación: IC95 superior >= 1.
  H20b. Antes se registraba como feminicidio una parte menor de los asesinatos de mujeres: la medida estatal de
        2015-2018 es menor que la de 2019-2023 (razón 2015-2018 ÷ 2019-2023, IC95 exacto condicional superior < 1).
        Refutación: IC95 superior >= 1.
La regla de tamaño de la pieza 18 (menos de 10 carpetas o 30 mujeres = conteo chico) se reporta, pero no impide las
pruebas: las dos usan intervalos exactos.

Exploratorio (incluye los datos de 2019-2023, ya vistos):
  E20c. Tabla por región con la ventana 2015-2023 completa y serie anual estatal 2015-2023.
Descripción: tasas por 100 mil mujeres (CONAPO) por región en 2015-2018; carpetas y homicidios de mujeres sin municipio.
"""
from __future__ import annotations

import pandas as pd

from mvj import data as D
from mvj.stats import poisson_ci
from pieces.p12_caida_homicidio import rate_ratio
from pieces.p18_feminicidio_region import AMG, REGIONES, _or

NEW, OLD, ALL = (2015, 2018), (2019, 2023), (2015, 2023)
ALTOS = ["Altos Norte", "Altos Sur"]


def _counts(fem: pd.DataFrame, w: pd.DataFrame, mun: pd.DataFrame, years) -> tuple[pd.Series, pd.Series, int, int]:
    f = fem[fem.year.between(*years)]
    fr = f.cvegeo.map(mun.region)
    ww = w[w.anio_ocur.between(*years)]
    wr = ww.cvegeo.map(mun.region)
    F = f.assign(region=fr).dropna(subset=["region"]).groupby("region").n.sum().reindex(REGIONES, fill_value=0)
    W = ww.assign(region=wr).dropna(subset=["region"]).groupby("region").size().reindex(REGIONES, fill_value=0)
    return F, W, int(f.loc[fr.isna(), "n"].sum()), int(wr.isna().sum())


def _table(F, W, P) -> dict:
    out = {}
    for r in REGIONES:
        f, w = int(F[r]), int(W[r])
        out[r] = {"carpetas_feminicidio": f, "mujeres_asesinadas_inegi": w,
                  "feminicidio_por_mujer_asesinada": rate_ratio(f, w, 1, 1) if w else None,
                  "conteo_chico": f < 10 or w < 30,
                  "tasa_mujeres_asesinadas_100mil_año": [round(float(x) * 1e5 / float(P[r]), 2) for x in (w, *poisson_ci(w))]}
    return out


def run() -> dict:
    mun = D.municipios().set_index("cvegeo")
    s = D.sesnsp()
    fem = s[(s.tipo == "Feminicidio") & (s.subtipo == "Feminicidio")]
    new, old = D.defunciones_2015_2017(), D.defunciones()
    D.check(not set(new.anio_regis) & set(old.anio_regis), "defunciones: las dos extracciones comparten años de registro")
    d = pd.concat([old, new], ignore_index=True)
    w = d[(d.tipo == "homicidio") & (d.sexo == "2")]
    pop = D.conapo()
    pop = pop[pop.sexo == "MUJER"].assign(region=lambda x: x.cvegeo.map(mun.region))

    res = {}
    for key, yrs in (("2015_2018", NEW), ("2019_2023", OLD), ("2015_2023", ALL)):
        F, W, fs, ws = _counts(fem, w, mun, yrs)
        P = pop[pop.year.between(*yrs)].groupby("region")["pop"].sum().reindex(REGIONES)
        res[key] = {"F": F, "W": W, "tabla": _table(F, W, P), "carpetas_sin_municipio": fs, "mujeres_sin_municipio": ws,
                    "estatal": [int(F.sum()), int(W.sum()), rate_ratio(int(F.sum()), int(W.sum()), 1, 1)]}
    n = res["2015_2018"]
    F, W = n["F"], n["W"]
    rest = [r for r in REGIONES if r not in ALTOS]
    h20a = _or(int(F["Altos Norte"]), int(W["Altos Norte"]), int(F[rest].sum()), int(W[rest].sum()))
    o = res["2019_2023"]
    h20b = _or(int(F.sum()), int(W.sum()), int(o["F"].sum()), int(o["W"].sum()))

    serie = {}
    for y in range(ALL[0], ALL[1] + 1):
        Fy, Wy, _, _ = _counts(fem, w, mun, (y, y))
        serie[y] = {"carpetas": int(Fy.sum()), "mujeres_asesinadas": int(Wy.sum()),
                    "razon": rate_ratio(int(Fy.sum()), int(Wy.sum()), 1, 1) if Wy.sum() else None}
    # Registro tardío: ocurrencias 2015-2017 que se registraron en 2018 o después (vienen de la extracción de siempre).
    tard = w[w.anio_ocur.between(2015, 2017)]
    return {
        "pregunta": "¿Lo que se vio en los Altos en 2019-2023 se repite en 2015-2018?",
        "periodos": {"confirmatorio": list(NEW), "pieza_18": list(OLD), "exploratorio": list(ALL)},
        "resultados": {k: {kk: vv for kk, vv in v.items() if kk not in ("F", "W")} for k, v in res.items()},
        "H20a_altos_norte_vs_resto_sin_altos_2015_2018": {"altos_norte": [int(F["Altos Norte"]), int(W["Altos Norte"])],
                                                          "resto_sin_altos": [int(F[rest].sum()), int(W[rest].sum())], "razon": h20a},
        "H20b_estatal_2015_2018_vs_2019_2023": {"razon": h20b},
        "E20c_serie_anual_estatal": serie,
        "registro_tardio_2015_2017": {"mujeres_asesinadas_ocurridas_2015_2017": int(len(tard)),
                                      "registradas_2018_o_despues": int((tard.anio_regis >= 2018).sum())},
        "hipotesis": {"H20a": h20a[2] < 1, "H20b": h20b[2] < 1, "E20c": "exploratoria"},
    }
