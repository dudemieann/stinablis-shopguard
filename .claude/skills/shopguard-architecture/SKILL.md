---
name: shopguard-architecture
description: Guardrails for editing Stinablis ShopGuard single-file HTML/JS architecture and localStorage backup compatibility.
---

# ShopGuard architecture guardrails

## Shape of the app

- **One file: `index.html`.** HTML, CSS and JavaScript together. No backend, no install, no build step, no external dependencies (no CDN scripts, fonts or images).
- Data lives in the browser's `localStorage` (state key `stinablis_shopguard_v1`; the Undo history for Deduct Parts From Stock uses a separate key and is never part of a backup).
- **Mobile first.** It must work at **390px** (phone) and **1280px** (desktop) with zero horizontal scrolling and no console or page errors.
- `Reset Demo Data` restores the realistic Kuching / Malaysia sample data (two taps to confirm).

## Backup compatibility (the most important rule)

- Keep every internal JSON / backup key backward-compatible: `tare`, `recipes`, `fitNote`, `dried`, `opened`, `thr`, `pack`, `cat`, `job`, `bad`, `settings`, and the backup envelope `{ app: "stinablis-shopguard", version: 1, data: ... }`.
- **Never rename or remove a key.** Visible labels change freely; keys do not.
- A new field needs all of these, or old files and round-trips break:
  1. a default in the demo data (`seed()`),
  2. a safe default in the backup sanitizer (`cleanState()`), so older `.json` backups without it import cleanly,
  3. the same default on any item created by a form (for example the Quick Restock Log's new-item path),
  4. a test that exports, resets, imports and finds the state identical.
- Imported text is untrusted: it is sanitised, and all user text is escaped (`esc()`) before it goes into HTML.

## Features that must stay intact

- **Filament tab:** + Add Filament Spool (material, color and brand, usable weight, **Empty Spool Weight**, reorder level, **Sealed** or **Opened on** a date), Sealed badge, Open Spool Today, **Mark Dried Today**, Scale reading to Save Weight, humidity warnings at **14 days (orange)** and **30 days (red)**.
- **Hardware tab:** groups Screws, Nuts, Heat-set inserts, Bearings, Magnets, **Fidgets & Keychains**, **Springs & Finishing**; **Exact Size / Fit Note** on every item; + Add Hardware Item.
- **Quick Search and Low Stock Only** filters on both tabs, with the plain no-match message and Clear Filters.
- **Quick Restock Log:** four fast fields plus Quantity Added, **+20 / +50 / +100** pack buttons for hardware, supplier badges, and **Saved Printer Settings** per supplier.
- **Parts Check:** Presets 1 to 4 (GREEN, AMBER, flashing RED, RED, in that order), **Check a Custom Job**, **Order Value Held Up** banner, local versus West Malaysia delivery advice, **Copy Restock Message**, and **Deduct Parts From Stock** with one-tap **Undo**.
- **Shelf / Spool Labels** with print-friendly styling, and **Save Backup File / Load Backup File**.

## Editing habits

- Make the smallest change that does the job. Do not add features that were not asked for.
- Keep existing element ids, `data-act` names and class names. The Chromium QA suite (`tests/shopguard-qa.js`) depends on them.
- Wording must follow the `plain-english-rules` skill.
- After any change, the QA suite must pass at both widths before the work counts as done.
