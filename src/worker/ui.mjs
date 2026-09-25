// Shared layout, styles and HTML helpers. Server-rendered; the only external script is Turnstile on /retiro.
import { CHART_CSS, CHART_JS } from './charts.mjs';
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-MX'));
export const titleCase = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
export function fecha(iso) {
  if (!iso) return 'Fecha no registrada';
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

const CSS = `
@font-face{font-family:"Source Serif 4";font-style:normal;font-weight:200 900;font-display:swap;src:url(/fonts/source-serif-4-latin-wght-normal.woff2) format("woff2")}
@font-face{font-family:"Source Serif 4";font-style:italic;font-weight:200 900;font-display:swap;src:url(/fonts/source-serif-4-latin-wght-italic.woff2) format("woff2")}
:root{color-scheme:light;--grid:#e1e0d9;--axis:#c3c2b7;--mid:#f0efec;--c1:#2a78d6;--c2:#eb6834;--c3:#1baf7a;--c4:#eda100;--c7:#4a3aa7;--c8:#e34948;--flat:#898781;--bg:#ffffff;--surface:#ffffff;--ink:#0b0b0b;--ink-2:#45443f;--ink-3:#6b6a64;--line:#e6e5e0;--rule:#0b0b0b;--accent:#2263b3;--accent-ink:#ffffff;--soft:#f4f4f1;--sel:#cfe0f7;--warn-bg:#fdf3e1;--warn-ink:#7a4b00;
--seq-0:#f0efec;--seq-1:#b7d3f6;--seq-2:#6da7ec;--seq-3:#3987e5;--seq-4:#1c5cab;--seq-5:#0d366b}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--grid:#2c2c2a;--axis:#4a4a46;--mid:#383835;--c1:#3987e5;--c2:#d95926;--c3:#199e70;--c4:#c98500;--c7:#9085e9;--c8:#e66767;--flat:#898781;--bg:#191918;--surface:#212120;--ink:#f4f3ef;--ink-2:#c3c2b7;--ink-3:#9a998f;--line:#353532;--rule:#d8d7d0;--accent:#7cb0ee;--accent-ink:#0b0b0b;--soft:#262624;--sel:#1f3f66;--warn-bg:#3a2c12;--warn-ink:#f3cf8a;
--seq-0:#383835;--seq-1:#104281;--seq-2:#1c5cab;--seq-3:#2a78d6;--seq-4:#5598e7;--seq-5:#9ec5f4}}
:root[data-theme="dark"]{color-scheme:dark;--grid:#2c2c2a;--axis:#4a4a46;--mid:#383835;--c1:#3987e5;--c2:#d95926;--c3:#199e70;--c4:#c98500;--c7:#9085e9;--c8:#e66767;--flat:#898781;--bg:#191918;--surface:#212120;--ink:#f4f3ef;--ink-2:#c3c2b7;--ink-3:#9a998f;--line:#353532;--rule:#d8d7d0;--accent:#7cb0ee;--accent-ink:#0b0b0b;--soft:#262624;--sel:#1f3f66;--warn-bg:#3a2c12;--warn-ink:#f3cf8a;
--seq-0:#383835;--seq-1:#104281;--seq-2:#1c5cab;--seq-3:#2a78d6;--seq-4:#5598e7;--seq-5:#9ec5f4}
:root{--hom:var(--c1);--des:var(--c2);--men:var(--c3);--women:var(--c7);--amg:var(--c1);--resto:var(--c2);--an:var(--c3);--as:var(--c4);--down:var(--c1);--up:var(--c8);
--serif:"Source Serif 4",Georgia,"Times New Roman",serif;--sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;--measure:66ch;--col:880px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scrollbar-color:var(--axis) transparent}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 var(--sans);caret-color:var(--accent);text-rendering:optimizeLegibility}
::selection{background:var(--sel);color:var(--ink)}
a{color:var(--accent);text-underline-offset:.18em;text-decoration-thickness:1px}a:hover{text-decoration-thickness:2px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}@media (max-width:480px){.wrap{padding:0 16px}}
/* header */
header.site{border-bottom:1px solid var(--line);background:var(--bg)}
header.site .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:0 32px;min-height:60px}
.brand{font:600 1.08rem/1 var(--serif);color:var(--ink);text-decoration:none;padding:18px 0;white-space:nowrap}.brand span{color:var(--ink-3);font-weight:400}
nav.main{display:flex;gap:0 22px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0;order:1}nav.main::-webkit-scrollbar{display:none}
nav.main a{color:var(--ink-2);text-decoration:none;padding:19px 0 17px;white-space:nowrap;border-bottom:2px solid transparent;font-size:.92rem}
nav.main a[aria-current]{color:var(--ink);border-bottom-color:var(--ink)}nav.main a:hover{color:var(--ink)}
.theme-t{display:none;order:2;align-items:center;justify-content:center;width:40px;min-height:40px;padding:0;margin-right:-8px;background:transparent;color:var(--ink-2);border:1px solid transparent;border-radius:999px}
.js .theme-t{display:inline-flex}.theme-t:hover{background:var(--soft);border-color:var(--line);color:var(--ink)}.theme-t svg{width:20px;height:20px}
:root[data-theme="dark"] .theme-t .i-moon,:root:not([data-theme="dark"]) .theme-t .i-sun{display:none}
@media (max-width:760px){header.site .wrap{gap:0}.brand{padding:16px 0 4px}.theme-t{order:0;margin:10px -8px 0 auto}nav.main{flex-basis:100%;gap:0 18px;mask-image:linear-gradient(90deg,#000 85%,transparent)}nav.main a{padding:10px 0 12px}}
/* type */
main{padding:40px 0 72px}@media (max-width:760px){main{padding:28px 0 56px}}
h1,h2,.hero-t{font-family:var(--serif);font-weight:600;text-wrap:balance;font-optical-sizing:auto}
h1{font-size:clamp(1.85rem,4.2vw,2.75rem);line-height:1.12;margin:0 0 16px;letter-spacing:-.018em;max-width:24ch}
h2{font-size:clamp(1.4rem,2.6vw,1.75rem);line-height:1.2;margin:72px 0 14px;letter-spacing:-.012em;max-width:34ch}
h3,h4{text-wrap:balance}
.lede{font:400 clamp(1.08rem,1.6vw,1.24rem)/1.55 var(--serif);color:var(--ink-2);max-width:62ch;margin:0 0 24px}
.byline{font-size:.84rem;color:var(--ink-3);margin:0 0 8px}.byline a{color:inherit}
.crumbs{font-size:.88rem;color:var(--ink-3);margin:0 0 12px}.crumbs a{color:var(--ink-2)}
.sub-h{font-size:.92rem;font-weight:600;margin:22px 0 8px}
.ctl-l{font-size:.85rem;color:var(--ink-3);min-width:9.5rem}
.ch-head{padding:0 0 8px;margin-bottom:8px}.sec{max-width:var(--col)}.sec .prose p,.sec>p{max-width:var(--measure)}
.sec>p,.prose p{margin:0 0 14px;font-family:var(--serif);font-size:1.1rem;line-height:1.6}.sec>p b,.prose p b{font-weight:650}
.fig{max-width:860px}.fig.wide{max-width:none}
.read{border-top:2px solid var(--rule);padding:18px 0 0;margin:72px 0 0;max-width:var(--col)}.read h2{font:600 1.05rem/1.3 var(--sans);margin:0 0 10px;letter-spacing:0}
.read ul{margin:0;padding-left:18px;columns:2 22rem;column-gap:40px}.read li{margin:0 0 10px;color:var(--ink-2);font-size:.93rem;break-inside:avoid}.read li b{color:var(--ink)}
.callout{background:var(--soft);border-radius:6px;padding:14px 18px;margin:24px 0;max-width:var(--measure)}.callout p{margin:0 0 6px;font-size:.98rem}.callout p:last-child{margin:0}
.ch-nav{display:grid;grid-template-columns:1fr 1fr;gap:16px;border-top:1px solid var(--line);padding-top:20px;margin-top:48px}
.ch-nav a{text-decoration:none;display:flex;flex-direction:column;gap:2px;font:600 1.05rem/1.3 var(--serif);color:var(--ink)}.ch-nav a:hover{color:var(--accent)}.ch-nav small{color:var(--ink-3);font:400 .8rem var(--sans)}.ch-nav a.next{text-align:right;grid-column:2}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;padding:0;list-style:none}.chips a,.chips span{font-size:.85rem;padding:3px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink-2);background:var(--surface)}
.chips a:hover{border-color:var(--ink-3);color:var(--ink)}.chips .on{border-color:var(--des);color:var(--ink)}
.seg{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.seg button,.seg a{font-size:.88rem;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink-2);min-height:36px;display:inline-flex;align-items:center;text-decoration:none}
.seg a:not([aria-current]):hover,.seg button:not([aria-pressed=true]):hover{border-color:var(--ink-3);background:var(--surface);color:var(--ink)}
.seg button[aria-pressed=true],.seg a[aria-current]{background:var(--ink);border-color:var(--ink);color:var(--bg)}
/* home: findings as an editorial list, not cards */
.hero{padding:8px 0 4px}.hero-t{font-size:clamp(2.1rem,5.4vw,3.6rem);max-width:18ch;line-height:1.06;letter-spacing:-.022em;margin:0 0 20px}
.hero .lede{max-width:64ch}
.findings{list-style:none;margin:0;padding:0;border-top:2px solid var(--rule)}
.finding{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);grid-template-areas:"t v" "m v";grid-template-rows:auto 1fr;gap:0 56px;padding:32px 0 36px;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;align-items:start}
.finding h3{font:600 clamp(1.25rem,2vw,1.45rem)/1.22 var(--serif);margin:0 0 14px;letter-spacing:-.008em;max-width:26ch}
.finding .big{display:block;font-size:clamp(2.2rem,4vw,2.9rem);font-weight:650;letter-spacing:-.025em;line-height:1;font-variant-numeric:tabular-nums;margin:0 0 8px}
.finding p{margin:0;color:var(--ink-2);font-size:.97rem;max-width:44ch}.finding .ft{grid-area:t}.finding .viz{grid-area:v;padding-top:4px;min-width:0}
.finding .more{grid-area:m;align-self:start;justify-self:start;margin-top:16px;color:var(--accent);font-size:.9rem}.finding:hover h3{color:var(--accent)}.finding:hover .more{text-decoration:underline}
.finding .viz .two{grid-template-columns:minmax(120px,180px) 1fr}.finding .viz .two p{font-size:.92rem}
@media (max-width:820px){.finding{grid-template-columns:1fr;grid-template-areas:"t" "v" "m";grid-template-rows:auto;gap:18px;padding:26px 0 28px}.finding .more{margin-top:0}.finding p{max-width:none}}
.principles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr));gap:4px 48px;max-width:var(--col)}
.principles p{font-size:1.02rem}
.badge{display:inline-flex;align-items:center;gap:4px;font-size:.78rem;padding:2px 8px;border-radius:999px;border:1px solid var(--line);white-space:nowrap;color:var(--ink-2)}
.badge.ok::before{content:"✓";font-weight:700;color:var(--ink)}.badge.no::before{content:"✗";font-weight:700;color:var(--ink)}.badge.exp::before{content:"◌";color:var(--ink)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:24px}@media (max-width:760px){.two{grid-template-columns:1fr}}
.tabs2{display:grid;gap:10px;margin:18px 0 6px}.tabgroup{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px}.tabgroup .seg{margin:0}
@media (max-width:560px){.tabgroup{display:grid;gap:6px}.tabgroup .seg{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}.tabgroup .seg a{white-space:nowrap}}
.locator{max-width:420px;justify-self:end;width:100%}.facts{padding-left:18px;margin:0}.facts li{margin:0 0 10px;color:var(--ink-2)}.facts li b{color:var(--ink)}
.caveats{padding-left:22px;max-width:76ch}.caveats li{margin:0 0 14px;color:var(--ink-2)}.caveats li b{color:var(--ink)}.caveats p{margin:8px 0 0}.caveats li:target{background:var(--warn-bg);border-radius:6px}
.hyp{border-top:1px solid var(--line);padding:10px 0;max-width:880px}.hyp summary{cursor:pointer}.hyp ul{list-style:none;padding:0;margin:10px 0 0}.hyp li{margin:0 0 8px;font-size:.92rem}.hyp:target{background:var(--soft)}
code{font-size:.88em;background:var(--soft);padding:1px 4px;border-radius:4px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0;margin:24px 0 32px;border-top:1px solid var(--rule)}
.stat{padding:14px 20px 16px 0;border-bottom:1px solid var(--line)}
.stat b{display:block;font-size:1.75rem;letter-spacing:-.02em;font-variant-numeric:tabular-nums;font-weight:650}.stat span{color:var(--ink-2);font-size:.9rem}
form.filters{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:0 0 20px}
label{font-size:.85rem;color:var(--ink-2);display:flex;flex-direction:column;gap:4px}
input,select,textarea{font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--axis);border-radius:6px;padding:8px 10px;min-height:44px}
input:hover,select:hover,textarea:hover{border-color:var(--ink-3)}
input[type=search]{min-width:min(280px,100%)}select{max-width:100%}textarea{min-height:120px;width:100%}
button,.btn{font:inherit;font-weight:550;background:var(--ink);color:var(--bg);border:1px solid var(--ink);border-radius:6px;padding:9px 18px;min-height:44px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
button:hover,.btn:hover{background:var(--ink-2);border-color:var(--ink-2)}
.btn.secondary,button.secondary{background:transparent;color:var(--ink);border:1px solid var(--axis)}.btn.secondary:hover,button.secondary:hover{border-color:var(--ink);background:transparent}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}@media (max-width:480px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:inherit}
.card:hover{border-color:var(--ink-3)}.photo{aspect-ratio:4/5;background:var(--soft);display:grid;place-items:center;color:var(--ink-3);font-size:2.2rem;font-weight:600}
.photo img{width:100%;height:100%;object-fit:cover}.photo.empty{aspect-ratio:auto;height:88px;font-size:1.4rem;letter-spacing:.04em}.profile .photo.empty{height:auto;aspect-ratio:4/5;font-size:3rem}.card .body{padding:12px 14px}.card h3{font-size:1rem;margin:0 0 4px;line-height:1.3}
.meta{color:var(--ink-2);font-size:.88rem;margin:0}.pager{display:flex;gap:10px;align-items:center;justify-content:center;margin:28px 0}
.note{background:var(--warn-bg);color:var(--warn-ink);border-radius:6px;padding:12px 14px;font-size:.92rem;max-width:78ch}
dl.fields{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;margin:0}dl.fields dt{color:var(--ink-2)}dl.fields dd{margin:0}
.profile{display:grid;grid-template-columns:minmax(0,300px) 1fr;gap:28px;align-items:start}
@media (max-width:720px){.profile{grid-template-columns:1fr}dl.fields{grid-template-columns:1fr}dl.fields dt{margin-top:8px}}
table{border-collapse:collapse;width:100%;font-size:.9rem;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--ink-2);font-weight:600;border-bottom-color:var(--axis)}td.n,th.n{text-align:right}
.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.map-wrap{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px}
.map-wrap svg{display:block;width:100%;height:auto;max-height:78vh;margin:0 auto}.map-wrap path{stroke:var(--surface);stroke-width:1.2;stroke-linejoin:round;cursor:pointer}
.map-wrap path:hover,.map-wrap path:focus{stroke:var(--ink);stroke-width:2;outline:none}
.tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--bg);font-size:.85rem;padding:6px 9px;border-radius:4px;white-space:nowrap;display:none;z-index:2;box-shadow:0 4px 14px rgb(0 0 0/.18)}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 0;font-size:.85rem;color:var(--ink-2);padding:0;list-style:none}
.legend i{display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:6px;vertical-align:-2px}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.tabs a{padding:6px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink-2);font-size:.9rem}
.tabs a[aria-current]{background:var(--ink);border-color:var(--ink);color:var(--bg)}
footer.site{border-top:1px solid var(--line);color:var(--ink-3);font-size:.86rem;padding:28px 0 48px}footer.site p{margin:0 0 8px;max-width:88ch}footer.site a{color:var(--ink-2)}
.prose{max-width:72ch}.prose li{margin:4px 0}.ok{color:var(--ink)}.muted{color:var(--ink-3)}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}::view-transition-old(root),::view-transition-new(root){animation-duration:.28s;animation-timing-function:cubic-bezier(.16,1,.3,1)}}
@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}
`;

// Light/dark toggle. The head script already set data-theme; this flips it, remembers the choice
// and, until the reader picks one, keeps following the system setting.
const THEME_JS = `(()=>{const d=document.documentElement,b=document.querySelector('.theme-t');if(!b)return;
const mq=matchMedia('(prefers-color-scheme: dark)');const sync=()=>b.setAttribute('aria-pressed',String(d.dataset.theme==='dark'));
const set=(t)=>{const go=()=>{d.dataset.theme=t;sync()};document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches?document.startViewTransition(go):go()};
sync();b.addEventListener('click',()=>{const t=d.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('theme',t)}catch(e){}set(t)});
mq.addEventListener('change',(e)=>{let s;try{s=localStorage.getItem('theme')}catch(x){}if(!s)set(e.matches?'dark':'light')})})()`;

// Chapters of the findings, in reading order. The cédula wall and takedown form stay out of navigation (routes still exist).
export const CHAPTERS = [
  ['/violencia-letal', 'Violencia letal', 'Asesinados y desaparecidos'],
  ['/busqueda', 'Búsqueda', 'Fosas y búsqueda registrada'],
  ['/tendencias', 'Tendencias', '¿Bajó la violencia?'],
  ['/victimas', 'Víctimas', 'Sobre quién recae'],
  ['/cifra-negra', 'Cifra negra', 'Lo que no llega a las cifras'],
];

export function page({ title, path = '/', body, meta = {}, head = '', status = 200, cache = 'public, max-age=300' }) {
  const nav = [...CHAPTERS.map(([h, l]) => [h, l]), ['/mapa', 'Mapa'], ['/metodologia', 'Metodología']]
    .map(([href, label]) => `<a href="${href}"${path.startsWith(href) || (href === '/mapa' && path.startsWith('/municipio')) ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const html = `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · México Visible</title><meta name="description" content="${esc(meta.description || 'Violencia en Jalisco con datos oficiales: homicidio, desaparición, fosas, delitos denunciados y lo que no se denuncia, con sus límites explicados.')}">
<script>(()=>{const d=document.documentElement;let t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;d.classList.add('js')})()</script>
<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/source-serif-4-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><style>${CSS}${CHART_CSS}</style>${head}</head><body>
<header class="site"><div class="wrap"><a class="brand" href="/">México Visible <span>· Jalisco</span></a><button type="button" class="theme-t" aria-pressed="false" aria-label="Modo oscuro" title="Cambiar entre modo claro y oscuro"><svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg><svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg></button><nav class="main" aria-label="Principal">${nav}</nav></div></header>
<main><div class="wrap">${body}</div></main>
<footer class="site"><div class="wrap"><p>Datos de fuentes oficiales: Registro Estatal de Personas Desaparecidas, Fiscalía del Estado de Jalisco, SESNSP, INEGI (defunciones, ENVIPE, Marco Geoestadístico) y CONAPO; Plataforma Ciudadana de Fosas. ${meta.updated ? `Registro observado el ${esc(meta.updated)}.` : ''}</p><p><a href="/metodologia">Metodología y límites</a></p></div></footer>
<script>${CHART_JS}</script><script>${THEME_JS}</script></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache,
    'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
}

export function initials(nombre) {
  return esc(String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase());
}
