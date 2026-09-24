"""Pieza 2 — ¿Son la desaparición de adolescentes y la de hombres adultos el mismo fenómeno?

Hipótesis (declaradas antes de calcular):
  H2a. La tasa de desaparición sin resolver en hombres alcanza su máximo entre 20 y 39 años.
  H2b. En mujeres, la tasa máxima está en adolescentes (10-19) y es menor que el máximo masculino.
  H2c. El desenlace difiere por sexo: la proporción que sigue desaparecida es mayor en hombres, y la
       proporción localizada sin vida también.
Refutación: si los picos por edad coinciden entre sexos, o si los intervalos de 95% de las proporciones
por sexo se traslapan, la tesis de "dos fenómenos distintos" no se sostiene con estos datos.

Fuentes: estadística REPD (personas que siguen desaparecidas, por año de desaparición, sexo y edad; personas
localizadas por sexo y condición), población CONAPO a mitad de año. Ventana 2019-2025 (años completos).
Unidad: persona-año. Las cédulas públicas NO se usan (cobertura desigual).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D
from mvj.stats import rate_table

YEARS = [str(y) for y in range(2019, 2026)]


def run() -> dict:
    ages = pd.concat([D.repd_year_age("HOMBRE"), D.repd_year_age("MUJER")])
    D.check(ages.n.sum() == 16_250, "edad×sexo REPD = 16,250")
    ages["age"] = ages["age"].replace({"85-89": "85+", "90-94": "85+", "95+": "85+"})
    unknown = int(ages.loc[ages.age == "rango de edad desconocido", "n"].sum())
    win = ages[ages.year.isin(YEARS) & (ages.age != "rango de edad desconocido")].groupby(["sexo", "age"]).n.sum()

    pop = D.conapo()
    py = pop[pop.year.between(2019, 2025)].groupby(["sexo", "age"]).pop.sum()  # person-years
    t = pd.DataFrame({"n": win, "person_years": py}).fillna({"n": 0}).reset_index()
    t = pd.concat([t, rate_table(t.n, t.person_years)], axis=1)
    t["age_order"] = t.age.map({a: i for i, a in enumerate(D.AGE_LABELS)})
    t = t.sort_values(["sexo", "age_order"]).drop(columns="age_order")

    peak = {s: t[t.sexo == s].nlargest(1, "rate").iloc[0] for s in ("HOMBRE", "MUJER")}
    teen = ["10-14", "15-19"]
    h2a = peak["HOMBRE"].age in {"20-24", "25-29", "30-34", "35-39"}
    h2b = peak["MUJER"].age in teen and peak["MUJER"].hi < peak["HOMBRE"].lo

    # Outcomes by sex (all years): still missing vs located alive vs located dead.
    missing = D.repd_year_sex().groupby("sexo").n.sum()
    loc = {}
    for s, name in (("HOMBRE", "hombres_localizadas_condicion_localizacion_victimas_delito"),
                    ("MUJER", "mujeres_localizadas_condicion_localizacion_victimas_delito")):
        res = D.repd(name)["resultados"]
        loc[s] = {c["condicion"]: sum(x["total"] for x in c["desglose_victimizacion"]) for c in res}
    D.check(sum(sum(v.values()) for v in loc.values()) == 22_017, "localizadas = 22,017")
    out = []
    for s in ("HOMBRE", "MUJER"):
        total = missing[s] + loc[s]["CON VIDA"] + loc[s]["SIN VIDA"]
        row = {"sexo": s, "registradas": int(total), "siguen_desaparecidas": int(missing[s]),
               "localizadas_con_vida": loc[s]["CON VIDA"], "localizadas_sin_vida": loc[s]["SIN VIDA"]}
        for key, k in (("p_desaparecidas", missing[s]), ("p_sin_vida_de_localizadas", loc[s]["SIN VIDA"])):
            denom = total if key == "p_desaparecidas" else loc[s]["CON VIDA"] + loc[s]["SIN VIDA"]
            lo, hi = proportion_confint(k, denom, method="wilson")
            row[key] = [round(k / denom, 4), round(lo, 4), round(hi, 4)]
        out.append(row)
    o = {r["sexo"]: r for r in out}
    h2c = (o["HOMBRE"]["p_desaparecidas"][1] > o["MUJER"]["p_desaparecidas"][2] and
           o["HOMBRE"]["p_sin_vida_de_localizadas"][1] > o["MUJER"]["p_sin_vida_de_localizadas"][2])

    ratio = (t[t.sexo == "HOMBRE"].set_index("age").rate / t[t.sexo == "MUJER"].set_index("age").rate).round(1)
    return {
        "pregunta": "¿Son la desaparición de adolescentes y la de hombres adultos el mismo fenómeno?",
        "ventana": "2019-2025, personas que siguen desaparecidas; tasa por 100 mil personas-año",
        "tasas": t.round({"rate": 2, "lo": 2, "hi": 2}).to_dict("records"),
        "razon_hombre_mujer_por_edad": ratio.dropna().to_dict(),
        "pico": {s: {"edad": p.age, "tasa": round(p.rate, 2), "ic95": [round(p.lo, 2), round(p.hi, 2)]} for s, p in peak.items()},
        "desenlace_por_sexo_todos_los_años": out,
        "edad_desconocida_excluida": unknown,
        "hipotesis": {"H2a": bool(h2a), "H2b": bool(h2b), "H2c": bool(h2c)},
    }
