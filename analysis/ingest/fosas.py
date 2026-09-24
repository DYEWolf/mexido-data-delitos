"""Convierte la tabla pública de fosas de la Fiscalía Especial en Personas Desaparecidas (PDF) en CSV por sitio.

Uso: uv run python -m ingest.fosas /ruta/a/s3-fosas-*/tabla-publica-agosto-2026.pdf
Valida: ids consecutivos 1..N sin huecos, municipio presente en el catálogo INEGI, conteos enteros y
identificadas <= localizadas y hombres + mujeres == identificadas. Si algo falla, se detiene.
La fuente identifica un sitio anterior al 1 como "oct-18" (San Miguel Buena Vista, Lagos de Moreno, inicio 10/2018);
se conserva tal cual. Cualquier otro id no numérico detiene la conversión.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pdfplumber

from mvj import data as D


def parse(pdf_path: Path) -> pd.DataFrame:
    rows, cur = [], None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for cells in table:
                    cells = [(c or "").replace("\n", " ").strip() for c in cells]
                    if len(cells) != 9 or cells[1] == "Denominación" or cells[0].startswith("Sitios de"):
                        continue
                    sid, name, mun, start, end, loc, ide, men, wom = cells
                    if sid or name:                      # new site (continuation rows have empty id/name/municipio)
                        cur = {"id": sid, "sitio": name, "municipio": mun, "periodos": []}
                        rows.append(cur)
                    if cur is None:
                        continue
                    if loc or start:
                        cur["periodos"].append((start, end, loc, ide, men, wom))
    out = []
    for r in rows:
        nums = [[int(x) if x.isdigit() else 0 for x in p[2:]] for p in r["periodos"]]
        tot = [sum(v) for v in zip(*nums)] if nums else [0, 0, 0, 0]
        starts = [p[0] for p in r["periodos"] if p[0]]
        ends = [p[1] for p in r["periodos"] if p[1]]
        out.append({"id": r["id"], "sitio": r["sitio"], "municipio": r["municipio"],
                    "inicio": min(starts, key=lambda s: s[3:] + s[:2]) if starts else None,
                    "fin": "PROCESANDO" if "PROCESANDO" in ends else (max(ends, key=lambda s: s[3:] + s[:2]) if ends else None),
                    "periodos": len(r["periodos"]), "localizadas": tot[0], "identificadas": tot[1],
                    "hombres_identificados": tot[2], "mujeres_identificadas": tot[3]})
    return pd.DataFrame(out)


def main(pdf: str) -> None:
    pdf_path = Path(pdf)
    df = parse(pdf_path)
    mun = D.municipios()
    df["key"] = df.municipio.map(D.norm)
    df = df.merge(mun[["key", "cvegeo", "region"]], on="key", how="left")
    is_num = df.id.str.fullmatch(r"\d+")
    numeric = df[is_num].id.astype(int)
    D.check(sorted(numeric) == list(range(1, numeric.max() + 1)), f"ids consecutivos 1..{numeric.max()}")
    D.check(set(df[~is_num].id) <= {"oct-18"}, f"ids no numéricos no documentados: {set(df[~is_num].id) - {'oct-18'}}")
    D.check(df.cvegeo.notna().all(), f"municipios sin match INEGI: {df[df.cvegeo.isna()].municipio.unique()}")
    D.check((df.identificadas <= df.localizadas).all(), "identificadas <= localizadas")
    bad = df[df.hombres_identificados + df.mujeres_identificadas != df.identificadas]
    D.check(bad.empty, f"hombres+mujeres != identificadas en {bad.id.tolist()}")
    out = pdf_path.parent / "fosas-sitios.csv"
    df.drop(columns="key").to_csv(out, index=False)
    print(f"{len(df)} sitios · {df.localizadas.sum()} víctimas localizadas · {df.identificadas.sum()} identificadas "
          f"({df.hombres_identificados.sum()} H, {df.mujeres_identificadas.sum()} M) · {(df.fin == 'PROCESANDO').sum()} en proceso")
    print(f"→ {out}")


if __name__ == "__main__":
    main(sys.argv[1])
