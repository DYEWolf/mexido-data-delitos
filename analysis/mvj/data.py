"""Loaders for the private, already-validated Stage 2 evidence.

Every loader records the SHA-256 of the file it read (provenance) and asserts the
totals already verified in Stage 2. If an input changes or is misread, the analysis
stops instead of producing numbers silently.
"""
from __future__ import annotations

import hashlib
import json
import unicodedata
from pathlib import Path

import pandas as pd

EVIDENCE = Path("/Users/chris/Documents/seguridad-mexico")
PATHS = {
    "inegi": EVIDENCE / "s2-inegi-import-20260923T221320Z/materialized-path-guard/geo-units.json",
    "conapo": EVIDENCE / "s2-c04-official-import-20260924T032403Z/conapo-jalisco-subset.csv",
    "sesnsp_2015_2025": EVIDENCE / "s2-c04-sesnsp-2015-2025-20260924T032818Z/sesnsp-2015-2025-jalisco-subset.csv",
    "sesnsp_2026": EVIDENCE / "s2-c04-official-import-20260924T032403Z/sesnsp-2026-jalisco-subset.csv",
    "repd_stats": EVIDENCE / "s3-analysis-repd-stats-20260924T181640Z",
}
MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
          "Septiembre", "Octubre", "Noviembre", "Diciembre"]

PROVENANCE: dict[str, str] = {}


def _sha(path: Path) -> str:
    h = hashlib.sha256(path.read_bytes()).hexdigest()
    PROVENANCE[str(path.relative_to(EVIDENCE))] = h
    return h


def norm(s) -> str:
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").upper()
    return " ".join("".join(c if c.isalnum() else " " for c in s).split())


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(f"verificación fallida: {msg}")


# ---------- geography ----------
ALTOS_NORTE = ["ENCARNACION DE DIAZ", "LAGOS DE MORENO", "OJUELOS DE JALISCO", "SAN DIEGO DE ALEJANDRIA",
               "SAN JUAN DE LOS LAGOS", "TEOCALTICHE", "UNION DE SAN ANTONIO", "VILLA HIDALGO"]
ALTOS_SUR = ["ACATIC", "ARANDAS", "CANADAS DE OBREGON", "JALOSTOTITLAN", "JESUS MARIA", "MEXTICACAN",
             "SAN IGNACIO CERRO GORDO", "SAN JULIAN", "SAN MIGUEL EL ALTO", "TEPATITLAN DE MORELOS",
             "VALLE DE GUADALUPE", "YAHUALICA DE GONZALEZ GALLO"]
AMG = ["GUADALAJARA", "ZAPOPAN", "SAN PEDRO TLAQUEPAQUE", "TONALA", "TLAJOMULCO DE ZUNIGA", "EL SALTO",
       "JUANACATLAN", "IXTLAHUACAN DE LOS MEMBRILLOS", "ZAPOTLANEJO", "ACATLAN DE JUAREZ"]


def municipios() -> pd.DataFrame:
    p = PATHS["inegi"]; _sha(p)
    units = [u for u in json.loads(p.read_text()) if u["isMunicipality"]]
    df = pd.DataFrame({"cvegeo": [u["cvegeo"] for u in units], "nombre": [u["name"] for u in units]})
    df["key"] = df["nombre"].map(norm)
    for group in (ALTOS_NORTE, ALTOS_SUR, AMG):
        missing = set(group) - set(df["key"])
        check(not missing, f"nombres de región sin match INEGI: {missing}")
    df["region"] = "Resto del estado"
    df.loc[df["key"].isin(ALTOS_NORTE), "region"] = "Altos Norte"
    df.loc[df["key"].isin(ALTOS_SUR), "region"] = "Altos Sur"
    df.loc[df["key"].isin(AMG), "region"] = "Área metropolitana de Guadalajara"
    check(len(df) == 125, "125 municipios INEGI")
    return df


