"""Pieza 13 — ¿Por qué no se denuncia en Jalisco, y cuánto se confía en las autoridades?

Hipótesis (declaradas el 24-09-2026 antes de calcular; ninguna cifra de estas variables se había visto):
  H13a. Entre los delitos no denunciados ocurridos en Jalisco en 2025 (ENVIPE 2026), la mayoría tiene como razón
        principal una causa atribuible a la autoridad (agrupación de INEGI: miedo a que lo extorsionaran, pérdida de
        tiempo, trámites largos y difíciles, desconfianza en la autoridad, actitud hostil de la autoridad; códigos
        02, 04, 05, 06 y 08 de BP1_23). Refutación: límite inferior del IC95 <= 50%.
  H13b. "Pérdida de tiempo" es la razón individual más frecuente en Jalisco. Refutación: otra razón tiene una
        estimación puntual mayor.
  H13c. Jalisco no se aparta del país en la proporción de causas atribuibles a la autoridad: el IC95 de la diferencia
        Jalisco − nacional queda dentro de ±5 puntos. Refutación: el IC95 sale de ese rango.
  H13d. La confianza en las autoridades civiles locales es menor en Jalisco que en el país: en al menos 3 de 5
        (policía de tránsito municipal, policía preventiva municipal, policía estatal, policía ministerial o de
        investigación, MP y fiscalía estatal) el IC95 de la diferencia Jalisco − nacional está por debajo de 0.
        Refutación: 2 o menos.
  H13e. En Jalisco, Marina y Ejército generan más confianza que la policía preventiva municipal por al menos 20
        puntos: límite inferior del IC95 de cada diferencia > 20 puntos. Refutación: cualquiera de las dos no lo cumple.

Réplica sin hipótesis: las mismas cifras con ENVIPE 2025 (delitos de 2024, confianza en 2025) se reportan como robustez.

Definiciones:
  - Motivos: delitos ocurridos en la entidad (BP1_2C), sin vandalismo (código 03 de BPCOD, igual que la pieza 9), que no
    denunció la víctima ni otro integrante del hogar (BP1_20 != 1 y BP1_21 != 1). Proporción de cada razón BP1_23 entre
    esos delitos, "no sabe / no responde" incluido en el denominador. Verificación: BP1_23 tiene respuesta válida en
    todos los delitos no denunciados y en ninguno denunciado.
  - Confianza: personas de 18 años y más (tper_vic1) residentes en la entidad (CVE_ENT) que identifican a la autoridad
    (AP5_3_xx = 1); "confía" = mucha o algo de confianza (AP5_4_xx en 1, 2). "No sabe" queda en el denominador, como
    en la publicación de INEGI.
  - Estimador: igual que la pieza 9. Razón ponderada (FAC_DEL para delitos, FAC_ELE para personas), varianza por
    linealización de Taylor con estratos EST_DIS y UPM_DIS (UPM con reemplazo), dominios sin eliminar UPM del
    diseño, IC95 en escala logit. Las diferencias Jalisco − nacional usan la misma linealización sobre la muestra
    completa (Jalisco es parte del nacional, así que la covarianza entra sola) con IC95 simple.
"""
from __future__ import annotations

import io
import zipfile

import numpy as np
import pandas as pd

from mvj import data as D
from pieces.p9_cifra_negra import estimate, load

AUTORIDAD = ["02", "04", "05", "06", "08"]
AUTH = {"01": "Policía de tránsito municipal", "02": "Policía preventiva municipal", "03": "Policía estatal",
        "04": "Guardia Nacional", "05": "Policía ministerial o de investigación", "06": "MP y fiscalía estatal",
        "07": "Fiscalía General de la República", "08": "Ejército", "10": "Marina", "11": "Jueces"}
LOCALES = ["01", "02", "03", "05", "06"]


def _catalog(z: zipfile.ZipFile, path: str) -> dict:
    cat = pd.read_csv(io.StringIO(z.read(path).decode("utf-8", errors="replace").replace("\r\n", "\n").replace("\r", "\n")), dtype=str)
    return dict(zip(cat.iloc[:, 0].str.strip(), cat.iloc[:, 1].str.strip()))


