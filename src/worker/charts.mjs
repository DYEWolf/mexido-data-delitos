// Server-rendered charts. Text, axes and marks are HTML positioned in percentages, so charts reflow on any width
// without scaling type; SVG is used only for lines, bands and municipal geometry. One site-wide script adds
// tooltips and the line-chart crosshair; every value is also in a data table, so nothing depends on hovering.
import { esc } from './ui.mjs';
import { MAP } from './generated/map.mjs';
import { F } from './generated/findings.mjs';

// ---- number formatting (es-MX, true minus sign) ----
const MINUS = '−';
export const num = (x, d = 0) => (x == null ? '—' : Number(x).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', MINUS));
export const pc = (x, d = 1) => (x == null ? '—' : `${num(x, d)}%`);
export const sgn = (x, d = 1, unit = '%') => (x == null ? '—' : `${x > 0 ? '+' : x < 0 ? MINUS : ''}${num(Math.abs(x), d)}${unit}`);
export const ci = (lo, hi, d = 1, unit = '') => `[${num(lo, d)}${unit}, ${num(hi, d)}${unit}]`;
export const range = (lo, hi, d = 1) => `${num(lo, d)}–${num(hi, d)}`;

// ---- scales ----
export function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const out = [];
  const end = Math.ceil(max / step - 1e-9) * step;
  for (let v = Math.floor(min / step + 1e-9) * step; v <= end + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}
const scaler = (min, max, log = false) => (log
  ? (v) => ((Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))) * 100
  : (v) => ((v - min) / (max - min)) * 100);
const clamp = (v) => Math.max(0, Math.min(100, v));
const P = (v) => `${clamp(v).toFixed(2)}%`;

// ---- figure frame, legend, table ----
export function legend(items) {
  return `<ul class="lg">${items.map((i) => `<li><i class="k-${i.shape || 'rect'}" style="--k:var(${i.color})"></i>${esc(i.label)}</li>`).join('')}</ul>`;
}

export function table(head, rows, numeric = []) {
  const cell = (tag, v, i) => `<${tag}${numeric.includes(i) ? ' class="n"' : ''}>${v}</${tag}>`;
  return `<table><thead><tr>${head.map((h, i) => cell('th', esc(h), i)).join('')}</tr></thead><tbody>${
    rows.map((r) => `<tr>${r.map((v, i) => cell('td', v, i)).join('')}</tr>`).join('')}</tbody></table>`;
}

export function figure({ id, title, sub, legend: lg = '', body, source, note, after = '', table: tb, cls = '' }) {
  return `<figure class="fig ${cls}"${id ? ` id="${esc(id)}"` : ''}>
<div class="fig-head"><h3>${title}</h3>${sub ? `<p class="fig-sub">${sub}</p>` : ''}</div>${lg}
<div class="fig-body">${body}</div>
${note ? `<p class="fig-note">${note}</p>` : ''}${after}${source ? `<p class="fig-src">${source}</p>` : ''}
${tb ? `<details class="fig-data"><summary>Ver los datos</summary><div class="table-scroll">${tb}</div></details>` : ''}</figure>`;
}

// ---- stat tiles ----
export function stats(items) {
  return `<div class="tiles">${items.map((s) => `<div class="tile"><b>${s.value}</b><span>${s.label}</span>${s.note ? `<small>${s.note}</small>` : ''}</div>`).join('')}</div>`;
}

// ---- horizontal rows: dot + interval, bars, dumbbells ----
// rows: { label, sub, v, lo, hi, color, ref (context tick), marks: [{v, color, tip, shape}], bar, tip, val }
export function rows({ rows: rs, min, max, ticks, fmt = (v) => num(v, 1), log = false, zero, refLabel, barBase = 0, compact = false, valW }) {
  const x = scaler(min, max, log);
  const tk = ticks || niceTicks(min, max, 5);
  const grid = tk.map((t) => `<span class="gl" style="left:${P(x(t))}"></span>`).join('') + (zero != null ? `<span class="z" style="left:${P(x(zero))}"></span>` : '');
  const axis = `<div class="rw rw-axis"><div></div><div class="rt">${tk.map((t) => `<span class="tk" style="left:${P(x(t))}">${esc(fmt(t))}</span>`).join('')}</div><div></div></div>`;
  const body = rs.map((r) => {
    let marks = '';
    if (r.bar) {
      const a = x(Math.min(barBase, r.v)), b = x(Math.max(barBase, r.v));
      marks += `<span class="bar${r.v < barBase ? ' neg' : ''}" style="left:${P(a)};width:${(clamp(b) - clamp(a)).toFixed(2)}%;--k:var(${r.color || '--c1'})"></span>`;
    }
    if (r.lo != null && r.hi != null) marks += `<span class="ci" style="left:${P(x(r.lo))};width:${(clamp(x(r.hi)) - clamp(x(r.lo))).toFixed(2)}%;--k:var(${r.color || '--c1'})"></span>`;
    if (r.ref != null) marks += `<span class="ref" style="left:${P(x(r.ref))}" title="${esc(refLabel || '')}"></span>`;
    if (r.marks) {
      const vs = r.marks.map((m) => m.v);
      if (r.link !== false && vs.length === 2) marks += `<span class="link" style="left:${P(x(Math.min(...vs)))};width:${(clamp(x(Math.max(...vs))) - clamp(x(Math.min(...vs)))).toFixed(2)}%"></span>`;
      marks += r.marks.map((m) => `<span class="dot${m.shape === 'ring' ? ' ring' : ''}" tabindex="0" style="left:${P(x(m.v))};--k:var(${m.color})" data-tip="${esc(m.tip)}"></span>`).join('');
    } else if (!r.bar) {
      marks += `<span class="dot" tabindex="0" style="left:${P(x(r.v))};--k:var(${r.color || '--c1'})" data-tip="${esc(r.tip)}"></span>`;
    } else {
      marks += `<span class="hit" tabindex="0" style="left:0;width:100%" data-tip="${esc(r.tip)}"></span>`;
    }
    return `<div class="rw${r.strong ? ' strong' : ''}${r.group ? ' grp' : ''}"><div class="rl">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div><div class="rt">${grid}${marks}</div><div class="rv">${r.val ?? ''}</div></div>`;
  }).join('');
  return `<div class="cq"><div class="rows${compact ? ' compact' : ''}"${valW ? ` style="--vw:${valW}"` : ''}>${axis}${body}</div></div>`;
}

