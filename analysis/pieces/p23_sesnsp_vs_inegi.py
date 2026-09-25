"""Pieza 23 — ¿El homicidio que registra el SESNSP sigue a los certificados de defunción? Réplica 2015-2018.

Por qué importa. La caída del homicidio de 2025 solo está en los registros del SESNSP; INEGI aún no publica 2025
(pieza 12). Si en los años con las dos fuentes el SESNSP se aleja de los certificados de defunción, una caída del SESNSP
no se puede leer sin más como menos muertes.

Datos. INEGI: homicidios ocurridos en Jalisco por año de ocurrencia (años de registro 2015-2024: las dos extracciones,
sin años de registro en común), por municipio de ocurrencia. SESNSP: víctimas estatales de homicidio doloso y de
feminicidio (INEGI no separa el feminicidio; se suman para comparar lo mismo) y carpetas de homicidio doloso por
municipio. Población CONAPO.

Transparencia. Ya se conocen: las series anuales 2019-2023 de carpetas y víctimas de homicidio doloso del SESNSP y de
homicidios INEGI (§3.3: la razón víctimas/INEGI va de 1.06 en 2019 a 1.23 en 2023), el acuerdo municipal 2019-2023
(Spearman 0.91, pieza 7), las víctimas de feminicidio 2019-2023 (pieza 15) y las mujeres asesinadas por INEGI en
2015-2018 (pieza 20). Pueden haberse visto las víctimas SESNSP 2015-2018 en verificaciones (víctimas >= carpetas). No se
ha visto ningún conteo total de homicidios INEGI 2015-2018 por año de ocurrencia ni por municipio. Por eso las pruebas
usan 2015-2018 como réplica fuera de muestra, y todo lo que incluye 2019-2023 es exploratorio.

Hipótesis (declaradas el 25-09-2026 antes de calcular):
  H23a. La distancia entre las fuentes crece con el tiempo: la razón víctimas SESNSP (homicidio doloso + feminicidio) /
        homicidios INEGI de 2015-2018 es menor que la de 2019-2023. Razón de razones con IC95 exacto condicional
        (Fisher, como H18a) superior < 1. Refutación: IC95 superior >= 1.
  H23b. En 2015-2018 las dos fuentes coinciden en dónde hay más homicidio: Spearman entre tasas municipales de carpetas
        de homicidio doloso (SESNSP) y de homicidios (INEGI), 125 municipios, IC95 (Fisher con error estándar de
        Bonett-Wright, como la pieza 1) inferior > 0.80. Refutación: IC95 inferior <= 0.80.
  H23c. La celda de "violencia oculta" de la pieza 1 se sostiene con homicidios INEGI 2015-2018: al menos 9 de los 12
        municipios siguen con homicidio creíblemente bajo y desaparición creíblemente alta (mismo método que H7b).
        Refutación: 8 o menos.

Exploratorio (incluye años ya vistos):
  E23d. Serie anual 2015-2023 de víctimas SESNSP, carpetas SESNSP y homicidios INEGI, con la razón víctimas/INEGI de
        cada año y su IC95 exacto; tendencia 2015-2023 de la razón (Poisson de víctimas con offset log(INEGI) y escala de
        Pearson). También homicidios + muertes de intención no determinada (INEGI).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm

from mvj import data as D
from pieces import p1_regiones as P1
from pieces.p7_victimas import TWELVE
from pieces.p12_caida_homicidio import rate_ratio
from pieces.p18_feminicidio_region import _or

NEW, OLD = (2015, 2018), (2019, 2023)
YEARS = range(2015, 2024)


def run() -> dict:
    new, old = D.defunciones_2015_2017(), D.defunciones()
    D.check(not set(new.anio_regis) & set(old.anio_regis), "defunciones: las dos extracciones comparten años de registro")
    d = pd.concat([old, new], ignore_index=True)
    hom = d[d.tipo == "homicidio"]
    ind = d[d.tipo.str.contains("no determinada|se ignora", case=False, na=False)]
    tipos = sorted(d.tipo.dropna().unique().tolist())
    D.check(len(ind) > 0, f"tipo de intención no determinada no encontrado en {tipos}")
    inegi = hom.groupby("anio_ocur").size().reindex(YEARS, fill_value=0)
    inegi_ind = ind.groupby("anio_ocur").size().reindex(YEARS, fill_value=0)

    vic = D.victimas_estatal()
    vh = vic[vic.subtipo == "Homicidio doloso"].groupby("year").n.sum().reindex(YEARS, fill_value=0)
    vf = vic[vic.subtipo == "Feminicidio"].groupby("year").n.sum().reindex(YEARS, fill_value=0)
    v = vh + vf
    s = D.sesnsp()
    carp = s[(s.subtipo == "Homicidio doloso") & (s.year <= 2025)]
    cy = carp.groupby("year").n.sum().reindex(YEARS, fill_value=0)

    sn = lambda x, p: int(x.loc[p[0]:p[1]].sum())
    h23a = _or(sn(v, NEW), sn(inegi, NEW), sn(v, OLD), sn(inegi, OLD))

    # H23b: acuerdo municipal 2015-2018.
    mun = D.municipios().set_index("cvegeo")
    pop = D.conapo()
    py = pop[pop.year.between(*NEW)].groupby("cvegeo").pop.sum().reindex(mun.index)
    hn = hom[hom.anio_ocur.between(*NEW)]
    both = pd.DataFrame({"inegi": hn.groupby("cvegeo").size(),
                         "sesnsp": carp[carp.year.between(*NEW)].groupby("cvegeo").n.sum()}).reindex(mun.index).fillna(0)
    rho = float(stats.spearmanr(both.inegi / py, both.sesnsp / py).statistic)
    se = np.sqrt((1 + rho ** 2 / 2) / (len(both) - 3))
    rho_ci = [round(float(x), 3) for x in np.tanh(np.arctanh(rho) + np.array([-1.96, 1.96]) * se)]
    sin_mun = {"inegi_sin_municipio": int(hn.cvegeo.isna().sum() + (~hn.cvegeo.isin(mun.index) & hn.cvegeo.notna()).sum()),
               "sesnsp_sin_municipio": int(carp[carp.year.between(*NEW) & ~carp.cvegeo.isin(mun.index)].n.sum())}

    # H23c: pieza 1 con INEGI 2015-2018 (como H7b).
    rm = D.repd_map().dropna(subset=["cvegeo"]).set_index("cvegeo")
    t = mun.join(pd.DataFrame({"pop2025": pop[pop.year == 2025].groupby("cvegeo").pop.sum(), "desap": rm.desaparecidas,
                               "py_2015": py, "hom_2015": hn.groupby("cvegeo").size()})).fillna({"hom_2015": 0})
    res = P1.analyze(t, NEW)
    tab = res.pop("_tabla")
    cell = set(tab[(tab.homicidio == "bajo") & (tab.desaparicion == "alto")].nombre)
    kept = sorted(cell & set(TWELVE))

    # E23d: serie anual y tendencia de la razón.
    serie = {int(y): {"victimas_sesnsp_homicidio_doloso": int(vh[y]), "victimas_sesnsp_feminicidio": int(vf[y]),
                      "carpetas_sesnsp_homicidio_doloso": int(cy[y]), "homicidios_inegi": int(inegi[y]),
                      "intencion_no_determinada_inegi": int(inegi_ind[y]),
                      "razon_victimas_sesnsp_inegi": rate_ratio(int(v[y]), int(inegi[y]), 1, 1)} for y in YEARS}
    yrs = list(YEARS)
    fit = sm.GLM(v.loc[yrs].values.astype(float), sm.add_constant(np.arange(len(yrs))), family=sm.families.Poisson(),
                 offset=np.log(inegi.loc[yrs].values.astype(float))).fit(scale="X2")
    tr = [round(float((np.exp(x) - 1) * 100), 1) for x in (fit.params[1], *fit.conf_int()[1])]

    return {
        "pregunta": "¿El homicidio que registra el SESNSP sigue a los certificados de defunción?",
        "definiciones": {"sesnsp": "víctimas de homicidio doloso + feminicidio (estatal); carpetas de homicidio doloso (municipal)",
                         "inegi": "homicidios ocurridos en Jalisco, año de ocurrencia, registros 2015-2024",
                         "tipos_inegi": tipos},
        "H23a_razon_2015_2018_vs_2019_2023": {"2015_2018": [sn(v, NEW), sn(inegi, NEW), rate_ratio(sn(v, NEW), sn(inegi, NEW), 1, 1)],
                                             "2019_2023": [sn(v, OLD), sn(inegi, OLD), rate_ratio(sn(v, OLD), sn(inegi, OLD), 1, 1)],
                                             "razon_de_razones": h23a},
        "H23b_spearman_municipal_2015_2018": {"rho": round(rho, 3), "ic95": rho_ci, **sin_mun,
                                              "carpetas_sesnsp": int(both.sesnsp.sum()), "homicidios_inegi": int(both.inegi.sum())},
        "H23c_violencia_oculta_inegi_2015_2018": {"celda": sorted(cell), "de_los_12_se_mantienen": kept, "n_mantenidos": len(kept),
                                                   "spearman_tasas_desaparicion_homicidio": res["spearman"]},
        "E23d_serie_anual": serie,
        "E23d_tendencia_razon_2015_2023_pct_anual": tr,
        "hipotesis": {"H23a": h23a[2] < 1, "H23b": rho_ci[0] > 0.80, "H23c": len(kept) >= 9, "E23d": "exploratoria"},
    }
