"""Pieza 17 — ¿Las razones para no denunciar cambian según el delito?

Datos: ENVIPE 2026 (delitos ocurridos en 2025), réplica con ENVIPE 2025 (delitos de 2024). tmod_vic: tipo de delito
(BPCOD), entidad de ocurrencia (BP1_2C), denuncia (BP1_20, BP1_21) y razón principal de no denunciar (BP1_23), con las
mismas definiciones y verificaciones de la pieza 13 (sin vandalismo; "no sabe / no responde" en el denominador).

Transparencia. Se conocen los agregados de todos los delitos (pieza 13) y la cifra negra por tipo (pieza 9). El
desglose de razones por tipo de delito no se había visto. Antes de escribir las hipótesis solo se contaron los delitos
no denunciados en muestra por tipo, para aplicar la regla de tamaño: en Jalisco 2026 llegan a 100 robo de accesorios
de vehículo (161), robo o asalto en calle o transporte (131), fraude bancario (126), fraude al consumidor (107) y
extorsión (100); amenazas queda en 95 y los delitos sexuales en 34 + 5. En el país, todos los tipos salvo secuestro (45)
y violación (88) pasan de 100. Regla (declarada): solo se reportan tipos con al menos 100 delitos no denunciados en la
muestra del dominio (Jalisco o nacional) y la edición correspondiente.

Hipótesis (declaradas el 24-09-2026 antes de calcular):
  H17a. En Jalisco (2026), "pérdida de tiempo" es la razón más frecuente en cada uno de los tipos elegibles.
        Refutación: en algún tipo otra razón tiene estimación puntual mayor.
  H17b. En Jalisco (2026), la proporción de causas atribuibles a la autoridad (códigos 02, 04, 05, 06 y 08, como en la
        pieza 13) varía por tipo de delito: al menos 15 puntos entre el tipo con más y el tipo con menos, y el IC95 de esa
        diferencia excluye 0. Refutación: menos de 15 puntos o IC95 que incluye 0.
  H17c. En el país (2026), el miedo al agresor pesa más en la extorsión que en el resto de los delitos: IC95 de la
        diferencia extorsión − resto > 0. Refutación: IC95 inferior <= 0.
  H17d. En el país (2026), el miedo al agresor pesa más en los delitos sexuales (hostigamiento o intimidación sexual,
        códigos 13, y violación, 14, juntos) que en el resto de los delitos: IC95 de la diferencia > 0.
        Refutación: IC95 inferior <= 0.
  H17e. En el país (2026), la razón más frecuente en la extorsión es "delito de poca importancia" (la mayoría de las
        extorsiones que capta la encuesta son intentos sin pérdida). Refutación: otra razón tiene estimación puntual mayor.

Réplica sin hipótesis: todo con ENVIPE 2025; H17c en Jalisco como descripción (100 casos en 2026).
Estimador: el de las piezas 9 y 13 (razón ponderada con FAC_DEL, linealización de Taylor, IC95 logit); diferencias entre
dominios de la misma muestra linealizadas sobre la muestra completa (IC95 simple).
"""
from __future__ import annotations

import zipfile

from mvj import data as D
from pieces.p9_cifra_negra import load
from pieces.p13_no_denuncia_confianza import AUTORIDAD, _catalog, diff, prop

MIN_CASOS = 100
CORTO = {"01": "Robo total de vehículo", "02": "Robo de accesorios de vehículo", "04": "Robo en casa",
         "05": "Robo o asalto en calle o transporte", "06": "Otro robo", "07": "Fraude bancario", "08": "Fraude al consumidor",
         "09": "Extorsión", "10": "Amenazas", "11": "Lesiones", "12": "Secuestro",
         "13": "Hostigamiento o intimidación sexual", "14": "Violación", "15": "Otros delitos"}
SEXUALES = ["13", "14"]