// ---- 100% stacked horizontal bars ----
// data: [{ label, parts: [{ v, color, label }] }]
export function stack(data, { fmt = (v) => pc(v, 1), minLabel = 11 } = {}) {
  return `<div class="cq"><div class="stk">${data.map((d) => {
    const tot = d.parts.reduce((a, p) => a + p.v, 0);
    return `<div class="stk-row"><div class="stk-l">${esc(d.label)}</div><div class="stk-bar">${d.parts.map((p) => {
      const share = (p.v / tot) * 100;
      return `<span class="stk-s" tabindex="0" style="flex:${share.toFixed(3)} 1 0;--k:var(${p.color})${p.text ? `;--t:var(${p.text})` : ''}" data-tip="${esc(`${d.label} · ${p.label}\n${fmt(share)}${p.extra ? `\n${p.extra}` : ''}`)}">${share >= minLabel ? `<em>${esc(fmt(share))}</em>` : ''}</span>`;
    }).join('')}</div></div>`;
  }).join('')}</div></div>`;
}

// ---- vertical columns (categories along x) ----
// items: [{ label, v, ghost, color, tip, dim, val }]
export function columns(items, { max, height = 200, fmt = (v) => num(v), ghostColor = '--c1', ticks, labelAt = 'top' } = {}) {
  const top = max || Math.max(...items.map((i) => Math.max(i.v || 0, i.ghost || 0)));
  const tk = ticks || niceTicks(0, top, 4);
  const y = (v) => (v / tk.at(-1)) * 100;
  return `<div class="cols" style="--h:${height}px"><div class="cols-y">${tk.map((t) => `<span style="bottom:${P(y(t))}">${esc(fmt(t))}</span>`).join('')}</div>
<div class="cols-plot">${tk.map((t) => `<span class="gl-h" style="bottom:${P(y(t))}"></span>`).join('')}${items.map((i) => `<div class="col" tabindex="0" data-tip="${esc(i.tip)}">
${i.ghost != null ? `<span class="col-g" style="height:${P(y(i.ghost))};--k:var(${ghostColor})"></span>` : ''}<span class="col-b${i.dim ? ' dim' : ''}" style="height:${P(y(i.v))};--k:var(${i.color || '--c1'})"></span>
<span class="col-v" style="bottom:${P(y(labelAt === 'v' ? i.v : Math.max(i.v, i.ghost || 0)))}">${i.val ?? esc(fmt(i.v))}</span></div>`).join('')}</div>
<div></div><div class="cols-x">${items.map((i) => `<span>${esc(i.label)}</span>`).join('')}</div></div>`;
}

