"""Pieza 6 — ¿Bajó la violencia en Jalisco, o solo el homicidio?

Hipótesis (declaradas antes de calcular):
  H6a. La baja no es general: de las 16 categorías comparables, al menos 5 NO tienen tendencia a la baja
       2019-2025 (IC95 de la tendencia toca o supera 0), medida como tasa por 100 mil habitantes.
  H6b. Violencia familiar no baja en 2019-2025 (IC95 de la tendencia incluye 0 o es positivo).
  H6c. Narcomenudeo sube en 2020-2025 (IC95 > 0); se interpreta como actividad policial, no como consumo.
Refutación: si 12 o más categorías bajan con IC95 < 0, la baja sí es general.

Método. Categorías definidas para que sean comparables entre metodologías según la nota del SESNSP (tentativas nuevas
de 2026 excluidas). Tendencia: regresión de Poisson log-lineal con offset log(población CONAPO) y escala de
Pearson (sobre-dispersión), 2019-2025. Cambio ene-ago 2026 vs ene-ago 2025: razón de tasas con IC exacto condicional
(Clopper-Pearson sobre n26/(n25+n26)), población de cada año.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D

CATS = {
    "Homicidio doloso": lambda d: d.subtipo == "Homicidio doloso",
    "Feminicidio": lambda d: d.subtipo == "Feminicidio",
    "Secuestro": lambda d: d.tipo == "Secuestro",
    "Extorsión": lambda d: (d.tipo == "Extorsión") & ~d.subtipo.str.startswith("Tentativa"),
    "Robo con violencia": lambda d: (d.tipo == "Robo") & d.modalidad.str.endswith("Con violencia"),
    "Robo sin violencia": lambda d: (d.tipo == "Robo") & d.modalidad.str.endswith("Sin violencia"),
    "Robo de vehículo": lambda d: d.subtipo.str.startswith("Robo de vehículo"),
    "Robo a casa habitación": lambda d: d.subtipo == "Robo a casa habitación",
    "Robo a negocio": lambda d: d.subtipo == "Robo a negocio",
    "Lesiones dolosas": lambda d: d.subtipo == "Lesiones dolosas",
    "Violencia familiar": lambda d: d.tipo == "Violencia familiar",
    "Violación": lambda d: d.subtipo.isin(["Violación simple", "Violación equiparada"]),
    "Abuso sexual": lambda d: d.tipo == "Abuso sexual",
    "Narcomenudeo": lambda d: d.tipo == "Narcomenudeo",
    "Fraude": lambda d: d.tipo == "Fraude",
    "Amenazas": lambda d: d.tipo == "Amenazas",
}


def trend(counts: pd.Series, pop: pd.Series, years):
    y = counts.loc[years].values; off = np.log(pop.loc[years].values)
    X = sm.add_constant(np.arange(len(years)))
    fit = sm.GLM(y, X, family=sm.families.Poisson(), offset=off).fit(scale="X2")
    b, (lo, hi) = fit.params[1], fit.conf_int()[1]
    return [round((np.exp(v) - 1) * 100, 1) for v in (b, lo, hi)]


def run() -> dict:
    s = D.sesnsp()
    pop = D.conapo().groupby("year").pop.sum()
    rows = []
    for name, f in CATS.items():
        sel = s[f(s)]
        annual = sel[sel.year <= 2025].groupby("year").n.sum().reindex(range(2015, 2026), fill_value=0)
        rate = (annual / pop.loc[2015:2025] * 1e5).round(1)
        t = trend(annual, pop, list(range(2019, 2026)))
        t_n = trend(annual, pop, list(range(2020, 2026))) if name == "Narcomenudeo" else None
        n25 = int(sel[(sel.year == 2025) & (sel.mes <= 8)].n.sum()); n26 = int(sel[(sel.year == 2026)].n.sum())
        lo, hi = proportion_confint(n26, max(n25 + n26, 1), method="beta")
        k = pop[2025] / pop[2026]
        rr = (n26 / n25 * k) if n25 else np.nan
        rr_ci = [lo / (1 - lo) * k, hi / (1 - hi) * k] if n25 else [np.nan, np.nan]
        cls = "baja" if t[2] < 0 else "sube" if t[1] > 0 else "sin tendencia clara"
        rows.append({"delito": name, "tasa_2015": rate[2015], "tasa_2019": rate[2019], "tasa_2025": rate[2025],
                     "maximo": [int(rate.idxmax()), float(rate.max())], "n_2025": int(annual[2025]),
                     "tendencia_2019_2025_pct_anual": t, "clase": cls,
                     "ene_ago_2025": n25, "ene_ago_2026": n26,
                     "razon_tasas_2026_vs_2025": [round(rr, 3), round(rr_ci[0], 3), round(rr_ci[1], 3)],
                     **({"tendencia_2020_2025_pct_anual": t_n} if t_n else {}),
                     "serie_tasa": {int(k2): float(v) for k2, v in rate.items()}})
    df = pd.DataFrame(rows)
    not_down = (df.clase != "baja").sum()
    vf = df[df.delito == "Violencia familiar"].iloc[0]
    nm = df[df.delito == "Narcomenudeo"].iloc[0]
    return {
        "pregunta": "¿Bajó la violencia en Jalisco, o solo el homicidio?",
        "unidad": "tasa por 100 mil habitantes (CONAPO), delitos denunciados SESNSP",
        "delitos": rows,
        "resumen": df.groupby("clase").delito.apply(list).to_dict(),
        "hipotesis": {"H6a": bool(not_down >= 5), "H6b": bool(vf.tendencia_2019_2025_pct_anual[2] >= 0),
                      "H6c": bool(nm.tendencia_2020_2025_pct_anual[1] > 0)},
    }
