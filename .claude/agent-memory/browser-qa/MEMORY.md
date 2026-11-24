# browser-qa memory

## Verified test command (this environment)
- From the repo root: `node tests/shopguard-qa.js` (about 25 s).
- Last known result: `SUMMARY: 650 passed, 0 failed (desktop 1280px + phone 390px)`, then `ALL PASSED`, EXIT_CODE=0 (run on 2026-11-24, no failures).
- Exit codes: 0 all passed, 1 failures, 2 the run crashed. Failing checks are listed again under `FAILED CHECKS:` with a `[desktop]` or `[phone]` tag.
- Playwright and Chromium are pre-installed. Do not run `playwright install`. If `require('playwright')` fails, the script tries the global npm folder.
- Screenshots and temp backup files go to `$SHOPGUARD_QA_OUT` (default: system temp folder `shopguard-qa`). Nothing is written into the repo.

## Gotchas learned while writing the suite (these were test bugs, not app bugs)
- A case-insensitive search for "RM" matches inside "confiRM": use `\bRM\b`.
- Some banner headings are shown in capitals by CSS (`text-transform`), so `innerText` is uppercase: compare case-insensitively.
- The jargon sweep opens every `<details>` section. A later `summary` click would then close it again: set `.open = true` instead of clicking summaries.
- "Clear Filters" only appears when filters hide everything; when some items still show, clear the search box and the Low Stock Only button by hand.
- Clipboard checks need `clipboard-read` and `clipboard-write` permission in the browser context (the suite grants it).

## Past real regressions (all fixed)
- Card unit prices under RM 1 once showed 3 decimals (RM 0.400/unit); all prices now use one formatter.
- Preset button labels in the HTML once differed from the preset names in the code.
- After Deduct Parts From Stock, the job was re-checked against the reduced stock and showed a scary red verdict; it now shows a calm DONE banner until Undo.

## Recurring regressions
- None recorded yet. Add new ones here with the exact failing test name.
- 2026-11-24 run: all 650 checks passed on desktop and phone, zero console/page errors, zero horizontal overflow.
