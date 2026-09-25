// Map layers shared by the chapters and the explorer. Every municipality gets a color from its own value
// (smoothed rate, model estimate or classification); an ink outline marks the ones whose difference is credible (IC95).
// Gray therefore means "near the state average", never "no data".
import { esc } from './ui.mjs';
import { F } from './generated/findings.mjs';
import { num, sgn, range, legend } from './charts.mjs';

const mun = (c) => F.mun[c].n;
const CLS_TXT = { superior: 'Creíblemente por encima del promedio', inferior: 'Creíblemente por debajo del promedio', indistinguible: 'No se distingue del promedio' };

// ---- Rates: sequential ramp by ratio to the state rate ----
const RATE_BREAKS = [0.5, 0.8, 1.25, 2];
const RATE_LABELS = ['Menos de la mitad del promedio', '0.5 a 0.8 veces', 'Cerca del promedio (0.8 a 1.25)', '1.25 a 2 veces', 'El doble o más'];
const RATES = {
  des: { m: () => F.p5.des.m, state: () => F.p5.des.tasa, unit: 'personas desaparecidas por 100 mil habitantes', short: 'por 100 mil', d: 0, n: 'personas desaparecidas' },
  hom: { m: () => F.p5.hom.m, state: () => F.p5.hom.tasa, unit: 'homicidios por 100 mil habitantes al año (2019–2025)', short: 'por 100 mil al año', d: 1, n: 'carpetas de homicidio' },
  vcm: { m: () => F.p11.vcm.m, state: () => F.p11.vcm.tasa, unit: 'mujeres víctimas por 100 mil mujeres (ene–ago 2026)', short: 'por 100 mil mujeres', d: 0, n: 'víctimas' },
};
const rateClass = (ratio) => `s${1 + RATE_BREAKS.filter((b) => ratio >= b).length}`;

export function rateLayer(kind) {
  const R = RATES[kind], m = R.m(), state = R.state();
  const count = (k) => Object.values(m).filter((x) => rateClass(x[1] / state) === k).length;
  const cred = Object.values(m).filter((x) => x[4] !== 'indistinguible').length;
  return {
    state, unit: R.unit,
    legend: legend([...RATE_LABELS.map((l, i) => ({ label: `${l} (${count(`s${i + 1}`)})`, color: `--seq-${i + 1}` })),
      { label: `Borde: diferencia creíble con el promedio (${cred})`, color: '--ink', shape: 'outline' }]),
    fill: (c) => { const [n, eb, lo, hi, cls] = m[c];
      return { k: rateClass(eb / state), tip: `${mun(c)}\n${num(eb, R.d)} ${R.short}\nIC95 ${range(lo, hi, R.d)} · ${CLS_TXT[cls]}\n${num(n)} ${R.n}` }; },
    overlay: (c) => ({ on: m[c][4] !== 'indistinguible' }),
    value: (c) => m[c][1],
    row: (c) => { const [n, eb, lo, hi, cls] = m[c]; return [num(eb, R.d), range(lo, hi, R.d), num(n), CLS_TXT[cls]]; },
    head: ['Tasa (suavizada)', 'IC95', 'Casos', 'Comparado con el promedio'],
  };
}

// ---- P1: which one weighs more, disappearance or homicide (each compared with its own state average) ----
const LVL = { alto: 2, promedio: 1, bajo: 0 };
const LVL_TXT = { alto: 'alta', promedio: 'indistinguible del promedio', bajo: 'baja' };
const HOM_TXT = { alto: 'alto', promedio: 'indistinguible del promedio', bajo: 'bajo' };
const P1K = { 2: 'dp2', 1: 'dp1', 0: 'd0', '-1': 'dn1', '-2': 'dn2' };
const P1L = { dp2: 'Desaparición alta, homicidio bajo', dp1: 'La desaparición pesa más que el homicidio', d0: 'Pesan parecido (mismo nivel en ambos)', dn1: 'El homicidio pesa más que la desaparición', dn2: 'Homicidio alto, desaparición baja' };
export const p1Class = (c) => { const x = F.p1.m[c]; return P1K[LVL[x[5]] - LVL[x[9]]]; };

