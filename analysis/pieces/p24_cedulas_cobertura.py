"""Pieza 24 — ¿A quién representan las cédulas públicas de búsqueda?

Datos. Cédulas públicas del REPD (captura del 23-09-2026; solo sexo, edad al desaparecer, fecha y estatus; ningún dato
identificable sale del cargador) con estatus "persona desaparecida" y fecha de desaparición hasta el 31-08-2026, contra
la estadística oficial del REPD de personas que siguen desaparecidas por año, sexo y rango de edad (corte 31-08-2026,
16,250). Cobertura = cédulas de personas desaparecidas / personas desaparecidas según la estadística. No es una
proporción estricta: las dos fuentes no se cruzan persona por persona, y una cédula puede no estar actualizada.

Transparencia. Ya se conocen: la cobertura global (1 de cada 3) y por región (§8.6), que 94% de las cédulas son de
desapariciones desde 2019, que 38% de las personas desaparecidas lo están desde 2018 o antes, el total de cédulas por
sexo (8,002 hombres y 2,232 mujeres, contando localizadas) y la distribución de edad de las mujeres en las cédulas
(pieza 2: el pico adolescente venía de las cédulas). No se ha calculado la cobertura por sexo, por edad ni por año.
La comparación antes y después de 2019 se deduce de cifras ya vistas y va como exploratoria.

Hipótesis (declaradas el 25-09-2026 antes de calcular):
  H24a. Las mujeres desaparecidas tienen más cédula pública que los hombres: razón de coberturas mujeres / hombres con
        IC95 exacto condicional (Fisher, como H18a) inferior > 1. Refutación: IC95 inferior <= 1.
  H24b. Los menores de 15 años tienen más cédula pública que las personas de 20 años o más: razón de coberturas con IC95
        inferior > 1 (el grupo de 15-19 años se reporta aparte porque cruza los 18). Refutación: IC95 inferior <= 1.
  H24c. La cobertura no es pareja entre los años de desaparición 2019-2025: prueba de dispersión (chi-cuadrada de las
        cédulas por año contra lo esperado con la cobertura común, gl = 6) con p < 0.01. Refutación: p >= 0.01.
Exploratorio:
  E24d. Cobertura de "2018 y anteriores" contra 2019-2026, y cobertura por año, sexo y grupo de edad.
Edad desconocida (edad -1 en cédulas; "rango de edad desconocido" en la estadística) queda fuera de H24b y se reporta.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from mvj import data as D
from pieces.p18_feminicidio_region import _or

CORTE = pd.Timestamp("2026-08-31")
MENORES = ["0-4", "5-9", "10-14"]


def _grupo_repd(a: str) -> str:
    if a in MENORES:
        return "0-14"
    if a == "15-19":
        return "15-19"
    if a == "rango de edad desconocido":
        return "desconocida"
    return "20+"


def _grupo_ced(e: int) -> str:
    return "desconocida" if e < 0 else "0-14" if e < 15 else "15-19" if e < 20 else "20+"


def run() -> dict:
    rep = pd.concat([D.repd_year_age("HOMBRE"), D.repd_year_age("MUJER")])
    D.check(rep.n.sum() == 16_250, f"REPD por año, sexo y edad = 16,250 ({rep.n.sum():,})")
    rep["grupo"] = rep.age.map(_grupo_repd)
    c = D.cedulas()
    fuera = int(((c.estatus == "PERSONA DESAPARECIDA") & (c.fecha > CORTE)).sum())
    c = c[(c.estatus == "PERSONA DESAPARECIDA") & (c.fecha <= CORTE)].copy()
    c["year"] = np.where(c.fecha.dt.year <= 2018, "2018 y anteriores", c.fecha.dt.year.astype(str))
    c["grupo"] = c.edad.map(_grupo_ced)

    def cov(mask_c, mask_r) -> dict:
        k, n = int(mask_c.sum()), int(rep.loc[mask_r, "n"].sum())
        return {"cedulas": k, "desaparecidas": n, "cobertura": round(k / n, 3) if n else None}

    sexo = {s: cov(c.sexo == s, rep.sexo == s) for s in ("MUJER", "HOMBRE")}
    h24a = _or(sexo["MUJER"]["cedulas"], sexo["MUJER"]["desaparecidas"], sexo["HOMBRE"]["cedulas"], sexo["HOMBRE"]["desaparecidas"])
    edad = {g: cov(c.grupo == g, rep.grupo == g) for g in ("0-14", "15-19", "20+", "desconocida")}
    h24b = _or(edad["0-14"]["cedulas"], edad["0-14"]["desaparecidas"], edad["20+"]["cedulas"], edad["20+"]["desaparecidas"])

    years = [str(y) for y in range(2019, 2026)]
    anual = {y: cov(c.year == y, rep.year == y) for y in ["2018 y anteriores"] + years + ["2026"]}
    k = np.array([anual[y]["cedulas"] for y in years], float)
    n = np.array([anual[y]["desaparecidas"] for y in years], float)
    e = n * k.sum() / n.sum()
    chi2 = float(((k - e) ** 2 / e).sum())
    p = float(stats.chi2.sf(chi2, len(years) - 1))

    antes = anual["2018 y anteriores"]
    desde = cov(c.year != "2018 y anteriores", rep.year != "2018 y anteriores")
    e24d = {"2018_y_anteriores_vs_2019_2026": _or(antes["cedulas"], antes["desaparecidas"], desde["cedulas"], desde["desaparecidas"]),
            "desde_2019": desde,
            "sexo_por_grupo_de_edad": {f"{s}_{g}": cov((c.sexo == s) & (c.grupo == g), (rep.sexo == s) & (rep.grupo == g))
                                       for s in ("MUJER", "HOMBRE") for g in ("0-14", "15-19", "20+")}}

    return {
        "pregunta": "¿A quién representan las cédulas públicas de búsqueda?",
        "total": cov(c.sexo.notna(), rep.n > -1),
        "cedulas_desaparecidas_posteriores_al_corte": fuera,
        "H24a_sexo": {**sexo, "razon_mujeres_hombres": h24a},
        "H24b_edad": {**edad, "razon_0_14_vs_20_y_mas": h24b},
        "H24c_por_año": {"cobertura": anual, "chi2": round(chi2, 1), "gl": len(years) - 1, "p": p},
        "E24d": e24d,
        "hipotesis": {"H24a": h24a[1] > 1, "H24b": h24b[1] > 1, "H24c": p < 0.01, "E24d": "exploratoria"},
    }
