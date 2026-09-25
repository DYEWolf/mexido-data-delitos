---
name: México Visible · Jalisco
description: Violence in Jalisco, told with official data and its limits in plain sight.
colors:
  record-ink: "#0b0b0b"
  paper: "#ffffff"
  surface: "#ffffff"
  ink-secondary: "#45443f"
  ink-tertiary: "#6b6a64"
  hairline: "#e6e5e0"
  heavy-rule: "#0b0b0b"
  quiet-fill: "#f4f4f1"
  chart-grid: "#e1e0d9"
  chart-axis: "#c3c2b7"
  selection: "#cfe0f7"
  link-blue: "#2263b3"
  caution-fill: "#fdf3e1"
  caution-ink: "#7a4b00"
  data-blue: "#2a78d6"
  data-orange: "#eb6834"
  data-green: "#1baf7a"
  data-amber: "#eda100"
  data-violet: "#4a3aa7"
  data-red: "#e34948"
  data-neutral: "#898781"
  seq-0: "#f0efec"
  seq-1: "#b7d3f6"
  seq-2: "#6da7ec"
  seq-3: "#3987e5"
  seq-4: "#1c5cab"
  seq-5: "#0d366b"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.1rem, 5.4vw, 3.6rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.022em"
  headline:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.85rem, 4.2vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.018em"
  title:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.4rem, 2.6vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.012em"
  lede:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.08rem, 1.6vw, 1.24rem)"
    fontWeight: 400
    lineHeight: 1.55
  body-reading:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  figure-title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1.02rem"
    fontWeight: 650
    lineHeight: 1.35
  figure-number:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "clamp(1.7rem, 3vw, 2.1rem)"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.84rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  hairline: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  gutter-mobile: "16px"
  gutter: "20px"
  row: "14px"
  block: "24px"
  figure: "36px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.record-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "9px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-secondary}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.record-ink}"
    rounded: "{rounded.md}"
    padding: "9px 18px"
    height: "44px"
  segment:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    height: "36px"
  segment-active:
    backgroundColor: "{colors.record-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.record-ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
    height: "44px"
  callout:
    backgroundColor: "{colors.quiet-fill}"
    textColor: "{colors.record-ink}"
    rounded: "{rounded.md}"
    padding: "14px 18px"
  caution-note:
    backgroundColor: "{colors.caution-fill}"
    textColor: "{colors.caution-ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  theme-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    size: "40px"
---

# Design System: México Visible · Jalisco

## Overview

**Creative North Star: "El expediente público" (The Public Record)**

The site reads like a well-edited official record: sober, verifiable, every figure carrying its footnote. Its authority comes from precision and restraint, never from rhetoric. The subject is grave (homicide, disappearance, graves, sexual violence), so the mood is sober, serene and precise. Nothing on the page raises its voice; the data is allowed to be alarming on its own, qualified by its interval and its source.

The page is black ink on white paper. A serif carries everything meant to be read as argument (headlines, ledes, reading paragraphs); a plain system sans carries everything meant to be checked (figures, charts, tables, labels, controls). Structure comes from rules, not boxes: a heavy rule opens a group of figures or a list of findings, hairlines separate what sits inside it. Color is reserved almost entirely for data. The interface itself is monochrome plus one link blue.

The site must never look like a *nota roja* tabloid (alarm red, blood, tabloid type, scene photography), a corporate dashboard (KPI cards, gradients, icons, soft SaaS shadows) or government propaganda (institutional colors, logos, a celebratory tone about figures).

**Key Characteristics:**
- Black ink on white paper, with a full dark theme that mirrors it.
- Serif for argument, sans for evidence.
- Rules, not boxes: heavy rule to open, hairlines to divide.
- Color belongs to the data; the interface is monochrome plus a link blue.
- Every chart has a title, a subtitle stating the unit and method, a source line and a data table.
- No hover-only information, no decoration, no eyebrow labels.

## Colors

A monochrome record with one link blue; all saturated color is data encoding, validated for categorical distinction in both themes.

