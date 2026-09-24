"""Pieza 1 — ¿Contar solo homicidios subestima la violencia letal en buena parte de Jalisco?

Hipótesis (declaradas antes de calcular):
  H1a. La razón desaparecidas/homicidios varía entre municipios más de lo que explica el azar
       (prueba de heterogeneidad chi-cuadrada sobre la proporción D/(D+H), p < 0.01).
  H1b. Hay al menos 10 municipios con "violencia oculta": homicidio creíblemente por debajo de la tasa estatal
       y desaparición NO creíblemente por debajo, y la mayoría está fuera del área metropolitana.
  H1c. Homicidio y desaparición están relacionados pero son fenómenos distintos: correlación de Spearman entre
       tasas suavizadas entre 0.2 y 0.7. Refuta: rho > 0.8 (mismo fenómeno) o rho <= 0.
  H1d (robustez). Las conclusiones de H1b y H1c se mantienen con la ventana de homicidio 2019-2025.

Medidas. D = personas que siguen desaparecidas (estadística REPD por municipio, acumulada; 16,117 con municipio).
H = homicidio doloso SESNSP. Ventana principal 2015-2025 (magnitud estatal comparable a D); robustez 2019-2025.
Tasas por 100 mil con suavizado bayesiano empírico (Poisson-Gamma). "Alto"/"bajo" solo si el intervalo al 95%
no incluye la tasa estatal; si lo incluye, "indistinguible del promedio".
Razón relativa R = (D/H) / (D_estado/H_estado) con IC exacto condicional (Clopper-Pearson sobre D/(D+H)).
Límite conocido: D no tiene año por municipio; la ventana de D y la de H no coinciden exactamente.
Nota (revisión 2026-09-24): H1c se declaró sobre la estimación puntual de rho. Se reporta además su IC95 (Fisher con
error estándar de Bonett-Wright para Spearman); el veredicto de H1c/H1d no se cambia.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D
from mvj.stats import eb_gamma

WINDOWS = {"2015-2025": (2015, 2025), "2019-2025": (2019, 2025)}


def classify(lo, hi, state):
    return np.where(lo > state, "alto", np.where(hi < state, "bajo", "promedio"))


def analyze(t: pd.DataFrame, years: tuple[int, int]) -> dict:
    py_col, h_col = f"py_{years[0]}", f"hom_{years[0]}"
    d_state = t.desap.sum() / t.pop2025.sum() * 1e5
    h_state = t[h_col].sum() / t[py_col].sum() * 1e5
    ebd = eb_gamma(t.desap, t.pop2025).set_index(t.index)
    ebh = eb_gamma(t[h_col], t[py_col]).set_index(t.index)
    r = t[["nombre", "region", "desap", h_col, "pop2025"]].copy()
    r["d_eb"], r["d_lo"], r["d_hi"] = ebd.eb_rate, ebd.eb_lo, ebd.eb_hi
    r["h_eb"], r["h_lo"], r["h_hi"] = ebh.eb_rate, ebh.eb_lo, ebh.eb_hi
    r["desaparicion"] = classify(r.d_lo, r.d_hi, d_state)
    r["homicidio"] = classify(r.h_lo, r.h_hi, h_state)

    # Relative ratio D/H with exact conditional CI.
    k, n = r.desap.values, (r.desap + r[h_col]).values
    p_state = t.desap.sum() / (t.desap.sum() + t[h_col].sum())
    lo, hi = proportion_confint(k, np.maximum(n, 1), method="beta")
    odds = lambda p: p / (1 - p)
    base = odds(p_state)
    with np.errstate(divide="ignore", invalid="ignore"):
        r["razon_rel"] = np.where(r[h_col] > 0, (k / np.maximum(n - k, 1e-9)) / base, np.inf)
        r["razon_lo"] = odds(lo) / base
        r["razon_hi"] = np.where(hi < 1, odds(hi) / base, np.inf)

    # H1a: heterogeneity of D/(D+H) across municipalities (chi-square, df = m-1).
    m = n > 0
    exp_d = n[m] * p_state
    chi2 = np.sum((k[m] - exp_d) ** 2 / (exp_d * (1 - p_state)))
    p_het = stats.chi2.sf(chi2, m.sum() - 1)

    hidden = r[(r.homicidio == "bajo") & (r.desaparicion != "bajo")]
    rho, rho_p = stats.spearmanr(r.d_eb, r.h_eb)
    rho_se = np.sqrt((1 + rho ** 2 / 2) / (len(r) - 3))
    rho_ci = np.tanh(np.arctanh(rho) + np.array([-1.96, 1.96]) * rho_se)
    grid = pd.crosstab(r.homicidio, r.desaparicion).reindex(index=["alto", "promedio", "bajo"], columns=["alto", "promedio", "bajo"]).fillna(0).astype(int)

    reg = r.groupby("region")[["desap", h_col]].sum()
    reg_lo, reg_hi = proportion_confint(reg.desap, reg.desap + reg[h_col], method="beta")
    reg["razon_rel"] = (reg.desap / reg[h_col]) / base
    reg["ic95"] = [[round(odds(a) / base, 2), round(odds(b) / base, 2)] for a, b in zip(reg_lo, reg_hi)]

    pick = lambda df: [{"municipio": x.nombre, "region": x.region, "desaparecidas": int(x.desap), "homicidios": int(x[h_col]),
                        "desap_eb": round(x.d_eb, 1), "hom_eb": round(x.h_eb, 1),
                        "razon_rel": round(float(x.razon_rel), 2), "razon_ic95": [round(float(x.razon_lo), 2), round(float(x.razon_hi), 2)]}
                       for _, x in df.iterrows()]
    return {
        "tasa_estatal": {"desaparicion_acumulada": round(d_state, 1), "homicidio_anual": round(h_state, 2)},
        "desaparecidas_por_homicidio_estatal": round(t.desap.sum() / t[h_col].sum(), 3),
        "heterogeneidad": {"chi2": round(chi2, 1), "gl": int(m.sum() - 1), "p": float(p_het)},
        "spearman": {"rho": round(rho, 3), "ic95": [round(float(x), 3) for x in rho_ci], "p": float(rho_p)},
        "cuadricula_homicidio_x_desaparicion": {h: grid.loc[h].to_dict() for h in grid.index},
        "violencia_oculta": pick(hidden.sort_values("d_eb", ascending=False)),
        "violencia_oculta_fuera_amg": int((hidden.region != "Área metropolitana de Guadalajara").sum()),
        "alto_en_ambos": pick(r[(r.homicidio == "alto") & (r.desaparicion == "alto")]),
        "solo_homicidio_alto": pick(r[(r.homicidio == "alto") & (r.desaparicion != "alto")]),
        "por_region": [{"region": i, "desaparecidas": int(x.desap), "homicidios": int(x[h_col]),
                        "razon_rel": round(x.razon_rel, 2), "ic95": x.ic95} for i, x in reg.iterrows()],
        "_tabla": r,
    }


def run() -> dict:
    mun = D.municipios().set_index("cvegeo")
    pop = D.conapo()
    rm = D.repd_map().dropna(subset=["cvegeo"]).set_index("cvegeo")
    ses = D.sesnsp()
    hd = ses[ses.subtipo == "Homicidio doloso"]
    t = mun.join(pd.DataFrame({"pop2025": pop[pop.year == 2025].groupby("cvegeo").pop.sum(), "desap": rm.desaparecidas}))
    for a, b in WINDOWS.values():
        t[f"py_{a}"] = pop[pop.year.between(a, b)].groupby("cvegeo").pop.sum()
        t[f"hom_{a}"] = hd[hd.year.between(a, b)].groupby("cvegeo").n.sum()
    t = t.fillna({c: 0 for c in t.columns if c.startswith("hom_")})
    D.check(t.desap.sum() == 16_117, "REPD municipal = 16,117")

    res = {k: analyze(t, w) for k, w in WINDOWS.items()}
    main, rob = res["2015-2025"], res["2019-2025"]
    hid_main = {x["municipio"] for x in main["violencia_oculta"]}
    hid_rob = {x["municipio"] for x in rob["violencia_oculta"]}
    for v in res.values():
        v.pop("_tabla")
    h1b = lambda v: len(v["violencia_oculta"]) >= 10 and v["violencia_oculta_fuera_amg"] > len(v["violencia_oculta"]) / 2
    h1c = lambda v: 0.2 <= v["spearman"]["rho"] <= 0.7
    return {
        "pregunta": "¿Contar solo homicidios subestima la violencia letal en buena parte de Jalisco?",
        "ventana_principal": "homicidio 2015-2025; desaparición = personas pendientes (acumulado REPD)",
        "resultados": res,
        "coincidencia_violencia_oculta_entre_ventanas": {"ambas": sorted(hid_main & hid_rob),
                                                          "solo_2015_2025": sorted(hid_main - hid_rob),
                                                          "solo_2019_2025": sorted(hid_rob - hid_main)},
        "hipotesis": {"H1a": main["heterogeneidad"]["p"] < 0.01, "H1b": h1b(main), "H1c": h1c(main),
                      "H1d": h1b(rob) and h1c(rob)},
    }