# ---------- CONAPO ----------
AGE_COLS = ["POB_00_04", "POB_05_09", "POB_010_014", "POB_015_019", "POB_20_24", "POB_25_29", "POB_30_34",
            "POB_35_39", "POB_40_44", "POB_45_49", "POB_50_54", "POB_55_59", "POB_60_64", "POB_65_69",
            "POB_70_74", "POB_75_79", "POB_80_84", "POB_85_mm"]
AGE_LABELS = ["0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54",
              "55-59", "60-64", "65-69", "70-74", "75-79", "80-84", "85+"]


def conapo() -> pd.DataFrame:
    """Long table: cvegeo, year, sexo (HOMBRE/MUJER), age, pop."""
    p = PATHS["conapo"]; _sha(p)
    raw = pd.read_csv(p, dtype={"CLAVE": str})
    check(len(raw) == 12750, "CONAPO Jalisco 12,750 filas")
    raw["cvegeo"] = raw["CLAVE"].str.zfill(5)
    raw["sexo"] = raw["SEXO"].map({"HOMBRES": "HOMBRE", "MUJERES": "MUJER"})
    check((raw[AGE_COLS].sum(axis=1) == raw["POB_TOTAL"]).all(), "suma de edades = POB_TOTAL")
    long = raw.melt(id_vars=["cvegeo", "ANO", "sexo"], value_vars=AGE_COLS, var_name="col", value_name="pop")
    long["age"] = long["col"].map(dict(zip(AGE_COLS, AGE_LABELS)))
    long = long.rename(columns={"ANO": "year"}).drop(columns="col")
    tot2026 = long.loc[long.year == 2026, "pop"].sum()
    check(tot2026 == 8_982_027, f"población Jalisco 2026 = 8,982,027 (obtenido {tot2026:,})")
    return long


# ---------- SESNSP ----------
def sesnsp() -> pd.DataFrame:
    """Long table with one row per municipality/type/subtype/modality/year/month."""
    frames = []
    for key in ("sesnsp_2015_2025", "sesnsp_2026"):
        p = PATHS[key]; _sha(p)
        df = pd.read_csv(p, dtype={"Cve. Municipio": str, "Clave_Ent": str, "Año": int})
        df["cvegeo"] = df["Cve. Municipio"].str.zfill(5)
        df["metodologia"] = "RNID 2026" if key == "sesnsp_2026" else "2015-2025"
        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    long = df.melt(id_vars=["Año", "cvegeo", "Bien jurídico afectado", "Tipo de delito", "Subtipo de delito",
                            "Modalidad", "metodologia"], value_vars=MONTHS, var_name="mes", value_name="n")
    long["mes"] = long["mes"].map({m: i + 1 for i, m in enumerate(MONTHS)})
    long = long.rename(columns={"Año": "year", "Bien jurídico afectado": "bien", "Tipo de delito": "tipo",
                                "Subtipo de delito": "subtipo", "Modalidad": "modalidad"})
    long["n"] = long["n"].fillna(0).astype(int)
    t = long.groupby("year")["n"].sum()
    check(t[2025] == 114_418, f"SESNSP 2025 = 114,418 (obtenido {t[2025]:,})")
    check(t[2026] == 76_393, f"SESNSP 2026 ene-ago = 76,393 (obtenido {t[2026]:,})")
    check(t.loc[2015:2025].sum() == 1_471_935, "SESNSP 2015-2025 = 1,471,935")
    return long


# ---------- REPD statistics (aggregate endpoints) ----------
def _repd(name: str) -> dict:
    p = PATHS["repd_stats"] / f"{name}.json"; _sha(p)
    data = json.loads(p.read_text())
    if isinstance(data, dict) and "corte_utilizado" in data:
        check(data["corte_utilizado"] == "2026-08-31", f"{name}: corte 2026-08-31")
    return data


def repd_year_sex(name: str = "grafica_personas_desaparecidas_por_año_sexo") -> pd.DataFrame:
    d = _repd(name)
    rows = [{"year": str(r["anio"]), "sexo": s["sexo"], "n": s["total"]}
            for r in d["resultados"] + [d["anteriores_2019"]] for s in r["desglose_sexo"]]
    return pd.DataFrame(rows)


