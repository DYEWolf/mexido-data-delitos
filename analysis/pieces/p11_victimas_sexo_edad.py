"""Pieza 11 — ¿Sobre quién recae cada delito? Víctimas por sexo y edad, Jalisco enero-agosto 2026.

Hipótesis (declaradas antes de calcular):
  H11a. Delitos sexuales (abuso sexual, violación, violación a la intimidad sexual, otros contra la libertad y seguridad
        sexual): las mujeres son >= 80% de las víctimas con sexo identificado (IC95 inferior >= 80%).
  H11b. Menores de edad (0-17) son >= 40% de las víctimas de abuso sexual con edad especificada.
  H11c. Violencia familiar: las mujeres son >= 70% de las víctimas con sexo identificado.
  H11d. Homicidio doloso: los hombres son >= 85% de las víctimas con sexo identificado (coherencia con la pieza 7).
  H11e. La tasa más alta de abuso sexual es la de mujeres de 13 a 17 años, con IC95 por encima de todo otro grupo.
  H11f (calidad de datos). En al menos 3 delitos frecuentes, más de 25% de las víctimas no tiene edad registrada.
Refutación de la lectura "violencia de género": si en delitos sexuales y familiares la proporción de mujeres fuera
cercana a su proporción en la población (51%), no habría sesgo de género que mostrar.

Fuente: SESNSP, víctimas del fuero común por municipio, metodología RNID, enero-agosto 2026 (80,631 víctimas).
La serie estatal 2015-2025 solo registra víctimas de delitos contra la persona (no incluye abuso sexual, violencia
familiar ni robo), por lo que no hay tendencia por edad previa a 2026.
Denominadores: CONAPO 2026 por sexo y edad. Los rangos del SESNSP (0-12, 13-17, 18-29, 30-60, 61+) no coinciden con
los quinquenios de CONAPO; el grupo 10-14 se reparte 3/5 a 0-12 y 2/5 a 13-17, y 60-64 se reparte 1/5 a 30-60 y 4/5
a 61+ (supuesto de distribución uniforme dentro del quinquenio). Tasas por 100 mil habitantes en el periodo de 8 meses.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D
from mvj.stats import eb_gamma, rate_table

SEXUAL = {"Abuso sexual", "Violación", "Violación a la intimidad sexual",
          "Otros delitos que atentan contra la libertad y la seguridad sexual", "Acoso sexual", "Hostigamiento sexual"}
AGES = ["0 a 12 años", "13 a 17 años", "18 a 29 años", "30 a 60 años", "Más de 60 años"]
KEY = {"Homicidio doloso": lambda v: v["Subtipo de delito"] == "Homicidio doloso",
       "Feminicidio": lambda v: (v["Tipo de delito"] == "Feminicidio") & ~v["Subtipo de delito"].str.startswith("Tentativa"),
       "Lesiones dolosas": lambda v: v["Subtipo de delito"] == "Lesiones dolosas",
       "Violencia familiar": lambda v: v["Tipo de delito"] == "Violencia familiar",
       "Abuso sexual": lambda v: v["Tipo de delito"] == "Abuso sexual",
       "Violación": lambda v: v["Tipo de delito"] == "Violación",
       "Delitos sexuales (todos)": lambda v: v["Tipo de delito"].isin(SEXUAL),
       "Robo con violencia": lambda v: (v["Tipo de delito"] == "Robo") & (v.Modalidad == "Con violencia"),
       "Extorsión": lambda v: (v["Tipo de delito"] == "Extorsión") & ~v["Subtipo de delito"].str.startswith("Tentativa"),
       "Privación ilegal de la libertad": lambda v: v["Tipo de delito"] == "Privación ilegal de la libertad"}


def wilson(k, n):
    if n == 0:
        return [None, None, None]
    lo, hi = proportion_confint(k, n, method="wilson")
    return [round(k / n, 4), round(lo, 4), round(hi, 4)]


def conapo_groups(pop: pd.DataFrame) -> pd.DataFrame:
    p = pop[pop.year == 2026].groupby(["sexo", "age"]).pop.sum().unstack("age")
    g = pd.DataFrame(index=p.index)
    g["0 a 12 años"] = p["0-4"] + p["5-9"] + 0.6 * p["10-14"]
    # 13-17: 2/5 of 10-14 (13, 14) + 3/5 of 15-19 (15, 16, 17)
    g["13 a 17 años"] = 0.4 * p["10-14"] + 0.6 * p["15-19"]
    g["18 a 29 años"] = 0.4 * p["15-19"] + p["20-24"] + p["25-29"]
    g["30 a 60 años"] = p[["30-34", "35-39", "40-44", "45-49", "50-54", "55-59"]].sum(axis=1) + 0.2 * p["60-64"]
    g["Más de 60 años"] = 0.8 * p["60-64"] + p[["65-69", "70-74", "75-79", "80-84", "85+"]].sum(axis=1)
    g.index = g.index.map({"HOMBRE": "Hombre", "MUJER": "Mujer"})
    return g


def run() -> dict:
    v = D.victimas_municipal_2026()
    pop = conapo_groups(D.conapo())
    D.check(abs(pop.values.sum() - 8_982_027) < 1, "grupos CONAPO suman la población 2026")

    # ---- A. per crime profile ----
    prof = []
    for tipo, g in v.groupby("Tipo de delito"):
        n = int(g.n.sum())
        if n < 200:
            continue
        sx = g.groupby("Sexo").n.sum(); ag = g.groupby("Rango de edad").n.sum()
        ident = int(sx.get("Hombre", 0) + sx.get("Mujer", 0))
        spec = int(ag.reindex(AGES, fill_value=0).sum())
        minors = int(ag.get("0 a 12 años", 0) + ag.get("13 a 17 años", 0))
        prof.append({"delito": tipo, "victimas": n, "mujeres": wilson(int(sx.get("Mujer", 0)), ident),
                     "menores_0_17": wilson(minors, spec),
                     "sin_sexo_pct": round(1 - ident / n, 3), "sin_edad_pct": round(1 - spec / n, 3)})
    prof.sort(key=lambda r: -(r["mujeres"][0] or 0))

    # ---- B. key crimes: shares + rates by sex x age ----
    key = {}
    for name, f in KEY.items():
        g = v[f(v)]
        sx = g.groupby("Sexo").n.sum(); ident = int(sx.get("Hombre", 0) + sx.get("Mujer", 0))
        cells = g[g.Sexo.isin(["Hombre", "Mujer"]) & g["Rango de edad"].isin(AGES)].groupby(["Sexo", "Rango de edad"]).n.sum()
        t = pd.DataFrame({"n": cells, "pop": pop.stack()}).fillna({"n": 0}).reset_index()
        t.columns = ["sexo", "edad", "n", "pop"]
        t = pd.concat([t, rate_table(t.n, t["pop"])], axis=1)
        top = t.nlargest(2, "rate")
        key[name] = {"victimas": int(g.n.sum()), "mujeres": wilson(int(sx.get("Mujer", 0)), ident),
                     "tasas_por_100k_8_meses": t.round({"rate": 2, "lo": 2, "hi": 2}).to_dict("records"),
                     "grupo_mas_afectado": {"sexo": top.iloc[0].sexo, "edad": top.iloc[0].edad, "tasa": round(top.iloc[0].rate, 2),
                                            "ic95": [round(top.iloc[0].lo, 2), round(top.iloc[0].hi, 2)],
                                            "separado_del_segundo": bool(top.iloc[0].lo > top.iloc[1].hi)}}

    # ---- C. where violence against women concentrates (familiar + sexual, female victims per 100k women) ----
    vaw = v[(v.Sexo == "Mujer") & (v["Tipo de delito"].isin(SEXUAL | {"Violencia familiar"}))].groupby("cvegeo").n.sum()
    women = D.conapo(); women = women[(women.year == 2026) & (women.sexo == "MUJER")].groupby("cvegeo").pop.sum()
    mun = D.municipios().set_index("cvegeo")
    t = mun.join(pd.DataFrame({"n": vaw, "women": women})).fillna({"n": 0})
    state = t.n.sum() / t.women.sum() * 1e5
    eb = eb_gamma(t.n, t.women); eb.index = t.index
    t = t.join(eb)
    high = t[t.eb_lo > state].sort_values("eb_rate", ascending=False)

    sex_share = lambda name: key[name]["mujeres"]
    minors_abuse = next(r for r in prof if r["delito"] == "Abuso sexual")["menores_0_17"]
    ga = key["Abuso sexual"]["grupo_mas_afectado"]
    return {
        "pregunta": "¿Sobre quién recae cada delito? Víctimas por sexo y edad, Jalisco enero-agosto 2026",
        "total_victimas": int(v.n.sum()),
        "calidad": {"sin_sexo": round(float((v.Sexo == "No identificado").mul(v.n).sum() / v.n.sum()), 3),
                    "sin_edad": round(float((~v["Rango de edad"].isin(AGES)).mul(v.n).sum() / v.n.sum()), 3)},
        "perfil_por_delito": prof,
        "delitos_clave": key,
        "violencia_contra_mujeres_municipios": {
            "definicion": "mujeres víctimas de violencia familiar o delitos sexuales por 100 mil mujeres, ene-ago 2026",
            "tasa_estatal": round(state, 1), "victimas": int(t.n.sum()),
            "creiblemente_superiores": [{"municipio": r.nombre, "region": r.region, "victimas": int(r.n),
                                         "tasa_eb": round(r.eb_rate, 1), "ic95": [round(r.eb_lo, 1), round(r.eb_hi, 1)]}
                                        for r in high.itertuples()]},
        "hipotesis": {
            "H11a": sex_share("Delitos sexuales (todos)")[1] >= 0.80,
            "H11b": minors_abuse[0] >= 0.40,
            "H11c": sex_share("Violencia familiar")[0] >= 0.70,
            "H11d": 1 - sex_share("Homicidio doloso")[0] >= 0.85,
            "H11e": ga["sexo"] == "Mujer" and ga["edad"] == "13 a 17 años" and ga["separado_del_segundo"],
            "H11f": sum(1 for r in prof if r["victimas"] >= 1000 and r["sin_edad_pct"] > 0.25) >= 3,
        },
    }