### Primary
- **Record Ink** (`record-ink`): the voice of the page. Headings, body text, active navigation underline, the primary button, the active segment, and the heavy rule that opens figure strips and finding lists.
- **Link Blue** (`link-blue`): links only, including "Leer el capítulo →" and "Ver los datos". It also drives focus rings, the text caret and the selection tint (`selection`). It is never used as a surface fill.

### Neutral
- **Paper** (`paper`) and **Surface** (`surface`): pure white page and the white of maps, cards and inputs. They are identical in light; in dark they split, so that framed elements (map frames, cédula cards) lift slightly.
- **Ink Secondary** (`ink-secondary`): ledes, figure subtitles, secondary text in stats, inactive navigation.
- **Ink Tertiary** (`ink-tertiary`): source lines, bylines ("Capítulo 3 de 5 · Tendencias"), breadcrumbs, footnotes, axis tick labels.
- **Hairline** (`hairline`): dividers between findings, stats and table rows; the top rule of each figure; card and chip borders.
- **Heavy Rule** (`heavy-rule`): 2px rule that opens stat strips, finding lists and the reading box.
- **Quiet Fill** (`quiet-fill`): callouts, code, hover on the theme toggle, the empty photo placeholder. The only tinted surface in the interface.
- **Chart Grid** / **Chart Axis** (`chart-grid`, `chart-axis`): gridlines and zero/reference lines; the axis tone also borders inputs and secondary buttons.
- **Caution Fill** / **Caution Ink** (`caution-fill`, `caution-ink`): the single warning note style, for data caveats that change how a page must be read, and for the targeted caveat in methodology.

### Data encoding
Each data color has one fixed meaning across the site. Never reassign one to a new meaning on a single page.
- **Data Blue** (`data-blue`): homicide; área metropolitana; "baja" (a credible decrease).
- **Data Orange** (`data-orange`): disappearance; resto del estado.
- **Data Green** (`data-green`): men (in sex splits); Altos Norte.
- **Data Amber** (`data-amber`): Altos Sur.
- **Data Violet** (`data-violet`): women.
- **Data Red** (`data-red`): "sube" (a credible increase). This is the only red, and it means a direction in a trend, never alarm.
- **Data Neutral** (`data-neutral`): no clear trend, population reference, "otros".
- **Sequential ramp** (`seq-0` … `seq-5`): choropleth maps, light to dark blue; `seq-0` is the "no data / not distinguishable" fill.

### Dark theme
Dark is a full mirror, not an inversion. Page `#191918`, surface `#212120`, ink `#f4f3ef`, secondary `#c3c2b7`, tertiary `#9a998f`, hairline `#353532`, heavy rule `#d8d7d0`, quiet fill `#262624`, link `#7cb0ee`, selection `#1f3f66`. The data colors shift to their dark-validated values (blue `#3987e5`, orange `#d95926`, green `#199e70`, amber `#c98500`, violet `#9085e9`, red `#e66767`) and the sequential ramp reverses so that darker still means "more" against the dark ground. The theme follows the system until the reader picks one with the header toggle; the choice is stored per browser.

### Named Rules
**The Data-Owns-Color Rule.** Saturated color appears only in charts, maps, legends and the chips that key to them. Interface chrome stays ink, paper and link blue.

**The One Meaning Rule.** A data color means the same thing on every page. Blue is homicide and "down"; orange is disappearance; red is only "up".

**The No Alarm Rule.** Red never signals danger, urgency or emphasis. Emphasis comes from weight and size.

## Typography

**Display Font:** Source Serif 4, self-hosted variable (with Georgia, Times New Roman)
**Body Font:** the platform system sans (system-ui, -apple-system, Segoe UI, Roboto)

**Character:** A book serif with optical sizing gives the argument a considered, editorial voice. The neutral system sans keeps numbers, axes and controls plain and fast, with tabular figures everywhere numbers align.

