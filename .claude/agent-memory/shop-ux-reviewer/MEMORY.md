# shop-ux-reviewer memory

## Already fixed or decided (do not report again)
- Jargon scrubbed from the screen and README: BOM, DFM, ETA, tare, floor, threshold, stalling, value at risk. Plain words now: Empty Spool Weight, reorder level, usual delivery time, Order Value Held Up, Parts Check.
- Retired labels replaced: Saved Printer Settings (was a "slicer recipe"), Shelf / Spool Label, Print Label, Save Backup File / Load Backup File.
- The label pattern is called an "item ID pattern" and the README says it is not a scannable QR code.
- Restock message contains only greeting, item, pack quantity, exact size and delivery window. Prices and supplier notes appear only in a "For your eyes only (not in the message)" line on screen.
- After Deduct Parts From Stock the panel shows a calm blue DONE banner, not a red re-check.
- Search box placeholders were shortened so they are not cut off at 390px.

## Accepted trade-offs (not bugs)
- Someone with old saved data does not get the newer demo items until they tap Reset Demo Data.
- The Undo option for Deduct Parts From Stock stays on that device only and is not part of the backup file.
- Loading a backup file replaces the data on that device (the footer says so).

## Patterns to watch
- Every new button, tooltip, placeholder, option and error message must pass the plain-English rules, including text inside collapsed sections.
- At 390px, check long item names, the four tabs in the header, and rows that hold a select plus a number box.

## Improve-loop pass (shop-floor edge cases)
- Fixed and verified CLEAN: Reset Demo Data double-tap (1s ignore, clearer armed text, backup tip), Undo double-tap (1s ignore, "Undo: <job>" label, same-job deduct guard), scale reading below Empty Spool Weight now saves 0 g.
- Checked fine: Quick Restock Log and Custom Job blank/0/negative inputs, WhatsApp copy has no prices/ratings/notes, backup keys unchanged.
- Minor open: toast "net 800 g saved" (index.html ~1165) could read "Saved: 800 g of filament left".
