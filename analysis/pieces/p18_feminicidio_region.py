"""Pieza 18 — ¿La proporción de asesinatos de mujeres que se registra como feminicidio cambia entre regiones?

Datos: INEGI defunciones, mujeres víctimas de homicidio ocurridas en Jalisco en 2019-2023, por municipio de ocurrencia
(misma selección que las piezas 7 y 15); SESNSP carpetas de feminicidio 2019-2023 por municipio (incidencia 2015-2025).
Las víctimas del SESNSP por sexo solo existen a nivel estatal antes de 2026, así que la comparación regional usa
carpetas. Regiones: las de las piezas 1, 5, 12 y 14. Periodo: el de la pieza 15.

Transparencia. Se conocen los totales estatales (300 víctimas de feminicidio SESNSP, 951 mujeres víctimas de homicidio
doloso SESNSP, 187 mujeres asesinadas en vivienda INEGI) y la tasa estatal de carpetas de feminicidio (pieza 6). No se
había visto ningún conteo regional de feminicidio ni de homicidios de mujeres.

Medida: carpetas de feminicidio (SESNSP) por cada mujer asesinada (INEGI) en la región. No es una proporción de casos
(carpetas y certificados no se cruzan, y una carpeta puede tener más de una víctima); compara cuánto se tipifica como
feminicidio en relación con los asesinatos de mujeres, entre regiones.

Hipótesis (declaradas el 24-09-2026 antes de calcular):
  H18a. Fuera del área metropolitana se registra como feminicidio una parte menor de los asesinatos de mujeres que en
        el área metropolitana: razón (feminicidio/mujeres asesinadas) resto del estado ÷ AMG, con IC95 exacto
        condicional (Fisher, razón de momios de la tabla 2×2 de conteos Poisson) superior < 1.
        Refutación: IC95 superior >= 1.
  H18b. La medida difiere entre las cuatro regiones: prueba exacta de homogeneidad (tabla 4×2, valor p por Monte Carlo
        condicional a los márgenes, 20,000 réplicas) con p < 0.05. Refutación: p >= 0.05.

Regla de tamaño (declarada): el IC95 de cada región es exacto (Clopper-Pearson condicional, como en las piezas 12 y 15);
las regiones con menos de 10 carpetas de feminicidio o menos de 30 mujeres asesinadas se marcan como "conteo chico" y
no se interpretan por separado, aunque entran en H18b (la prueba exacta no necesita conteos grandes).
Descripción (sin hipótesis): tasas por 100 mil mujeres (CONAPO) de ambas medidas por región; carpetas y homicidios de
mujeres sin municipio. Sensibilidad: H18a con el resto del estado sin los Altos.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats.contingency import odds_ratio

from mvj import data as D
from mvj.stats import poisson_ci
from pieces.p12_caida_homicidio import rate_ratio

YEARS = (2019, 2023)
AMG = "Área metropolitana de Guadalajara"
REGIONES = [AMG, "Altos Norte", "Altos Sur", "Resto del estado"]
N_MC = 20_000


def _or(f1, w1, f0, w0) -> list:
    """(f1/w1)/(f0/w0) with conditional exact IC95 (Fisher)."""
    res = odds_ratio([[f1, w1], [f0, w0]], kind="conditional")
    ci = res.confidence_interval(0.95)
    return [round(float(f1 / w1 / (f0 / w0)), 3), round(float(ci.low), 3), round(float(ci.high), 3)]


def _homogeneity(f: np.ndarray, w: np.ndarray, seed: int = 20260924) -> dict:
    """Monte Carlo exact test of a 4×2 table given both margins (label permutation), Pearson χ² statistic."""
    tab = np.column_stack([f, w]).astype(float)
    def chi2(t):
        e = t.sum(1, keepdims=True) * t.sum(0, keepdims=True) / t.sum()
        return float(((t - e) ** 2 / e).sum())
    obs = chi2(tab)
    labels = np.repeat(np.arange(len(f)), (f + w).astype(int))
    is_f = np.r_[np.ones(int(f.sum())), np.zeros(int(w.sum()))]
    rng = np.random.default_rng(seed)
    hits = 0
    for _ in range(N_MC):
        perm = rng.permutation(is_f)
        ff = np.bincount(labels, weights=perm, minlength=len(f))
        hits += chi2(np.column_stack([ff, (f + w) - ff])) >= obs - 1e-9
    return {"chi2": round(obs, 2), "gl": len(f) - 1, "p_monte_carlo": round((hits + 1) / (N_MC + 1), 4), "replicas": N_MC}


def run() -> dict:
    mun = D.municipios().set_index("cvegeo")
    s = D.sesnsp()
    fem = s[(s.tipo == "Feminicidio") & (s.subtipo == "Feminicidio") & s.year.between(*YEARS)]
    fem_reg = fem.cvegeo.map(mun.region)
    fem_sin_mun = int(fem.loc[fem_reg.isna(), "n"].sum())
    F = fem.assign(region=fem_reg).dropna(subset=["region"]).groupby("region").n.sum().reindex(REGIONES, fill_value=0)

    d = D.defunciones()
    w = d[(d.tipo == "homicidio") & (d.sexo == "2") & d.anio_ocur.between(*YEARS)]
    w_reg = w.cvegeo.map(mun.region)
    w_sin_mun = int(w_reg.isna().sum())
    W = w.assign(region=w_reg).dropna(subset=["region"]).groupby("region").size().reindex(REGIONES, fill_value=0)

    pop = D.conapo()
    pop = pop[(pop.sexo == "MUJER") & pop.year.between(*YEARS)].assign(region=lambda x: x.cvegeo.map(mun.region))
    P = pop.groupby("region")["pop"].sum().reindex(REGIONES)

    por_region = {}
    for r in REGIONES:
        f, ww = int(F[r]), int(W[r])
        por_region[r] = {"carpetas_feminicidio": f, "mujeres_asesinadas_inegi": ww,
                         "feminicidio_por_mujer_asesinada": rate_ratio(f, ww, 1, 1) if ww else None,
                         "conteo_chico": f < 10 or ww < 30,
                         "tasa_feminicidio_100mil_mujeres_año": [round(float(x) * 1e5 / float(P[r]), 2) for x in (f, *poisson_ci(f))],
                         "tasa_mujeres_asesinadas_100mil_año": [round(float(x) * 1e5 / float(P[r]), 2) for x in (ww, *poisson_ci(ww))]}
    fa, wa = int(F[AMG]), int(W[AMG])
    fr, wr = int(F.drop(AMG).sum()), int(W.drop(AMG).sum())
    fo, wo = int(F["Resto del estado"]), int(W["Resto del estado"])
    h18a = _or(fr, wr, fa, wa)
    homog = _homogeneity(F.values, W.values)
    return {
        "pregunta": "¿La proporción de asesinatos de mujeres que se registra como feminicidio cambia entre regiones?",
        "periodo_ocurrencia": list(YEARS),
        "estatal": {"carpetas_feminicidio_con_municipio": int(F.sum()), "carpetas_feminicidio_sin_municipio": fem_sin_mun,
                    "mujeres_asesinadas_inegi_con_municipio": int(W.sum()), "mujeres_asesinadas_inegi_sin_municipio": w_sin_mun,
                    "feminicidio_por_mujer_asesinada": rate_ratio(int(F.sum()), int(W.sum()), 1, 1)},
        "por_region": por_region,
        "H18a_resto_vs_amg": {"fuera_amg": [fr, wr], "amg": [fa, wa], "razon": h18a,
                              "sensibilidad_resto_sin_altos": _or(fo, wo, fa, wa)},
        "H18b_homogeneidad": homog,
        "hipotesis": {"H18a": h18a[2] < 1, "H18b": homog["p_monte_carlo"] < 0.05},
    }
