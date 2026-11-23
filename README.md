# Stinablis ShopGuard

A single-page web app that helps Stinablis (a 3D printing and custom prototyping shop in Kuching, Malaysia) avoid surprise stock-outs of filament and small hardware, and remember every purchase: where it was bought, what it cost, how long delivery took, and which slicer settings worked.

Built for the Galavate Innovation Challenge 2026.

## Run it (for judges)

No install, no build, no internet needed.

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari — desktop or mobile).
2. That's it. Data is saved in your browser's localStorage.

Optional — serve it locally instead of opening the file directly:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Demo data

The app ships with realistic Kuching/Malaysia sample data (filament spools, screws, heat-set inserts, bearings, magnets, and a purchase history). Use the **Reset Demo Data** button (bottom right; tap twice to confirm) at any time to restore it. Everything you edit is saved in your browser's localStorage.

## Suggested 3-minute judge walkthrough

1. **Filament tab.** Spools are sorted with the lowest stock first. On *PLA White*, type a scale reading (e.g. `700`) and tap **Update net g**. The app subtracts the empty spool weight (250 g by default) and stores the net grams. Amber and red humidity warnings appear after 14 and 30 days open (editable under *Settings*).
2. **Purchases tab.** Log a restock in four fields (Item, Supplier/Link, RM Paid, Delivery Days) plus Quantity Added (defaults to 1000 g, or a pack count for hardware). The app shows RM/kg or RM/unit, updates stock and the Supplier Reliability Badge, and can save an optional **Verified Slicer Recipe** per supplier.
3. **Job Check tab.** Tap a preset:
   - *Industrial Assembly Alignment Jig (PLA + M4 Hardware)* gives **GREEN** (everything in stock).
   - *Reverse-Engineered Automotive Sensor Mount (PETG + M3 Inserts)* gives **AMBER** (PETG Grey is 11 g short of the 15% reprint margin; with a 14-day promise it recommends cheap West MY stock).
   - *Urgent Rapid Prototype Enclosure (PETG + Full Fastener Kit)* gives a flashing **RED** (5x M3x12 screws short, which blocks the whole job; with a 2-day promise it recommends Local Kuching Backup).

   On AMBER or RED, a **Job Value at Risk** banner compares the tiny cost of the missing parts with the quoted job value (e.g. "RM 0.38 in missing parts is stalling a RM 1,200.00 custom job"). The preset quote values are demo numbers, and you can type your own in **Quoted Job Value**. Next to each shortage, **Copy Restock Message** copies a ready-to-send WhatsApp/supplier message (item, pack quantity, target delivery window). The message never includes prices, the job value, supplier ratings or other internal notes.

   Change the **Promised Turnaround (days)** or any quantity and the verdict, shortage list, cost estimate and reorder advice update live. You can also add or remove filament grams and parts from existing inventory.
4. **Bin/Spool Card.** Every spool and hardware item has a **Bin/Spool Card** button. It opens a pocket-sized label (QR-style reference pattern, item code, reorder floor, #1 supplier, last RM price, typical ETA, and verified slicer settings for filament). **Print Card** prints only the label, and **Print All Low-Stock Cards** (top of the page) prints a sheet of every item at or below its reorder floor.

5. **Backup / handoff.** At the bottom of the page, **Export Backup (.json)** downloads inventory, supplier memory, verified slicer recipes and the current job. **Import Backup** loads that file on another phone or computer (it replaces that device's data). Invalid or unrelated files are rejected without touching your data.

## Why Zero-Install + JSON Export

- **Zero-install:** ShopGuard is one `index.html` with no libraries, no server and no account. A small shop can open it on any phone or workshop PC, and it works offline on the shop floor.
- **Data stays with Stinablis:** everything lives in the browser's localStorage on that device. Nothing is uploaded anywhere.
- **No lock-in, easy CTO handoff:** the JSON backup is plain, readable and versioned (`"app": "stinablis-shopguard"`, `"version": 1`). It moves data between shop phones today, and it is a clean starting point for a database or ERP later. A CTO can import it with a few lines of code.

## How the Job Check decides

- **Filament** needs the job grams plus a **15% reprint safety margin**. **Hardware** needs the exact count.
- **GREEN:** everything is covered. **AMBER:** a small gap (1 piece of hardware, or under 50 g of filament that still covers the job itself). **RED:** 2 or more pieces of hardware short, 50 g or more of filament short, or not enough filament to print the job even once.
- **Reorder advice** compares the promised turnaround (keeping 1 day to print/assemble) with the delivery times saved in your purchase history: West MY / online suppliers (average 3+ days, typically 7-12) versus local Kuching (average 1-2 days). Suppliers flagged "Avoid - Bad Batch" are ignored.
- **Estimated cost** uses each item's last logged supplier price.

## Notes

- The pattern on each card is a deterministic **QR-style reference pattern** generated from the item code. It is for visual identification and is not a scannable QR code.
- Print layout targets A4 with 92 mm wide cards (2 per row), so cards can be cut out and taped to bins or spools.

## Status

Piece #1 (inventory, spool scale/humidity, purchase memory, slicer recipes), Piece #2 (pre-job BOM check, printable bin/spool cards) and Piece #3 (Stinablis job kits, value-at-risk banner, restock message copy, JSON backup) are complete. See `CLAUDE.md` for the project rules.
