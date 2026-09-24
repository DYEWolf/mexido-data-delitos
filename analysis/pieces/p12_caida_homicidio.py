"""Pieza 12 — ¿La caída del homicidio en 2025 es real, o es reclasificación?

Contexto. Las carpetas de homicidio doloso bajaron de 1,439 (2024) a 952 (2025) y las víctimas de 1,797 a 1,196: la
mayor caída anual de la serie. Si fuera reclasificación, esos casos tendrían que aparecer en otra categoría: homicidio
culposo, "otros delitos contra la vida", desaparición o muertes de intención no determinada (INEGI).

Transparencia. En la revisión del 2026-09-24, antes de escribir esta pieza, ya se habían visto: los totales anuales
2019-2025 de carpetas y víctimas de homicidio doloso, de homicidio culposo (sin desglose por modalidad) y de "otros
delitos contra la vida"; las denuncias anuales de desaparición; el cambio 2024-2025 por región y municipio; y los
conteos anuales de muertes de intención no determinada por año de registro. Lo que depende de esas cifras se reporta
como exploratorio (E12e-E12g). Las hipótesis confirmatorias usan cortes que no se habían calculado: mes, modalidad,
lesiones y perfil de las muertes de intención no determinada.

Hipótesis (declaradas antes de calcular):
  H12a. La caída es general en el año: en víctimas de homicidio doloso (SESNSP), al menos 10 de los 12 meses de 2025
        están por debajo del mismo mes de 2024, y la razón de tasas 2025/2024 tiene IC95 superior < 0.85.
  H12b. No hay sustitución hacia homicidio culposo con arma: el aumento 2024→2025 en carpetas de homicidio culposo con
        arma de fuego o arma blanca compensa menos del 10% de la caída en carpetas de homicidio doloso.
  H12c. La violencia armada no letal también baja: carpetas de lesiones dolosas con arma de fuego, razón de tasas
        2025/2024 con IC95 superior < 1.
  H12d. Las muertes de intención no determinada (INEGI, ocurridas 2019-2023) tienen perfil de homicidio: al menos 75%
        son hombres (IC95 inferior >= 75%, entre las de sexo conocido).
Refutación: si H12a falla (caída concentrada en pocos meses) o H12b falla (el culposo con arma absorbe la caída), la
baja de 2025 no puede presentarse como baja de la violencia letal sin más evidencia. Si H12c falla, la violencia armada
no letal no acompaña la baja y caben una reclasificación o un cambio en la letalidad.

Exploratorio (cifras ya vistas):
  E12e. Tendencia 2019-2023 de homicidio + intención no determinada (INEGI, año de ocurrencia) contra homicidio solo.
  E12f. Denuncias de desaparición por víctima de homicidio doloso, 2025 contra 2019-2024.
  E12g. Dónde ocurrió la caída 2024→2025 (región y municipios).
Descriptivo: víctimas de homicidio doloso enero-agosto 2026 contra enero-agosto 2025 (categoría comparable en RNID).

Límite: INEGI aún no publica las defunciones de 2025; la prueba independiente de 2025 (certificados de defunción)
queda pendiente.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D

ARMED = ["Con arma de fuego", "Con arma blanca"]


def rate_ratio(k1, k0, pop1, pop0) -> list[float]:
    """Razón de tasas (k1/pop1)/(k0/pop0) con IC exacto condicional (Clopper-Pearson sobre k1/(k1+k0))."""
    lo, hi = proportion_confint(k1, k1 + k0, method="beta")
    f = pop0 / pop1
    return [round(float(k1 / k0 * f), 3), round(float(lo / (1 - lo) * f), 3), round(float(hi / (1 - hi) * f), 3)]


def trend(y, pop) -> list[float]:
    """Cambio anual % (Poisson log-lineal con offset de población y escala de Pearson) con IC95."""
    X = sm.add_constant(np.arange(len(y)))
    fit = sm.GLM(np.asarray(y, float), X, family=sm.families.Poisson(), offset=np.log(np.asarray(pop, float))).fit(scale="X2")
    return [round(float((np.exp(v) - 1) * 100), 1) for v in (fit.params[1], *fit.conf_int()[1])]


def run() -> dict:
    s = D.sesnsp()
    old = s[s.metodologia == "2015-2025"]
    pop = D.conapo().groupby("year").pop.sum()
    mun = D.municipios().set_index("cvegeo")
    vic = D.victimas_estatal()

    def carpetas(subtipo, modalidades=None):
        x = old[(old.subtipo == subtipo) & old.year.between(2019, 2025)]
        if modalidades:
            x = x[x.modalidad.isin(modalidades)]
        return x.groupby("year").n.sum().reindex(range(2019, 2026), fill_value=0)

    # ---- H12a: víctimas mes a mes ----
    vh = vic[vic.subtipo == "Homicidio doloso"]
    v_year = vh.groupby("year").n.sum()
    v_month = vh[vh.year.isin([2024, 2025])].groupby("year")[D.MONTHS].sum()
    below = int((v_month.loc[2025] < v_month.loc[2024]).sum())
    rr_v = rate_ratio(v_year[2025], v_year[2024], pop[2025], pop[2024])
    hd = carpetas("Homicidio doloso")
    c_month = old[(old.subtipo == "Homicidio doloso") & old.year.isin([2024, 2025])].groupby(["year", "mes"]).n.sum().unstack()
    rr_c = rate_ratio(hd[2025], hd[2024], pop[2025], pop[2024])

    # ---- H12b: sustitución hacia categorías vecinas ----
    drop = int(hd[2024] - hd[2025])
    cul = old[(old.subtipo == "Homicidio culposo") & old.year.isin([2024, 2025])].groupby(["modalidad", "year"]).n.sum().unstack(fill_value=0)
    cul_armed = cul.loc[cul.index.intersection(ARMED)].sum()
    comp_armed = max(int(cul_armed[2025] - cul_armed[2024]), 0) / drop
    neighbours = {name: carpetas(name) for name in ("Homicidio culposo", "Feminicidio",
                                                    "Otros delitos que atentan contra la vida y la integridad corporal")}
    neighbours["Homicidio culposo con arma de fuego o blanca"] = carpetas("Homicidio culposo", ARMED)

    # ---- H12c: violencia armada no letal ----
    les = carpetas("Lesiones dolosas", ["Con arma de fuego"])
    rr_l = rate_ratio(les[2025], les[2024], pop[2025], pop[2024])
    hd_fire = carpetas("Homicidio doloso", ["Con arma de fuego"])

    # ---- H12d: perfil de las muertes de intención no determinada ----
    dd = D.defunciones()
    win = dd[dd.anio_ocur.between(2019, 2023)]

    def profile(x):
        known = x[x.sexo.isin(["1", "2"])]
        men = int((known.sexo == "1").sum())
        lo, hi = proportion_confint(men, len(known), method="wilson")
        age = x.edad_anios.dropna()
        return {"n": int(len(x)), "hombres": [round(men / len(known), 4), round(lo, 4), round(hi, 4)],
                "edad_mediana": float(age.median()), "pct_15_44": round(float(age.between(15, 44).mean()), 4),
                "pct_edad_desconocida": round(float(x.edad_anios.isna().mean()), 4),
                "mecanismo_pct": (x.arma.value_counts(normalize=True) * 100).round(1).to_dict()}

    ign, hom = profile(win[win.tipo == "se ignora"]), profile(win[win.tipo == "homicidio"])

    # ---- E12e: homicidio + intención no determinada (INEGI, ocurrencia) ----
    occ = dd[dd.anio_ocur.between(2018, 2024)].groupby(["anio_ocur", "tipo"]).size().unstack(fill_value=0)
    yrs = list(range(2019, 2024))
    both = occ.loc[yrs, "homicidio"] + occ.loc[yrs, "se ignora"]

    # ---- E12f: denuncias de desaparición por víctima de homicidio ----
    rep = pd.DataFrame(D.repd("porcentaje_localizacion_año")["resultados"]).set_index("anio").desaparecidas_reportadas_mismo_anio
    per_year = []
    for y in range(2019, 2026):
        k, n = int(rep[y]), int(v_year[y])
        se = np.sqrt(1 / k + 1 / n)
        per_year.append({"año": y, "denuncias_desaparicion": k, "victimas_homicidio": n,
                         "razon": [round(k / n, 2), round(k / n * np.exp(-1.96 * se), 2), round(k / n * np.exp(1.96 * se), 2)]})
    pre_k, pre_n = int(rep.loc[2019:2024].sum()), int(v_year.loc[2019:2024].sum())
    orr = (rep[2025] / v_year[2025]) / (pre_k / pre_n)
    se = np.sqrt(1 / rep[2025] + 1 / v_year[2025] + 1 / pre_k + 1 / pre_n)

    # ---- E12g: dónde ocurrió la caída ----
    hm = old[(old.subtipo == "Homicidio doloso") & old.year.isin([2024, 2025])].groupby(["cvegeo", "year"]).n.sum().unstack(fill_value=0)
    hm = hm.join(mun[["nombre", "region"]], how="left").fillna({"region": "Sin municipio", "nombre": "Sin municipio"})
    hm["cambio"] = hm[2025] - hm[2024]
    reg = hm.groupby("region")[[2024, 2025]].sum()
    top = hm.sort_values("cambio").head(10)

    # ---- descriptivo: enero-agosto 2026 ----
    v26 = D.victimas_municipal_2026()
    h26 = int(v26.loc[v26["Subtipo de delito"] == "Homicidio doloso", "n"].sum())
    h25 = int(vh[vh.year == 2025][D.MONTHS[:8]].sum().sum())

    return {
        "pregunta": "¿La caída del homicidio en 2025 es real, o es reclasificación?",
        "homicidio_doloso": {
            "carpetas_por_año": {int(k): int(v) for k, v in hd.items()},
            "victimas_por_año": {int(k): int(v) for k, v in v_year.loc[2019:2025].items()},
            "razon_tasas_2025_vs_2024": {"carpetas": rr_c, "victimas": rr_v},
            "victimas_por_mes": {int(y): [int(x) for x in v_month.loc[y]] for y in (2024, 2025)},
            "carpetas_por_mes": {int(y): [int(x) for x in c_month.loc[y]] for y in (2024, 2025)},
            "meses_2025_debajo_de_2024_victimas": below,
            "con_arma_de_fuego_carpetas": {int(k): int(v) for k, v in hd_fire.items()},
        },
        "sustitucion": {
            "caida_carpetas_doloso_2024_2025": drop,
            "categorias_vecinas_carpetas": {k: {int(y): int(n) for y, n in v.items()} for k, v in neighbours.items()},
            "homicidio_culposo_por_modalidad_2024_2025": {m: [int(r[2024]), int(r[2025])] for m, r in cul.iterrows()},
            "compensacion_culposo_con_arma": round(comp_armed, 4),
        },
        "lesiones_dolosas_arma_de_fuego": {"carpetas_por_año": {int(k): int(v) for k, v in les.items()},
                                           "razon_tasas_2025_vs_2024": rr_l},
        "intencion_no_determinada_inegi_2019_2023": {"se_ignora": ign, "homicidio": hom},
        "inegi_ocurrencia": {
            "por_año": {int(y): {"homicidio": int(r["homicidio"]), "se_ignora": int(r["se ignora"])} for y, r in occ.iterrows()},
            "nota": "2024 incompleto (faltan registros tardíos).",
            "tendencia_2019_2023_pct_anual": {"homicidio": trend(occ.loc[yrs, "homicidio"], pop.loc[yrs]),
                                              "homicidio_mas_se_ignora": trend(both, pop.loc[yrs])},
            "se_ignora_entre_homicidio_mas_se_ignora_pct": {int(y): round(float(occ.loc[y, "se ignora"] / (occ.loc[y, "homicidio"] + occ.loc[y, "se ignora"]) * 100), 1)
                                                           for y in range(2018, 2025)},
        },
        "desaparicion_por_victima_de_homicidio": {
            "por_año": per_year,
            "razon_2025_vs_2019_2024": [round(float(orr), 3), round(float(orr * np.exp(-1.96 * se)), 3), round(float(orr * np.exp(1.96 * se)), 3)],
        },
        "donde_bajo_2024_2025": {
            "por_region": [{"region": r, "2024": int(x[2024]), "2025": int(x[2025]), "cambio_pct": round(float((x[2025] / x[2024] - 1) * 100), 1)}
                           for r, x in reg.iterrows() if x[2024] > 0],
            "municipios_que_mas_bajaron": [{"municipio": x.nombre, "2024": int(x[2024]), "2025": int(x[2025]), "cambio": int(x.cambio)}
                                           for _, x in top.iterrows()],
            "proporcion_de_la_caida_en_5_municipios": round(float(-top.cambio.head(5).sum() / -hm.cambio.sum()), 3),
            "municipios_que_subieron": int((hm.cambio > 0).sum()),
        },
        "victimas_ene_ago_2026_vs_2025": {"2025": h25, "2026": h26, "razon_tasas": rate_ratio(h26, h25, pop[2026], pop[2025])},
        "hipotesis": {"H12a": bool(below >= 10 and rr_v[2] < 0.85), "H12b": bool(comp_armed < 0.10),
                      "H12c": bool(rr_l[2] < 1), "H12d": bool(ign["hombres"][1] >= 0.75),
                      "E12e": "exploratoria", "E12f": "exploratoria", "E12g": "exploratoria"},
    }
