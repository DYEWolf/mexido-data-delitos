"""Extrae de los microdatos de defunciones registradas (INEGI) las defunciones ocurridas en Jalisco.

Uso: uv run python -m ingest.defunciones /ruta/a/s3-inegi-defunciones-*
Salida (misma carpeta privada):
  - jalisco-defunciones-violentas.csv: una fila por defunción con presunto homicidio, suicidio, accidente o intención
    no determinada ("se ignora") ocurrida en Jalisco (anónima: sin nombres; INEGI ya publica estos microdatos).
  - jalisco-defunciones-resumen.csv: conteo por año de registro, año de ocurrencia y tipo, para TODAS las defunciones.
Códigos según los catálogos oficiales incluidos en cada ZIP: presunto 1 accidente, 2 homicidio, 3 suicidio;
edad 4000+años (4998 = no especificada; <4000 = menor de un año); sexo 1 hombre, 2 mujer, 9 no especificado.
Excepción: el ZIP de 2022 trae el catálogo anterior (4 = se ignora, 8 = natural), pero sus datos ya usan la
codificación vigente (4 = natural, 9 = se ignora) que documentan los catálogos de 2023 en adelante. Las muertes
naturales son siempre el código más frecuente; si el catálogo del ZIP no lo dice así, se usa la codificación vigente.
"""
from __future__ import annotations

import io
import re
import sys
import zipfile
from pathlib import Path

import pandas as pd

from mvj import data as D

COLS = ["ent_ocurr", "mun_ocurr", "ent_resid", "mun_resid", "causa_def", "sexo", "edad", "anio_ocur", "mes_ocurr",
        "anio_regis", "presunto", "sitio_ocur", "lugar_ocur", "par_agre", "area_ur"]
OPTIONAL = ["vio_fami"]          # absent in the 2022 file
RENAMES = {"tipo_defun": "presunto"}  # renamed from 2022 on
CURRENT_CODES = {"1": "accidente", "2": "homicidio", "3": "suicidio", "4": "natural o no aplica",
                 "5": "operaciones legales o intervencion legal", "9": "se ignora"}  # catálogos 2023 en adelante


def label(desc: str) -> str:
    d = D.norm(desc)
    for key in ("HOMICIDIO", "SUICIDIO", "ACCIDENTE"):
        if key in d:
            return key.lower()
    if "NATURAL" in d or "ENFERMEDAD" in d:
        return "natural o no aplica"
    if "IGNORA" in d:
        return "se ignora"
    return "operaciones legales o intervencion legal"


def weapon(icd: str) -> str:
    """Mecanismo: agresión (CIE-10 X85–Y09) o evento de intención no determinada (Y10–Y34)."""
    m = re.match(r"^([XY])(\d{2})", icd or "")
    if not m:
        return "otro"
    code = int(m.group(2)) if m.group(1) == "X" else 100 + int(m.group(2))
    if 93 <= code <= 95 or 122 <= code <= 124: return "arma de fuego"
    if code in (99, 128): return "arma blanca"
    if code in (91, 120): return "ahorcamiento/estrangulamiento"
    return "otro medio"