// ---- line chart over evenly spaced x categories ----
// series: [{ label, color, vals: [number|null], band: [[lo,hi]|null], hollow: [index], end: label text }]
export function line({ x, series, min = 0, max, ticks, fmt = (v) => num(v), height = 240, tipFmt, xEvery = 1, notes = [] }) {
  const all = series.flatMap((s) => [...s.vals, ...(s.band || []).flat()]).filter((v) => v != null);
  const tk = ticks || niceTicks(min, max ?? Math.max(...all), 5);
  const lo = tk[0], hi = tk.at(-1);
  const X = (i) => 3 + (x.length === 1 ? 47 : (i / (x.length - 1)) * 94);
  const Y = (v) => 100 - ((v - lo) / (hi - lo)) * 100;
  const paths = series.map((s) => {
    let d = '', pen = false;
    s.vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(2)},${Y(v).toFixed(2)}`; pen = true; });
    let band = '';
    if (s.band) {
      const idx = s.band.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
      if (idx.length) band = `<polygon points="${[...idx.map((i) => `${X(i).toFixed(2)},${Y(s.band[i][1]).toFixed(2)}`), ...idx.reverse().map((i) => `${X(i).toFixed(2)},${Y(s.band[i][0]).toFixed(2)}`)].join(' ')}" style="fill:var(${s.color})" class="band"/>`;
    }
    return `${band}<path d="${d}" style="stroke:var(${s.color})"${s.thin ? ' class="thin"' : ''}/>`;
  }).join('');
  const marks = series.map((s) => s.vals.map((v, i) => (v == null || (s.marks === 'none') || (s.marks === 'end' && i !== s.vals.length - 1 && !(s.hollow || []).includes(i))
    ? '' : `<span class="mk${(s.hollow || []).includes(i) ? ' hollow' : ''}" style="left:${P(X(i))};top:${P(Y(v))};--k:var(${s.color})"></span>`)).join('')).join('');
  // End labels: de-collided vertically (min gap ~16px), keyed by a short line of the series color.
  const ends = series.filter((s) => s.end).map((s) => { const i = s.vals.map((v, j) => (v == null ? -1 : j)).filter((j) => j >= 0).at(-1); return { s, i, y: (Y(s.vals[i]) / 100) * height }; })
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 17) ends[k].y = ends[k - 1].y + 17;
  if (ends.length && ends.at(-1).y > height - 6) { ends.at(-1).y = height - 6; for (let k = ends.length - 2; k >= 0; k--) if (ends[k + 1].y - ends[k].y < 17) ends[k].y = ends[k + 1].y - 17; }
  const endHtml = ends.map((e) => `<span class="end" style="top:${e.y.toFixed(1)}px;--k:var(${e.s.color})">${e.s.end}</span>`).join('');
  const notesHtml = notes.map((n) => `<span class="lc-note${X(n.i) > 75 ? ' r' : ''}" style="left:${P(X(n.i))};top:${P(Y(n.v))}">${esc(n.text)}</span>`).join('');
  const last = x.length - 1, lastShown = last - (last % xEvery);
  // Always label the last category; drop the regular label just before it when the two would collide.
  const showX = (i) => i === last || (i % xEvery === 0 && !(i === lastShown && last - i < xEvery * 0.75));
  const data = { x: x.map(String), s: series.map((s) => ({ n: s.label, c: s.color, v: s.vals.map((v, i) => (v == null ? null : (tipFmt || fmt)(v, i, s))) })) };
  return `<div class="cq"><div class="lc${ends.length ? ' has-end' : ''}" style="--h:${height}px">
<div class="lc-y">${tk.map((t) => `<span style="top:${P(Y(t))}">${esc(fmt(t))}</span>`).join('')}</div>
<div class="lc-plot" data-lc="${esc(JSON.stringify(data))}">${tk.map((t) => `<span class="gl-h" style="top:${P(Y(t))}"></span>`).join('')}
<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>${marks}${notesHtml}<span class="lc-x"></span></div>
<div class="lc-end">${endHtml}</div><div></div>
<div class="lc-xl">${x.map((l, i) => (showX(i) ? `<span style="left:${P(X(i))}">${esc(l)}</span>` : '')).join('')}</div></div></div>`;
}

// ---- back-to-back rate pyramid ----
// ages top->bottom; left/right: { label, color, vals: [[v,lo,hi]] }
export function pyramid({ ages, left, right, max, fmt = (v) => num(v, 1) }) {
  const m = max || Math.max(...[...left.vals, ...right.vals].map((v) => v[2]));
  const w = (v) => ((v / m) * 100).toFixed(2);
  const side = (s, i, age, dir) => { const [v, lo, hi] = s.vals[i];
    return `<div class="py-t ${dir}" tabindex="0" data-tip="${esc(`${s.label}, ${age} años\n${fmt(v)} por 100 mil al año\nIC95 ${range(lo, hi)}`)}"><span class="py-b" style="width:${w(v)}%;--k:var(${s.color})"></span><span class="py-ci" style="${dir === 'l' ? 'right' : 'left'}:${w(lo)}%;width:${(w(hi) - w(lo)).toFixed(2)}%"></span><span class="py-v" style="${dir === 'l' ? 'right' : 'left'}:calc(${w(hi)}% + 6px)">${esc(fmt(v))}</span></div>`; };
  return `<div class="py"><div class="py-h"><span>${esc(left.label)}</span><span></span><span>${esc(right.label)}</span></div>${ages.map((a, i) => `<div class="py-r">${side(left, i, a, 'l')}<div class="py-a">${esc(a)}</div>${side(right, i, a, 'r')}</div>`).join('')}</div>`;
}

// ---- 10x10 unit chart ----
export function waffle(pctFilled, { color = '--c1', label = '' } = {}) {
  const k = Math.round(pctFilled);
  let cells = '';
  for (let i = 0; i < 100; i++) cells += `<i${i < k ? ' class="on"' : ''}></i>`;
  return `<div class="waf" role="img" aria-label="${esc(label || `${k} de cada 100`)}" style="--k:var(${color})">${cells}</div>`;
}

// ---- scatter with selective labels ----
// points: [{ x, y, label, tip, color, show, dx, dy, anchor }]
export function scatter({ points, xMin = 0, xMax = 100, yMin = 0, yMax = 100, xTicks, yTicks, xLabel, yLabel, fmt = (v) => `${num(v)}%`, height = 360 }) {
  const X = scaler(xMin, xMax), Y = (v) => 100 - scaler(yMin, yMax)(v);
  const xt = xTicks || niceTicks(xMin, xMax, 4), yt = yTicks || niceTicks(yMin, yMax, 4);
  return `<div class="sc" style="--h:${height}px"><div class="sc-yl">${esc(yLabel)}</div><div class="sc-y">${yt.map((t) => `<span style="top:${P(Y(t))}">${esc(fmt(t))}</span>`).join('')}</div>
<div class="sc-plot">${yt.map((t) => `<span class="gl-h" style="top:${P(Y(t))}"></span>`).join('')}${xt.map((t) => `<span class="gl-v" style="left:${P(X(t))}"></span>`).join('')}
${points.map((p) => `<span class="sc-p" tabindex="0" style="left:${P(X(p.x))};top:${P(Y(p.y))};--k:var(${p.color || '--c1'})" data-tip="${esc(p.tip)}"></span>${p.show ? `<span class="sc-l ${p.anchor || (X(p.x) > 50 ? 'l' : 'r')}" style="left:${P(X(p.x))};top:${P(Y(p.y))};--dx:${p.dx || 0}px;--dy:${p.dy || 0}px">${esc(p.label)}</span>` : ''}`).join('')}</div>
<div></div><div></div><div class="sc-x">${xt.map((t) => `<span style="left:${P(X(t))}">${esc(fmt(t))}</span>`).join('')}</div><div></div><div></div><div class="sc-xl">${esc(xLabel)}</div></div>`;
}

// ---- sparkline (single series, own scale; first and last values labeled) ----
export function spark(vals, { color = '--c1', height = 56, labels } = {}) {
  const v = vals.filter((x) => x != null), lo = Math.min(...v), hi = Math.max(...v);
  const X = (i) => 4 + (i / (vals.length - 1)) * 92, Y = (x) => 90 - ((x - lo) / (hi - lo || 1)) * 80;
  const d = vals.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)},${Y(x).toFixed(2)}`).join('');
  const hl = (labels || []).map(([i, text]) => `<span class="mk" style="left:${P(X(i))};top:${P(Y(vals[i]))};--k:var(${color})"></span><span class="sp-l" style="left:${P(X(i))};top:${P(Y(vals[i]))}">${esc(text)}</span>`).join('');
  return `<div class="sp" style="--h:${height}px"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" style="stroke:var(${color})"/></svg>${hl}</div>`;
}