### Hierarchy
- **Display** (`display`): the home headline only.
- **Headline** (`headline`): the page h1 of chapters, map, municipality and methodology pages; max 24ch, balanced.
- **Title** (`title`): section h2 inside a chapter; 72px above, 14px below; max 34ch.
- **Lede** (`lede`): the paragraph under an h1; secondary ink; max 62–64ch.
- **Body Reading** (`body-reading`): argument paragraphs directly inside a section; max 66ch.
- **Body** (`body`): UI, lists, caveats, finding summaries, table text.
- **Figure Title** (`figure-title`): the h3 of every chart; max 60ch, followed by a secondary-ink subtitle at 0.9rem.
- **Figure Number** (`figure-number`): the numbers in stat strips; the home findings use a larger step (clamp(2.2rem, 4vw, 2.9rem)).
- **Label** (`label`): bylines, breadcrumbs, control-group labels; source lines at 0.8rem, tick labels at 0.75rem.

### Named Rules
**The Argument/Evidence Rule.** If the reader is meant to be persuaded, it is serif. If the reader is meant to check it, it is sans. Chart titles are evidence and stay sans.

**The No Eyebrow Rule.** No uppercase kicker above a heading. Sequence and context ("Capítulo 3 de 5 · Tendencias", "Jalisco · datos oficiales 2015–2026") go below the lede as a quiet byline, or become a breadcrumb.

**The Tabular Rule.** Every number that sits in a column, strip, axis or table uses tabular figures and the true minus sign (−).

## Layout

A single 1120px container with a 20px gutter (16px under 480px). Reading content is left-aligned on an 880px column (`--col`) with prose held to 66ch. Figures may run to 860px or full width (`.fig.wide`); the home findings use the full container.

Vertical rhythm is generous and asymmetric. Main padding is 40px top and 72px bottom (28/56 on mobile). Sections open with 72px above the h2. Figures sit 36px above and 44px below, each opened by a hairline and 14px of air. The reading box and chapter navigation close a chapter after 72px and 48px.

The home findings list is a two-column grid (text 5fr, chart 6fr, 56px gap), with the chapter link pinned under the text. Under 820px it becomes one column in the order text → chart → link. Stat strips use `auto-fit` columns of at least 200px and drop to two columns under 560px. Charts respond to their own width through container queries: row charts stack label over track under 560px, and axes with six or more ticks show every other label while keeping the reference tick (0% or 1×).

Breakpoints in use: 480px (gutter, cédula grid to two columns), 560px (container: charts, stats, segmented controls scroll horizontally), 720–760px (header wraps; two-column blocks stack), 820px (findings stack). No page may scroll horizontally at 390px; wide tables scroll inside `.table-scroll`.

## Elevation & Depth

Flat by default. Depth is conveyed with rules, a single quiet fill and the paper/surface split in dark mode, not with shadows. Only floating, transient layers get a shadow, because they genuinely sit above the page.

### Shadow Vocabulary
- **Chart tooltip** (`box-shadow: 0 4px 18px rgba(0,0,0,.12)`): the hover/focus tooltip on chart marks, on a surface background with a hairline border.
- **Map tooltip** (`box-shadow: 0 4px 14px rgb(0 0 0/.18)`): the inverted ink tooltip over municipal maps.
- **Mark separation** (`box-shadow: 0 0 0 2px var(--surface)`): a surface-colored ring around dots so that overlapping marks stay legible. This is separation, not elevation.

### Named Rules
**The Flat Record Rule.** Nothing at rest casts a shadow. Stats, findings, callouts and figures are separated by rules and space, never by lifted cards.

## Shapes

Quiet, slightly softened geometry. 6px (`md`) is the working radius for buttons, inputs, callouts and notes; 8px (`lg`) for framed containers (map frames, cédula cards); 4px (`sm`) for tooltips, code and bar ends; 999px (`pill`) for chips, segmented controls and the theme toggle. Borders are 1px hairlines. The only heavier line is the 2px heavy rule, always horizontal, always opening a group. Waffle cells use 2px corners; bars are flat at the baseline and rounded 4px at the value end.

## Components

### Buttons
Plain and decisive: ink, not color.
- **Shape:** gently rounded (6px), 44px minimum height.
- **Primary:** record ink fill, paper text, weight 550, 9px 18px padding. Hover shifts the fill to ink secondary.
- **Secondary:** transparent with a chart-axis border and ink text; hover darkens the border to ink.
- **Focus:** 2px link-blue outline at 2px offset, as on every focusable element.

