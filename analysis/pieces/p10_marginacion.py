"""Pieza 10 — ¿La desaparición sigue a la marginación y a la ruralidad, y el homicidio no?

Hipótesis (declaradas antes de calcular):
  H10a. La tasa municipal de personas desaparecidas aumenta con la marginación (IRR por 1 DE > 1, IC95 > 1).
  H10b. La tasa de homicidio (INEGI, ocurridos 2019-2023) NO aumenta con la marginación (IC95 del IRR incluye 1 o < 1).
  H10c. La proporción desaparición/(desaparición + homicidio) aumenta con la marginación (OR por 1 DE > 1, IC95 > 1).
  H10d. Los efectos anteriores se mantienen al controlar ruralidad (% de población en localidades < 5 mil habitantes).
Refutación: si desaparición y homicidio responden igual a la marginación, la diferencia territorial no se explica
por condiciones socioeconómicas.

Método. Regresión binomial negativa (conteos con sobre-dispersión) con offset log(población). Marginación: índice
CONAPO 2020 (IM_2020; en la metodología 2020 un valor MAYOR significa MENOS marginación), usado como −z(IM_2020)
para que "más" sea "más marginado". Ruralidad: PL.5000 estandarizada. H10c: GLM binomial con D y H como éxitos y
fracasos. Asociación ecológica a nivel municipio; no implica causalidad ni se aplica a personas.

Corrección registrada 2026-09-24: el modelo de H10c/H10d no corregía la sobre-dispersión (la razón D/(D+H) varía
entre municipios mucho más que lo binomial; ver pieza 1), y sus intervalos salían varias veces más estrechos. Ahora
los errores estándar se escalan por la raíz del estadístico de Pearson entre sus grados de libertad (cuasi-binomial).
Sensibilidad añadida: el mismo modelo sin los 10 municipios del área metropolitana, que concentran dos tercios de D+H.
Advertencia: PL.5000 es uno de los nueve indicadores del propio índice de marginación CONAPO 2020, así que "controlar
por ruralidad" retira del índice parte de sí mismo.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

from mvj import data as D


def irr(fit, term):
    b = fit.params[term]; lo, hi = fit.conf_int().loc[term]
    return [round(float(np.exp(b)), 3), round(float(np.exp(lo)), 3), round(float(np.exp(hi)), 3)]


def ratio_or(df: pd.DataFrame, terms: list[str]) -> tuple[dict, float]:
    """OR por 1 DE de D/(D+H): GLM binomial (éxitos D, fracasos H) con errores escalados por la dispersión de Pearson."""
    df = df[(df.D + df.H) > 0]
    fit = sm.GLM(df[["D", "H"]].to_numpy(float), sm.add_constant(df[terms]), family=sm.families.Binomial()).fit()
    phi = fit.pearson_chi2 / fit.df_resid
    out = {}
    for k in terms:
        se = fit.bse[k] * np.sqrt(phi)
        out[k] = [round(float(np.exp(fit.params[k] + z * se)), 3) for z in (0, -1.96, 1.96)]
    return out, round(float(phi), 1)


def run() -> dict:
    mun = D.municipios().set_index("cvegeo")
    im = D.marginacion().set_index("cvegeo")
    pop = D.conapo()
    rm = D.repd_map().dropna(subset=["cvegeo"]).set_index("cvegeo")
    dd = D.defunciones()
    h = dd[(dd.tipo == "homicidio") & dd.anio_ocur.between(2019, 2023)].groupby("cvegeo").size()
    t = mun.join(pd.DataFrame({
        "D": rm.desaparecidas, "H": h,
        "pop25": pop[pop.year == 2025].groupby("cvegeo").pop.sum(),
        "py": pop[pop.year.between(2019, 2023)].groupby("cvegeo").pop.sum(),
        "marg": -(im.IM_2020 - im.IM_2020.mean()) / im.IM_2020.std(),
        "rural": (im["PL.5000"] - im["PL.5000"].mean()) / im["PL.5000"].std(),
        "grado": im.GM_2020})).fillna({"H": 0})
    t["log_pop25"] = np.log(t.pop25); t["log_py"] = np.log(t.py)

    def nb(formula, offset):
        # Estimate NB dispersion alpha by ML first, then fit GLM with that alpha for proper offset handling.
        ml = smf.negativebinomial(formula, data=t, offset=t[offset]).fit(disp=0)
        alpha = ml.params["alpha"]
        return smf.glm(formula, data=t, offset=t[offset], family=sm.families.NegativeBinomial(alpha=alpha)).fit(), alpha

    out = {"pregunta": "¿La desaparición sigue a la marginación y a la ruralidad, y el homicidio no?", "modelos": {},
           "correlacion_marginacion_ruralidad": round(float(t.marg.corr(t.rural)), 3)}
    amg = t.region == "Área metropolitana de Guadalajara"
    for label, f, terms in (("solo_marginacion", "{y} ~ marg", ["marg"]),
                            ("marginacion_y_ruralidad", "{y} ~ marg + rural", ["marg", "rural"])):
        fd, ad = nb(f.format(y="D"), "log_pop25")
        fh, ah = nb(f.format(y="H"), "log_py")
        ob, phi = ratio_or(t, terms)
        ob_out, phi_out = ratio_or(t[~amg], terms)
        m = {"desaparicion_IRR_por_DE": {k: irr(fd, k) for k in fd.params.index if k != "Intercept"},
             "homicidio_IRR_por_DE": {k: irr(fh, k) for k in fh.params.index if k != "Intercept"},
             "razon_D_sobre_D_mas_H_OR_por_DE": ob,
             "razon_D_sobre_D_mas_H_OR_por_DE_sin_amg": ob_out,
             "dispersion_pearson": {"todos": phi, "sin_amg": phi_out},
             "alpha_nb": {"desaparicion": round(float(ad), 3), "homicidio": round(float(ah), 3)}}
        out["modelos"][label] = m
    # Alto y muy alto suman 5 municipios: se reportan juntos.
    t["grupo"] = t.grado.replace({"Alto": "Alto o muy alto", "Muy alto": "Alto o muy alto"})
    by_grade = t.groupby("grupo").agg(municipios=("D", "size"), D=("D", "sum"), H=("H", "sum"), pop25=("pop25", "sum"), py=("py", "sum"))
    by_grade["desap_acumuladas_100k"] = (by_grade.D / by_grade.pop25 * 1e5).round(1)
    by_grade["homicidio_inegi_100k_anual_2019_2023"] = (by_grade.H / by_grade.py * 1e5).round(1)
    by_grade["desap_acumuladas_por_homicidio_inegi_2019_2023"] = (by_grade.D / by_grade.H).round(2)
    out["por_grado_de_marginacion"] = by_grade.reindex(["Muy bajo", "Bajo", "Medio", "Alto o muy alto"]).reset_index().to_dict("records")
    m1, m2 = out["modelos"]["solo_marginacion"], out["modelos"]["marginacion_y_ruralidad"]
    out["hipotesis"] = {
        "H10a": m1["desaparicion_IRR_por_DE"]["marg"][1] > 1,
        "H10b": not (m1["homicidio_IRR_por_DE"]["marg"][1] > 1),
        "H10c": m1["razon_D_sobre_D_mas_H_OR_por_DE"]["marg"][1] > 1,
        "H10d": (m2["desaparicion_IRR_por_DE"]["marg"][1] > 1) and (m2["razon_D_sobre_D_mas_H_OR_por_DE"]["marg"][1] > 1),
    }
    return out