// ---- municipal maps ----
// Geometry is emitted once per page (<defs>), every map instance is <use> elements, so several maps cost little.
export function mapDefs() {
  return `<svg class="map-defs" aria-hidden="true" width="0" height="0"><defs>${Object.entries(MAP.paths).map(([c, d]) => `<path id="g${c}" d="${d}" vector-effect="non-scaling-stroke"/>`).join('')}</defs></svg>`;
}

// fill(cv) -> { k: class suffix, tip, attrs }; circles: [{ cv, v, tip, k }] sized by area; opts.inset shows the AMG zoom.
export function map({ fill, circles = [], maxCircle, inset = true, label, attrs = '', small = false, link = true }) {
  const box = F.amgBox;
  const uses = (inInset) => Object.keys(MAP.paths).map((c) => {
    const f = fill(c) || {};
    const u = `<use href="#g${c}" class="f-${f.k || 'none'}" data-tip="${esc(f.tip || F.mun[c].n)}"${f.attrs || ''}${inInset ? '' : ' tabindex="-1"'}/>`;
    return link && !inInset ? `<a href="/municipio/${c}" aria-label="${esc(F.mun[c].n)}">${u}</a>` : u;
  }).join('');
  const cmax = maxCircle || Math.max(1, ...circles.map((c) => c.v));
  const rad = (v) => Math.sqrt(v / cmax) * (small ? 14 : 26);
  const circ = (inInset) => circles.filter((c) => c.v > 0 && (!inInset || (F.mun[c.cv].c[0] > box[0] && F.mun[c.cv].c[0] < box[0] + box[2] && F.mun[c.cv].c[1] > box[1] && F.mun[c.cv].c[1] < box[1] + box[3])))
    .sort((a, b) => b.v - a.v).map((c) => {
      const [cx, cy] = F.mun[c.cv].c;
      const lx = inInset ? ((cx - box[0]) / box[2]) * 100 : (cx / MAP.width) * 100, ly = inInset ? ((cy - box[1]) / box[3]) * 100 : (cy / MAP.height) * 100;
      const r = rad(c.v);
      return `<span class="mc${c.k ? ` mc-${c.k}` : ''}" tabindex="0" style="left:${lx.toFixed(2)}%;top:${ly.toFixed(2)}%;width:${(2 * r).toFixed(1)}px;height:${(2 * r).toFixed(1)}px" data-tip="${esc(c.tip)}"></span>`;
    }).join('');
  const main = `<div class="map-main"><svg viewBox="0 0 ${MAP.width} ${MAP.height}" role="img" aria-label="${esc(label)}">${uses(false)}${inset ? `<rect class="inset-box" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"/>` : ''}</svg>${circ(false)}</div>`;
  const ins = inset ? `<div class="map-inset"><p>Área metropolitana de Guadalajara, ampliada</p><div class="map-inset-v"><svg viewBox="${box.join(' ')}" aria-hidden="true">${uses(true)}</svg>${circ(true)}</div></div>` : '';
  return `<div class="map${small ? ' small' : ''}${inset ? ' with-inset' : ''}"${attrs}>${main}${ins}</div>`;
}

// Size key for proportional circles (same px scale as map()).
export function circleKey(values, max, fmtV = (v) => num(v), small = false) {
  return `<div class="ckey">${values.map((v) => { const d = 2 * Math.sqrt(v / max) * (small ? 14 : 26); return `<span><i style="width:${d.toFixed(1)}px;height:${d.toFixed(1)}px"></i>${esc(fmtV(v))}</span>`; }).join('')}</div>`;
}

