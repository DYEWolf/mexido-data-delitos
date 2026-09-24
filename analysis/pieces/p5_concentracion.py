"""Pieza 5 — ¿Dónde se concentran las desapariciones, y es una concentración real o ruido de municipios chicos?

Hipótesis (declaradas antes de calcular):
  H5a. Las desapariciones están más concentradas que la población: índice de concentración (Gini sobre la curva
       de Lorenz casos-vs-población) > 0.20 con IC95 que no incluye 0.20.
  H5b. Un grupo de municipios con ~15% de la población concentra >= 25% de las personas desaparecidas.
  H5c. Tras suavizado bayesiano empírico, al menos 5 municipios tienen tasa creíblemente superior a la estatal
       (límite inferior del intervalo al 95% por encima de la tasa estatal).
Refutación: Gini con IC que incluye 0.20, o menos de 5 municipios creíblemente altos, indicaría que la
"concentración" visible en rankings crudos es sobre todo ruido.

Método del intervalo (revisión 24-09-2026, §9): el IC95 del Gini es el intervalo básico del bootstrap, que corrige
el sesgo hacia arriba del remuestreo Poisson; antes se reportaba el percentil. H5a y su umbral no cambian.

Comparación: homicidio doloso 2019-2025 con el mismo método.
Fuentes: estadística REPD por municipio (acumulado, 16,117 en municipios + 86 sin municipio), SESNSP, CONAPO 2025.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from mvj import data as D
from mvj.stats import eb_gamma, gini_ci, lorenz, rate_table


def run() -> dict:
    mun = D.municipios()
    pop = D.conapo()
    p25 = pop[pop.year == 2025].groupby("cvegeo").pop.sum()
    py = pop[pop.year.between(2019, 2025)].groupby("cvegeo").pop.sum()
    rm = D.repd_map().dropna(subset=["cvegeo"]).set_index("cvegeo")
    ses = D.sesnsp()
    hom = ses[(ses.subtipo == "Homicidio doloso") & ses.year.between(2019, 2025)].groupby("cvegeo").n.sum()

    t = mun.set_index("cvegeo").join(pd.DataFrame({"pop2025": p25, "py": py, "desap": rm.desaparecidas, "hom": hom})).fillna({"hom": 0})
    D.check(t.desap.sum() == 16_117, "REPD municipal = 16,117")
    out = {"pregunta": "¿Dónde se concentran las desapariciones, y es real o ruido de municipios chicos?"}
    for label, cases, expo in (("desaparicion", "desap", "pop2025"), ("homicidio_2019_2025", "hom", "py")):
        x, y, g = lorenz(t[cases], t[expo])
        gb = gini_ci(t[cases].values, t[expo].values)
        g_lo, g_hi = gb["ic95"]
        state = t[cases].sum() / t[expo].sum() * 1e5
        eb = eb_gamma(t[cases], t[expo]); eb.index = t.index
        crude = rate_table(t[cases], t[expo]); crude.index = t.index
        r = t[["nombre", "region", cases, expo]].join(crude).join(eb)
        credible = r[r.eb_lo > state].sort_values("eb_rate", ascending=False)
        # Population share needed (highest-rate areas first) to reach 25% and 50% of cases.
        rs = r.sort_values("eb_rate", ascending=False)
        cp = rs[expo].cumsum() / rs[expo].sum(); cc = rs[cases].cumsum() / rs[cases].sum()
        top_pop15 = float(cc[cp <= 0.15].iloc[-1]) if (cp <= 0.15).any() else 0.0
        crude_top = r.sort_values("rate", ascending=False).head(10)
        out[label] = {
            "tasa_estatal": round(state, 2),
            "gini": round(g, 3), "gini_ic95": [round(g_lo, 3), round(g_hi, 3)],
            "gini_ic95_percentil_sin_correccion": [round(v, 3) for v in gb["ic95_percentil"]],
            "gini_sesgo_bootstrap": round(gb["sesgo_bootstrap"], 4), "gini_corregido_por_sesgo": round(gb["gini_corregido"], 3),
            "gini_prop_replicas_bajo_estimacion": round(gb["prop_replicas_bajo_estimacion"], 3),
            "casos_en_municipios_con_15pct_poblacion_mas_afectada": round(top_pop15, 3),
            "poblacion_necesaria_para_50pct_casos": round(float(cp[cc >= 0.5].iloc[0]), 3),
            "creiblemente_superiores": [{"municipio": n, "region": rg, "casos": int(c), "tasa_cruda": round(cr, 1),
                                         "tasa_eb": round(e, 1), "ic95_eb": [round(l, 1), round(h, 1)]}
                                        for n, rg, c, cr, e, l, h in zip(credible.nombre, credible.region, credible[cases],
                                                                         credible.rate, credible.eb_rate, credible.eb_lo, credible.eb_hi)],
            "top10_crudo_que_no_es_creible": [n for n in crude_top.nombre if n not in set(credible.nombre)],
            "lorenz": {"x": np.round(x, 4).tolist(), "y": np.round(y, 4).tolist()},
        }
        if label == "desaparicion":
            reg = r.groupby("region")[[cases, expo]].sum()
            reg["pct_casos"] = reg[cases] / reg[cases].sum(); reg["pct_pob"] = reg[expo] / reg[expo].sum()
            reg["razon"] = reg.pct_casos / reg.pct_pob
            out["por_region"] = reg.round(3).reset_index().to_dict("records")
            h = out[label]
            out["hipotesis"] = {"H5a": h["gini_ic95"][0] > 0.20, "H5b": h["casos_en_municipios_con_15pct_poblacion_mas_afectada"] >= 0.25,
                                "H5c": len(h["creiblemente_superiores"]) >= 5}
    return out