def repd_year_age(sexo: str) -> pd.DataFrame:
    name = "hombres_desaparecidos_año_rango_edad" if sexo == "HOMBRE" else "mujeres_desaparecidas_año_rango_edad"
    d = _repd(name)
    blocks = d["resultados"] + ([d["anteriores_2019"]] if d.get("anteriores_2019") else [])
    rows = [{"year": str(r["anio"]), "age": a["rango_edad"], "n": a["total"], "sexo": sexo}
            for r in blocks for a in r["desglose_rango_edad"]]
    return pd.DataFrame(rows)


def repd_map() -> pd.DataFrame:
    d = _repd("datos_para_mapa")
    rows = []
    for v in d.values():
        c = v["clave_geoestadistica_municipal"]
        rows.append({"cvegeo": f"14{c:03d}" if 1 <= c <= 125 else None,
                     "desaparecidas": v["TOTAL CASOS"].get("PERSONA DESAPARECIDA", 0),
                     "localizadas": v["TOTAL CASOS"].get("PERSONA LOCALIZADA", 0)})
    df = pd.DataFrame(rows)
    check(df["desaparecidas"].sum() == 16_203, "mapa REPD = 16,203 desaparecidas")
    return df


def repd(name: str) -> dict:
    return _repd(name)


# ---------- Stage 3 sources ----------
PATHS.update({
    "defunciones": EVIDENCE / "s3-inegi-defunciones-20260924T184755Z/jalisco-defunciones-violentas.csv",
    "fosas": EVIDENCE / "s3-fosas-20260924T184227Z/fosas-sitios.csv",
    "extra": EVIDENCE / "s3-extra-import-20260924T190235Z",
    "envipe": EVIDENCE / "s3-envipe-20260924T184849Z",
})


def defunciones() -> pd.DataFrame:
    """Violent deaths occurred in Jalisco (INEGI), one row per death. Registration years 2018-2024."""
    p = PATHS["defunciones"]; _sha(p)
    df = pd.read_csv(p, dtype=str)
    for c in ("anio_ocur", "anio_regis"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["edad_anios"] = pd.to_numeric(df["edad_anios"], errors="coerce")
    h = df[df.tipo == "homicidio"]
    check(len(h) == 15_131, f"homicidios INEGI Jalisco registro 2018-2024 = 15,131 ({len(h):,})")
    return df


def fosas() -> pd.DataFrame:
    p = PATHS["fosas"]; _sha(p)
    df = pd.read_csv(p, dtype={"cvegeo": str})
    check(len(df) == 259 and df.localizadas.sum() == 2_218 and df.identificadas.sum() == 1_174, "fosas 259 / 2,218 / 1,174")
    return df


def victimas_municipal_2026() -> pd.DataFrame:
    p = PATHS["extra"] / "sesnsp-victimas-municipal-2026-jalisco.csv"; _sha(p)
    df = pd.read_csv(p, dtype={"cvegeo": str})
    check(df.n.sum() == 80_631, "víctimas SESNSP Jalisco 2026 = 80,631")
    return df


def victimas_estatal() -> pd.DataFrame:
    p = PATHS["extra"] / "sesnsp-victimas-estatal-2015-2025-jalisco.csv"; _sha(p)
    df = pd.read_csv(p)
    return df.rename(columns={"Año": "year", "Tipo de delito": "tipo", "Subtipo de delito": "subtipo",
                              "Modalidad": "modalidad", "Rango de edad": "edad"})


def marginacion() -> pd.DataFrame:
    p = PATHS["extra"] / "conapo-marginacion-2020-jalisco.csv"; _sha(p)
    df = pd.read_csv(p, dtype={"cvegeo": str})
    check(len(df) == 125 and df.POB_TOT.sum() == 8_348_151, "IMM Jalisco 125 / 8,348,151")
    return df
