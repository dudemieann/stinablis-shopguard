# Stinablis ShopGuard

ShopGuard helps Stinablis (a 3D printing and custom prototyping shop in Kuching, Malaysia) stop running out of filament, screws and small parts by surprise. It also remembers every purchase: where it was bought, what it cost, how long delivery took, and which printer settings worked.

Built for the Galavate Innovation Challenge 2026.

## How to open it (for judges)

Nothing to install and no internet needed.

1. Open the file `index.html` in any modern browser (Chrome, Edge, Firefox or Safari, on a computer or a phone).
2. That's it. Your changes are saved on that device.

You can also run it from a small local web server if you prefer:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Demo data

The app starts with realistic Kuching and Malaysia sample data: filament spools, screws, nuts, brass heat-set inserts, bearings, magnets, and a purchase history. Tap **Reset Demo Data** (bottom right, tap twice to confirm) at any time to put everything back.

## A 3-minute walkthrough

1. **Filament tab.** Spools with the least left are shown first. On *PLA White*, type a scale reading (for example `700`) and tap **Save Weight**. The app takes off the empty spool weight (250 g to start with) and saves how much filament is really left. Spools that have been open too long get an orange warning after 14 days and a red warning after 30 days, because Kuching air is damp. You can change these numbers under *Settings*.
2. **Purchases tab.** The **Quick Restock Log** takes four things: the item, the supplier or link, the RM you paid, and the delivery days. Add the quantity (it starts at 1000 g for filament, or a pack count for parts) and the app works out the price per kg or per piece, adds the stock, and gives the supplier a badge: *Fast Local Kuching*, *Cheap West MY — 7+ Days*, or *Avoid — Bad Batch*. For filament you can also save **Saved Printer Settings** (nozzle temperature, bed temperature, flow rate, drying note) for each supplier, so switching suppliers never ruins print quality.
3. **Parts Check tab.** This is the **Before-You-Promise Parts Check**. Tap one of the three ready-made jobs:
   - *Industrial Alignment Jig (PLA + M4 Hardware)* shows **GREEN**: everything is in stock.
   - *Reverse-Engineered Car Sensor Mount (PETG + M3 Inserts)* shows **AMBER**: the PETG is a little short once 15% extra is kept for a reprint. With a 14-day promise, the advice is to order cheap West Malaysia stock.
   - *Urgent Prototype Electronics Case (PETG + Full Screw Kit)* shows a flashing **RED**: 5 screws (M3x12) are missing, which stops the whole job. With a 2-day promise, the advice is to use the Local Kuching Backup.

   You can change the days promised, the job value or any quantity, and everything updates straight away. You can also add or remove filament and parts from your own inventory. On AMBER or RED, the **Order Value Held Up** box shows the tiny cost of the missing parts next to the full job value, for example: "RM 0.38 in missing parts is holding up a RM 1,200.00 custom job." Next to each shortage, **Copy Restock Message** copies a ready-to-send WhatsApp message with the item, the pack quantity and the delivery window you need. It never includes prices, the job value or private shop notes.
4. **Shelf / Spool Label.** Every spool and every parts bin has a **Shelf / Spool Label** button. It shows a small label with an item ID pattern, the item code, the reorder level, the main supplier, the last RM price, the usual delivery time and (for filament) the saved printer settings. **Print Label** prints only the label. **Print All Low-Stock Labels** (at the top) prints a sheet for everything that needs restocking.
5. **Backup.** At the bottom, **Save Backup File** downloads your inventory, supplier history, saved printer settings and the current job as one file. **Load Backup File** puts that file onto another phone or computer (it replaces what is on that device). A file that is damaged or is not a ShopGuard backup is refused and nothing is changed.

## Why no install, and why a backup file

- **No install:** ShopGuard is one page with nothing to set up, no accounts and no server. A small shop can open it on any phone or workshop computer, and it works without internet on the shop floor.
- **Your data stays with Stinablis:** everything is saved on the device you use. Nothing is sent anywhere.
- **Easy hand-over:** the backup file is plain, readable text (a `.json` file), clearly marked as a Stinablis ShopGuard backup. It moves your data between shop phones today, and it gives a CTO a clean starting point for a database or other system later.

## How the Parts Check decides

- **Filament** needs the grams for the job plus **15% extra in case of a reprint**. **Parts** need the exact count.
- **GREEN:** everything is covered. **AMBER:** a small gap (1 part short, or under 50 g of filament short while the job itself is still covered). **RED:** 2 or more parts short, 50 g or more of filament short, or not enough filament to print the job even once.
- **Reorder advice** compares the days you promised (keeping 1 day to print and assemble) with the delivery times you have saved: West Malaysia and online suppliers (usually 7 to 12 days) against local Kuching (1 to 2 days). Suppliers marked *Avoid — Bad Batch* are left out.
- **Estimated cost** uses the last price you paid for each item.

## Good to know

- The pattern on each label is an **item ID pattern** made from the item code, so people can recognise a bin or spool at a glance. It is **not a scannable QR code**.
- Labels print on A4 paper, 2 across, each 92 mm wide, so they can be cut out and taped to bins or spools.

## Status

All the planned features are built: stock and spool tracking, the Quick Restock Log with saved printer settings, the Before-You-Promise Parts Check, printable labels, the restock message, and backup files. See `CLAUDE.md` for the project rules.
