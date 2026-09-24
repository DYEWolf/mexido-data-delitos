"""Pieza 16 — ¿Qué tan inseguro se siente Jalisco, y la percepción sigue la baja del homicidio registrado?

Datos: ENVIPE 2026 (percepción medida en marzo-abril de 2026) y ENVIPE 2025 (marzo-abril de 2025), tabla de personas de
18 años y más (tper_vic1), módulo AP4. Variables verificadas en el diccionario y los catálogos de cada ZIP antes de
calcular (24-09-2026):
  - AP4_3_1 / AP4_3_2 / AP4_3_3: seguridad en su colonia o localidad / municipio / estado (1 seguro, 2 inseguro,
    9 no sabe / no responde); se preguntan a todas las personas elegidas.
  - AP4_4_01..12: seguridad en 12 lugares (1 seguro, 2 inseguro, 3 no aplica, 9 no sabe / no responde).
  - AP4_5_xx: incivilidades en su colonia (1 = sí; 0 = no se declaró); los códigos 01-17 tienen la misma etiqueta en
    los dos años; en 2026 cambian 18-20.
  - AP4_7_2: tendencia esperada de la seguridad en su estado (1 mejorará ... 4 empeorará, 9 no sabe).
  - Entidad y municipio de residencia (CVE_ENT, CVE_MUN), FAC_ELE, EST_DIS, UPM_DIS.
Ningún resultado de este módulo se había visto antes de escribir estas hipótesis; sí se conocen la baja del homicidio
registrado en 2025 (pieza 12: 0.66 [0.60-0.71] en carpetas) y el tamaño de muestra por región (AMG 1,754 personas en
2026; resto del estado, incluidos los Altos, 910).

Hipótesis (declaradas el 24-09-2026 antes de calcular):
  H16a. La mayoría de los adultos de Jalisco se siente insegura en su estado (ENVIPE 2026): IC95 inferior > 50%.
        Refutación: IC95 inferior <= 50%.
  H16b. Jalisco no se aparta del país en la percepción de inseguridad en el estado: IC95 de la diferencia Jalisco −
        nacional dentro de ±5 puntos. Refutación: el IC95 sale de ese rango.
  H16c. En Jalisco la inseguridad se percibe más lejos que cerca: estado > municipio > colonia, y cada diferencia
        (pareada, mismas personas) tiene IC95 inferior > 0. Refutación: alguna de las dos no lo cumple.
  H16d. La percepción no sigue la baja del homicidio registrado: la razón 2026/2025 de la proporción de adultos de
        Jalisco que se siente insegura en su estado tiene IC95 inferior > 0.90 (se descarta una baja mayor a 10%,
        frente a −34% del homicidio). Refutación: IC95 inferior <= 0.90.
  H16e. En el área metropolitana (10 municipios, como en las piezas 1, 5, 12 y 14) la inseguridad en la colonia es
        mayor que en el resto del estado: IC95 de la diferencia AMG − resto > 0. Refutación: IC95 inferior <= 0.
  H16f. El cajero automático en la vía pública es el lugar donde más adultos de Jalisco se sienten inseguros
        (entre quienes el lugar les aplica). Refutación: otro lugar tiene una estimación puntual mayor.

Robustez y descripción (sin hipótesis): todo con ENVIPE 2025; H16d también en colonia y municipio, y como diferencia
de cambios Jalisco − nacional; lugares, incivilidades 01-17 y tendencia esperada, Jalisco contra nacional.

Exploratorio (añadido el 24-09-2026 después de ver los resultados de las dos ediciones):
  E16g. Cambio 2025 → 2026 en Jalisco y en el país de las 17 incivilidades comparables (todas, no solo homicidios y
        disparos, que fueron las que motivaron la pregunta).

Estimador: el de las piezas 9 y 13 (razón ponderada con FAC_ELE, linealización de Taylor con EST_DIS y UPM_DIS, dominios
sin eliminar UPM del diseño, IC95 en escala logit). "No sabe / no responde" queda en el denominador. Diferencias dentro
de una misma edición: linealización sobre la muestra completa (IC95 simple). Entre ediciones (muestras
independientes): varianzas sumadas; la razón usa el método delta en escala logarítmica.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from mvj import data as D
from pieces.p9_cifra_negra import ratio_se
from pieces.p13_no_denuncia_confianza import _lin, _var, diff, load_personas, prop

NIVELES = {"AP4_3_1": "colonia o localidad", "AP4_3_2": "municipio", "AP4_3_3": "estado"}
LUGARES = {"01": "Casa", "02": "Trabajo", "03": "Calle", "04": "Escuela", "05": "Mercado", "06": "Centro comercial",
           "07": "Banco", "08": "Cajero automático en la vía pública", "09": "Transporte público", "10": "Automóvil",
           "11": "Carretera", "12": "Parque o centro recreativo"}
INCIVILIDADES = {"01": "Consumo de alcohol en la calle", "02": "Pandillerismo o bandas violentas", "03": "Riñas entre vecinos",
                 "04": "Venta ilegal de alcohol", "05": "Venta de productos piratas", "06": "Violencia policiaca contra ciudadanos",
                 "07": "Invasión de predios", "08": "Consumo de droga", "09": "Robos o asaltos frecuentes", "10": "Venta de droga",
                 "11": "Disparos frecuentes", "12": "Prostitución", "13": "Secuestros", "14": "Homicidios",
                 "15": "Extorsiones (cobro de piso)", "16": "Robo o venta ilegal de combustible (huachicol)",
                 "17": "Tomas irregulares de luz"}


def _check(df: pd.DataFrame, year: int) -> None:
    for v in NIVELES:
        D.check(set(df[v].fillna("NA").str.strip()) <= {"1", "2", "9"}, f"{v} {year}: códigos fuera de {{1, 2, 9}} o vacíos")
    for c in LUGARES:
        D.check(set(df[f"AP4_4_{c}"].fillna("NA").str.strip()) <= {"1", "2", "3", "9"}, f"AP4_4_{c} {year}: códigos fuera de catálogo")
    for c in INCIVILIDADES:
        D.check(set(df[f"AP4_5_{c}"].fillna("NA").str.strip()) <= {"0", "1"}, f"AP4_5_{c} {year}: códigos fuera de catálogo")
    D.check(set(df.AP4_7_2.fillna("NA").str.strip()) <= {"1", "2", "3", "4", "9"}, f"AP4_7_2 {year}: códigos fuera de catálogo")
    D.check(df.CVE_MUN.notna().all(), f"CVE_MUN {year}: sin vacíos")


def _catalogs(year: int) -> None:
    import zipfile
    from pieces.p13_no_denuncia_confianza import _catalog
    z = zipfile.ZipFile(D.PATHS["envipe"] / f"conjunto_de_datos_envipe_{year}_csv.zip")
    base = f"tper_vic1_envipe{year}/catalogos"
    for v in NIVELES:
        c = {k: D.norm(x) for k, x in _catalog(z, f"{base}/{v.lower()}.csv").items()}
        D.check(c.get("1") == "SEGURO" and c.get("2") == "INSEGURO", f"catálogo {v} {year}: {c}")
    for k in LUGARES:
        c = {k2: D.norm(x) for k2, x in _catalog(z, f"{base}/ap4_4_{k}.csv").items()}
        D.check(c.get("2", "").startswith("INSEGURO") and c.get("3") == "NO APLICA", f"catálogo AP4_4_{k} {year}")
    c = {k: D.norm(x) for k, x in _catalog(z, f"{base}/ap4_7_2.csv").items()}
    D.check(c.get("4") == "EMPEORARA", f"catálogo AP4_7_2 {year}")


def _se(df, y, dom) -> tuple[float, float]:
    x = dom.astype(float)
    return ratio_se(df, y.astype(float) * x, x)


def _paired(df, a, b, dom) -> list:
    x = dom.astype(float)
    r, z = _lin(df, (a.astype(float) - b.astype(float)) * x, x)
    se = np.sqrt(_var(df, z))
    return [round(r, 4), round(r - 1.96 * se, 4), round(r + 1.96 * se, 4)]


def edition(year: int) -> tuple[dict, dict]:
    df, _ = load_personas(year)
    _catalogs(year); _check(df, year)
    m = D.municipios()
    reg = dict(zip(m.cvegeo.str[-3:], m.region))
    jal = df.ent == 14
    nat = df.ent.notna()
    D.check(set(df.loc[jal, "CVE_MUN"].str.strip().str.zfill(3)) <= set(reg), f"CVE_MUN Jalisco {year} fuera del catálogo INEGI")
    amg = jal & (df.CVE_MUN.str.strip().str.zfill(3).map(reg) == "Área metropolitana de Guadalajara")
    resto = jal & ~amg
    ins = {v: df[v].str.strip() == "2" for v in NIVELES}
    out = {"personas_muestra": {"jalisco": int(jal.sum()), "amg": int(amg.sum()), "resto_del_estado": int(resto.sum()),
                                "nacional": int(nat.sum())},
           "inseguro": {}, "gradiente_jalisco": {}, "lugares": [], "incivilidades": [], "tendencia_estado": {}}
    se = {}
    for v, lab in NIVELES.items():
        out["inseguro"][lab] = {"jalisco": prop(df, ins[v], jal), "nacional": prop(df, ins[v], nat),
                                "diferencia_jalisco_menos_nacional": diff(df, ins[v], jal, nat),
                                "amg": prop(df, ins[v], amg), "resto_del_estado": prop(df, ins[v], resto),
                                "diferencia_amg_menos_resto": diff(df, ins[v], amg, resto)}
        se[lab] = {"jalisco": _se(df, ins[v], jal), "nacional": _se(df, ins[v], nat)}
    out["gradiente_jalisco"] = {"estado_menos_municipio": _paired(df, ins["AP4_3_3"], ins["AP4_3_2"], jal),
                                "municipio_menos_colonia": _paired(df, ins["AP4_3_2"], ins["AP4_3_1"], jal)}
    for c, lab in LUGARES.items():
        v = df[f"AP4_4_{c}"].str.strip()
        applies = v != "3"
        out["lugares"].append({"codigo": c, "lugar": lab, "jalisco": prop(df, v == "2", jal & applies),
                               "nacional": prop(df, v == "2", nat & applies),
                               "diferencia_jalisco_menos_nacional": diff(df, v == "2", jal & applies, nat & applies),
                               "personas_muestra_jalisco": int((jal & applies).sum())})
    out["lugares"].sort(key=lambda r: -r["jalisco"][0])
    for c, lab in INCIVILIDADES.items():
        y = df[f"AP4_5_{c}"].str.strip() == "1"
        out["incivilidades"].append({"codigo": c, "incivilidad": lab, "jalisco": prop(df, y, jal), "nacional": prop(df, y, nat),
                                     "diferencia_jalisco_menos_nacional": diff(df, y, jal, nat),
                                     "amg": prop(df, y, amg), "resto_del_estado": prop(df, y, resto)})
        se[f"inc_{c}"] = {"jalisco": _se(df, y, jal), "nacional": _se(df, y, nat)}
    out["incivilidades"].sort(key=lambda r: -r["jalisco"][0])
    t = df.AP4_7_2.str.strip()
    for code, lab in (("1", "mejorará"), ("2", "seguirá igual de bien"), ("3", "seguirá igual de mal"), ("4", "empeorará")):
        out["tendencia_estado"][lab] = {"jalisco": prop(df, t == code, jal), "nacional": prop(df, t == code, nat)}
    return out, se


def _between(a: tuple, b: tuple) -> dict:
    """a = (p, se) newer edition, b = older; independent samples."""
    (pa, sa), (pb, sb) = a, b
    d, sd = pa - pb, np.sqrt(sa ** 2 + sb ** 2)
    r, sl = pa / pb, np.sqrt((sa / pa) ** 2 + (sb / pb) ** 2)
    return {"diferencia": [round(d, 4), round(d - 1.96 * sd, 4), round(d + 1.96 * sd, 4)],
            "razon": [round(r, 3), round(float(r * np.exp(-1.96 * sl)), 3), round(float(r * np.exp(1.96 * sl)), 3)]}


def run() -> dict:
    r26, se26 = edition(2026)
    r25, se25 = edition(2025)
    cambio = {}
    for lab in NIVELES.values():
        j, n = _between(se26[lab]["jalisco"], se25[lab]["jalisco"]), _between(se26[lab]["nacional"], se25[lab]["nacional"])
        (dj, sj), (dn, sn) = [(x["diferencia"][0], (x["diferencia"][2] - x["diferencia"][0]) / 1.96) for x in (j, n)]
        # Jalisco is inside the national sample; treating the two changes as independent slightly overstates the SE.
        dd, sdd = dj - dn, np.sqrt(sj ** 2 + sn ** 2)
        cambio[lab] = {"jalisco_2026_vs_2025": j, "nacional_2026_vs_2025": n,
                       "cambio_jalisco_menos_cambio_nacional": [round(dd, 4), round(dd - 1.96 * sdd, 4), round(dd + 1.96 * sdd, 4)]}
    e16g = []
    for c, lab in INCIVILIDADES.items():
        k = f"inc_{c}"
        e16g.append({"codigo": c, "incivilidad": lab,
                     "jalisco_2026_vs_2025": _between(se26[k]["jalisco"], se25[k]["jalisco"]),
                     "nacional_2026_vs_2025": _between(se26[k]["nacional"], se25[k]["nacional"])})
    e16g.sort(key=lambda r: r["jalisco_2026_vs_2025"]["diferencia"][0])
    est = r26["inseguro"]["estado"]
    g = r26["gradiente_jalisco"]
    col = r26["inseguro"]["colonia o localidad"]
    return {
        "pregunta": "¿Qué tan inseguro se siente Jalisco, y la percepción sigue la baja del homicidio registrado?",
        "resultados": {2026: {"levantamiento": "marzo-abril 2026", **r26}, 2025: {"levantamiento": "marzo-abril 2025", **r25}},
        "cambio_2025_a_2026": cambio,
        "E16g_cambio_incivilidades": e16g,
        "hipotesis": {
            "H16a": est["jalisco"][1] > 0.50,
            "H16b": -0.05 <= est["diferencia_jalisco_menos_nacional"][1] and est["diferencia_jalisco_menos_nacional"][2] <= 0.05,
            "H16c": g["estado_menos_municipio"][1] > 0 and g["municipio_menos_colonia"][1] > 0,
            "H16d": cambio["estado"]["jalisco_2026_vs_2025"]["razon"][1] > 0.90,
            "H16e": col["diferencia_amg_menos_resto"][1] > 0,
            "H16f": r26["lugares"][0]["codigo"] == "08",
            "E16g": "exploratoria",
        },
    }
