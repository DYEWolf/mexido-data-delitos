"""Pieza 15 — ¿Dónde ocurren los homicidios, y cuántas mujeres asesinadas en su casa llegan a contarse como feminicidio?

Datos: INEGI defunciones, homicidios ocurridos en Jalisco en 2019-2023 (años con registro prácticamente completo),
variables lugar_ocur (lugar donde ocurrió la lesión), sitio_ocur (sitio de la defunción), vio_fami y par_agre;
SESNSP víctimas estatales de feminicidio y de homicidio doloso por sexo, 2019-2023.

Transparencia. Antes de escribir esta pieza se conocían la tasa estatal de carpetas de feminicidio (pieza 6: 0.8 → 0.4
por 100 mil, 2019-2025) y el porcentaje de hombres entre víctimas de homicidio INEGI (pieza 7: 89.2%). No se había
visto ningún conteo por lugar de ocurrencia ni las víctimas de feminicidio u homicidio doloso por sexo en 2019-2023.

Hipótesis (declaradas el 24-09-2026 antes de calcular):
  H15a. Las mujeres asesinadas mueren en una vivienda particular (lugar_ocur = 0) mucho más que los hombres: razón de
        proporciones mujeres/hombres, entre homicidios con lugar conocido, con IC95 inferior > 1.5.
        Refutación: IC95 inferior <= 1.5.
  H15b. Las mujeres asesinadas en una vivienda particular (INEGI) son más que las víctimas de feminicidio que registra
        el SESNSP en el mismo periodo: razón INEGI/SESNSP con IC95 exacto condicional inferior > 1.
        Refutación: IC95 inferior <= 1.
  H15c. El SESNSP clasifica como feminicidio menos de una cuarta parte de los asesinatos de mujeres: víctimas de
        feminicidio / (feminicidio + mujeres víctimas de homicidio doloso), 2019-2023, con IC95 superior (Wilson) < 25%.
        Refutación: IC95 superior >= 25%.

Robustez (sin hipótesis): H15b con sitio_ocur = 11 (hogar) en lugar de lugar_ocur = 0.
Exploratorio:
  E15d. Entre mujeres asesinadas en vivienda particular: proporción con violencia familiar registrada (vio_fami = 1;
        la variable no existe en el archivo de 2022) y parentesco con el agresor (par_agre) agrupado.
  E15e. Serie anual 2019-2023: mujeres asesinadas en vivienda (INEGI) y víctimas de feminicidio (SESNSP).

Validación de códigos (el análisis se detiene si falla), igual que ingest/defunciones.py: el catálogo de lugar y el
de sitio de cada ZIP se leen por separado; en cada año, las etiquetas de los códigos que se usan deben ser las
esperadas (lugar 0 = vivienda particular, 4 = calle o carretera, 9 = se ignora, 88 = no aplica para muerte natural;
sitio 10 = vía pública, 11 = hogar, 99 = no especificado); ningún código en los datos puede faltar en el catálogo de su
año; y entre homicidios, el código 88 ("no aplica para muerte natural") debe ser menos de 1%.

Límites: un feminicidio no ocurre necesariamente en una vivienda, ni todo asesinato de una mujer en su casa es
feminicidio; H15b compara magnitudes, no casos. INEGI cuenta víctimas por certificado de defunción; el SESNSP, víctimas
en carpetas de investigación.
"""
from __future__ import annotations

import io
import zipfile

import numpy as np
import pandas as pd
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D
from pieces.p12_caida_homicidio import rate_ratio

YEARS = (2019, 2023)
EXPECT = {"lugar_ocurrencia": {"0": "VIVIENDA PARTICULAR", "4": "CALLE O CARRETERA", "9": "SE IGNORA", "88": "NO APLICA"},
          "sitio_ocurrencia": {"10": "VIA PUBLICA", "11": "HOGAR", "99": "NO ESPECIFICADO"}}
