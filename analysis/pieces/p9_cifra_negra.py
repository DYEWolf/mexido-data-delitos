"""Pieza 9 — ¿Qué parte de los delitos en Jalisco nunca llega a las cifras oficiales?

Hipótesis (declaradas antes de calcular):
  H9a. La cifra negra de Jalisco (delitos ocurridos en 2025, ENVIPE 2026) es mayor a 90% (IC95 inferior > 90%).
  H9b. Varía por tipo de delito: al menos 20 puntos de diferencia entre el delito con mayor y menor cifra negra
       (entre los que tienen al menos 100 casos en muestra).
  H9c. Validación del método (condición para usar el resto): la estimación nacional reproduce el 93.4% publicado por
       INEGI para ENVIPE 2026 con diferencia menor a 0.3 puntos.

Definición INEGI: cifra negra = delitos no denunciados + denunciados sin carpeta de investigación + no especificados,
entre el total de delitos. Aquí: 1 − P(denunciado por la víctima u otro integrante del hogar Y se inició carpeta).
Alcance: igual que la cifra principal de INEGI, excluye el código 03 (vandalismo: pintas y daños intencionales);
verificado: con esa exclusión el módulo expande exactamente a los 33.8 millones de delitos publicados y reproduce el 93.4%.
(Corrección registrada 2026-09-24: la primera corrida incluía vandalismo y daba 93.75%, fallando H9c; el vandalismo se
reporta aparte.)
Estimador de razón ponderado con FAC_DEL; varianza por linealización de Taylor con estratos (EST_DIS) y UPM (UPM_DIS),
aproximación de UPM con reemplazo. Dominio Jalisco = entidad de ocurrencia 14 (BP1_2C), sin eliminar UPM del diseño.
IC95 en escala logit (corrección registrada 2026-09-24: el intervalo simple daba límites superiores de hasta 101%).
"""
from __future__ import annotations

import io
import zipfile

import numpy as np
import pandas as pd

from mvj import data as D

PUBLISHED_NATIONAL_2026 = 0.934


def load(year: int) -> tuple[pd.DataFrame, dict]:
    p = D.PATHS["envipe"] / f"conjunto_de_datos_envipe_{year}_csv.zip"; D._sha(p)
    z = zipfile.ZipFile(p)
    rd = lambda n: z.read(n).decode("utf-8", errors="replace").replace("\r\n", "\n").replace("\r", "\n")
    base = f"tmod_vic_envipe{year}"
    df = pd.read_csv(io.StringIO(rd(f"{base}/conjunto_de_datos/conjunto_de_datos_{base}.csv")), dtype=str, low_memory=False)
    df.columns = [c.upper() for c in df.columns]
    cat = pd.read_csv(io.StringIO(rd(f"{base}/catalogos/bpcod.csv")), dtype=str)
    names = dict(zip(cat.iloc[:, 0].str.strip(), cat.iloc[:, 1].str.strip()))
    df["w"] = pd.to_numeric(df.FAC_DEL)
    df["known"] = (((df.BP1_20 == "1") | (df.BP1_21 == "1")) & (df.BP1_24 == "1")).astype(float)
    df["ent"] = pd.to_numeric(df.BP1_2C, errors="coerce")
    df["vandalismo"] = df.BPCOD == "03"
    return df, names


def ratio_se(df: pd.DataFrame, y: pd.Series, x: pd.Series) -> tuple[float, float]:
    """Weighted ratio sum(w*y)/sum(w*x) with Taylor-linearized SE (stratified, PSU with replacement)."""
    w = df.w
    X = (w * x).sum(); R = (w * y).sum() / X
    z = w * (y - R * x) / X
    psu = pd.DataFrame({"h": df.EST_DIS, "u": df.UPM_DIS, "z": z}).groupby(["h", "u"]).z.sum().reset_index()
    var = 0.0
    for _, g in psu.groupby("h"):
        n = len(g)
        if n > 1:
            var += n / (n - 1) * ((g.z - g.z.mean()) ** 2).sum()
    return R, np.sqrt(var)


def estimate(df, domain_mask):
    x = domain_mask.astype(float)
    r, se = ratio_se(df, (1 - df.known) * x, x)
    # IC en escala logit (revisión 2026-09-24): el intervalo simple r ± 1.96·EE rebasaba 100% cerca de 1.
    if not 0 < r < 1:
        return [round(r, 4), round(r, 4), round(r, 4)]
    lo, hi = np.log(r / (1 - r)) + np.array([-1.96, 1.96]) * se / (r * (1 - r))
    return [round(r, 4), round(float(1 / (1 + np.exp(-lo))), 4), round(float(1 / (1 + np.exp(-hi))), 4)]


def run() -> dict:
    out = {"pregunta": "¿Qué parte de los delitos en Jalisco nunca llega a las cifras oficiales?"}
    res = {}
    for year in (2026, 2025):
        df, names = load(year)
        scope = ~df.vandalismo
        nat = estimate(df, scope)
        jal_mask = (df.ent == 14) & scope
        jal = estimate(df, jal_mask)
        by = []
        for code, g in df[jal_mask].groupby("BPCOD"):
            if len(g) < 30:
                continue
            m = jal_mask & (df.BPCOD == code)
            est = estimate(df, m)
            by.append({"codigo": code, "delito": names.get(code, code), "casos_muestra": int(len(g)),
                       "delitos_estimados": int(df.loc[m, "w"].sum()), "cifra_negra": est})
        res[year] = {"victimizacion_del_año": year - 1, "nacional": nat, "jalisco": jal,
                     "nacional_delitos_estimados": int(df.loc[scope, "w"].sum()),
                     "jalisco_vandalismo_aparte": estimate(df, (df.ent == 14) & df.vandalismo),
                     "jalisco_delitos_estimados": int(df.loc[jal_mask, "w"].sum()),
                     "jalisco_casos_muestra": int(jal_mask.sum()),
                     "por_delito": sorted(by, key=lambda r: -r["cifra_negra"][0])}
    out["resultados"] = res
    r26 = res[2026]
    big = [b for b in r26["por_delito"] if b["casos_muestra"] >= 100]
    spread = max(b["cifra_negra"][0] for b in big) - min(b["cifra_negra"][0] for b in big)
    out["hipotesis"] = {"H9a": r26["jalisco"][1] > 0.90, "H9b": spread >= 0.20,
                        "H9c": abs(r26["nacional"][0] - PUBLISHED_NATIONAL_2026) < 0.003}
    return out