export const CHART_CSS = `
:root{--wo:color-mix(in srgb,var(--ink) 13%,transparent)}
.fig{margin:36px 0 44px;padding:14px 0 0;border-top:1px solid var(--line)}.fig-head h3{font-size:1.02rem;font-weight:650;margin:0 0 4px;line-height:1.35;max-width:60ch}.fig-sub{margin:0 0 14px;color:var(--ink-2);font-size:.9rem;max-width:72ch}
.finding .fig,.fig .fig{border-top:0;padding-top:0}
.fig-body{position:relative}.fig-src{color:var(--ink-3);font-size:.8rem;margin:12px 0 0}.fig-src a{color:inherit}
.fig-note{color:var(--ink-2);font-size:.86rem;margin:10px 0 0;max-width:72ch}
.fig-data{margin-top:8px;font-size:.88rem}.fig-data summary{cursor:pointer;color:var(--accent);width:max-content}.fig-data table{margin-top:8px}
.lg{display:flex;flex-wrap:wrap;gap:4px 16px;list-style:none;margin:0 0 12px;padding:0;font-size:.85rem;color:var(--ink-2)}
.lg li{display:flex;align-items:center;gap:6px}.lg i{display:inline-block;background:var(--k)}
.k-rect{width:12px;height:12px;border-radius:3px}.k-dot{width:10px;height:10px;border-radius:50%}.k-line{width:16px;height:2px;border-radius:1px}
.k-ring{width:10px;height:10px;border-radius:50%;background:transparent!important;box-shadow:inset 0 0 0 2px var(--k)}.k-tick{width:2px;height:12px}
.k-half{width:12px;height:12px;border-radius:3px;opacity:.45}.k-circle{width:12px;height:12px;border-radius:50%;background:transparent!important;border:1.5px solid var(--k)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:0 28px;margin:28px 0 12px;border-top:2px solid var(--rule)}
.tile{padding:14px 0 16px;border-bottom:1px solid var(--line)}.tile b{display:block;font-size:clamp(1.7rem,3vw,2.1rem);line-height:1.1;letter-spacing:-.025em;font-weight:650;font-variant-numeric:tabular-nums}
.tile span{display:block;color:var(--ink);font-size:.92rem;margin-top:6px;line-height:1.4;max-width:28ch}.tile small{display:block;color:var(--ink-3);font-size:.78rem;margin-top:6px;line-height:1.4}
@media (max-width:560px){.tiles{grid-template-columns:1fr 1fr;gap:0 16px}.tile b{font-size:1.55rem}}
/* rows */
.rows{--lw:minmax(8rem,15rem);--vw:5.5rem;font-size:.9rem}.rw{display:grid;grid-template-columns:var(--lw) 1fr var(--vw);gap:0 12px;align-items:center;min-height:30px}
.rw.grp{margin-top:10px}.rl{line-height:1.25;padding:3px 0}.rl small{display:block;color:var(--ink-3);font-size:.78rem}.rw.strong .rl{font-weight:600}
.rv{font-variant-numeric:tabular-nums;color:var(--ink-2);font-size:.84rem;white-space:nowrap}.rw.strong .rv{color:var(--ink)}
.rt{position:relative;height:30px}.rw-axis{min-height:20px}.rw-axis .rt{height:20px}
.tk{position:absolute;top:0;transform:translateX(-50%);font-size:.75rem;color:var(--ink-3);font-variant-numeric:tabular-nums;white-space:nowrap}
.gl{position:absolute;top:0;bottom:0;width:1px;background:var(--grid)}.z{position:absolute;top:0;bottom:0;width:1px;background:var(--axis)}
.ci{position:absolute;top:50%;height:2px;margin-top:-1px;background:var(--k);opacity:.55;border-radius:1px}
.dot{position:absolute;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--k);box-shadow:0 0 0 2px var(--surface);cursor:default;outline-offset:2px}
.dot::after,.hit::after,.col::after{content:"";position:absolute;inset:-8px}.dot.ring{background:var(--surface);box-shadow:inset 0 0 0 2px var(--k),0 0 0 2px var(--surface)}
.dot:hover,.dot:focus{transform:scale(1.25)}.ref{position:absolute;top:6px;bottom:6px;width:2px;margin-left:-1px;background:var(--ink-3);border-radius:1px}
.link{position:absolute;top:50%;height:2px;margin-top:-1px;background:var(--axis)}
.bar{position:absolute;top:50%;height:14px;margin-top:-7px;background:var(--k);border-radius:0 4px 4px 0}.bar.neg{border-radius:4px 0 0 4px}
.hit{position:absolute;top:0;bottom:0}.rows.compact .rw{min-height:24px}.rows.compact .rt{height:24px}
.cq{container-type:inline-size}
.rows.compact{--lw:minmax(6.5rem,10rem)}
@container (max-width:560px){.rw-axis .rt:has(.tk:nth-child(6)) .tk:nth-child(odd){visibility:hidden}}
@container (max-width:560px){.rows:not(.compact) .rw{grid-template-columns:1fr var(--vw);grid-template-areas:"l l" "t v"}.rows:not(.compact) .rw>.rl{grid-area:l;padding-top:6px}.rows:not(.compact) .rw>.rt{grid-area:t}.rows:not(.compact) .rw>.rv{grid-area:v}
.rows:not(.compact) .rw-axis{grid-template-areas:"t v"}.rows:not(.compact) .rw-axis>div:first-child{display:none}.rows:not(.compact) .rw-axis .tk:first-child{transform:none}.rows:not(.compact) .rw-axis .tk:last-child{transform:translateX(-100%)}}
@container (max-width:380px){.rows.compact .rw{grid-template-columns:1fr var(--vw);grid-template-areas:"l l" "t v";min-height:0}.rows.compact .rw>.rl{grid-area:l;padding-top:4px}.rows.compact .rw>.rt{grid-area:t}.rows.compact .rw>.rv{grid-area:v}
.rows.compact .rw-axis{grid-template-areas:"t v"}.rows.compact .rw-axis>div:first-child{display:none}.rows.compact .rw-axis .tk:first-child{transform:none}.rows.compact .rw-axis .tk:last-child{transform:translateX(-100%)}}
/* stacked */
.stk{display:grid;gap:10px}.stk-row{display:grid;grid-template-columns:minmax(7rem,13rem) 1fr;gap:12px;align-items:center;font-size:.9rem}
.stk-bar{display:flex;gap:2px;height:26px}.stk-s{background:var(--k);position:relative;display:flex;align-items:center;justify-content:center;min-width:2px;cursor:default}
.stk-s:first-child{border-radius:4px 0 0 4px}.stk-s:last-child{border-radius:0 4px 4px 0}.stk-s em{font-style:normal;font-size:.78rem;color:var(--t,#fff);font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.stk-s:hover,.stk-s:focus{filter:brightness(1.12);outline:none}
@container (max-width:520px){.stk-row{grid-template-columns:1fr;gap:4px}}
/* columns */
.cols{display:grid;grid-template-columns:3rem 1fr;grid-template-rows:var(--h) auto;font-size:.8rem}.cols-y{position:relative}
.cols-y span{position:absolute;right:8px;transform:translateY(50%);color:var(--ink-3);font-variant-numeric:tabular-nums}
.cols-plot{position:relative;display:flex;align-items:stretch;gap:2px;border-bottom:1px solid var(--axis)}.gl-h{position:absolute;left:0;right:0;height:1px;background:var(--grid)}
.col{position:relative;flex:1;display:flex;justify-content:center;cursor:default}.col-g,.col-b{position:absolute;bottom:0;border-radius:4px 4px 0 0}
.col-g{width:min(26px,70%);background:var(--k);opacity:.3}.col-b{width:min(14px,44%);background:var(--k)}.col-b.dim{opacity:.45}
.col-v{position:absolute;transform:translateY(-4px);font-size:.74rem;color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.col:hover .col-b,.col:focus .col-b{filter:brightness(1.15)}.col:focus{outline:none}.col:focus-visible{outline:2px solid var(--accent)}
.cols-x{display:flex;gap:2px;padding-top:6px}.cols-x span{flex:1;text-align:center;color:var(--ink-2);font-variant-numeric:tabular-nums}
/* line */
.lc{display:grid;grid-template-columns:3.2rem 1fr 0;grid-template-rows:var(--h) auto;font-size:.8rem}.lc.has-end{grid-template-columns:3.2rem 1fr 9.5rem}
.lc-y{position:relative;grid-area:1/1}.lc-plot{grid-area:1/2}.lc-end{grid-area:1/3}.lc-xl{grid-area:2/2}.lc-y span{position:absolute;right:8px;transform:translateY(-50%);color:var(--ink-3);font-variant-numeric:tabular-nums;white-space:nowrap}
.lc-plot{position:relative;border-bottom:1px solid var(--axis);cursor:crosshair}.lc-plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.lc-plot path{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}.lc-plot path.thin{stroke-width:1.5}
.lc-plot .band{opacity:.12}.mk{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--k);box-shadow:0 0 0 2px var(--surface);pointer-events:none}
.mk.hollow{background:var(--surface);box-shadow:inset 0 0 0 2px var(--k),0 0 0 2px var(--surface)}
.lc-x{position:absolute;top:0;bottom:0;width:1px;background:var(--ink-3);display:none;pointer-events:none}
.lc-note{position:absolute;transform:translate(-50%,-150%);font-size:.74rem;color:var(--ink-2);white-space:nowrap;background:var(--surface);padding:0 3px;border-radius:3px}
.lc-note.r{transform:translate(-100%,-150%)}.lc-end{position:relative}.end{position:absolute;left:10px;transform:translateY(-50%);font-size:.78rem;color:var(--ink-2);white-space:nowrap;line-height:1.1}
.end::before{content:"";display:inline-block;width:10px;height:2px;background:var(--k);vertical-align:middle;margin-right:5px}
.lc-xl{position:relative;height:22px}.lc-xl span{position:absolute;top:6px;transform:translateX(-50%);color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
@container (max-width:560px){.lc.has-end{grid-template-columns:2.6rem 1fr 0}.lc-end{display:none}}
.sp{position:relative;height:var(--h);margin:14px 0 4px}.sp svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.sp path{fill:none;stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round}.sp-l{position:absolute;transform:translate(-50%,-160%);font-size:.72rem;color:var(--ink-2);white-space:nowrap;font-variant-numeric:tabular-nums}
.sp-l:first-of-type{transform:translate(-10%,-160%)}
/* pyramid */
.py{font-size:.8rem}.py-h,.py-r{display:grid;grid-template-columns:1fr 3.4rem 1fr;align-items:center}.py-h{color:var(--ink-2);font-weight:600;margin-bottom:6px}
.py-h span:first-child{text-align:right;padding-right:6px}.py-r{height:22px}.py-a{text-align:center;color:var(--ink-2);font-variant-numeric:tabular-nums}
.py-t{position:relative;height:100%;cursor:default}.py-b{position:absolute;top:4px;bottom:4px;background:var(--k)}.py-t.l .py-b{right:0;border-radius:4px 0 0 4px}.py-t.r .py-b{left:0;border-radius:0 4px 4px 0}
.py-ci{position:absolute;top:50%;height:2px;margin-top:-1px;background:var(--ink)}.py-v{position:absolute;top:50%;transform:translateY(-50%);color:var(--ink-2);font-size:.72rem;font-variant-numeric:tabular-nums;white-space:nowrap}
.py-t:hover .py-b,.py-t:focus .py-b{filter:brightness(1.15)}.py-t:focus{outline:none}
/* waffle */
.waf{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;width:100%;max-width:180px;aspect-ratio:1}.waf i{background:var(--wo);border-radius:2px}.waf i.on{background:var(--k)}
/* scatter */
.sc{display:grid;grid-template-columns:1.2rem 2.6rem 1fr;grid-template-rows:var(--h) auto auto;font-size:.8rem}
.sc-yl{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;color:var(--ink-2)}.sc-y{position:relative}
.sc-y span{position:absolute;right:8px;transform:translateY(-50%);color:var(--ink-3)}.sc-plot{position:relative;border-left:1px solid var(--axis);border-bottom:1px solid var(--axis)}
.gl-v{position:absolute;top:0;bottom:0;width:1px;background:var(--grid)}.sc-x{position:relative;height:20px}.sc-x span{position:absolute;top:4px;transform:translateX(-50%);color:var(--ink-3)}
.sc-xl{text-align:center;color:var(--ink-2)}.sc-x span:last-child{transform:translateX(-100%)}.sc-x span:first-child{transform:none}.sc-p{position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--k);box-shadow:0 0 0 2px var(--surface);cursor:default}
.sc-p::after{content:"";position:absolute;inset:-7px}.sc-p:hover,.sc-p:focus{transform:scale(1.3);outline:none}
.sc-l{position:absolute;font-size:.76rem;color:var(--ink);white-space:nowrap;pointer-events:none;transform:translate(calc(8px + var(--dx)),calc(-50% + var(--dy)))}
.sc-l.l{transform:translate(calc(-100% - 8px + var(--dx)),calc(-50% + var(--dy)))}
/* maps */
.map-defs{position:absolute;width:0;height:0;overflow:hidden}
.map{display:grid;gap:12px;align-items:start}.map.with-inset{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}
.map-main,.map-inset-v{position:relative}.map svg{display:block;width:100%;height:auto}
.map use{stroke:var(--surface);stroke-width:.8;stroke-linejoin:round;fill:var(--mid)}.map a:focus{outline:none}
.map use:hover,.map a:focus use{stroke:var(--ink);stroke-width:1.8}.map-main svg{max-height:74vh}
.inset-box{fill:none;stroke:var(--ink-3);stroke-width:1;vector-effect:non-scaling-stroke}
.map-inset p{margin:0 0 6px;font-size:.8rem;color:var(--ink-2)}.map-inset-v{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--bg)}
.mc{position:absolute;transform:translate(-50%,-50%);border-radius:50%;background:color-mix(in srgb,var(--ink) 18%,transparent);border:1.5px solid var(--ink);cursor:default}
.mc:hover,.mc:focus{background:color-mix(in srgb,var(--ink) 35%,transparent);outline:none}
.ckey{display:flex;align-items:flex-end;gap:14px;font-size:.8rem;color:var(--ink-2);margin:6px 0 0}.ckey span{display:flex;flex-direction:column;align-items:center;gap:4px}
.ckey i{display:block;border-radius:50%;border:1.5px solid var(--ink);background:color-mix(in srgb,var(--ink) 18%,transparent)}
.map .f-des{fill:var(--des)}.map .f-des-p{fill:var(--des);fill-opacity:.45}.map .f-hom{fill:var(--hom)}.map .f-ambos{fill:var(--c3)}
.map .f-vcm{fill:var(--women)}.map .f-sel{fill:var(--ink)}.map .f-up{fill:var(--up)}.map .f-down{fill:var(--down)}.map .f-alto{fill:var(--up)}.map .f-otra{fill:var(--c2)}.map .f-reg{fill:var(--c1);fill-opacity:.35}
.map.small.with-inset{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}
@media (max-width:720px){.map.with-inset{grid-template-columns:1fr}}
.map[data-k] use[data-c0]{fill:var(--mid)}
.map[data-k="0"] use[data-c0="up"]{fill:var(--up)}.map[data-k="0"] use[data-c0="down"]{fill:var(--down)}.map[data-k="1"] use[data-c1="up"]{fill:var(--up)}.map[data-k="1"] use[data-c1="down"]{fill:var(--down)}.map[data-k="2"] use[data-c2="up"]{fill:var(--up)}.map[data-k="2"] use[data-c2="down"]{fill:var(--down)}.map[data-k="3"] use[data-c3="up"]{fill:var(--up)}.map[data-k="3"] use[data-c3="down"]{fill:var(--down)}.map[data-k="4"] use[data-c4="up"]{fill:var(--up)}.map[data-k="4"] use[data-c4="down"]{fill:var(--down)}
.sparks{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.spk{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--surface);font-size:.86rem}
.spk b{display:block;font-weight:600;line-height:1.25;min-height:2.5em}.spk small{display:block;color:var(--ink-3);font-size:.72rem}
table.bv{width:auto;max-width:100%;font-size:.85rem}table.bv caption{text-align:left;color:var(--ink-2);font-size:.85rem;padding-bottom:6px;caption-side:top}table.bv td{text-align:center;min-width:4.5rem;font-weight:600}@media (max-width:480px){table.bv{font-size:.78rem}table.bv td{min-width:0}table.bv th,table.bv td{padding:6px 5px}}
table.bv th{font-weight:500}.bv-des{background:color-mix(in srgb,var(--des) 28%,transparent)}.bv-hom{background:color-mix(in srgb,var(--hom) 22%,transparent)}.bv-ambos{background:color-mix(in srgb,var(--c3) 28%,transparent)}
.maps2{display:grid;grid-template-columns:1fr 1fr;gap:20px}.maps2 h4{font-size:.92rem;margin:0 0 6px}@media (max-width:720px){.maps2{grid-template-columns:1fr}}
/* tooltip */
.tt{position:fixed;z-index:20;pointer-events:none;background:var(--surface);color:var(--ink);border:1px solid var(--line);box-shadow:0 4px 18px rgba(0,0,0,.12);
border-radius:8px;padding:7px 10px;font-size:.82rem;line-height:1.35;max-width:300px;display:none}.tt div{color:var(--ink-2)}.tt .tv{color:var(--ink);font-weight:650;font-size:.95rem}
.tt .tr{display:flex;align-items:center;gap:6px;color:var(--ink)}.tt .tr i{display:inline-block;width:10px;height:2px;background:var(--k)}.tt .tr b{font-weight:650}.tt .tx{color:var(--ink-3);margin-bottom:2px}
`;

