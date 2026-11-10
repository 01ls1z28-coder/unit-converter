# Unit Converter (local test copy)

A static, offline unit converter for the Tools Hub. Created by Jorge Guerra.

**Status:** LOCAL TEST COPY. It is not on the hub and not live.

## Open it
Double-click `index.html`. It works from `file://` with no server and no network: plain `<script src>` files, no modules, no fetch, no CDN, no external fonts, no analytics.

## Files
- `index.html` is the page.
- `css/app.css` holds the Obsidian theme.
- `js/units.js` is the exact unit library (BigInt rationals, factors, sources) and defines `UnitsLib`.
- `js/app.js` is the UI: an always-visible category grid, always-visible From/To unit pickers (common units first), search, swap, copy, precision, all-units table and full-precision view.
- `tests/accuracy-test.js` is the accuracy test. Run it with `node tests/accuracy-test.js`. The page never loads it.

## Accuracy
- Every unit is defined as an exact rational multiple of its SI unit, written as exact decimal strings or expressions such as `LBF/IN^2` or `231*IN^3`.
- Conversions go input → SI → output with BigInt numerators and denominators. Nothing passes through floating point.
- Temperature is affine, using exactly 273.15, 459.67 and 5/9.
- L/100 km and gal/100 mi are inverse units, and 0 converts to ∞.
- Rounding (half away from zero) happens only for display.
- Radian units are the one exception to exactness: they need π, which is carried to 75 decimal places and flagged in the UI.
- Sources: NIST SP 811 Appendix B, NIST HB 44 Appendix C, BIPM SI Brochure (9th ed.), ICAO Doc 7488 / ISA (Mach), IEC 80000-13, IAU 2012 B2, UK Weights and Measures Act 1985, and 21 CFR 101.9 for the legal cup.

## Keyboard
- `/` focuses search. Use ↑/↓ and Enter to pick a unit as **From**, Shift+Enter to pick it as **To**, and Esc to close.
- In the category grid and in each unit picker, arrow keys move and select, and Home/End jump to the first or last item.
- Alt+S swaps the units.
