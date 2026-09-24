"""Importa las descargas manuales del dueño: SESNSP víctimas (municipal 2026, estatal 2015-2025) y CONAPO marginación 2020.

Uso: uv run python -m ingest.extra
Copia cada original a una carpeta privada nueva con SHA-256, extrae Jalisco y verifica contra fuentes independientes:
  - víctimas de homicidio doloso >= carpetas SESNSP del mismo periodo (una carpeta tiene al menos una víctima);
  - marginación: 125 municipios con clave INEGI y población total = Censo 2020 de Jalisco (8,348,151).
"""
from __future__ import annotations

import hashlib
import io
import json
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from mvj import data as D

SRC = D.EVIDENCE
FILES = {"victimas_mun_2026": "RNID-Víctimas_Municipal-2026-ago2026.zip",
         "victimas_est_2015_2025": "Estatal-Víctimas-2015-2025_ago2026.zip",
         "marginacion_2020": "imm_2020-3.csv"}
MONTHS = D.MONTHS


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read_zip_csv(p: Path) -> pd.DataFrame:
    with zipfile.ZipFile(p) as z:
        raw = z.read(z.namelist()[0])
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin1")
    return pd.read_csv(io.StringIO(text), dtype=str)


def main() -> None:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = SRC / f"s3-extra-import-{stamp}"
    out.mkdir(mode=0o700)
    (out / "raw").mkdir(mode=0o700)
    manifest = {"importado": stamp, "metodo": "descarga manual del dueño desde navegador", "archivos": {}}
    for key, name in FILES.items():
        src = SRC / name
        D.check(src.exists(), f"falta {name}")
        dst = out / "raw" / name
        shutil.copy2(src, dst); dst.chmod(0o600)
        manifest["archivos"][key] = {"archivo": name, "bytes": dst.stat().st_size, "sha256": sha(dst)}

    ses = D.sesnsp()
    hom_carpetas = ses[ses.subtipo == "Homicidio doloso"].groupby("year").n.sum()

    # --- víctimas municipal 2026 ---
    v26 = read_zip_csv(out / "raw" / FILES["victimas_mun_2026"])
    v26 = v26[v26.Clave_Ent.astype(int) == 14].copy()
    v26["n"] = v26[MONTHS].apply(pd.to_numeric, errors="coerce").fillna(0).sum(axis=1).astype(int)
    v26["cvegeo"] = v26["Cve. Municipio"].str.zfill(5)
    muni = set(D.municipios().cvegeo)
    D.check(muni <= set(v26.cvegeo), "víctimas 2026: los 125 municipios presentes")
    h26 = v26[v26["Subtipo de delito"] == "Homicidio doloso"].n.sum()
    D.check(h26 >= hom_carpetas[2026], f"víctimas homicidio doloso 2026 ({h26}) >= carpetas ({hom_carpetas[2026]})")
    v26.to_csv(out / "sesnsp-victimas-municipal-2026-jalisco.csv", index=False)

    # --- víctimas estatal 2015-2025 ---
    ve = read_zip_csv(out / "raw" / FILES["victimas_est_2015_2025"])
    ve = ve[ve.Clave_Ent.astype(int) == 14].copy()
    ve["n"] = ve[MONTHS].apply(pd.to_numeric, errors="coerce").fillna(0).sum(axis=1).astype(int)
    hv = ve[ve["Subtipo de delito"] == "Homicidio doloso"].groupby(ve["Año"].astype(int)).n.sum()
    for y in range(2015, 2026):
        D.check(hv[y] >= hom_carpetas[y], f"víctimas homicidio doloso {y} ({hv[y]}) >= carpetas ({hom_carpetas[y]})")
    ve.to_csv(out / "sesnsp-victimas-estatal-2015-2025-jalisco.csv", index=False)

    # --- marginación CONAPO 2020 ---
    raw = (out / "raw" / FILES["marginacion_2020"]).read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin1")
    im = pd.read_csv(io.StringIO(text), dtype={"CVE_MUN": str})
    D.check(len(im) == 2469, f"IMM 2020 nacional = 2,469 municipios ({len(im)})")
    im = im[im.CVE_ENT == 14].copy()
    im["cvegeo"] = im.CVE_MUN.str.zfill(5)
    D.check(set(im.cvegeo) == muni, "IMM Jalisco = 125 claves INEGI")
    D.check(im.POB_TOT.sum() == 8_348_151, f"población Censo 2020 Jalisco = 8,348,151 ({im.POB_TOT.sum():,})")
    im.to_csv(out / "conapo-marginacion-2020-jalisco.csv", index=False)

    manifest["verificaciones"] = {"victimas_homicidio_2026_vs_carpetas": [int(h26), int(hom_carpetas[2026])],
                                  "victimas_homicidio_por_año_vs_carpetas": {int(y): [int(hv[y]), int(hom_carpetas[y])] for y in range(2015, 2026)},
                                  "marginacion_poblacion_2020": int(im.POB_TOT.sum())}
    (out / "acquisition-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    for f in out.glob("*.csv"):
        f.chmod(0o600)
    (out / "acquisition-manifest.json").chmod(0o600)
    print(json.dumps(manifest["verificaciones"], indent=1))
    print("grado de marginación Jalisco:", im.GM_2020.value_counts().to_dict())
    print("víctimas 2026 Jalisco (ene-ago):", int(v26.n.sum()), "· sexos:", v26.groupby("Sexo").n.sum().to_dict())
    print("→", out)


if __name__ == "__main__":
    main()
