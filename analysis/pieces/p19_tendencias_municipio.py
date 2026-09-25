"""Pieza 19 — ¿Qué municipios se apartan de la tendencia del estado? Tendencias 2019-2025 con un modelo jerárquico.

Datos: SESNSP carpetas 2019-2025 por municipio (125 municipios; la clave 14998 "no especificado" queda fuera, como en
la pieza 14) y población CONAPO por municipio y año. Delitos: los cinco de la pieza 14 (homicidio doloso, robo con
violencia, robo de vehículo, violencia familiar, abuso sexual).

Por qué un modelo jerárquico: la tendencia cruda de un municipio con 3 homicidios al año es casi puro ruido. El modelo
estima a la vez la tendencia típica y cuánto varía entre municipios, y "encoge" las tendencias de los municipios chicos
hacia la típica en proporción a lo poco que dicen sus datos.

Transparencia. Se conocen las tendencias 2019-2025 por región de los cinco delitos (pieza 14: el homicidio baja a ritmo
parejo entre regiones, F p = 0.74; el robo baja sobre todo en el AMG; la violencia familiar no baja en ninguna región; el
abuso sexual sube en el AMG y en el resto del estado) y el cambio 2024→2025 del homicidio por municipio (E12g). No se
había calculado ninguna tendencia municipal 2019-2025, cruda ni jerárquica.

Modelo (declarado antes de calcular). Para el municipio i en el año t (t = año − 2022):
    carpetas_it ~ Poisson(μ_it),  log μ_it = log pob_it + β0 + β1·t + u_i + v_i·t,  (u_i, v_i) ~ Normal(0, Σ)
con Σ libre (σu, σv, ρ). Máxima verosimilitud marginal por cuadratura de Gauss-Hermite adaptativa (9 puntos por
dimensión). β1 es la tendencia del municipio típico; v_i, la desviación del municipio i. Tendencia de cada municipio:
β1 + v_i, con media posterior (bayes empírico) e IC95 que incluye la incertidumbre de los hiperparámetros (200 sorteos
de la normal asintótica de los parámetros, un sorteo de v_i de su posterior en cada uno).
"Se aparta de la tendencia estatal": el IC95 de su cambio anual excluye el cambio anual del estado (Poisson log-lineal
sobre la suma de los 125 municipios, escala de Pearson, como en la pieza 6). Tendencia cruda: GLM de Poisson por
municipio con escala de Pearson (como en la pieza 6), solo en municipios con al menos 5 carpetas en 2019-2025 y ajuste
finito; los demás quedan "sin estimación cruda".

Hipótesis (declaradas el 25-09-2026 antes de calcular):
  H19a. Aunque las regiones bajan igual, los municipios no: en homicidio doloso la varianza de la pendiente municipal es
        mayor que cero (razón de verosimilitudes contra el modelo sin pendiente aleatoria, distribución de mezcla
        ½χ²₁ + ½χ²₂) con p < 0.05. Refutación: p >= 0.05.
  H19b. En homicidio doloso, ningún municipio de menos de 20,000 habitantes (CONAPO 2025) se aparta de la tendencia
        estatal en el modelo jerárquico. Refutación: al menos uno se aparta.
  H19c. Las tendencias crudas exageran: de los municipios cuya tendencia cruda de homicidio se aparta de la estatal, al
        menos la mitad deja de apartarse en el modelo jerárquico. Refutación: menos de la mitad; o ningún municipio
        se aparta en crudo (entonces no hay nada que exagerar).
  H19d. En cada uno de los otros cuatro delitos la varianza de la pendiente municipal también es mayor que cero (misma
        prueba que H19a, p < 0.05). Refutación: en alguno p >= 0.05.
  H19e. El aumento del abuso sexual está extendido: al menos 10 municipios tienen IC95 inferior de su cambio anual
        > 0 en el modelo jerárquico. Refutación: 9 o menos.

Robustez y descripción (sin hipótesis): el mismo modelo con distribución binomial negativa condicional (sobre-dispersión
año a año dentro del municipio), reportando si H19a-e cambiarían; tendencia típica β1 y σv con IC95; municipios que
se apartan, con su tendencia cruda al lado; proporción de carpetas con municipio no especificado por año y, si pasa de
5% en algún año (como el abuso sexual en 2019, pieza 14), H19e también en 2020-2025. Los veredictos son los del modelo
de Poisson.

Corrección de método (25-09-2026, después de ver los resultados; ANALISIS.md §9). El modelo de Poisson declarado arriba
no admite sobre-dispersión de un año a otro dentro del municipio y sus IC95 municipales son demasiado angostos: en
municipios grandes quedaban más angostos que los crudos con escala de Pearson; la binomial negativa estima α = 0.21 en
homicidio; en simulación con esa sobre-dispersión el IC95 del Poisson cubre 72% y el de la binomial negativa 92.5%.
Desde esta fecha el modelo principal es la binomial negativa (antes robustez) y el Poisson queda como comparación.
Hipótesis, umbrales y criterios no cambian. Veredictos que cambian por la corrección: H19b y H19c (❌ → ✅).
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy.optimize import minimize
from scipy.special import gammaln, logsumexp
from scipy.stats import chi2

from mvj import data as D
from pieces.p6_tendencias import CATS, trend
from pieces.p14_tendencias_region import DELITOS

YEARS = list(range(2019, 2026))
Q = 9
N_DRAWS = 200
SEED = 20260925
SMALL = 20_000


class GLMM:
    """Poisson (o binomial negativa) log-lineal con intercepto y pendiente aleatorios por municipio, AGHQ."""

    def __init__(self, Y, logE, t, slope=True, nb=False):
        self.Y, self.logE, self.t, self.nb = Y, logE, t, nb
        self.q = 2 if slope else 1
        self.Z = np.column_stack([np.ones_like(t), t])[:, :self.q]          # T × q
        x, w = np.polynomial.hermite.hermgauss(Q)
        grid = np.stack(np.meshgrid(*[x] * self.q, indexing="ij"), -1).reshape(-1, self.q)
        self.nodes = grid
        self.logw = np.log(np.prod(np.stack(np.meshgrid(*[w] * self.q, indexing="ij"), -1).reshape(-1, self.q), 1)) + (grid ** 2).sum(1)
        self.lgy = gammaln(Y + 1)
        self.zhat = np.zeros((Y.shape[0], self.q))

    def unpack(self, th):
        b0, b1 = th[0], th[1]
        if self.q == 2:
            su, sv, r = np.exp(th[2]), np.exp(th[3]), np.tanh(th[4])
            S = np.array([[su * su, r * su * sv], [r * su * sv, sv * sv]])
            k = 5
        else:
            S = np.array([[np.exp(2 * th[2])]])
            k = 3
        alpha = np.exp(th[k]) if self.nb else None
        return b0, b1, S, alpha

    def _ll(self, eta, alpha):
        """Log-verosimilitud condicional por observación, en η (… × T)."""
        Y = self.Y if eta.ndim == 2 else self.Y[:, None, :]
        lgy = self.lgy if eta.ndim == 2 else self.lgy[:, None, :]
        mu = np.exp(eta)
        if not self.nb:
            return (Y * eta - mu - lgy).sum(-1)
        a = 1 / alpha
        return (gammaln(Y + a) - gammaln(a) - lgy + Y * np.log(alpha * mu / (1 + alpha * mu)) - a * np.log1p(alpha * mu)).sum(-1)

    def _cluster(self, th):
        b0, b1, S, alpha = self.unpack(th)
        Si = np.linalg.inv(S)
        base = self.logE + b0 + b1 * self.t                                  # M × T
        z = self.zhat.copy()
        for _ in range(50):
            mu = np.exp(base + z @ self.Z.T)
            w = mu if not self.nb else mu / (1 + alpha * mu)
            r = (self.Y - mu) if not self.nb else (self.Y - mu) / (1 + alpha * mu)
            g = r @ self.Z - z @ Si
            H = np.einsum("mt,ti,tj->mij", w, self.Z, self.Z) + Si
            step = np.linalg.solve(H, g[..., None])[..., 0]
            n = np.linalg.norm(step, axis=1, keepdims=True)
            z = z + step * np.minimum(1, 2 / np.maximum(n, 1e-12))
            if n.max() < 1e-8:
                break
        mu = np.exp(base + z @ self.Z.T)
        w = mu if not self.nb else mu / (1 + alpha * mu)
        H = np.einsum("mt,ti,tj->mij", w, self.Z, self.Z) + Si
        C = np.linalg.cholesky(np.linalg.inv(H))                             # M × q × q
        zk = z[:, None, :] + np.sqrt(2) * np.einsum("mij,kj->mki", C, self.nodes)   # M × K × q
        eta = base[:, None, :] + zk @ self.Z.T
        _, logdetS = np.linalg.slogdet(S)
        prior = -0.5 * np.einsum("mki,ij,mkj->mk", zk, Si, zk) - 0.5 * logdetS - self.q / 2 * np.log(2 * np.pi)
        lf = self.logw + self._ll(eta, alpha) + prior                         # M × K
        logdetC = np.log(np.abs(np.linalg.det(np.sqrt(2) * C)))
        return z, zk, lf, logdetC

    def nll(self, th):
        try:
            z, _, lf, logdetC = self._cluster(th)
        except np.linalg.LinAlgError:
            return 1e12
        if not np.all(np.isfinite(z)):
            return 1e12
        self.zhat = z
        v = -(logdetC + logsumexp(lf, axis=1)).sum()
        return v if np.isfinite(v) else 1e12

    def posterior(self, th):
        """Media y varianza posterior de la desviación de pendiente (o del intercepto si q = 1) por municipio."""
        _, zk, lf, _ = self._cluster(th)
        p = np.exp(lf - logsumexp(lf, axis=1, keepdims=True))
        m = (p[..., None] * zk).sum(1)
        var = (p[..., None] * zk ** 2).sum(1) - m ** 2
        return m[:, -1], var[:, -1]

    def fit(self):
        k = 2 + (3 if self.q == 2 else 1) + (1 if self.nb else 0)
        tot = np.log(self.Y.sum() / np.exp(self.logE).sum())
        th0 = np.zeros(k); th0[0] = tot; th0[2:2 + (3 if self.q == 2 else 1)] = [-0.5, -2.5, 0][: (3 if self.q == 2 else 1)]
        if self.nb:
            th0[-1] = -2
        nv = 3 if self.q == 2 else 1
        lo_sig = [(-7, 3)] * (2 if self.q == 2 else 1) + ([(-4, 4)] if self.q == 2 else [])
        self.bounds = [(None, None), (None, None)] + lo_sig + ([(-12, 3)] if self.nb else [])
        best = None
        for _ in range(3):  # reinicios desde el óptimo anterior hasta que no mejore
            r = minimize(self.nll, th0 if best is None else best.x, method="L-BFGS-B", bounds=self.bounds,
                         options={"maxiter": 3000})
            if best is not None and best.fun - r.fun < 1e-6:
                best = r if r.fun < best.fun else best
                break
            best = r
        self.th, self.ll = best.x, -best.fun
        self.nll(self.th)
        # Parámetros en la cota (p. ej. σv → 0) se fijan: no entran en la covarianza ni en los sorteos.
        self.at_bound = [i for i, (lo, hi) in enumerate(self.bounds)
                         if (lo is not None and self.th[i] - lo < 1e-3) or (hi is not None and hi - self.th[i] < 1e-3)]
        self.cov = self._cov(self.th)
        return self

    def _cov(self, th, h=1e-3):
        free = [i for i in range(len(th)) if i not in self.at_bound]
        k = len(free); Hm = np.zeros((k, k)); f0 = self.nll(th)
        E = np.zeros((k, len(th)))
        for a, i in enumerate(free):
            E[a, i] = h
        for a in range(k):
            for b in range(a, k):
                if a == b:
                    Hm[a, a] = (self.nll(th + E[a]) - 2 * f0 + self.nll(th - E[a])) / h ** 2
                else:
                    Hm[a, b] = Hm[b, a] = (self.nll(th + E[a] + E[b]) - self.nll(th + E[a] - E[b])
                                           - self.nll(th - E[a] + E[b]) + self.nll(th - E[a] - E[b])) / (4 * h * h)
        self.nll(th)
        val, vec = np.linalg.eigh(Hm)
        self.hessian_pd = bool(val.min() > 0)
        Vf = vec @ np.diag(1 / np.maximum(val, 1e-8)) @ vec.T
        V = np.zeros((len(th), len(th)))
        V[np.ix_(free, free)] = Vf
        return V


def pct(x):
    return round(float((np.exp(x) - 1) * 100), 1)


def panel(s, name, mun, pop):
    sel = s[CATS[name](s) & s.year.between(2019, 2025)]
    tot = sel.groupby("year").n.sum().reindex(YEARS, fill_value=0)
    unk = sel[~sel.cvegeo.isin(mun.index)].groupby("year").n.sum().reindex(YEARS, fill_value=0)
    counts = sel[sel.cvegeo.isin(mun.index)].groupby(["cvegeo", "year"]).n.sum()
    idx = pd.MultiIndex.from_product([mun.index, YEARS], names=["cvegeo", "year"])
    Y = counts.reindex(idx, fill_value=0).unstack().loc[mun.index, YEARS]
    P = pop.reindex(idx).unstack().loc[mun.index, YEARS]
    pct_unk = {int(y): round(float(unk[y] / tot[y] * 100), 2) if tot[y] else 0.0 for y in YEARS}
    return Y, P, pct_unk


def crude(y, p, years):
    if y.sum() < 5:
        return None
    X = sm.add_constant(np.arange(len(years), dtype=float))
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            f = sm.GLM(y.astype(float), X, family=sm.families.Poisson(), offset=np.log(p.astype(float))).fit(scale="X2")
        except Exception:
            return None
    b, (lo, hi) = f.params[1], f.conf_int()[1]
    if not all(np.isfinite([b, lo, hi])) or abs(b) > 5:
        return None
    return [pct(b), pct(lo), pct(hi)]


def analyse(Y, P, years, state, mun, nb=False):
    t = np.array(years, float) - 2022
    Yv, logE = Y.values.astype(float), np.log(P.values.astype(float))
    full = GLMM(Yv, logE, t, slope=True, nb=nb).fit()
    null = GLMM(Yv, logE, t, slope=False, nb=nb).fit()
    lr = max(0.0, 2 * (full.ll - null.ll))
    p_lr = 0.5 * chi2.sf(lr, 1) + 0.5 * chi2.sf(lr, 2)
    th, V = full.th, full.cov
    se = np.sqrt(np.diag(V))
    out = {"tendencia_tipica_pct_anual": [pct(th[1]), pct(th[1] - 1.96 * se[1]), pct(th[1] + 1.96 * se[1])],
           "sigma_pendiente": [round(float(np.exp(th[3])), 4), round(float(np.exp(th[3] - 1.96 * se[3])), 4), round(float(np.exp(th[3] + 1.96 * se[3])), 4)],
           "sigma_intercepto": round(float(np.exp(th[2])), 3), "rho": round(float(np.tanh(th[4])), 2),
           "razon_verosimilitud": round(lr, 2), "p_pendiente_aleatoria": float(p_lr), "hessiana_definida_positiva": full.hessian_pd,
           "parametros_en_cota": [["beta0", "beta1", "log_sigma_u", "log_sigma_v", "atanh_rho", "log_alpha"][i] for i in full.at_bound]}
    if nb:
        out["alpha_binomial_negativa"] = round(float(np.exp(th[5])), 4)
    m0, _ = full.posterior(th)
    rng = np.random.default_rng(SEED)
    sims = np.empty((N_DRAWS, len(m0)))
    for d, thd in enumerate(rng.multivariate_normal(th, V, N_DRAWS)):
        md, vd = full.posterior(thd)
        sims[d] = thd[1] + rng.normal(md, np.sqrt(np.maximum(vd, 0)))
    lo, hi = np.percentile(sims, [2.5, 97.5], axis=0)
    rows = []
    for i, cve in enumerate(Y.index):
        h = [pct(th[1] + m0[i]), pct(lo[i]), pct(hi[i])]
        c = crude(Y.values[i], P.values[i], years)
        rows.append({"cvegeo": cve, "municipio": mun.nombre[cve], "region": mun.region[cve], "pob_2025": int(P[2025][cve]) if 2025 in P else None,
                     "carpetas": int(Y.values[i].sum()), "jerarquico": h, "crudo": c,
                     "se_aparta_jer": not (h[1] <= state <= h[2]),
                     "se_aparta_crudo": None if c is None else not (c[1] <= state <= c[2])})
    out["municipios"] = rows
    return out


def summarize(res, state):
    rows = res["municipios"]
    dev = [r for r in rows if r["se_aparta_jer"]]
    crude_dev = [r for r in rows if r["se_aparta_crudo"]]
    kept = [r for r in crude_dev if r["se_aparta_jer"]]
    return {"n_se_apartan_jerarquico": len(dev), "n_se_apartan_jerarquico_suben": sum(r["jerarquico"][0] > state for r in dev),
            "n_con_estimacion_cruda": sum(r["crudo"] is not None for r in rows), "n_se_apartan_crudo": len(crude_dev),
            "n_crudo_que_siguen_en_jerarquico": len(kept),
            "n_pequenos_se_apartan_jerarquico": sum(r["pob_2025"] < SMALL for r in dev),
            "n_pequenos_se_apartan_crudo": sum(r["pob_2025"] < SMALL for r in crude_dev),
            "n_ic_inferior_mayor_a_0": sum(r["jerarquico"][1] > 0 for r in rows),
            "n_ic_superior_menor_a_0": sum(r["jerarquico"][2] < 0 for r in rows),
            "se_apartan": sorted([{k: r[k] for k in ("municipio", "region", "pob_2025", "carpetas", "jerarquico", "crudo")} for r in dev],
                                 key=lambda r: -r["pob_2025"])}


def run() -> dict:
    s = D.sesnsp()
    mun = D.municipios().set_index("cvegeo")
    pop = D.conapo().groupby(["cvegeo", "year"]).pop.sum()
    out = {"pregunta": "¿Qué municipios se apartan de la tendencia del estado?", "delitos": {}}
    for name in DELITOS:
        Y, P, pct_unk = panel(s, name, mun, pop)
        state = trend(Y.sum(), P.sum(), YEARS)[0]
        res = analyse(Y, P, YEARS, state, mun)
        nbr = analyse(Y, P, YEARS, state, mun, nb=True)
        d = {"tendencia_estatal_pct_anual": trend(Y.sum(), P.sum(), YEARS),
             "pct_municipio_no_especificado_por_año": pct_unk,
             "binomial_negativa": {k: v for k, v in nbr.items() if k != "municipios"} | {"resumen": summarize(nbr, state)},
             "poisson_comparacion": {k: v for k, v in res.items() if k != "municipios"} | {"resumen": summarize(res, state)},
             "municipios": nbr["municipios"]}
        if max(pct_unk.values()) > 5:
            yrs = YEARS[1:]
            st2 = trend(Y[yrs].sum(), P[yrs].sum(), yrs)[0]
            r2 = analyse(Y[yrs], P[yrs], yrs, st2, mun, nb=True)
            d["sensibilidad_2020_2025"] = {"tendencia_estatal": st2, "p_pendiente_aleatoria": r2["p_pendiente_aleatoria"],
                                           "n_ic_inferior_mayor_a_0": sum(r["jerarquico"][1] > 0 for r in r2["municipios"])}
        out["delitos"][name] = d
    d = out["delitos"]
    otros = [n for n in DELITOS if n != "Homicidio doloso"]
    h = lambda P_: {
        "H19a": P_["Homicidio doloso"]["p"] < 0.05,
        "H19b": P_["Homicidio doloso"]["peq"] == 0,
        "H19c": P_["Homicidio doloso"]["crudo"] > 0 and P_["Homicidio doloso"]["kept"] <= P_["Homicidio doloso"]["crudo"] / 2,
        "H19d": all(P_[n]["p"] < 0.05 for n in otros),
        "H19e": P_["Abuso sexual"]["sube"] >= 10}
    for key in ("binomial_negativa", "poisson_comparacion"):
        P_ = {n: {"p": d[n][key]["p_pendiente_aleatoria"], "peq": d[n][key]["resumen"]["n_pequenos_se_apartan_jerarquico"],
                  "crudo": d[n][key]["resumen"]["n_se_apartan_crudo"], "kept": d[n][key]["resumen"]["n_crudo_que_siguen_en_jerarquico"],
                  "sube": d[n][key]["resumen"]["n_ic_inferior_mayor_a_0"]} for n in DELITOS}
        if key == "binomial_negativa":
            out["hipotesis"] = h(P_)
        else:
            out["comparacion_poisson_hipotesis"] = h(P_)
    return out