def read_year(zp: Path) -> pd.DataFrame:
    with zipfile.ZipFile(zp) as z:
        name = next(n for n in z.namelist() if re.search(r"conjunto_de_datos/.*\.csv$", n, re.I))
        raw = z.read(name)
        # 2018 en adelante: presunta_defuncion_violenta.csv; 2015-2017: depresunto.csv (mismos códigos 1-3).
        cat_name = next(n for n in z.namelist() if re.search(r"catalogos/(presunta_defuncion_violenta|depresunto)\.csv$", n, re.I))
        cat = pd.read_csv(io.BytesIO(z.read(cat_name)), dtype=str, encoding="latin1")
    codes = {c.strip(): label(d) for c, d in zip(cat.CVE, cat.DESCRIP)}
    D.check(codes.get("1") == "accidente" and codes.get("2") == "homicidio" and codes.get("3") == "suicidio",
            f"{zp.name}: catálogo de presunto con códigos inesperados {codes}")
    df = pd.read_csv(io.BytesIO(raw), dtype=str, encoding="latin1", low_memory=False)
    df.columns = [c.strip().lower() for c in df.columns]
    df = df.rename(columns=RENAMES)
    missing = set(COLS) - set(df.columns)
    D.check(not missing, f"{zp.name}: columnas faltantes {missing}")
    df = df[COLS + [c for c in OPTIONAL if c in df.columns]].apply(lambda s: s.str.strip())
    modal = df.presunto.value_counts().idxmax()
    if codes.get(modal) != "natural o no aplica":
        D.check(CURRENT_CODES.get(modal) == "natural o no aplica",
                f"{zp.name}: el catálogo no corresponde a los datos (código más frecuente {modal})")
        print(f"{zp.name}: el catálogo del ZIP no corresponde a los datos; se usa la codificación vigente")
        codes = CURRENT_CODES
    unknown = set(df.presunto.dropna()) - set(codes)
    D.check(not unknown, f"{zp.name}: códigos de presunto fuera del catálogo {unknown}")
    df["tipo"] = df.presunto.map(codes).fillna("natural o no aplica")
    df["archivo"] = zp.name
    return df


def main(folder: str) -> None:
    folder = Path(folder)
    zips = sorted(folder.glob("*.zip"))
    D.check(len(zips) >= 1, "hay archivos ZIP")
    frames, summary = [], []
    for zp in zips:
        D._sha(zp)
        df = read_year(zp)
        years = df.anio_regis.unique()
        D.check(len(years) == 1, f"{zp.name}: un solo año de registro ({years})")
        jal = df[df.ent_ocurr == "14"].copy()
        summary.append(jal.groupby(["anio_regis", "anio_ocur", "tipo"]).size().rename("n").reset_index())
        v = jal[jal.tipo.isin(["accidente", "homicidio", "suicidio", "se ignora"])].copy()
        frames.append(v)
        print(f"{zp.name}: {len(df):,} defunciones en México · Jalisco {len(jal):,} · homicidios {int((jal.tipo == 'homicidio').sum()):,}")
    v = pd.concat(frames, ignore_index=True)
    v["cvegeo"] = "14" + v.mun_ocurr.str.zfill(3)
    v.loc[v.mun_ocurr.isin(["999", "998"]), "cvegeo"] = None
    edad = pd.to_numeric(v.edad, errors="coerce")
    # <4000: hours/days/months (under one year) -> 0; 4000+n: n years; 4998 or unreadable -> unknown.
    v["edad_anios"] = pd.Series(pd.NA, index=v.index, dtype="Int64")
    v.loc[edad.between(1, 3999), "edad_anios"] = 0
    years = edad.between(4000, 4150)
    v.loc[years, "edad_anios"] = (edad[years] - 4000).astype(int)
    v["arma"] = v.causa_def.map(weapon).where(v.tipo.isin(["homicidio", "se ignora"]))
    mun = set(D.municipios().cvegeo)
    bad = set(v.cvegeo.dropna()) - mun
    D.check(not bad, f"claves municipales fuera del catálogo INEGI: {bad}")
    v.drop(columns=["ent_ocurr"]).to_csv(folder / "jalisco-defunciones-violentas.csv", index=False)
    pd.concat(summary).to_csv(folder / "jalisco-defunciones-resumen.csv", index=False)
    h = v[v.tipo == "homicidio"]
    print("\nHomicidios ocurridos en Jalisco por año de ocurrencia (según año de registro disponible):")
    print(h.pivot_table(index="anio_ocur", columns="anio_regis", values="sexo", aggfunc="size", fill_value=0).tail(10).to_string())
    print("\nsin municipio:", int(h.cvegeo.isna().sum()), "· edad desconocida:", int(h.edad_anios.isna().sum()),
          "· sexo:", h.sexo.value_counts().to_dict())


if __name__ == "__main__":
    main(sys.argv[1])
