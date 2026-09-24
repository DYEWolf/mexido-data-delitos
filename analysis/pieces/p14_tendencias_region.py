"""Pieza 14 — ¿La baja de la violencia es igual en todo Jalisco? Tendencias 2019-2025 por región.

Regiones: área metropolitana de Guadalajara (10 municipios), Altos Norte, Altos Sur y resto del estado (mismas listas
que las piezas 1, 5 y 12). Delitos: homicidio doloso y cuatro categorías comparables de la pieza 6: robo con violencia,
robo de vehículo, violencia familiar y abuso sexual.

Transparencia. Antes de escribir esta pieza ya se había visto el cambio 2024→2025 del homicidio doloso por región y
municipio (E12g). Las tendencias 2019-2025 por región no se habían calculado para ningún delito.

Hipótesis (declaradas el 24-09-2026 antes de calcular):
  H14a. La baja del homicidio doloso 2019-2025 no es igual en todo el estado: en un modelo de Poisson con región,
        año e interacción región × año (offset de población, escala de Pearson), la prueba F conjunta de las 3
        interacciones da p < 0.05. Refutación: p >= 0.05.
  H14b. Aun así, el homicidio doloso baja en al menos 3 de las 4 regiones (IC95 superior de la tendencia < 0).
        Refutación: 2 o menos.
  H14c. Violencia familiar no baja en ninguna región (IC95 superior >= 0 en las 4), como en el estado (H6b).
        Refutación: baja en al menos una región.
  H14d. Abuso sexual sube en al menos 3 de las 4 regiones (IC95 inferior > 0), como en el estado.
        Refutación: 2 o menos.
  H14e. La baja del robo es sobre todo metropolitana: para robo con violencia y para robo de vehículo, el factor de
        cambio anual del resto del estado dividido entre el del AMG tiene IC95 inferior > 1 (el AMG baja más rápido).
        Refutación: cualquiera de los dos no lo cumple.

Exploratorio:
  E14f. Cambio 2024→2025 por región para los cinco delitos (razón de tasas, IC exacto condicional). Para homicidio ya
        se había visto (pieza 12); para los otros cuatro no, pero no tiene hipótesis previa.

Método. Tendencia por región: Poisson log-lineal con offset log(población CONAPO de la región), escala de Pearson,
2019-2025 (igual que la pieza 6). Delitos con municipio "no especificado" (clave 14998) quedan fuera de toda región;
se reporta su proporción por año y delito. Si pasa de 5% en algún año, la tendencia 2020-2025 se reporta como
sensibilidad.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

from mvj import data as D
from pieces.p6_tendencias import CATS, trend
from pieces.p12_caida_homicidio import rate_ratio

DELITOS = ["Homicidio doloso", "Robo con violencia", "Robo de vehículo", "Violencia familiar", "Abuso sexual"]
REGIONES = ["Área metropolitana de Guadalajara", "Altos Norte", "Altos Sur", "Resto del estado"]
YEARS = list(range(2019, 2026))


def interaction(panel: pd.DataFrame):
    """Poisson GLM region × year with population offset and Pearson scale. Returns F test and slope ratios vs AMG."""
    df = panel.assign(t=panel.year - 2019)
    fit = smf.glm("n ~ C(region, Treatment(reference='Área metropolitana de Guadalajara')) * t", data=df,
                  family=sm.families.Poisson(), offset=np.log(df["pop"])).fit(scale="X2")
    names = [c for c in fit.params.index if ":t" in c]
    R = np.zeros((len(names), len(fit.params)))
    for i, c in enumerate(names):
        R[i, list(fit.params.index).index(c)] = 1
    w = fit.wald_test(R, use_f=True, scalar=True)
    ci = fit.conf_int()
    ratios = {c.split("T.")[1].split("]")[0]: [round(float(np.exp(v)), 3) for v in (fit.params[c], *ci.loc[c])] for c in names}
    return {"F": round(float(w.statistic), 2), "gl": [int(w.df_num), int(w.df_denom)], "p": float(w.pvalue),
            "escala_pearson": round(float(fit.scale), 2), "factor_anual_vs_AMG": ratios}


def run() -> dict:
    s = D.sesnsp()
    mun = D.municipios().set_index("cvegeo")
    pop = D.conapo()
    pop = pop.assign(region=pop.cvegeo.map(mun.region)).groupby(["region", "year"]).pop.sum()
    s = s[s.year.between(2019, 2025)]
    s = s.assign(region=s.cvegeo.map(mun.region))
    out = {"pregunta": "¿La baja de la violencia es igual en todo Jalisco?", "delitos": {}}
    for name in DELITOS:
        sel = s[CATS[name](s)]
        tot = sel.groupby("year").n.sum().reindex(YEARS, fill_value=0)
        unk = sel[sel.region.isna()].groupby("year").n.sum().reindex(YEARS, fill_value=0)
        pct_unk = (unk / tot.replace(0, np.nan) * 100).round(2)
        counts = sel.dropna(subset=["region"]).groupby(["region", "year"]).n.sum()
        panel = pd.DataFrame({"n": counts, "pop": pop}).loc[[(r, y) for r in REGIONES for y in YEARS]].fillna({"n": 0}).reset_index()
        regs = {}
        for r in REGIONES:
            g = panel[panel.region == r].set_index("year")
            regs[r] = {"n_2019": int(g.n[2019]), "n_2025": int(g.n[2025]),
                       "tasa_2019": round(g.n[2019] / g["pop"][2019] * 1e5, 1), "tasa_2025": round(g.n[2025] / g["pop"][2025] * 1e5, 1),
                       "tendencia_2019_2025_pct_anual": trend(g.n, g["pop"], YEARS),
                       "E14f_razon_2025_vs_2024": rate_ratio(int(g.n[2025]), int(g.n[2024]), g["pop"][2025], g["pop"][2024])}
            if pct_unk.max() > 5:
                regs[r]["sensibilidad_2020_2025_pct_anual"] = trend(g.n, g["pop"], YEARS[1:])
        out["delitos"][name] = {"por_region": regs, "interaccion_region_año": interaction(panel),
                                "pct_municipio_no_especificado_por_año": {int(k): float(v) for k, v in pct_unk.items()}}
    d = out["delitos"]
    hom = d["Homicidio doloso"]
    tr = lambda name, r: d[name]["por_region"][r]["tendencia_2019_2025_pct_anual"]
    out["hipotesis"] = {
        "H14a": hom["interaccion_region_año"]["p"] < 0.05,
        "H14b": sum(tr("Homicidio doloso", r)[2] < 0 for r in REGIONES) >= 3,
        "H14c": all(tr("Violencia familiar", r)[2] >= 0 for r in REGIONES),
        "H14d": sum(tr("Abuso sexual", r)[1] > 0 for r in REGIONES) >= 3,
        "H14e": all(d[n]["interaccion_region_año"]["factor_anual_vs_AMG"]["Resto del estado"][1] > 1
                    for n in ("Robo con violencia", "Robo de vehículo")),
        "E14f": "exploratoria",
    }
    return out