def edition(year: int) -> dict:
    df, names = load(year)
    z = zipfile.ZipFile(D.PATHS["envipe"] / f"conjunto_de_datos_envipe_{year}_csv.zip")
    cat = {k: v for k, v in _catalog(z, f"tmod_vic_envipe{year}/catalogos/bp1_23.csv").items() if k != "b"}
    D.check(cat.get("01", "").startswith("Por miedo al") and cat.get("03", "").startswith("Delito de poca")
            and cat.get("04", "").startswith("Pérdida"), f"catálogo BP1_23 {year}")
    for code, lab in CORTO.items():
        D.check(code in names, f"BPCOD {code} ({lab}) falta en el catálogo {year}")
    reason = df.BP1_23.fillna("").str.strip()
    no_den = (df.BP1_20 != "1") & (df.BP1_21 != "1")
    D.check((reason.isin(list(cat)) == no_den).all(), f"BP1_23 {year}: respuesta válida sólo y siempre en no denunciados")
    scope = no_den & ~df.vandalismo
    auth = reason.isin(AUTORIDAD)
    out = {}
    for dom_name, dom in (("jalisco", scope & (df.ent == 14)), ("nacional", scope)):
        tipos = []
        for code, lab in CORTO.items():
            m = dom & (df.BPCOD == code)
            n = int(m.sum())
            if n < MIN_CASOS:
                continue
            razones = sorted(({"codigo": c, "razon": l, "p": prop(df, reason == c, m)} for c, l in cat.items()),
                             key=lambda r: -r["p"][0])
            tipos.append({"codigo": code, "delito": lab, "no_denunciados_muestra": n,
                          "no_denunciados_estimados": int(df.loc[m, "w"].sum()),
                          "atribuibles_autoridad": prop(df, auth, m), "razones": razones})
        tipos.sort(key=lambda t: -t["atribuibles_autoridad"][0])
        excluidos = {CORTO[c]: int((dom & (df.BPCOD == c)).sum()) for c in CORTO if 0 < (dom & (df.BPCOD == c)).sum() < MIN_CASOS}
        miedo = reason == "01"
        ext, sex = dom & (df.BPCOD == "09"), dom & df.BPCOD.isin(SEXUALES)
        out[dom_name] = {
            "tipos": tipos, "excluidos_por_menos_de_100": excluidos,
            "miedo_al_agresor": {
                "extorsion": prop(df, miedo, ext), "resto_sin_extorsion": prop(df, miedo, dom & ~ext.astype(bool)),
                "diferencia_extorsion_menos_resto": diff(df, miedo, ext, dom & ~ext),
                "sexuales_muestra": int(sex.sum()),
                "sexuales": prop(df, miedo, sex) if sex.sum() >= MIN_CASOS else None,
                "diferencia_sexuales_menos_resto": diff(df, miedo, sex, dom & ~sex) if sex.sum() >= MIN_CASOS else None}}
        if len(tipos) >= 2:
            hi, lo = tipos[0], tipos[-1]
            out[dom_name]["brecha_autoridad_max_menos_min"] = {
                "max": hi["delito"], "min": lo["delito"],
                "diferencia": diff(df, auth, dom & (df.BPCOD == hi["codigo"]), dom & (df.BPCOD == lo["codigo"]))}
    return out


def run() -> dict:
    r26, r25 = edition(2026), edition(2025)
    j, n = r26["jalisco"], r26["nacional"]
    ext_nat = next(t for t in n["tipos"] if t["codigo"] == "09")
    br = j["brecha_autoridad_max_menos_min"]["diferencia"]
    return {
        "pregunta": "¿Las razones para no denunciar cambian según el delito?",
        "regla_tamano": f"tipos con al menos {MIN_CASOS} delitos no denunciados en la muestra del dominio",
        "resultados": {2026: {"victimizacion_del_año": 2025, **r26}, 2025: {"victimizacion_del_año": 2024, **r25}},
        "hipotesis": {
            "H17a": all(t["razones"][0]["codigo"] == "04" for t in j["tipos"]),
            "H17b": br[0] >= 0.15 and (br[1] > 0 or br[2] < 0),
            "H17c": n["miedo_al_agresor"]["diferencia_extorsion_menos_resto"][1] > 0,
            "H17d": n["miedo_al_agresor"]["diferencia_sexuales_menos_resto"][1] > 0,
            "H17e": ext_nat["razones"][0]["codigo"] == "03",
        },
    }