// Tooltips for [data-tip] (first line = label, second = value) and crosshair for line charts. textContent only.
export const CHART_JS = `(()=>{const t=document.createElement('div');t.className='tt';document.body.appendChild(t);let cur=null;
const place=(x,y)=>{const w=t.offsetWidth,h=t.offsetHeight;let l=x+14,tp=y-h-12;if(l+w>innerWidth-8)l=x-w-14;if(l<8)l=8;if(tp<8)tp=y+18;t.style.left=l+'px';t.style.top=tp+'px'};
const show=(el,x,y)=>{const s=el.getAttribute('data-tip');if(!s)return;t.replaceChildren(...s.split('\\n').map((l,i)=>{const d=document.createElement('div');d.textContent=l;if(i===1)d.className='tv';return d}));t.style.display='block';place(x,y)};
const hide=()=>{cur=null;t.style.display='none'};
document.addEventListener('pointerover',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');if(el&&el!==cur){cur=el;show(el,e.clientX,e.clientY)}});
document.addEventListener('pointermove',e=>{if(cur)place(e.clientX,e.clientY)});
document.addEventListener('pointerout',e=>{if(cur&&!(e.relatedTarget&&cur.contains(e.relatedTarget)))hide()});
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');if(el){cur=el;const r=el.getBoundingClientRect();show(el,r.left+r.width/2,r.top)}});
document.addEventListener('focusout',hide);addEventListener('scroll',()=>{if(cur&&cur.matches('.lc-plot'))hide()},{passive:true});
document.querySelectorAll('.lc-plot').forEach(p=>{const d=JSON.parse(p.dataset.lc),x=p.querySelector('.lc-x'),n=d.x.length;
const at=e=>{const r=p.getBoundingClientRect();const f=((e.clientX-r.left)/r.width*100-3)/94;const i=Math.max(0,Math.min(n-1,Math.round(f*(n-1))));
x.style.left=(3+(n===1?47:i/(n-1)*94))+'%';x.style.display='block';const rows=[];const hd=document.createElement('div');hd.className='tx';hd.textContent=d.x[i];rows.push(hd);
d.s.forEach(s=>{if(s.v[i]==null)return;const r=document.createElement('div');r.className='tr';r.style.setProperty('--k','var('+s.c+')');const k=document.createElement('i');const b=document.createElement('b');b.textContent=s.v[i];const l=document.createElement('span');l.textContent=s.n;r.append(k,b,l);rows.push(r)});
t.replaceChildren(...rows);t.style.display='block';place(e.clientX,e.clientY);cur=p};
p.addEventListener('pointermove',at);p.addEventListener('pointerleave',()=>{x.style.display='none';hide()})});
const openHash=()=>{const d=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));if(d&&d.tagName==='DETAILS')d.open=true};openHash();addEventListener('hashchange',openHash);
document.querySelectorAll('[data-switch]').forEach(g=>{const m=document.getElementById(g.dataset.switch);g.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
g.querySelectorAll('button').forEach(o=>o.setAttribute('aria-pressed',o===b?'true':'false'));const k=b.dataset.k;m.dataset.k=k;
m.querySelectorAll('use[data-t'+k+']').forEach(u=>u.setAttribute('data-tip',u.getAttribute('data-t'+k)));
document.querySelectorAll('[data-for="'+g.dataset.switch+'"]').forEach(el=>el.hidden=el.dataset.k!==k)}))})})()`;
