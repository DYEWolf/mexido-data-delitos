"""Statistical helpers: exact Poisson intervals, empirical-Bayes rate smoothing, concentration."""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

PER = 100_000


def poisson_ci(k, alpha: float = 0.05):
    """Exact (Garwood) two-sided interval for a Poisson count k."""
    k = np.asarray(k, dtype=float)
    lo = np.where(k == 0, 0.0, stats.chi2.ppf(alpha / 2, 2 * k) / 2)
    hi = stats.chi2.ppf(1 - alpha / 2, 2 * (k + 1)) / 2
    return lo, hi


def rate_table(count, exposure, per: int = PER, alpha: float = 0.05) -> pd.DataFrame:
    """Crude rate with exact Poisson CI. `exposure` = person-years."""
    count = np.asarray(count, dtype=float); exposure = np.asarray(exposure, dtype=float)
    lo, hi = poisson_ci(count, alpha)
    return pd.DataFrame({"rate": count / exposure * per, "lo": lo / exposure * per, "hi": hi / exposure * per})


def eb_gamma(count, exposure, per: int = PER) -> pd.DataFrame:
    """Empirical-Bayes Poisson-Gamma smoothing (global method of moments, Marshall 1991).

    Small areas are shrunk toward the overall rate in proportion to how little data they have.
    Returns posterior mean rate and a 95% credible interval from the Gamma posterior.
    """
    y = np.asarray(count, dtype=float); e = np.asarray(exposure, dtype=float)
    m = y.sum() / e.sum()
    r = y / e
    s2 = np.sum(e * (r - m) ** 2) / e.sum()
    var_between = max(s2 - m / e.mean(), 1e-12)      # between-area variance of true rates
    shape, scale_rate = m ** 2 / var_between, m / var_between  # Gamma(alpha, beta) prior
    a_post, b_post = shape + y, scale_rate + e
    mean = a_post / b_post
    lo = stats.gamma.ppf(0.025, a_post, scale=1 / b_post)
    hi = stats.gamma.ppf(0.975, a_post, scale=1 / b_post)
    return pd.DataFrame({"eb_rate": mean * per, "eb_lo": lo * per, "eb_hi": hi * per,
                         "shrink": 1 - (e / (e + scale_rate))})


def lorenz(cases, pop):
    """Lorenz curve of cases vs population, areas sorted by rate (ascending). Returns x, y, gini."""
    cases = np.asarray(cases, dtype=float); pop = np.asarray(pop, dtype=float)
    order = np.argsort(cases / pop)
    x = np.concatenate([[0], np.cumsum(pop[order]) / pop.sum()])
    y = np.concatenate([[0], np.cumsum(cases[order]) / cases.sum()])
    gini = 1 - np.sum((x[1:] - x[:-1]) * (y[1:] + y[:-1]))
    return x, y, gini


def gini_ci(cases, pop, n_boot: int = 5000, seed: int = 20260924) -> dict:
    """Parametric bootstrap (Poisson resampling of each area's count) for the concentration index.

    Poisson resampling adds noise on top of the noise already in the observed counts, so the bootstrap
    Gini is biased upward and the percentile interval is not centred on the estimate. We report the
    basic (pivotal) interval [2g - q97.5, 2g - q2.5], which corrects that bias (Davison & Hinkley 1997,
    §5.2). Efron's BC percentile interval is not used: when most replicas exceed the estimate, its lower
    quantile falls in the extreme tail and is unstable with a finite number of replicas.
    """
    rng = np.random.default_rng(seed)
    cases = np.asarray(cases, dtype=float)
    g = lorenz(cases, pop)[2]
    boots = np.array([lorenz(rng.poisson(cases), pop)[2] for _ in range(n_boot)])
    q_lo, q_hi = np.percentile(boots, [2.5, 97.5])
    bias = boots.mean() - g
    return {"ic95": (2 * g - q_hi, 2 * g - q_lo), "ic95_percentil": (q_lo, q_hi), "sesgo_bootstrap": bias,
            "gini_corregido": g - bias, "prop_replicas_bajo_estimacion": float((boots < g).mean())}