export function p1Layer() {
  const count = (k) => Object.keys(F.p1.m).filter((c) => p1Class(c) === k).length;
  const robust = new Set(F.p1.list12.filter((m) => m.robust).map((m) => m.cv));
  return {
    legend: legend(['dp2', 'dp1', 'd0', 'dn1', 'dn2'].map((k) => ({ label: `${P1L[k]} (${count(k)})`, color: { dp2: '--des', dp1: '--des-l', d0: '--mid', dn1: '--hom-l', dn2: '--hom' }[k] }))),
    fill: (c) => { const x = F.p1.m[c];
      return { k: p1Class(c), tip: `${mun(c)}\nDesaparición ${LVL_TXT[x[5]]} · homicidio ${HOM_TXT[x[9]]}\n${num(x[0])} personas desaparecidas · ${num(x[1])} homicidios 2015–2025${
        p1Class(c) === 'dp2' ? `\n${robust.has(c) ? 'Se sostiene' : 'No se sostiene'} con el homicidio de 2015–2018` : ''}` }; },
    value: (c) => LVL[F.p1.m[c][5]] - LVL[F.p1.m[c][9]],
    row: (c) => { const x = F.p1.m[c]; return [LVL_TXT[x[5]], HOM_TXT[x[9]], num(x[0]), num(x[1]), x[10] == null ? '—' : `${num(x[10], 2)}×`]; },
    head: ['Desaparición', 'Homicidio', 'Desaparecidas', 'Homicidios 2015–2025', 'Razón relativa'],
    label: (c) => P1L[p1Class(c)],
  };
}

// ---- P19: municipal trend. The hierarchical model pulls small municipalities toward the *typical* trend (not toward
// zero), so the point estimate alone would overstate change. Strong color = credible change (IC95 excludes zero);
// light color = the estimate points that way but the interval includes zero; gray = estimate within ±3% and not credible.
const TK = ['tn2', 'tn1', 't0', 'tp1', 'tp2'];
const TL = ['Baja de forma creíble', 'Tiende a bajar, sin certeza', 'Sin cambio claro', 'Tiende a subir, sin certeza', 'Sube de forma creíble'];
const TC = ['--down', '--down-l', '--mid', '--up-l', '--up'];
const trendClass = (m) => (m[3] === 'down' ? 'tn2' : m[3] === 'up' ? 'tp2' : m[0] <= -3 ? 'tn1' : m[0] >= 3 ? 'tp1' : 't0');
const TREND_TXT = { up: 'Sube de forma creíble', down: 'Baja de forma creíble', flat: 'Sin certeza: el intervalo incluye el cero' };
const trendTip = (d, c) => { const m = d.m[c]; return `${mun(c)} · ${d.k}\n${sgn(m[0])} al año\nIC95 ${sgn(m[1])} a ${sgn(m[2])} · ${TREND_TXT[m[3]]}\n${num(m[4])} carpetas 2019–2025`; };

export function trendLegend(i) {
  const d = F.p19[i];
  const count = (k) => Object.values(d.m).filter((m) => trendClass(m) === k).length;
  return legend(TK.map((k, j) => ({ label: `${TL[j]} (${count(k)})`, color: TC[j] })));
}

export function trendLayer(i) {
  const d = F.p19[i];
  return {
    legend: trendLegend(i),
    fill: (c) => ({ k: trendClass(d.m[c]), tip: trendTip(d, c) }),
    value: (c) => d.m[c][0],
    row: (c) => { const m = d.m[c]; return [sgn(m[0]), `${sgn(m[1])} a ${sgn(m[2])}`, num(m[4]), TREND_TXT[m[3]]]; },
    head: ['Cambio anual', 'IC95', 'Carpetas 2019–2025', 'Clasificación'],
  };
}

// One map for the five crimes: per-crime class and tooltip ride on data attributes; CSS picks by data-k.
export function trendSwitch(id) {
  const css = F.p19.map((_, i) => TK.map((k, j) => `#${id}[data-k="${i}"] use[data-c${i}="${k}"]{fill:var(${TC[j]})}`).join('')).join('');
  return {
    css: `<style>${css}</style>`,
    fill: (c) => ({ tip: trendTip(F.p19[0], c), attrs: F.p19.map((d, i) => ` data-c${i}="${trendClass(d.m[c])}" data-t${i}="${esc(trendTip(d, c))}"`).join('') }),
  };
}
