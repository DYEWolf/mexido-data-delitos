"""Corre las piezas de análisis y guarda resultados agregados (sin datos personales) en output/.

Uso:  uv run python run.py [p2 p3 p5 ...]
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from mvj import data as D
from pieces import p1_regiones, p2_sexo_edad, p3_acervo, p5_concentracion, p6_tendencias, p7_victimas, p8_fosas, p9_cifra_negra, p10_marginacion, p11_victimas_sexo_edad, p12_caida_homicidio, p13_no_denuncia_confianza, p14_tendencias_region, p15_lugar_homicidio, p16_percepcion, p17_motivos_por_delito, p18_feminicidio_region, p19_tendencias_municipio, p20_feminicidio_2015_2018, p21_delitos_menores, p22_costo_del_miedo, p23_sesnsp_vs_inegi, p24_cedulas_cobertura, p25_fosas_otras_fuentes

PIECES = {"p1": p1_regiones, "p2": p2_sexo_edad, "p3": p3_acervo, "p5": p5_concentracion, "p6": p6_tendencias, "p7": p7_victimas, "p8": p8_fosas, "p9": p9_cifra_negra, "p10": p10_marginacion, "p11": p11_victimas_sexo_edad, "p12": p12_caida_homicidio, "p13": p13_no_denuncia_confianza, "p14": p14_tendencias_region, "p15": p15_lugar_homicidio, "p16": p16_percepcion, "p17": p17_motivos_por_delito, "p18": p18_feminicidio_region, "p19": p19_tendencias_municipio, "p20": p20_feminicidio_2015_2018, "p21": p21_delitos_menores, "p22": p22_costo_del_miedo, "p23": p23_sesnsp_vs_inegi, "p24": p24_cedulas_cobertura, "p25": p25_fosas_otras_fuentes}
OUT = Path(__file__).parent / "output"


def default(o):
    if isinstance(o, (np.integer,)): return int(o)
    if isinstance(o, (np.floating,)): return float(o)
    if isinstance(o, (np.bool_,)): return bool(o)
    raise TypeError(type(o))


def main(names):
    OUT.mkdir(exist_ok=True)
    for name in names or PIECES:
        D.PROVENANCE.clear()
        result = PIECES[name].run()
        result["_procedencia"] = {"generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                  "script": PIECES[name].__name__, "insumos_sha256": dict(D.PROVENANCE)}
        (OUT / f"{name}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, default=default) + "\n")
        print(f"{name}: {result['pregunta']}\n   hipótesis → {result.get('hipotesis')}")


if __name__ == "__main__":
    main(sys.argv[1:])
