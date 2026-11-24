# shopguard-builder memory

## Layout of `index.html` (find things by name, not line number)
- `<style>` first, then the HTML tab panels (`#view-filament`, `#view-hardware`, `#view-purchases`, `#view-job`), the footer (backup buttons, Reset Demo Data), the toast, and the label window (`#card-modal`), then one `<script>` wrapped in an IIFE.
- Script order: helpers (`esc`, `rm`, `unitRm`), `seed()`, `load()`/`save()`, derived data (`itemStats`, `supStats`, `humidity`, `isLow`), render functions (`filamentCard`, `hardwareCard`, `renderFilament`, `renderHardware`, `renderPurchases`, `renderAll`), the Quick Restock Log (`submitPurchase`), Parts Check (`jobCheck`, `plan`, `restockMsg`, `adviceHtml`, `renderJobResult`, `renderJob`), backup (`cleanState`, `exportBackup`, `importBackup`), labels (`qrSvg`, `codeOf`, `qcardHtml`), filters and custom job and Deduct/Undo, then `act()` (all `data-act` button actions) and the event listeners, then startup.

## Data shape (localStorage key `stinablis_shopguard_v1`)
- `state = { settings:{amber,red,tare}, bad:{supplierKey:true}, items:[], purchases:[], job:{name,days,value,lines:[{item,qty}]} }`
- Filament item: `{id,type:'filament',name,unit:'g',qty,thr,tare,opened|null,dried|null,pack:1000,recipes:{supplierKey:{nozzle,bed,flow,dry,name,saved}}}`. `opened === null` means Sealed.
- Hardware item: `{id,type:'hardware',name,cat,unit:'pcs',qty,thr,pack,fitNote,recipes:{}}`.
- Purchase: `{id,item,supplier,qty,rm,days,date}`. Supplier key is the lower-cased trimmed supplier text.
- Backup file: `{app:'stinablis-shopguard',version:1,exportedAt,data:state}`. `cleanState()` sanitises imports and fills defaults for missing fields (`dried:null`, `fitNote:''`, `job.value:null`).
- The Undo history for Deduct Parts From Stock lives under its own key `stinablis_shopguard_undo_v1` and is not in backups.

## Rules of thumb
- New field: add it to `seed()`, to `cleanState()`, and to any item created in a form (restock log new-item path, add-spool form, add-hardware form), then check the export, reset, import round-trip comes back identical.
- Humidity counts from `dried` if it is on or after `opened`, otherwise from `opened`.
- Parts Check: filament need = grams x 1.15 (rounded up); GREEN = all covered; AMBER = small gap; RED = 2+ parts short, or 50 g+ filament short, or not enough for one print. Deduct is allowed when stock covers the base need, never below zero.
- Restock message is built in `restockMsg()`: item, pack, exact size, delivery window only. No prices.

## Resolved bugs
- `fmtUnitPrice` showed 3 decimals under RM 1 (now `unitRm`).
- An item id of `__proto__` in a backup is rejected on import.
- Reset Demo Data ignores a second tap within 1 s (`resetAt`); Undo ignores taps within 1 s of the last one (`lastUndoAt`); `deductParts` returns early if the top undo entry has the same `jobSig()`. Tests that tap reset/undo twice must `waitForTimeout(1100)` between taps.
- Scale reading lighter than Empty Spool Weight now saves 0 g (negative readings are still refused).
- Risk banner said "Missing parts is holding up" (now "The missing parts are holding up").