def _lin(df: pd.DataFrame, y: pd.Series, x: pd.Series) -> tuple[float, pd.Series]:
    """Ratio and its linearized variable, same as p9.ratio_se."""
    X = (df.w * x).sum(); R = (df.w * y).sum() / X
    return R, df.w * (y - R * x) / X


def _var(df: pd.DataFrame, z: pd.Series) -> float:
    psu = pd.DataFrame({"h": df.EST_DIS, "u": df.UPM_DIS, "z": z}).groupby(["h", "u"]).z.sum().reset_index()
    var = 0.0
    for _, g in psu.groupby("h"):
        n = len(g)
        if n > 1:
            var += n / (n - 1) * ((g.z - g.z.mean()) ** 2).sum()
    return var


def prop(df, y, dom) -> list:
    """Weighted proportion of y within domain, logit IC95 (p9.estimate computes 1 − proportion)."""
    r, lo, hi = estimate(df.assign(known=y.astype(float)), dom)
    return [round(1 - r, 4), round(1 - hi, 4), round(1 - lo, 4)]


def diff(df, y, dom_a, dom_b) -> list:
    """Difference of two domain proportions (a − b) on the same sample, Taylor-linearized, simple IC95."""
    ya, xa = y.astype(float) * dom_a, dom_a.astype(float)
    yb, xb = y.astype(float) * dom_b, dom_b.astype(float)
    ra, za = _lin(df, ya, xa); rb, zb = _lin(df, yb, xb)
    se = np.sqrt(_var(df, za - zb))
    d = ra - rb
    return [round(d, 4), round(d - 1.96 * se, 4), round(d + 1.96 * se, 4)]


def load_personas(year: int) -> tuple[pd.DataFrame, dict]:
    p = D.PATHS["envipe"] / f"conjunto_de_datos_envipe_{year}_csv.zip"
    z = zipfile.ZipFile(p)
    base = f"tper_vic1_envipe{year}"
    raw = z.read(f"{base}/conjunto_de_datos/conjunto_de_datos_{base}.csv").decode("utf-8", errors="replace")
    df = pd.read_csv(io.StringIO(raw.replace("\r\n", "\n").replace("\r", "\n")), dtype=str, low_memory=False)
    df.columns = [c.upper() for c in df.columns]
    df["w"] = pd.to_numeric(df.FAC_ELE)
    df["ent"] = pd.to_numeric(df.CVE_ENT, errors="coerce")
    cat = _catalog(z, f"{base}/catalogos/ap5_4_01.csv")
    D.check(cat.get("1") == "Mucha confianza" and cat.get("2") == "Algo de confianza", f"catálogo AP5_4 {year}")
    for c in AUTH:
        D.check(set(df[f"AP5_4_{c}"].dropna().str.strip()) - {"1", "2", "3", "4", "9", "b", ""} == set(),
                f"AP5_4_{c} {year}: códigos fuera del catálogo")
    return df, cat


def motivos(year: int) -> dict:
    df, _ = load(year)
    z = zipfile.ZipFile(D.PATHS["envipe"] / f"conjunto_de_datos_envipe_{year}_csv.zip")
    cat = _catalog(z, f"tmod_vic_envipe{year}/catalogos/bp1_23.csv")
    D.check(cat.get("06", "").startswith("Desconfianza") and cat.get("04", "").startswith("Pérdida"), f"catálogo BP1_23 {year}")
    reason = df.BP1_23.fillna("").str.strip()
    no_den = (df.BP1_20 != "1") & (df.BP1_21 != "1")
    valid = reason.isin(list(cat) ) & (reason != "b")
    D.check((valid == no_den).all(), f"BP1_23 {year}: respuesta válida sólo y siempre en delitos no denunciados")
    scope = no_den & ~df.vandalismo
    jal = scope & (df.ent == 14)
    auth = reason.isin(AUTORIDAD)
    out = {"casos_muestra_jalisco": int(jal.sum()), "casos_muestra_nacional": int(scope.sum()),
           "no_denunciados_estimados_jalisco": int(df.loc[jal, "w"].sum()),
           "atribuibles_autoridad": {"jalisco": prop(df, auth, jal), "nacional": prop(df, auth, scope),
                                     "diferencia_jalisco_menos_nacional": diff(df, auth, jal, scope)},
           "por_razon": []}
    for code, label in cat.items():
        if code == "b":
            continue
        y = reason == code
        out["por_razon"].append({"codigo": code, "razon": label, "casos_muestra_jalisco": int((jal & y).sum()),
                                 "jalisco": prop(df, y, jal), "nacional": prop(df, y, scope)})
    out["por_razon"].sort(key=lambda r: -r["jalisco"][0])
    return out


