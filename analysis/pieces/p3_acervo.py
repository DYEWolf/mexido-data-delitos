"""Pieza 3 — Si cada año desaparecen menos personas, ¿se está reduciendo la deuda pendiente?

Hipótesis (declaradas antes de calcular):
  H3a. Las denuncias anuales de desaparición bajan entre 2019 y 2025 (tendencia log-lineal negativa, IC95 < 0).
  H3b. Aun así, cada año de 2019 a 2025 aporta personas que hoy siguen desaparecidas (>0 con IC95 > 0), de modo
       que el acervo de personas sin localizar no deja de crecer en ninguno de esos años.
  H3c. La parte del acervo anterior a 2019 es de al menos un tercio.
Refutación: si algún año aporta ~0 personas aún desaparecidas, o si las denuncias no bajan, la tesis
"menos casos nuevos, pero la deuda crece" no se sostiene.

Nota de interpretación: las cohortes recientes han tenido MENOS tiempo para ser localizadas, lo que infla su
número de "aún desaparecidas". Que aun así ese número baje es evidencia conservadora de que llegan menos casos.
Las denuncias tardías actúan en sentido contrario (pueden subir cohortes recientes con el tiempo).

Fuentes: estadística REPD — serie "personas desaparecidas por año y sexo" (siguen desaparecidas; suma 16,250) y
"porcentaje de localización por año" (denuncias recibidas en el año). No se usan las series "1 enero 2019 al corte"
porque no cuadran con las anteriores y la fuente no las define.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm

from mvj import data as D
from mvj.stats import poisson_ci


def run() -> dict:
    a = D.repd_year_sex().groupby("year").n.sum()
    D.check(a.sum() == 16_250, "acervo REPD = 16,250")
    base = int(a["2018 y anteriores"])
    years = [str(y) for y in range(2019, 2027)]
    stock = a[years]
    lo, hi = poisson_ci(stock.values)

    rep = pd.DataFrame(D.repd("porcentaje_localizacion_año")["resultados"])
    rep = rep[rep.anio.between(2019, 2025)]
    # Log-linear Poisson trend of annual reports (2019-2025).
    X = sm.add_constant(rep.anio - 2019)
    fit = sm.GLM(rep.desaparecidas_reportadas_mismo_anio, X, family=sm.families.Poisson()).fit(scale="X2")
    slope, (s_lo, s_hi) = fit.params.iloc[1], fit.conf_int().iloc[1]
    X2 = sm.add_constant(np.arange(7))
    fit2 = sm.GLM(stock[[str(y) for y in range(2019, 2026)]].values, X2, family=sm.families.Poisson()).fit(scale="X2")

    cum = base + stock.cumsum()
    h3a = s_hi < 0
    h3b = bool((lo[:7] > 0).all())
    h3c = base / a.sum() >= 1 / 3
    return {
        "pregunta": "Si cada año desaparecen menos personas, ¿se está reduciendo la deuda pendiente?",
        "acervo_total_hoy": int(a.sum()),
        "anteriores_2019": base,
        "proporcion_anterior_2019": round(base / a.sum(), 4),
        "por_cohorte": [{"año": y, "siguen_desaparecidas": int(stock[y]), "ic95": [round(l, 1), round(h, 1)],
                         "acumulado_desde_antes_2019": int(cum[y])} for y, l, h in zip(years, lo, hi)],
        "denuncias_por_año": rep[["anio", "desaparecidas_reportadas_mismo_anio", "localizadas_mismo_anio"]].to_dict("records"),
        "tendencia_denuncias_anual_pct": [round((np.exp(v) - 1) * 100, 1) for v in (slope, s_lo, s_hi)],
        "tendencia_aun_desaparecidas_anual_pct": [round((np.exp(v) - 1) * 100, 1)
                                                   for v in (fit2.params[1], *fit2.conf_int()[1])],
        "nota_2026": "2026 incluye solo enero-agosto; no entra en tendencias.",
        "hipotesis": {"H3a": bool(h3a), "H3b": h3b, "H3c": bool(h3c)},
    }