# par_agre (catálogo idéntico 2018-2024 en los códigos 1-72): pareja o expareja = cónyuge, concubino(a), amante,
# novio(a), ex esposo(a); otro familiar = 1-44 sin cónyuges, y 70; no familiar = 53-69, 71, 72; el resto (88, 98, 99,
# vacío) = parentesco no registrado. El significado de 88 cambia entre años, por eso cuenta como no registrado.
PAREJA = {"11", "12"} | {str(c) for c in range(45, 53)}
FAMILIAR = ({str(c) for c in range(1, 45)} - PAREJA) | {"70"}
NO_FAMILIAR = {str(c) for c in range(53, 70)} | {"71", "72"}
PAR_EXPECT = {"11": "ESPOSO", "12": "ESPOSA", "45": "CONCUBINO", "50": "NOVIA", "51": "EX ESPOSO", "70": "OTRO FAMILIAR",
              "71": "SIN PARENTESCO", "72": "NINGUNO"}


def catalog(z: zipfile.ZipFile, name: str) -> dict:
    raw = z.read(f"catalogos/{name}.csv")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin1")
    out = {}
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")[1:]:
        if "," not in line:
            continue
        code, desc = line.split(",", 1)
        if code.strip().isdigit():
            out[code.strip()] = D.norm(desc.strip().rstrip(",").strip('"'))
    return out


def load() -> tuple[pd.DataFrame, dict]:
    d = D.defunciones()
    h = d[(d.tipo == "homicidio")].copy()
    folder = D.PATHS["defunciones"].parent
    cats = {}
    for arch in sorted(h.archivo.unique()):
        p = folder / arch; D._sha(p)
        z = zipfile.ZipFile(p)
        c = {k: catalog(z, k) for k in EXPECT}
        c["parentesco_agresor"] = catalog(z, "parentesco_agresor")
        for code, lab in PAR_EXPECT.items():
            D.check(c["parentesco_agresor"].get(code, "").startswith(lab), f"{arch} par_agre {code}: '{c['parentesco_agresor'].get(code)}'")
        for k, exp in EXPECT.items():
            for code, lab in exp.items():
                D.check(c[k].get(code, "").startswith(lab), f"{arch} {k} {code}: '{c[k].get(code)}' no es '{lab}'")
        rows = h[h.archivo == arch]
        for col, k in (("lugar_ocur", "lugar_ocurrencia"), ("sitio_ocur", "sitio_ocurrencia")):
            extra = set(rows[col].dropna()) - set(c[k])
            D.check(not extra, f"{arch} {col}: códigos fuera del catálogo {extra}")
        D.check((rows.lugar_ocur == "88").mean() < 0.01, f"{arch}: homicidios con lugar 'no aplica' >= 1%")
        cats[arch] = c
    return h, cats