def confianza(year: int) -> dict:
    df, _ = load_personas(year)
    jal_all, nat_all = df.ent == 14, df.ent.notna()
    out = {"personas_muestra_jalisco": int(jal_all.sum()), "personas_muestra_nacional": int(nat_all.sum()), "autoridades": []}
    for c, name in AUTH.items():
        ident = df[f"AP5_3_{c}"].str.strip() == "1"
        conf = df[f"AP5_4_{c}"].fillna("").str.strip().isin(["1", "2"])
        jal, nat = jal_all & ident, nat_all & ident
        out["autoridades"].append({
            "codigo": c, "autoridad": name,
            "identifica": {"jalisco": prop(df, ident, jal_all), "nacional": prop(df, ident, nat_all)},
            "personas_muestra_jalisco": int(jal.sum()),
            "confia": {"jalisco": prop(df, conf, jal), "nacional": prop(df, conf, nat),
                       "diferencia_jalisco_menos_nacional": diff(df, conf, jal, nat)}})
    # Jalisco: Marina/Ejército minus preventive municipal police, among people identifying both.
    prev = df.AP5_3_02.str.strip() == "1"
    conf_prev = df.AP5_4_02.fillna("").str.strip().isin(["1", "2"]).astype(float)
    out["jalisco_brecha_vs_policia_preventiva"] = {}
    for c in ("10", "08"):
        both = jal_all & prev & (df[f"AP5_3_{c}"].str.strip() == "1")
        conf_c = df[f"AP5_4_{c}"].fillna("").str.strip().isin(["1", "2"]).astype(float)
        x = both.astype(float)
        r, zz = _lin(df, (conf_c - conf_prev) * x, x)
        se = np.sqrt(_var(df, zz))
        out["jalisco_brecha_vs_policia_preventiva"][AUTH[c]] = {
            "personas_muestra": int(both.sum()), "diferencia": [round(r, 4), round(r - 1.96 * se, 4), round(r + 1.96 * se, 4)]}
    return out


def run() -> dict:
    res = {y: {"victimizacion_del_año": y - 1, "motivos_no_denuncia": motivos(y), "confianza": confianza(y)} for y in (2026, 2025)}
    m, c = res[2026]["motivos_no_denuncia"], res[2026]["confianza"]
    locales = [a for a in c["autoridades"] if a["codigo"] in LOCALES]
    brecha = c["jalisco_brecha_vs_policia_preventiva"]
    return {
        "pregunta": "¿Por qué no se denuncia en Jalisco, y cuánto se confía en las autoridades?",
        "resultados": res,
        "hipotesis": {
            "H13a": m["atribuibles_autoridad"]["jalisco"][1] > 0.50,
            "H13b": m["por_razon"][0]["codigo"] == "04",
            "H13c": -0.05 <= m["atribuibles_autoridad"]["diferencia_jalisco_menos_nacional"][1]
                    and m["atribuibles_autoridad"]["diferencia_jalisco_menos_nacional"][2] <= 0.05,
            "H13d": sum(a["confia"]["diferencia_jalisco_menos_nacional"][2] < 0 for a in locales) >= 3,
            "H13e": all(v["diferencia"][1] > 0.20 for v in brecha.values()),
        },
    }
