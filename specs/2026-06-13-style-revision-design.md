# Style Revision — Bright System Windows on an Interactive Nebula

**Date:** 2026-06-13
**Status:** Design approved (validated via visual mockup v8)

## Context

The wiki's current "System" theme uses dark translucent cyan panels on a static
blue-black void. The user found it too rigid and too dark. This revision keeps
the manhwa "System" identity but makes it brighter, more animated, and more
distinctive — matching the bright azure "scenario card" reference image and a
purple/blue nebula reference image.

Direction was validated interactively in the browser (mockup `direction-v8.html`).
This spec translates that mockup into the real MkDocs Material site.

## Visual direction (the approved look)

1. **Bright "System windows"** — the special callouts become bright azure
   gradient-filled cards with **white text**, replacing the old dark panels:
   - Angular shape: corners **cut** (notched top-left & bottom-right via `clip-path`).
   - **Layered white frame**: crisp 1px outline + soft inner band (inset box-shadow),
     and the **white outline also traces the diagonal cut edges** (two rotated
     line segments via `::before`/`::after`).
   - **Title bar** with the title and the fake `─ ▢ ✕` window controls (kept).
   - **Corner brackets** at the two square corners.
   - **Digitization**: small glowing pixel squares marching down the side edges.
   - Subtle entrance (rise/fade) + hover (lift + glow) motion.
2. **Per-flavor colors** (same shape, different fill):
   - `system`, `profile`, `scenario` → azure
   - `reward` → gold
   - `penalty` → red/crimson
3. **Interactive nebula background** (fixed, behind everything):
   - Dark base + blurred color blobs (deep blue/indigo/violet).
   - Three **static** SVG `feTurbulence` smoke layers that **swirl/churn** via
     smooth GPU transforms (translate + scale + rotate; no `baseFrequency`
     animation — that caused boiling).
   - A **magenta core** glow that follows the cursor (smoothed trail).
   - **Click ripples** (expanding magenta rings).
   - Clouds are **dark** and churn noticeably (≈±20° rotation, 38–66s cycles).
4. **Calm reading surface** — body/article text sits on a calm dark-glass panel
   (not bright), so long-form reading stays comfortable over the busy nebula.
5. **Headers** — keep Orbitron/Rajdhani/Share Tech Mono. Soften H1 to a light
   gradient (less harsh glow). Keep the `< >` bracket treatment on H1.

## Mapping to MkDocs Material

### Background (new)
- New `docs/assets/javascripts/nebula.js`: on load, injects the fixed nebula DOM
  (`.neb` with blobs + 3 smoke SVGs + `.core`) **once**, into `document.body`,
  outside the content area so it **persists across `navigation.instant`** page
  swaps (guard against double-inject). Runs the rAF loop for cursor-follow +
  parallax, and the click-ripple handler. Hook Material's `document$` if present.
- All nebula styling lives in `system.css`.
- Register `nebula.js` in `mkdocs.yml` `extra_javascript` (alongside `calendar.js`).

### System windows = custom admonition flavors
- Restyle **only the custom flavors** (`system`, `profile`, `scenario`, `reward`,
  `penalty`) into bright windows. **Standard** Material types (`note`, `tip`,
  `warning`, etc.) stay as calm dark-glass admonitions so not every callout is loud.
- Reuse existing structure: `.admonition` (panel), `.admonition-title` (title bar).
  The `─ ▢ ✕` controls already exist via `.admonition-title::after` — keep.
- Cut corners via `clip-path` on the admonition; diagonal white outline via the
  panel's `::before`/`::after` (the title icon stays on `.admonition-title::before`,
  so no conflict).
- **Digitization**: implement **CSS-only** (animated repeating-gradient / masked
  edge) to avoid injecting DOM into every admonition. (Mockup used JS spans; the
  real site uses a CSS approximation.)
- Per-flavor fill colors via the existing `--flavor`/`color-mix` pattern, but with
  bright gradients and white text.

### Home grid cards
- The home `.grid.cards` panels also get the bright-window treatment (they are the
  landing "System panels").

### Reading surface
- Give the article body (`.md-typeset` content column) a calm dark-glass backing
  so text is legible over the nebula. Sidebar/header get matching translucent
  treatment.

### Calendar
- The calendar stays on **calm glass** with cyan accents (not a bright fill) — a
  full bright azure grid would be visually overwhelming. Its existing styling is
  retuned to sit on the new background.

### Accessibility / performance
- Respect `@media (prefers-reduced-motion: reduce)`: disable churn, parallax,
  cursor-follow, ripples, and entrance animations (static dark nebula remains).
- Background is `pointer-events:none` and `position:fixed`; reuse single rAF loop.
- Keep the site **dark-only** (no light toggle, already removed).

## Files touched

- `docs/assets/stylesheets/system.css` — major: nebula, bright windows + diagonal
  outline, per-flavor colors, reading surface, header softening, calendar retune.
- `docs/assets/javascripts/nebula.js` — **new**: background injection + interaction.
- `mkdocs.yml` — add `nebula.js` to `extra_javascript`.
- (No content/markdown changes; admonition syntax unchanged.)

## Out of scope
- Editor GUI chrome restyle (`editor/static/editor.css`) — unchanged.
- Any change to navigation structure, categories, or content.

## Verification
1. `mkdocs build --strict` — no warnings/broken links.
2. `mkdocs serve` + headless screenshots: home, a `scenario` page, a `profile`
   page, the calendar — confirm bright windows, diagonal outline, dark swirling
   nebula, readable body text.
3. Manually confirm cursor-follow + click ripple in a real browser, and that the
   background persists across instant navigation between pages.
4. Toggle OS "reduce motion" → confirm animations stop.
5. Deploy via `mkdocs gh-deploy` and verify live.
