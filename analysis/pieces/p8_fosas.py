"""Pieza 8 — ¿Qué dice el registro oficial de fosas, y qué deja fuera?

Hipótesis (declaradas antes de calcular):
  H8a. Menos del 60% de las víctimas localizadas en fosas ha sido identificada (IC95 superior < 60%).
  H8b. El registro de fosas está mucho más concentrado geográficamente que la desaparición: la proporción de víctimas
       en fosas del área metropolitana supera la proporción de personas desaparecidas de esa zona (61.9%) por más
       de 20 puntos.
  H8c. Brecha de búsqueda: menos de 25% de los municipios fuera del área metropolitana con desaparición creíblemente
       alta (pieza 5) tiene al menos una fosa registrada.
Refutación: si la cobertura geográfica del registro se parece a la de la desaparición, las fosas podrían leerse como
un mapa de dónde está la violencia; si no, se leen como un mapa de dónde se ha buscado.

Fuente: tabla pública de sitios de inhumación clandestina, Fiscalía Especial en Personas Desaparecidas de Jalisco,
corte 31-08-2026 (oct 2018 en adelante). Cifras preliminares según la propia fuente.

Añadido en la revisión del 2026-09-24 (H8c queda como fue declarada): comparación de base para H8c (proporción de
municipios con fosa entre los demás municipios fuera del área metropolitana, prueba exacta de Fisher), totales fuera
del área metropolitana y sitios registrados con 0 víctimas.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.proportion import proportion_confint

from mvj import data as D


def wilson(k, n):
    lo, hi = proportion_confint(k, n, method="wilson")
    return [round(k / n, 4), round(lo, 4), round(hi, 4)]


def run() -> dict:
    f = D.fosas()
    rm = D.repd_map().dropna(subset=["cvegeo"])
    mun = D.municipios()
    f["anio_inicio"] = f.inicio.str[-4:].astype(int)
    done = f[f.fin != "PROCESANDO"]

    ident = wilson(f.identificadas.sum(), f.localizadas.sum())
    by_year = done.groupby("anio_inicio")[["localizadas", "identificadas"]].sum()
    by_year["pct"] = (by_year.identificadas / by_year.localizadas * 100).round(1)
    sex = {"hombres": int(f.hombres_identificados.sum()), "mujeres": int(f.mujeres_identificadas.sum())}

    amg = set(mun[mun.region == "Área metropolitana de Guadalajara"].cvegeo)
    p_fosas_amg = wilson(f[f.cvegeo.isin(amg)].localizadas.sum(), f.localizadas.sum())
    p_desap_amg = rm[rm.cvegeo.isin(amg)].desaparecidas.sum() / rm.desaparecidas.sum()

    p5 = json.loads((Path(__file__).parent.parent / "output" / "p5.json").read_text())
    high = [m for m in p5["desaparicion"]["creiblemente_superiores"] if m["region"] != "Área metropolitana de Guadalajara"]
    with_fosa = set(mun[mun.cvegeo.isin(f.cvegeo)].nombre)
    covered = [m["municipio"] for m in high if m["municipio"] in with_fosa]

    outside = mun[mun.region != "Área metropolitana de Guadalajara"]
    rest = outside[~outside.nombre.isin({m["municipio"] for m in high})]
    rest_with = int(rest.cvegeo.isin(f.cvegeo).sum())
    odds, p_fisher = stats.fisher_exact([[len(covered), len(high) - len(covered)], [rest_with, len(rest) - rest_with]])
    f_out = f[~f.cvegeo.isin(amg)]
    start = pd.to_datetime(f.inicio, format="%m/%Y")

    by_mun = f.groupby(["municipio", "region"]).agg(sitios=("id", "count"), localizadas=("localizadas", "sum"),
                                                     identificadas=("identificadas", "sum")).reset_index()
    return {
        "pregunta": "¿Qué dice el registro oficial de fosas, y qué deja fuera?",
        "totales": {"sitios": int(len(f)), "en_proceso": int((f.fin == "PROCESANDO").sum()),
                    "victimas_localizadas": int(f.localizadas.sum()), "identificadas": int(f.identificadas.sum()),
                    "municipios_con_fosa": int(f.cvegeo.nunique())},
        "proporcion_identificada": ident,
        "identificacion_por_año_de_inicio_sitios_cerrados": by_year.reset_index().to_dict("records"),
        "identificadas_por_sexo": sex,
        "proporcion_victimas_fosas_en_amg": p_fosas_amg,
        "proporcion_desaparecidas_en_amg": round(p_desap_amg, 4),
        "municipios_desaparicion_alta_fuera_amg": len(high),
        "de_esos_con_fosa_registrada": covered,
        "comparacion_base_H8c": {"desaparicion_alta_con_fosa": [len(covered), len(high)],
                                 "demas_fuera_amg_con_fosa": [rest_with, len(rest)],
                                 "razon_de_momios": round(float(odds), 2), "p_fisher": round(float(p_fisher), 3)},
        "fuera_amg": {"municipios": int(len(outside)), "con_fosa": int(outside.cvegeo.isin(f.cvegeo).sum()),
                      "victimas_localizadas": int(f_out.localizadas.sum()),
                      "proporcion_victimas": round(float(f_out.localizadas.sum() / f.localizadas.sum()), 4),
                      "proporcion_desaparecidas": round(1 - p_desap_amg, 4)},
        "sitios_sin_victimas": f[f.localizadas == 0][["id", "sitio", "municipio", "inicio", "fin"]].to_dict("records"),
        "inicio_mas_antiguo": start.min().strftime("%m/%Y"),
        "por_municipio": by_mun.sort_values("localizadas", ascending=False).to_dict("records"),
        "hipotesis": {"H8a": ident[2] < 0.60, "H8b": p_fosas_amg[1] - p_desap_amg > 0.20,
                      "H8c": len(covered) / max(len(high), 1) < 0.25},
    }