def run() -> dict:
    h, cats = load()
    h = h[h.anio_ocur.between(*YEARS)]
    h = h.assign(sexo=h.sexo.map({"1": "HOMBRE", "2": "MUJER"}))
    last = cats[sorted(cats)[-1]]
    known = h[~h.lugar_ocur.isin(["9", "88"]) & h.sexo.notna()]
    lug = known.groupby(["sexo", "lugar_ocur"]).size().unstack(0, fill_value=0)
    lug.index = [last["lugar_ocurrencia"].get(c, c) for c in lug.index]
    pct = (lug / lug.sum() * 100).round(1)

    # H15a: ratio of proportions (Katz log interval).
    kw, nw = int(((known.sexo == "MUJER") & (known.lugar_ocur == "0")).sum()), int((known.sexo == "MUJER").sum())
    km, nm = int(((known.sexo == "HOMBRE") & (known.lugar_ocur == "0")).sum()), int((known.sexo == "HOMBRE").sum())
    rp = (kw / nw) / (km / nm)
    se = np.sqrt(1 / kw - 1 / nw + 1 / km - 1 / nm)
    h15a = [round(rp, 2), round(rp * np.exp(-1.96 * se), 2), round(rp * np.exp(1.96 * se), 2)]

    # SESNSP victims by sex, 2019-2023.
    v = D.victimas_estatal()
    v = v[v.year.between(*YEARS)]
    fem = v[(v.subtipo == "Feminicidio")].groupby("year").n.sum().reindex(range(YEARS[0], YEARS[1] + 1), fill_value=0)
    hdm = v[(v.subtipo == "Homicidio doloso") & (v.Sexo == "Mujer")].groupby("year").n.sum().reindex(fem.index, fill_value=0)
    D.check((v[v.subtipo == "Feminicidio"].Sexo == "Mujer").all() or v[(v.subtipo == "Feminicidio") & (v.Sexo != "Mujer")].n.sum() == 0,
            "víctimas de feminicidio: todas mujeres")

    w = h[h.sexo == "MUJER"]
    viv = w[w.lugar_ocur == "0"]
    hog = w[w.sitio_ocur == "11"]
    viv_y = viv.groupby("anio_ocur").size().reindex(fem.index, fill_value=0)
    F, V, Hg, M = int(fem.sum()), int(len(viv)), int(len(hog)), int(hdm.sum())
    h15b = rate_ratio(V, F, 1, 1)
    h15c = proportion_confint(F, F + M, method="wilson")

    # E15d: violencia familiar y parentesco entre mujeres asesinadas en vivienda.
    vf = viv[viv.vio_fami.notna() & (viv.vio_fami != "")]
    vf_known = vf[~vf.vio_fami.isin(["8", "9"])]
    k_vf = int((vf_known.vio_fami == "1").sum())
    ci_vf = proportion_confint(k_vf, max(len(vf_known), 1), method="wilson")
    par = viv.par_agre.fillna("")
    grupos = {"pareja_o_expareja": par.isin(PAREJA), "otro_familiar": par.isin(FAMILIAR), "no_familiar": par.isin(NO_FAMILIAR)}
    par_n = {k: int(m.sum()) for k, m in grupos.items()}
    par_n["no_registrado"] = int(len(par) - sum(par_n.values()))
    return {
        "pregunta": "¿Dónde ocurren los homicidios, y cuántas mujeres asesinadas en su casa se cuentan como feminicidio?",
        "periodo_ocurrencia": list(YEARS),
        "homicidios": {"total": int(len(h)), "lugar_conocido": int(len(known)),
                       "lugar_se_ignora_pct": round(float(h.lugar_ocur.isin(["9"]).mean() * 100), 1)},
        "lugar_por_sexo_pct": pct.to_dict(), "lugar_por_sexo_n": lug.to_dict(),
        "H15a_vivienda": {"mujeres": [kw, nw, round(kw / nw, 4)], "hombres": [km, nm, round(km / nm, 4)],
                          "razon_mujeres_hombres": h15a},
        "H15b_vivienda_vs_feminicidio": {"mujeres_asesinadas_en_vivienda_inegi": V, "victimas_feminicidio_sesnsp": F,
                                         "razon": h15b,
                                         "robustez_hogar_sitio_ocur": {"mujeres_muertas_en_hogar_inegi": Hg, "razon": rate_ratio(Hg, F, 1, 1)}},
        "H15c_feminicidio_entre_asesinatos_de_mujeres": {"feminicidio": F, "homicidio_doloso_mujeres": M,
                                                          "proporcion": [round(F / (F + M), 4), round(h15c[0], 4), round(h15c[1], 4)]},
        "mujeres_asesinadas_inegi": int(len(w)),
        "E15d": {"con_variable_vio_fami": int(len(vf)), "vio_fami_conocida": int(len(vf_known)),
                 "hubo_violencia_familiar": [k_vf, round(k_vf / max(len(vf_known), 1), 4), round(ci_vf[0], 4), round(ci_vf[1], 4)],
                 "parentesco_agresor": par_n,
                 "nota": "El SESNSP y el INEGI no se cruzan caso por caso; el parentesco solo se registra cuando se conoce."},
        "E15e_serie": {int(y): {"mujeres_en_vivienda_inegi": int(viv_y[y]), "feminicidio_sesnsp": int(fem[y]),
                                "homicidio_doloso_mujeres_sesnsp": int(hdm[y])} for y in fem.index},
        "hipotesis": {"H15a": h15a[1] > 1.5, "H15b": h15b[1] > 1, "H15c": h15c[1] < 0.25,
                      "E15d": "exploratoria", "E15e": "exploratoria"},
    }
