// Shared layout, styles and HTML helpers. Server-rendered; the only external script is Turnstile on /retiro.
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
:root{color-scheme:light;--bg:#fcfcfb;--surface:#ffffff;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#77766f;--line:#e4e3de;--accent:#256abf;--accent-ink:#ffffff;--soft:#f0efec;--warn-bg:#fdf3e1;--warn-ink:#7a4b00;
--seq-0:#f0efec;--seq-1:#b7d3f6;--seq-2:#6da7ec;--seq-3:#3987e5;--seq-4:#1c5cab;--seq-5:#0d366b}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--bg:#1a1a19;--surface:#222221;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#9a998f;--line:#383835;--accent:#6da7ec;--accent-ink:#0b0b0b;--soft:#2a2a28;--warn-bg:#3a2c12;--warn-ink:#f3cf8a;
--seq-0:#383835;--seq-1:#104281;--seq-2:#1c5cab;--seq-3:#2a78d6;--seq-4:#5598e7;--seq-5:#9ec5f4}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#1a1a19;--surface:#222221;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#9a998f;--line:#383835;--accent:#6da7ec;--accent-ink:#0b0b0b;--soft:#2a2a28;--warn-bg:#3a2c12;--warn-ink:#f3cf8a;
--seq-0:#383835;--seq-1:#104281;--seq-2:#1c5cab;--seq-3:#2a78d6;--seq-4:#5598e7;--seq-5:#9ec5f4}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}a:hover{text-decoration-thickness:2px}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px}
header.site{border-bottom:1px solid var(--line);background:var(--surface)}
header.site .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px;min-height:60px}
.brand{font-weight:700;color:var(--ink);text-decoration:none;letter-spacing:-.01em}
nav.main{display:flex;flex-wrap:wrap;gap:4px 18px}nav.main a{color:var(--ink-2);text-decoration:none;padding:6px 0}
nav.main a[aria-current]{color:var(--ink);border-bottom:2px solid var(--accent)}
main{padding:28px 0 56px}h1{font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.2;margin:0 0 8px;letter-spacing:-.02em}
h2{font-size:1.25rem;margin:36px 0 12px}.lede{color:var(--ink-2);max-width:68ch;margin:0 0 20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:20px 0 28px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.stat b{display:block;font-size:1.7rem;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.stat span{color:var(--ink-2);font-size:.9rem}
form.filters{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:0 0 20px}
label{font-size:.85rem;color:var(--ink-2);display:flex;flex-direction:column;gap:4px}
input,select,textarea{font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 10px;min-height:40px}
input[type=search]{min-width:min(280px,100%)}textarea{min-height:120px;width:100%}
button,.btn{font:inherit;background:var(--accent);color:var(--accent-ink);border:0;border-radius:8px;padding:9px 16px;min-height:40px;cursor:pointer;text-decoration:none;display:inline-block}
.btn.secondary,button.secondary{background:transparent;color:var(--ink);border:1px solid var(--line)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:inherit}
.card:hover{border-color:var(--accent)}.photo{aspect-ratio:4/5;background:var(--soft);display:grid;place-items:center;color:var(--ink-3);font-size:2.2rem;font-weight:600}
.photo img{width:100%;height:100%;object-fit:cover}.photo.empty{aspect-ratio:auto;height:88px;font-size:1.4rem;letter-spacing:.04em}.profile .photo.empty{height:auto;aspect-ratio:4/5;font-size:3rem}.card .body{padding:12px 14px}.card h3{font-size:1rem;margin:0 0 4px;line-height:1.3}
.meta{color:var(--ink-2);font-size:.88rem;margin:0}.pager{display:flex;gap:10px;align-items:center;justify-content:center;margin:28px 0}
.note{background:var(--warn-bg);color:var(--warn-ink);border-radius:10px;padding:12px 14px;font-size:.92rem;max-width:78ch}
dl.fields{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;margin:0}dl.fields dt{color:var(--ink-2)}dl.fields dd{margin:0}
.profile{display:grid;grid-template-columns:minmax(0,300px) 1fr;gap:28px;align-items:start}
@media (max-width:720px){.profile{grid-template-columns:1fr}dl.fields{grid-template-columns:1fr}dl.fields dt{margin-top:8px}}
table{border-collapse:collapse;width:100%;font-size:.92rem;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line)}th{color:var(--ink-2);font-weight:600}td.n,th.n{text-align:right}
.table-scroll{overflow-x:auto}
.map-wrap{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px}
.map-wrap svg{display:block;width:100%;height:auto;max-height:78vh;margin:0 auto}.map-wrap path{stroke:var(--surface);stroke-width:1.2;stroke-linejoin:round;cursor:pointer}
.map-wrap path:hover,.map-wrap path:focus{stroke:var(--ink);stroke-width:2;outline:none}
.tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--bg);font-size:.85rem;padding:6px 9px;border-radius:6px;white-space:nowrap;display:none;z-index:2}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 0;font-size:.85rem;color:var(--ink-2);padding:0;list-style:none}
.legend i{display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:6px;vertical-align:-2px}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.tabs a{padding:6px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink-2);font-size:.9rem}
.tabs a[aria-current]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
footer.site{border-top:1px solid var(--line);color:var(--ink-2);font-size:.88rem;padding:22px 0 40px}
.prose{max-width:72ch}.prose li{margin:4px 0}.ok{color:var(--ink)}.muted{color:var(--ink-3)}
`;

export function page({ title, path = '/', body, meta = {}, head = '', status = 200, cache = 'public, max-age=300' }) {
  // Cédula wall and takedown form are hidden from navigation for now (routes still exist).
  const nav = [['/mapa', 'Mapa'], ['/metodologia', 'Metodología']]
    .map(([href, label]) => `<a href="${href}"${(href === '/' ? path === '/' || path.startsWith('/cedula') : path.startsWith(href)) ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const html = `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · México Visible</title><meta name="description" content="${esc(meta.description || 'Personas desaparecidas en Jalisco: cédulas de búsqueda, mapa municipal y metodología de las fuentes oficiales.')}">
<style>${CSS}</style>${head}</head><body>
<header class="site"><div class="wrap"><a class="brand" href="/mapa">México Visible · Jalisco</a><nav class="main" aria-label="Principal">${nav}</nav></div></header>
<main><div class="wrap">${body}</div></main>
<footer class="site"><div class="wrap">Datos de fuentes oficiales: Registro Estatal de Personas Desaparecidas de Jalisco, SESNSP, CONAPO e INEGI. ${meta.updated ? `Actualizado con el registro observado el ${esc(meta.updated)}.` : ''} <a href="/metodologia">Metodología</a></div></footer>
</body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache,
    'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
}

export function initials(nombre) {
  return esc(String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase());
}
