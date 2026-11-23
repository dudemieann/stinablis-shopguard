# Stinablis ShopGuard — Project Rules

Stinablis is a 3D printing and custom prototyping shop in Kuching, Malaysia. ShopGuard is a separate single-page web app built for the Galavate Innovation Challenge 2026.

## Problem
Stinablis sometimes runs out of specific screws, small hardware, or filament unexpectedly, then buys randomly from suppliers and forgets where they bought it, what it cost, how long shipping took, and which slicer settings actually worked for that filament batch.

## Rules

- **Brand name:** Always spell it "Stinablis".
- **Tech stack:** One self-contained `index.html` with zero external dependencies, mobile-friendly layout, realistic Kuching/Malaysia mock data (PLA/PETG around RM38–RM59/kg from West Malaysia/Shopee taking 7–12 days vs. RM69–RM89/kg local Kuching pickup in 1–2 days; M3/M4 screws, brass heat-set inserts, bearings).
- **Core features (to be built in 2 pieces):**
  1. **Inventory & Spool Tracker:** Tracks both filament spools (with Scale-to-Net-Grams updater that subtracts empty spool tare weight, plus Opened-Date humidity warning for humid Kuching weather) and small hardware (screws, nuts, heat-set inserts, magnets) with low-stock thresholds.
  2. **15-Second Purchase Memory Logger:** Fast 4-field restock form (Item, Supplier/Link, RM Paid, Delivery Days) plus Supplier Reliability Badge ("Fast Local Kuching", "Cheap West MY — 7+ Days", "Avoid — Bad Batch") and optional "Verified Slicer Recipe" (Nozzle °C, Bed °C, Flow Ratio, Drying Note) so switching filament suppliers never ruins print quality.
  3. **Pre-Job BOM Completeness Check:** Pick a preset custom job kit or build one (filament grams + specific screw/hardware counts) to check before promising a delivery date — flashing red if even 2 screws or 50g of filament are short, and recommending whether to order cheap West Malaysia stock or urgent local Kuching backup.
  4. **Printable Bin/Spool Quick Cards:** One-click print-friendly card preview (`@media print`) for any screw bin or filament roll showing a crisp SVG QR-style reference pattern/item code, item name, reorder floor, #1 verified supplier, last RM price, typical ETA, and verified slicer settings (for spools).
- **Workflow rule:** Build one piece at a time, verify in headless Chromium with zero console/page errors before claiming done, persist edits in localStorage (with a "Reset Demo Data" button), and save a Git commit after each piece.
