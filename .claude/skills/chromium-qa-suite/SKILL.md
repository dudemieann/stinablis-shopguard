---
name: chromium-qa-suite
description: Runs headless Chromium verification for Stinablis ShopGuard at desktop and phone widths.
---

# Chromium QA suite for ShopGuard

## What to run

From the repo root, run the existing automated suite (Playwright and Chromium are already installed in Claude Code on the web; do not run `playwright install`):

```bash
node tests/shopguard-qa.js
```

It takes about 25 seconds. It opens `index.html` at **1280px (desktop)** and **390px (phone)** and checks:

- zero console errors and zero page errors,
- zero horizontal overflow on every tab, form and label window,
- every functional check for the Filament tab, Hardware tab, Quick Restock Log, Parts Check (presets, custom job, deduct and undo), Shelf / Spool Labels and printing,
- the plain-English jargon sweep across every tab, expanded section, form and modal,
- Save Backup File / Load Backup File round-trips, including older backups that lack newer fields.

Exit code: 0 = all passed, 1 = at least one check failed, 2 = the run itself crashed.
Screenshots and temporary backup files go to `$SHOPGUARD_QA_OUT` (default: the system temp folder), never into the repo.

## What to return

Return ONLY a concise pass/fail summary so the main conversation stays clean:

1. One line: `PASS` or `FAIL`, with the numbers from the `SUMMARY:` line.
2. If anything failed: the **exact** `FAIL ...` lines (copy them verbatim, including the `[desktop]` or `[phone]` tag from the `FAILED CHECKS:` list). If the run crashed, the exact `CRASH:` line.
3. Nothing else. No full logs, no screenshots, no fix suggestions, and never edit application code.
