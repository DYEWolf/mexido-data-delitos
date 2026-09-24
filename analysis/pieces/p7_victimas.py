"""Pieza 7 — ¿Las personas asesinadas y las que desaparecen son la misma población? + robustez de la pieza 1.

Hipótesis (declaradas antes de calcular):
  H7a. Mismo perfil: la proporción de hombres difiere < 5 puntos entre víctimas de homicidio (INEGI) y personas que
       siguen desaparecidas (REPD), y la distancia de Jensen-Shannon entre sus distribuciones de edad masculinas < 0.10.
  H7b. Robustez de la pieza 1 con una fuente independiente: usando homicidios INEGI (víctimas por certificado de
       defunción, ocurridos 2019-2023) en lugar de carpetas SESNSP, al menos 9 de los 12 municipios de "homicidio bajo y
       desaparición alta" se mantienen en esa celda.
  H7c (exploratoria, sin dirección previa). Proporción de víctimas de homicidio con edad desconocida por año de
       ocurrencia y su tendencia; se reporta como posible indicador de cuerpos sin identificar.
  E7d (exploratoria, agregada el 24-09-2026; el 0.07 de H7a ya se había visto). Punto de comparación para la distancia
       de Jensen-Shannon de H7a: distancia entre la edad de los hombres víctimas de homicidio (INEGI, ocurridos 2019-2023)
       y la de la población masculina (CONAPO, personas-año 2019-2023), y entre la de los hombres que siguen
       desaparecidos (REPD 2019-2025) y la población masculina (CONAPO 2019-2025). Mismos 18 grupos de edad. IC95 por
       bootstrap multinomial (5,000 réplicas) para las tres distancias; la población se toma como fija. Sin umbral ni
       dirección previa: solo se reporta para dar escala al 0.07.

Ventanas: INEGI por año de ocurrencia 2019-2023 (años con registro prácticamente completo); REPD personas que siguen
desaparecidas con año de desaparición 2019-2025. Grupos de edad quinquenales comparables con CONAPO.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.spatial.distance import jensenshannon
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D
from mvj.stats import rate_table
from pieces import p1_regiones as P1

BINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 200]
LABELS = D.AGE_LABELS
TWELVE = ["Arandas", "Atotonilco el Alto", "Casimiro Castillo", "Cihuatlán", "Colotlán", "Huejuquilla el Alto",
          "La Barca", "San Gabriel", "San Juan de los Lagos", "San Miguel el Alto", "Tala", "Tuxcacuesco"]


def run() -> dict:
    d = D.defunciones()
    h = d[(d.tipo == "homicidio") & d.anio_ocur.between(2019, 2023)].copy()
    h["sexo"] = h.sexo.map({"1": "HOMBRE", "2": "MUJER"})
    h["age"] = pd.cut(h.edad_anios, BINS, right=False, labels=LABELS)

    # ---- H7a: profiles ----
    rep = pd.concat([D.repd_year_age("HOMBRE"), D.repd_year_age("MUJER")])
    rep["age"] = rep.age.replace({"85-89": "85+", "90-94": "85+", "95+": "85+"})
    rep = rep[rep.year.isin([str(y) for y in range(2019, 2026)])]
    male_h = (h.sexo == "HOMBRE").sum(); tot_h = h.sexo.isin(["HOMBRE", "MUJER"]).sum()
    male_r = rep[rep.sexo == "HOMBRE"].n.sum(); tot_r = rep.n.sum()
    ph = proportion_confint(male_h, tot_h, method="wilson"); pr = proportion_confint(male_r, tot_r, method="wilson")
    dist_h = h[h.sexo == "HOMBRE"].age.value_counts().reindex(LABELS, fill_value=0)
    dist_r = rep[(rep.sexo == "HOMBRE") & rep.age.isin(LABELS)].groupby("age").n.sum().reindex(LABELS, fill_value=0)
    js = float(jensenshannon(dist_h / dist_h.sum(), dist_r / dist_r.sum(), base=2))
    mean_age = lambda counts: float(np.dot([2.5 + 5 * i for i in range(len(LABELS))], counts) / counts.sum())

    # Homicide rates by sex x age (CONAPO person-years 2019-2023) to set beside piece 2.
    pop = D.conapo()
    py = pop[pop.year.between(2019, 2023)].groupby(["sexo", "age"]).pop.sum()
    hr = h.dropna(subset=["sexo", "age"]).groupby(["sexo", "age"], observed=False).size()
    ht = pd.DataFrame({"n": hr, "py": py}).fillna(0).reset_index()
    ht = pd.concat([ht, rate_table(ht.n, ht.py)], axis=1)

    # ---- E7d: scale for the JS distance (vs. male population) ----
    rng = np.random.default_rng(20260924)
    pop_m = lambda y0, y1: pop[(pop.sexo == "HOMBRE") & pop.year.between(y0, y1)].groupby("age").pop.sum().reindex(LABELS)
    pm_h, pm_r = pop_m(2019, 2023), pop_m(2019, 2025)

    def js_boot(a, b=None, ref=None, n=5000):
        pa = (a / a.sum()).values
        pb = (b / b.sum()).values if b is not None else (ref / ref.sum()).values
        est = float(jensenshannon(pa, pb, base=2))
        ra = rng.multinomial(int(a.sum()), pa, size=n)
        rb = rng.multinomial(int(b.sum()), pb, size=n) if b is not None else np.tile(pb, (n, 1))
        bs = [jensenshannon(x / x.sum(), y / y.sum(), base=2) for x, y in zip(ra, rb)]
        return {"js": round(est, 4), "ic95_bootstrap": [round(float(v), 4) for v in np.percentile(bs, [2.5, 97.5])]}

    e7d = {"homicidio_vs_desaparicion": js_boot(dist_h, dist_r),
           "homicidio_vs_poblacion_masculina": js_boot(dist_h, ref=pm_h),
           "desaparicion_vs_poblacion_masculina": js_boot(dist_r, ref=pm_r),
           "edad_media_poblacion_masculina_2019_2023": round(mean_age(pm_h), 1),
           "nota": "Percentil del bootstrap; la distancia estimada con muestras finitas tiene sesgo hacia arriba, "
                   "así que sirve para escala, no como prueba."}

    # ---- H7b: piece 1 with INEGI homicides ----
    mun = D.municipios().set_index("cvegeo")
    rm = D.repd_map().dropna(subset=["cvegeo"]).set_index("cvegeo")
    t = mun.join(pd.DataFrame({"pop2025": pop[pop.year == 2025].groupby("cvegeo").pop.sum(), "desap": rm.desaparecidas,
                               "py_2019": pop[pop.year.between(2019, 2023)].groupby("cvegeo").pop.sum(),
                               "hom_2019": h.groupby("cvegeo").size()})).fillna({"hom_2019": 0})
    res = P1.analyze(t, (2019, 2023))
    tab = res.pop("_tabla")
    cell = set(tab[(tab.homicidio == "bajo") & (tab.desaparicion == "alto")].nombre)
    kept = sorted(cell & set(TWELVE))

    # ---- SESNSP (carpetas) vs INEGI (víctimas) municipal agreement ----
    ses = D.sesnsp()
    sh = ses[(ses.subtipo == "Homicidio doloso") & ses.year.between(2019, 2023)].groupby("cvegeo").n.sum()
    both = pd.DataFrame({"inegi": h.groupby("cvegeo").size(), "sesnsp": sh}).reindex(mun.index).fillna(0)
    from scipy.stats import spearmanr
    rho = spearmanr(both.inegi / t.py_2019, both.sesnsp / t.py_2019)

    # ---- H7c: unknown age ----
    all_h = d[(d.tipo == "homicidio") & d.anio_ocur.between(2018, 2024)]
    unk = all_h.groupby("anio_ocur").apply(lambda g: pd.Series({"n": len(g), "edad_desconocida": int(g.edad_anios.isna().sum())}))
    unk["pct"] = (unk.edad_desconocida / unk.n * 100).round(1)
    unk_ci = [proportion_confint(k, n, method="wilson") for k, n in zip(unk.edad_desconocida, unk.n)]

    return {
        "pregunta": "¿Las personas asesinadas y las que desaparecen son la misma población?",
        "hombres": {"homicidio_inegi_2019_2023": [round(male_h / tot_h, 4), round(ph[0], 4), round(ph[1], 4)],
                    "siguen_desaparecidas_2019_2025": [round(male_r / tot_r, 4), round(pr[0], 4), round(pr[1], 4)]},
        "edad_media_hombres": {"homicidio": round(mean_age(dist_h), 1), "desaparicion": round(mean_age(dist_r), 1)},
        "jensen_shannon_edad_hombres": round(js, 4),
        "E7d_escala_jensen_shannon": e7d,
        "distribucion_edad_hombres_pct": {"homicidio": (dist_h / dist_h.sum() * 100).round(1).to_dict(),
                                          "desaparicion": (dist_r / dist_r.sum() * 100).round(1).to_dict()},
        "tasa_homicidio_sexo_edad": ht.round({"rate": 2, "lo": 2, "hi": 2}).to_dict("records"),
        "robustez_pieza1_con_inegi": {"celda_homicidio_bajo_desaparicion_alta": sorted(cell), "de_los_12_se_mantienen": kept,
                                      "n_mantenidos": len(kept), "spearman_tasas": res["spearman"],
                                      "por_region": res["por_region"]},
        "acuerdo_municipal_inegi_vs_sesnsp": {"spearman": round(float(rho.statistic), 3)},
        "edad_desconocida_por_año": [{"año": int(y), **{k: (int(v) if k != "pct" else float(v)) for k, v in r.items()},
                                      "ic95": [round(c[0] * 100, 1), round(c[1] * 100, 1)]} for (y, r), c in zip(unk.iterrows(), unk_ci)],
        "hipotesis": {"H7a": bool(abs(male_h / tot_h - male_r / tot_r) < 0.05 and js < 0.10),
                      "H7b": len(kept) >= 9, "H7c": "exploratoria",
                      "E7d": "exploratoria"},
    }
