"""Pieza 25 — ¿El registro de fosas de la Fiscalía deja fuera lo que otras fuentes sí ven?

Datos. Registro de sitios de la Fiscalía Especial en Personas Desaparecidas de Jalisco (pieza 8; sitios desde oct 2018,
corte 31-08-2026) contra la Plataforma Ciudadana de Fosas (PDH IBERO, ARTICLE 19 y Data Cívica; base 2024, descargada
el 25-09-2026), que trae tres bases por municipio y año, 2006-2024: fiscalía estatal (vía transparencia), FGR (vía
transparencia) y prensa (con una cota baja y una alta). Ventana común: 2019-2024. En la pieza 8, un sitio cuenta en el
año de su fecha de inicio. La clave 14000 de la Plataforma (sin municipio) queda fuera de la comparación municipal y
se reporta.

Transparencia. Se conocen los resultados de la pieza 8 (95.1% de las víctimas en el área metropolitana; 11 de 115
municipios fuera de ella con algún sitio). De la Plataforma solo se revisaron la estructura (columnas, años, 32
entidades, 126 claves de Jalisco) y su página de presentación (dice que en Jalisco usa datos de la fiscalía y de
servicios forenses). No se ha visto ninguna cifra de Jalisco de la Plataforma.

Hipótesis (declaradas el 25-09-2026 antes de calcular):
  H25a. La prensa registra fosas fuera del área metropolitana donde el registro de la Fiscalía no tiene ningún sitio:
        al menos 5 municipios fuera del área metropolitana con fosas en la prensa (cota baja >= 1) en 2019-2024 y
        ningún sitio en todo el registro de la pieza 8. Refutación: 4 o menos.
  H25b. La concentración metropolitana es menor en la prensa que en el registro: la razón (cuerpos en el área
        metropolitana / cuerpos fuera) de la prensa (cota baja), dividida entre la misma razón con las víctimas del
        registro en sitios iniciados en 2019-2024, tiene IC95 exacto condicional (Fisher) superior < 1.
        Refutación: IC95 superior >= 1.
  H25c. La base de fiscalía de la Plataforma y el registro de la pieza 8 son consistentes: cuerpos 2019-2024 de la
        base de fiscalía dentro de ±10% de las víctimas del registro en sitios iniciados en 2019-2024.
        Refutación: diferencia mayor a 10%.
Exploratorio:
  E25d. Series anuales 2019-2024 de las cuatro fuentes; municipios con fosas según cada fuente; FGR contra fiscalía.
  E25e. (Agregado el 25-09-2026 después de ver H25c.) Cuerpos más restos o fragmentos de la base de fiscalía por año,
        contra víctimas del registro, para ver si la diferencia de H25c es de unidades. No cambia ningún veredicto.
Límite declarado: los cuerpos se agrupan en fosas, así que los intervalos que tratan cada cuerpo como independiente son
más estrechos de lo que deberían; se reporta también la comparación por fosas.
"""
from __future__ import annotations

import pandas as pd

from mvj import data as D
from pieces.p18_feminicidio_region import _or

YEARS = (2019, 2024)
AMG = "Área metropolitana de Guadalajara"


