"""Convierte la tabla pública de fosas de la Fiscalía Especial en Personas Desaparecidas (PDF) en CSV por sitio.

Uso: uv run python -m ingest.fosas /ruta/a/s3-fosas-*/tabla-publica-agosto-2026.pdf
Valida: ids consecutivos 1..N sin huecos, municipio presente en el catálogo INEGI, conteos enteros y
identificadas <= localizadas y hombres + mujeres == identificadas. Si algo falla, se detiene.
La fuente identifica un sitio anterior al 1 como "oct-18" (San Miguel Buena Vista, Lagos de Moreno, inicio 10/2018);
se conserva tal cual. Cualquier otro id no numérico detiene la conversión.

Texto en las celdas de conteo (corrección del 2026-09-25). En la columna de víctimas localizadas la fuente escribe a
veces una nota en lugar de una cifra: "COMPETENCIA FGR" (el caso lo lleva la FGR y el registro estatal no reporta
víctimas; es La Estanzuela, Teuchitlán, la localidad de Rancho Izaguirre) e "IJCF PROCESANDO" (el instituto forense
sigue procesando el sitio). Antes esas notas se convertían en 0; ahora el conteo queda vacío (sin cifra) y la nota se
guarda en la columna `nota`. Un periodo con "-" en las cuatro columnas no aporta conteos. Cualquier otro texto en una
celda de conteo detiene la conversión.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pdfplumber

from mvj import data as D

# Notes the source writes instead of a count of located victims. Anything else that is not a number stops the conversion.
NOTES = {"COMPETENCIA FGR", "IJCF PROCESANDO"}


def counts(period, where):
    """Parse the four count cells of one period: (localizadas, identificadas, hombres, mujeres, nota)."""
    loc, ide, men, wom = period
    if [loc, ide, men, wom] == ["-"] * 4:
        return None, None, None, None, None
    note = None
    if loc in NOTES:
        note, loc = loc, None
    bad = [c for c in ([loc] if loc is not None else []) + [ide, men, wom] if not c.isdigit()]
    D.check(not bad, f"conteo no numérico y no documentado {bad} en {where}")
    return (int(loc) if loc is not None else None), int(ide), int(men), int(wom), note


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
        parsed = [counts(p[2:], f"sitio {r['id']} {r['sitio']}") for p in r["periodos"]]
        # A site has a count of located victims only if some period gives a number; notes are kept, never turned into 0.
        col = lambda i: [v[i] for v in parsed if v[i] is not None]
        tot = [sum(col(i)) if col(i) else (None if i == 0 else 0) for i in range(4)]
        notes = sorted({v[4] for v in parsed if v[4]})
        starts = [p[0] for p in r["periodos"] if p[0]]
        ends = [p[1] for p in r["periodos"] if p[1]]
        out.append({"id": r["id"], "sitio": r["sitio"], "municipio": r["municipio"],
                    "inicio": min(starts, key=lambda s: s[3:] + s[:2]) if starts else None,
                    "fin": "PROCESANDO" if "PROCESANDO" in ends else (max(ends, key=lambda s: s[3:] + s[:2]) if ends else None),
                    "periodos": len(r["periodos"]), "localizadas": tot[0], "identificadas": tot[1],
                    "hombres_identificados": tot[2], "mujeres_identificadas": tot[3], "nota": "; ".join(notes) or None})
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
    df["localizadas"] = df.localizadas.astype("Int64")
    known = df.localizadas.notna()
    D.check((df[known].identificadas <= df[known].localizadas).all(), "identificadas <= localizadas")
    D.check((df[~known].identificadas == 0).all() and df[~known].nota.notna().all(), "sitios sin cifra: 0 identificadas y con nota de la fuente")
    bad = df[df.hombres_identificados + df.mujeres_identificadas != df.identificadas]
    D.check(bad.empty, f"hombres+mujeres != identificadas en {bad.id.tolist()}")
    out = pdf_path.parent / "fosas-sitios.csv"
    df.drop(columns="key").to_csv(out, index=False)
    print(f"sin cifra de víctimas (nota de la fuente): {df[~known][['id', 'sitio', 'municipio', 'nota']].to_dict('records')}")
    print(f"{len(df)} sitios · {df.localizadas.sum()} víctimas localizadas · {df.identificadas.sum()} identificadas "
          f"({df.hombres_identificados.sum()} H, {df.mujeres_identificadas.sum()} M) · {(df.fin == 'PROCESANDO').sum()} en proceso")
    print(f"→ {out}")


if __name__ == "__main__":
    main(sys.argv[1])