### Segmented controls and chips
- **Segments** (map layers, chart toggles): pill, surface fill, hairline border, secondary ink, 36px minimum height. Active is an ink fill with paper text, and hover never recolors the active segment. Under 560px a group scrolls horizontally instead of wrapping.
- **Chips** (municipality lists keyed to a chart): pill, hairline border, 0.85rem. A chip with a data-colored border repeats that color's meaning from the chart.

### Stat strip
The signature replacement for KPI cards. A heavy rule on top, then columns of big tabular numbers (Figure Number) over a one-line ink label (max 28ch) and a tertiary source note, each cell closed by a hairline. No boxes, no icons, no accent color.

### Finding row (home)
A headline in serif, a large figure, a secondary summary (max 44ch), and the chart beside it, rendered with the same chart components as the chapters. The whole row is one link: hover turns the headline link blue and underlines "Capítulo N: … →". Rows are divided by hairlines under a heavy rule.

### Figure
Every chart: hairline on top, a sans figure title, a subtitle naming the unit and method, the legend, the chart, an optional note, a tertiary "Fuente: …" line linking to its analysis piece, and a "Ver los datos" disclosure with the full table. Charts are HTML/SVG with percentage positioning, so type never scales with the chart.

### Callout and caution note
- **Callout:** quiet fill, 6px radius, 14px 18px padding, for an interpretive aside inside a chapter. It never has a colored side border.
- **Caution note:** caution fill with caution ink, for data caveats that change how a page must be read.

### Inputs / Fields
Surface fill, 1px chart-axis border, 6px radius, 44px minimum height. Hover darkens the border to ink tertiary; focus shows the global link-blue ring. Labels sit above the field in 0.85rem secondary ink.

### Navigation
- **Header:** paper background, hairline bottom. The wordmark is serif 600 "México Visible" with a tertiary "· Jalisco".
- **Links:** sans 0.92rem in secondary ink; the current page is ink with a 2px ink underline flush with the header rule.
- **Mobile:** under 760px the wordmark and theme toggle share the first row, and the links become a horizontally scrolling row with a fade mask at the right edge.
- **Chapter navigation:** a two-column footer with serif chapter titles, a tertiary "← Capítulo N" or "Capítulo N →" label, and the next chapter aligned right.

### Theme toggle
A 40px circular ghost button with a drawn 1.6px-stroke moon (in light) or sun (in dark). Hover gives it a quiet fill and a hairline border. It is exposed as a toggle ("Modo oscuro", aria-pressed). The switch crossfades through a 0.28s view transition (`cubic-bezier(.16,1,.3,1)`), which is skipped under reduced motion.

## Do's and Don'ts

### Do:
- **Do** open every group of figures or findings with the 2px heavy rule, and divide inside it with 1px hairlines.
- **Do** give every chart a title, a method subtitle, a source line linked to its piece, and a data table under "Ver los datos".
- **Do** set argument in Source Serif 4 and evidence in the system sans, with tabular figures and the true minus sign.
- **Do** keep each data color's meaning fixed site-wide (blue homicide/down, orange disappearance, red only up).
- **Do** put chapter sequence and dataset context in a byline below the lede.
- **Do** self-host every font and asset; the CSP allows no third-party origins except Turnstile.
- **Do** verify every page at 390px wide with no horizontal scroll, in both themes.

### Don't:
- **Don't** make it look like *nota roja*: no alarm red, blood imagery, tabloid type or scene photography.
- **Don't** make it look like a corporate dashboard: no KPI cards, gradients, icon tiles or soft lifted shadows.
- **Don't** make it look like government propaganda: no institutional colors, logos or celebratory framing of figures.
- **Don't** put an uppercase eyebrow or kicker above a heading.
- **Don't** use a colored side border on callouts or notes, or any shadow on content at rest.
- **Don't** use saturated color for interface chrome; link blue is the only non-data color.
- **Don't** put information only in hover; tooltips repeat what the table already holds.
