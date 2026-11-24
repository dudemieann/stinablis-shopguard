# Stinablis ShopGuard

Single-page web app for **Stinablis** (a 3D printing and custom prototyping shop in Kuching, Malaysia), built for the Galavate Innovation Challenge 2026. It stops surprise stock-outs of filament, screws and small parts, and remembers where things were bought, what they cost, how long delivery took and which printer settings worked.

Git remote: `origin` = `dudemieann/stinablis-shopguard`, branch `main`.

## Rules

- **Brand:** always spell it "Stinablis".
- **Tech:** one self-contained `index.html`. Zero dependencies, no backend, no install. Mobile-friendly (390px phone and 1280px desktop). Data in `localStorage`, with a "Reset Demo Data" button. Realistic Kuching/Malaysia sample data (PLA/PETG about RM38-RM59/kg from West Malaysia taking 7-12 days, versus RM69-RM89/kg local Kuching pickup in 1-2 days).
- **Plain English:** every word a person can read (screen and README) is everyday English. Never use "BOM", "DFM", "ETA", "tare", "floor", "threshold", "stalling", "value at risk" or the misspelling "Stinabilis". Details: `.claude/skills/plain-english-rules`.
- **Backup compatibility:** internal JSON/backup keys (`tare`, `recipes`, `fitNote`, `dried`, ...) are never renamed or removed. Older `.json` backups must always import cleanly. Details: `.claude/skills/shopguard-architecture`.
- **WhatsApp restock copy** never contains prices, job value, supplier ratings or internal notes. The label code is a visual item ID pattern, not a scannable QR code.
- **Workflow:** change one thing at a time, run the Chromium suite (zero console/page errors, zero horizontal overflow) before calling it done, and commit.

## What ShopGuard does (Pieces 1-5)

1. **Filament tab:** spools with Scale reading to net grams (Empty Spool Weight), humidity warnings at 14 days (orange) and 30 days (red), **+ Add Filament Spool** (Sealed or Opened on a date), **Open Spool Today**, **Mark Dried Today**.
2. **Hardware tab:** groups Screws, Nuts, Heat-set inserts, Bearings, Magnets, Fidgets & Keychains, Springs & Finishing; **Exact Size / Fit Note** on every item; **+ Add Hardware Item**; low-stock flags.
3. **Quick Search + Low Stock Only** on the Filament and Hardware tabs.
4. **Quick Restock Log:** item, supplier or link, RM paid, delivery days, quantity (+20 / +50 / +100 buttons for parts), supplier badges, **Saved Printer Settings**.
5. **Parts Check** ("Before-You-Promise Parts Check"): Presets 1-4 (GREEN, AMBER, flashing RED, RED), **Check a Custom Job**, 15% reprint allowance, **Order Value Held Up** banner, local vs West Malaysia delivery advice, **Copy Restock Message**, **Deduct Parts From Stock** with one-tap **Undo**.
6. **Shelf / Spool Labels** (print-friendly, with a visual item ID pattern) and **Save Backup File / Load Backup File**.

## Testing

```bash
node tests/shopguard-qa.js
```

Headless Chromium at 1280px and 390px (about 25 s): errors, overflow, every feature, the plain-English sweep and backup round-trips. Exit code 0 means all passed.

## Agents and workflow

| Agent | Job | Tools | Model | Memory |
|---|---|---|---|---|
| `shop-ux-reviewer` | Reviews wording, phone usability and WhatsApp copy as a workshop owner. Read-only. Returns the top 3 issues, or `STATUS: CLEAN`. | Read, Grep, Glob | sonnet | project |
| `shopguard-builder` | Makes only the fixes it is given, in `index.html` and `README.md`. | Read, Edit, Write, Grep, Glob | sonnet | project |
| `browser-qa` | Runs the Chromium suite and reports pass/fail and exact failing lines. Never edits code. | Read, Bash, Grep, Glob | haiku | project |

Each agent keeps its own notes in `.claude/agent-memory/<agent-name>/`. Skills live in `.claude/skills/`: `plain-english-rules`, `shopguard-architecture`, `chromium-qa-suite`, and `improve-loop`.

**`/improve-loop`** (manual only): up to **3 rounds** of review and test in parallel, then fix with the builder, then re-test. It stops as soon as `browser-qa` passes 100% and the reviewer says `STATUS: CLEAN`. Then it commits once (including the agent memory notes) and pushes. If issues remain after round 3 it stops and asks the user.
