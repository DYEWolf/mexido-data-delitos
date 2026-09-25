# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **informed citizens of Jalisco** who want to understand what is happening with violence in the state beyond headlines — homicide, disappearance, graves and search, reported crime, and what never gets reported.

Other audiences (served, not designed for first): journalists and researchers who need citable figures with source and method; families and search collectives who use the cédula wall; officials and organizations. None of these were confirmed as primary.

## Product Purpose

México Visible · Jalisco (mexicovisible.com) explains violence in Jalisco with official data, honestly: what the numbers say, how sure we can be, and what they leave out. It also publishes the state registry's public search cédulas of disappeared persons so they can be found.

Success means a reader leaves with a correct, qualified understanding — not a bigger number — and can check any figure back to its source and method.

## Positioning

Explicit rigor, visible on every page:

- Official sources only (REPD, Fiscalía del Estado, SESNSP, INEGI, CONAPO; Plataforma Ciudadana de Fosas as a third comparison).
- Every rate, share or trend carries its 95% interval; a municipality is "high" or "low" only when its interval excludes the state average.
- Hypotheses were written before calculating and are published whether confirmed, refuted or exploratory (111 total: 64 confirmed, 29 refuted, 18 exploratory).
- Limits are part of the content: reported crime is not crime (cifra negra ≈ 92%), gaps and source breaks are stated, not hidden.

## Operating Context

Not yet known: the site is new and there is no usage data (arrival channel, device mix, reading depth). Do not assume mobile-social or long-form desktop reading; both must work.

Content is Spanish (es-MX). Pages are read as chapters in order (Violencia letal → Búsqueda → Tendencias → Víctimas → Cifra negra), plus a municipal map, per-municipality pages, methodology, the cédula wall and a takedown form.

## Capabilities and Constraints

- Scope is **Jalisco permanently**; not a pilot for other states. Cédulas belong by publication in the Jalisco state registry, even if the event or residence is elsewhere. Federal sources are used only for their Jalisco subset.
- One Cloudflare Worker, server-rendered HTML with small inline vanilla JS; JSON API under `/api/*`; D1 holds only publishable precomputed data; static files from `public/`. Public pages are edge-cached.
- Strict CSP: no third-party scripts, styles or fonts except Cloudflare Turnstile on `/retiro`. Everything else is self-hosted.
- Charts are HTML/SVG rendered on the server; every chart's values are also available as a data table, so nothing depends on hover.
- Cédulas show only public fields and link to the official source; takedown requests are honored within 24 h and suppressed IDs are excluded at build and read time.
- Production only (no staging): validate locally with `npm run dev`, then deploy. No automated tests; validation is end-to-end.
- Findings data is generated (`src/worker/generated/findings.mjs` via `npm run findings`); figures in copy come from it, not hand-typed.

## Brand Commitments

- Name: **México Visible · Jalisco**.
- Voice (as observed in the existing copy, not separately confirmed): plain, careful Spanish; states uncertainty and limits in the same sentence as the claim; names sources; no sensationalism about victims.

## Evidence on Hand

- `ANALISIS.md`: sources, verification, method, 24 analysis pieces, hypothesis register, biases and limits.
- `reports/` and `sources/`: per-source contracts and stage reports.
- Generated findings in `src/worker/generated/findings.mjs`.
- Absent, and not to be fabricated: usage analytics, testimonials, press coverage, partner organizations, named team.

## Product Principles

1. **Qualified over dramatic.** A figure never appears without its interval, source or caveat nearby.
2. **Verifiable by the reader.** Every claim links back to its piece, its source and its data table.
3. **Refutations are content.** What the data does not show is published with the same weight as what it does.
4. **The limits are the frame.** The cifra negra and source gaps shape how every trend is read.
5. **Dignity for the people behind the data.** Victims and disappeared persons are not decoration; public fields only, fast takedown.