def run() -> dict:
    mun = D.municipios().set_index("cvegeo")
    amg = set(mun.index[mun.region == AMG])
    reg = D.fosas()
    reg["year"] = pd.to_numeric(reg.inicio.str.split("/").str[1], errors="coerce")
    D.check(reg.year.notna().all(), "fosas: año de inicio legible en todos los sitios")
    rw = reg[reg.year.between(*YEARS)]
    con_sitio = set(reg.cvegeo)

    src = {k: D.pcdf(k) for k in ("fiscalia", "fgr", "prensa")}
    w = {k: v[v.year.between(*YEARS)] for k, v in src.items()}
    col = {"fiscalia": ("total_fosas", "total_cuerpos"), "fgr": ("total_fosas", "total_cuerpos"),
           "prensa": ("fosas_bajo", "cuerpos_bajo")}

    def split(df, c):
        m = df[df.cvegeo.isin(mun.index)]
        return int(m[m.cvegeo.isin(amg)][c].sum()), int(m[~m.cvegeo.isin(amg)][c].sum()), int(df[~df.cvegeo.isin(mun.index)][c].sum())

    # H25a
    p = w["prensa"]
    pm = p[p.cvegeo.isin(mun.index) & ~p.cvegeo.isin(amg)].groupby("cvegeo").fosas_bajo.sum()
    prensa_fuera = set(pm[pm >= 1].index)
    sin_registro = sorted(prensa_fuera - con_sitio)

    # H25b
    r_amg = int(rw[rw.cvegeo.isin(amg)].localizadas.sum()); r_out = int(rw[~rw.cvegeo.isin(amg)].localizadas.sum())
    pc_amg, pc_out, pc_sin = split(p, "cuerpos_bajo")
    h25b = _or(pc_amg, pc_out, r_amg, r_out)
    pf_amg, pf_out, _ = split(p, "fosas_bajo")
    s_amg, s_out = int(rw.cvegeo.isin(amg).sum()), int((~rw.cvegeo.isin(amg)).sum())
    h25b_fosas = _or(pf_amg, pf_out, s_amg, s_out)

    # H25c
    fis_cuerpos = int(w["fiscalia"].total_cuerpos.sum())
    reg_vict = int(rw.localizadas.sum())
    dif = fis_cuerpos / reg_vict - 1

    # E25d
    serie = {}
    for y in range(YEARS[0], YEARS[1] + 1):
        ry = reg[reg.year == y]
        serie[y] = {"registro_sitios": int(len(ry)), "registro_victimas": int(ry.localizadas.sum()),
                    **{f"{k}_fosas": int(src[k].loc[src[k].year == y, col[k][0]].sum()) for k in src},
                    **{f"{k}_cuerpos": int(src[k].loc[src[k].year == y, col[k][1]].sum()) for k in src},
                    "prensa_cuerpos_alto": int(src["prensa"].loc[src["prensa"].year == y, "cuerpos_alto"].sum())}
    municipios = {"registro_2019_2024": sorted(mun.loc[sorted(set(rw.cvegeo) & set(mun.index)), "nombre"]),
                  **{k: sorted(mun.loc[sorted(set(w[k].loc[w[k][col[k][0]] > 0, "cvegeo"]) & set(mun.index)), "nombre"])
                     for k in src}}
    reparto = {k: dict(zip(("amg", "fuera", "sin_municipio"), split(w[k], col[k][1]))) for k in src}
    reparto["registro"] = {"amg": r_amg, "fuera": r_out, "sin_municipio": 0}

    wf = w["fiscalia"]
    from pieces.p7_victimas import TWELVE
    ff = set(wf.loc[(wf.total_fosas > 0) & wf.cvegeo.isin(mun.index) & ~wf.cvegeo.isin(amg), "cvegeo"])
    fis_sin = sorted(mun.loc[sorted(ff - con_sitio), "nombre"])
    union = sorted(set(fis_sin) | set(mun.loc[sin_registro, "nombre"]))
    e25e = {int(y): {"cuerpos": int(g.total_cuerpos.sum()), "restos_fragmentos": int(g.total_restos_fragmentos.sum()),
                     "registro_victimas": int(reg.loc[reg.year == y, "localizadas"].sum())} for y, g in wf.groupby("year")}

    return {
        "pregunta": "¿El registro de fosas de la Fiscalía deja fuera lo que otras fuentes sí ven?",
        "ventana": list(YEARS),
        "H25a_prensa_fuera_amg_sin_sitio_en_registro": {"municipios_prensa_fuera_amg": sorted(mun.loc[sorted(prensa_fuera), "nombre"]),
                                                       "sin_ningun_sitio_en_registro": sorted(mun.loc[sin_registro, "nombre"]),
                                                       "n": len(sin_registro)},
        "H25b_concentracion": {"prensa_cuerpos": [pc_amg, pc_out], "prensa_cuerpos_sin_municipio": pc_sin,
                               "registro_victimas": [r_amg, r_out],
                               "prensa_proporcion_amg": round(pc_amg / (pc_amg + pc_out), 4) if pc_amg + pc_out else None,
                               "registro_proporcion_amg": round(r_amg / (r_amg + r_out), 4),
                               "razon_de_razones": h25b,
                               "por_fosas_y_sitios": {"prensa_fosas": [pf_amg, pf_out], "registro_sitios": [s_amg, s_out],
                                                      "razon_de_razones": h25b_fosas}},
        "H25c_fiscalia_plataforma_vs_registro": {"plataforma_fiscalia_cuerpos": fis_cuerpos, "registro_victimas": reg_vict,
                                                 "diferencia_relativa": round(dif, 4)},
        "E25d_serie_anual": serie,
        "E25d_municipios_con_fosas_2019_2024": municipios,
        "E25d_reparto_cuerpos_2019_2024": reparto,
        "E25d_fuera_amg_sin_sitio_en_registro": {"base_fiscalia": fis_sin, "prensa_o_base_fiscalia": union,
                                                 "de_ellos_en_los_12_de_violencia_oculta": sorted(set(union) & set(TWELVE))},
        "E25e_fiscalia_cuerpos_y_restos": {"por_año": e25e, "total_cuerpos_mas_restos": int(wf.total_cuerpos.sum() + wf.total_restos_fragmentos.sum())},
        "hipotesis": {"H25a": len(sin_registro) >= 5, "H25b": h25b[2] < 1, "H25c": abs(dif) <= 0.10, "E25d": "exploratoria", "E25e": "exploratoria"},
    }
