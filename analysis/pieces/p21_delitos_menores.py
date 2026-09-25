"""Pieza 21 — ¿Qué pasa con los delitos que no entraron en la pieza 6? Tendencias 2019-2025 de los tipos menores.

Datos: SESNSP incidencia 2015-2025 (estatal, incluye municipio no especificado) y RNID ene-ago 2026; población CONAPO.
Universo: los 27 tipos de delito del SESNSP con serie 2015-2025 que ninguna de las 16 categorías de la pieza 6 cubre
(se excluyen los tipos que solo existen en 2026). Los 7 tipos "Otros ..." se llaman aquí categorías residuales.

Transparencia. Ya se habían visto: los conteos de 2025 de "Otros delitos del fuero común" (13,785; 12.0% del total) y
de daño a la propiedad (2,175), y el total de los 30 tipos restantes (9,721) en la bitácora §1; el perfil por sexo y
edad de las víctimas de acoso sexual en 2026 (pieza 11) y el porcentaje de víctimas sin edad en falsificación, despojo,
abuso de confianza y daño a la propiedad (pieza 11). No se había visto ninguna serie ni tendencia de estos tipos, ni la
participación de las categorías residuales en otro año. Antes de escribir las hipótesis solo se revisó el catálogo de
tipos (nombres y años en que existen).

Hipótesis (declaradas el 25-09-2026 antes de calcular):
  H21a. Cada vez más carpetas caen en categorías residuales: la participación de los 7 tipos "Otros ..." en el total de
        carpetas del SESNSP sube 2019-2025. Poisson log-lineal de sus carpetas con offset log(total de carpetas) y
        escala de Pearson; IC95 inferior del cambio anual > 0. Refutación: IC95 inferior <= 0.
  H21b. La baja tampoco es general entre los tipos menores: de los tipos del universo con al menos 30 carpetas en
        cada año 2019-2025, al menos la mitad NO baja (IC95 superior de la tendencia >= 0; tendencia como en la pieza
        6: Poisson con offset de población y escala de Pearson). Refutación: más de la mitad baja.
  H21c. Los delitos sexuales y de género menores suben, como el abuso sexual (piezas 6, 14 y 19): al menos 2 de estos
        4 tipos tienen IC95 inferior de la tendencia 2019-2025 > 0: acoso sexual, hostigamiento sexual, violencia de
        género distinta a la familiar y otros delitos contra la libertad y la seguridad sexual. Refutación: 1 o
        ninguno.
Regla de tamaño: los tipos con menos de 30 carpetas en algún año 2019-2025 se marcan como conteo chico; su tendencia se
reporta, pero no entran en H21b. Los tipos sin ninguna carpeta en 2019-2025 no tienen tendencia (clase "sin casos"); si
alguno de los 4 de H21c no tiene casos, cuenta como que no sube.

Exploratorio:
  E21d. Cambio ene-ago 2026 contra ene-ago 2025 por tipo, con las reagrupaciones de la nota del SESNSP sobre la
        comparación RNID (las mismas de la pieza 6 y del inventario): pornografía infantil con trata; privación ilegal
        y retención o sustracción de menores con otros contra la libertad personal; violencia de género, violación a la
        intimidad sexual y otros contra la libertad sexual sumados; discriminación con otros contra la sociedad;
        suplantación con otros del fuero común; administración de justicia y tortura con servidores públicos;
        tentativas de homicidio doloso y de feminicidio con otros contra la vida; tentativas de extorsión con otros
        contra el patrimonio. Razón de tasas con IC exacto condicional, como la pieza 6.
  E21e. Homicidio culposo y lesiones culposas (subtipos que la pieza 6 no cubre): tendencia 2019-2025.
  E21f. (Agregado el 25-09-2026 después de ver las series de H21a-H21c.) Rupturas de registro: años en que un tipo pasa
        de 0 a 30 o más carpetas, o se multiplica o divide por 2 o más de un año al siguiente (con al menos 30 carpetas
        en alguno de los dos años), 2015-2025. Serie combinada de otros delitos contra la familia más incumplimiento de
        obligaciones de asistencia familiar, que aparece en 2024. No cambia ningún veredicto.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D
from pieces.p6_tendencias import CATS, trend

YEARS = list(range(2019, 2026))
MIN_N = 30
SEXUALES = ["Acoso sexual", "Hostigamiento sexual",
            "Violencia de género en todas sus modalidades distinta a la violencia familiar",
            "Otros delitos que atentan contra la libertad y la seguridad sexual"]
LIBERTAD_SEXUAL = "Otros contra la libertad sexual + violencia de género + intimidad sexual"
# Reagrupación RNID 2026 -> tipos 2015-2025 (nota del SESNSP). La clave es el tipo 2026 o (tipo, subtipo).
REGRUPA = {
    "Pornografía infantil": "Trata de personas",
    "Privación ilegal de la libertad": "Otros delitos que atentan contra la libertad personal",
    "Retención o sustracción de menores e incapaces": "Otros delitos que atentan contra la libertad personal",
    "Discriminación": "Otros delitos contra la sociedad",
    "Suplantación y usurpación de identidad": "Otros delitos del Fuero Común",
    "Delitos contra la administración de justicia": "Delitos cometidos por servidores públicos",
    "Tortura": "Delitos cometidos por servidores públicos",
    "Violación a la intimidad sexual": LIBERTAD_SEXUAL,
    "Violencia de género en todas sus modalidades distinta a la violencia familiar": LIBERTAD_SEXUAL,
    "Otros delitos que atentan contra la libertad y la seguridad sexual": LIBERTAD_SEXUAL,
    ("Homicidio", "Tentativa de homicidio doloso"): "Otros delitos que atentan contra la vida y la integridad corporal",
    ("Feminicidio", "Tentativa de feminicidio"): "Otros delitos que atentan contra la vida y la integridad corporal",
    ("Extorsión", "Tentativa de extorsión por otros medios"): "Otros delitos contra el patrimonio",
    ("Extorsión", "Tentativa de extorsión presencial"): "Otros delitos contra el patrimonio",
}


def _grupo(d: pd.DataFrame) -> pd.Series:
    g = d.tipo.map(lambda t: REGRUPA.get(t, t))
    for (t, st), dest in ((k, v) for k, v in REGRUPA.items() if isinstance(k, tuple)):
        g[(d.tipo == t) & (d.subtipo == st)] = dest
    return g


def _rr(n25: int, n26: int, k: float) -> list:
    if not n25:
        return [None, None, None]
    lo, hi = proportion_confint(n26, n25 + n26, method="beta")
    return [round(n26 / n25 * k, 3), round(lo / (1 - lo) * k, 3), round(hi / (1 - hi) * k, 3)]


def run() -> dict:
    s = D.sesnsp()
    pop = D.conapo().groupby("year").pop.sum()
    cubierto = pd.Series(False, index=s.index)
    for f in CATS.values():
        cubierto |= f(s)
    hist = s[s.year <= 2025]
    tipos_hist = set(hist.tipo)
    universo = sorted(t for t in tipos_hist if not cubierto[s.tipo == t].any())
    total = hist.groupby("year").n.sum()

    filas = {}
    for t in universo:
        a = hist[hist.tipo == t].groupby("year").n.sum().reindex(range(2015, 2026), fill_value=0)
        rate = (a / pop.loc[2015:2025] * 1e5).round(2)
        tr = trend(a, pop, YEARS) if a.loc[YEARS].sum() else None
        chico = bool((a.loc[YEARS] < MIN_N).any())
        filas[t] = {"n_2019": int(a[2019]), "n_2025": int(a[2025]), "tasa_2019": float(rate[2019]),
                    "tasa_2025": float(rate[2025]), "tendencia_2019_2025_pct_anual": tr,
                    "clase": "sin casos" if tr is None else "baja" if tr[2] < 0 else "sube" if tr[1] > 0 else "sin tendencia clara",
                    "conteo_chico": chico, "residual": t.startswith("Otros"),
                    "serie": {int(y): int(v) for y, v in a.items()}}

    # H21a: participación de las categorías residuales en el total.
    res_t = [t for t in universo if t.startswith("Otros")]
    ro = hist[hist.tipo.isin(res_t)].groupby("year").n.sum().reindex(YEARS)
    fit = sm.GLM(ro.values, sm.add_constant(np.arange(len(YEARS))), family=sm.families.Poisson(),
                 offset=np.log(total.loc[YEARS].values)).fit(scale="X2")
    h21a = [round((np.exp(v) - 1) * 100, 1) for v in (fit.params[1], *fit.conf_int()[1])]
    part = {int(y): round(float(ro[y] / total[y] * 100), 2) for y in YEARS}

    grandes = [t for t in universo if not filas[t]["conteo_chico"]]
    no_baja = [t for t in grandes if filas[t]["clase"] != "baja"]
    suben_sex = [t for t in SEXUALES if filas[t]["clase"] == "sube"]

    # E21d: ene-ago 2026 contra ene-ago 2025 con reagrupaciones.
    k = pop[2025] / pop[2026]
    d25 = s[(s.year == 2025) & (s.mes <= 8)]
    d26 = s[s.year == 2026]
    g25 = d25.groupby(_grupo(d25)).n.sum()
    g26 = d26.groupby(_grupo(d26)).n.sum()
    grupos = sorted({REGRUPA.get(t, t) for t in universo})
    e21d = {g: {"ene_ago_2025": int(g25.get(g, 0)), "ene_ago_2026": int(g26.get(g, 0)),
                "razon_tasas": _rr(int(g25.get(g, 0)), int(g26.get(g, 0)), k)} for g in grupos}
    meses26 = sorted(d26.groupby("mes").n.sum().loc[lambda x: x > 0].index.tolist())

    e21e = {}
    for st in ("Homicidio culposo", "Lesiones culposas"):
        a = hist[hist.subtipo == st].groupby("year").n.sum().reindex(range(2015, 2026), fill_value=0)
        e21e[st] = {"n_2019": int(a[2019]), "n_2025": int(a[2025]), "tendencia_2019_2025_pct_anual": trend(a, pop, YEARS)}

    rupturas = []
    for t in universo:
        a = filas[t]["serie"]
        for y in range(2016, 2026):
            x0, x1 = a[y - 1], a[y]
            if max(x0, x1) >= MIN_N and (x0 == 0 or x1 == 0 or max(x0, x1) / min(x0, x1) >= 2):
                rupturas.append({"tipo": t, "año": y, "antes": x0, "despues": x1})
    fam = ["Otros delitos contra la familia", "Incumplimiento de obligaciones de asistencia familiar"]
    fam_serie = {y: sum(filas[t]["serie"][y] for t in fam) for y in range(2015, 2026)}

    return {
        "pregunta": "¿Qué pasa con los delitos que no entraron en la pieza 6?",
        "unidad": "tasa por 100 mil habitantes (CONAPO), delitos denunciados SESNSP, estatal",
        "universo": universo,
        "tipos": filas,
        "resumen": {c: [t for t in universo if filas[t]["clase"] == c] for c in ("baja", "sube", "sin tendencia clara", "sin casos")},
        "carpetas_universo": {"2019": int(sum(f["n_2019"] for f in filas.values())),
                              "2025": int(sum(f["n_2025"] for f in filas.values())),
                              "total_sesnsp_2019": int(total[2019]), "total_sesnsp_2025": int(total[2025])},
        "H21a_participacion_residual": {"tipos": res_t, "participacion_pct": part, "cambio_anual_pct": h21a},
        "H21b_tipos_con_30_o_mas": {"n_tipos": len(grandes), "no_bajan": no_baja, "n_no_bajan": len(no_baja)},
        "H21c_sexuales_y_genero": {t: filas[t]["tendencia_2019_2025_pct_anual"] for t in SEXUALES} | {"suben": suben_sex},
        "E21d_ene_ago_2026_vs_2025": {"meses_2026": meses26, "grupos": e21d},
        "E21e_culposos": e21e,
        "E21f_rupturas_de_registro": {"rupturas": rupturas, "familia_mas_incumplimiento": fam_serie},
        "hipotesis": {"H21a": h21a[1] > 0, "H21b": len(no_baja) >= len(grandes) / 2, "H21c": len(suben_sex) >= 2,
                      "E21d": "exploratoria", "E21e": "exploratoria",
                      "E21f": "exploratoria"},
    }
