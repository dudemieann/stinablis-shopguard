---
name: plain-english-rules
description: Enforces 100% plain-English workshop wording and clean WhatsApp restock copy for Stinablis ShopGuard.
---

# Plain-English rules for Stinablis ShopGuard

ShopGuard is used by a busy Kuching workshop team on their phones. Everything a person can read must sound like a workshop owner talking, not like an engineer.

## Banned words (visible screen text and README.md)

Never write these where a person can read them: **"BOM"**, **"DFM"**, **"ETA"**, **"tare"**, **"floor"**, **"threshold"**, **"stalling"**, **"value at risk"**, and the misspelling **"Stinabilis"**.

- The brand is always spelled **Stinablis**.
- Use these plain words instead: "usual delivery time" (not ETA), "Empty Spool Weight" (not tare), "reorder level" (not floor or threshold), "holding up" (not stalling), "Order Value Held Up" (not value at risk), "Parts Check" (not BOM check).
- Retired old labels that must also stay off the screen: "Verified Slicer Recipe" (now **Saved Printer Settings**), "Bin/Spool Card" (now **Shelf / Spool Label**), "Print Card" (now **Print Label**), "Job Check" and "Pre-Job" (now **Parts Check**), "net g", "Import/Export Backup" (now **Save Backup File** / **Load Backup File**).
- This applies to everything on screen: headings, buttons, labels, placeholders, tooltips, banners, toasts, error messages, option text, `aria-label` text, and README.md. It also applies to text inside collapsed sections and print/label views.
- It does NOT apply to internal code names. Internal JSON and code keys such as `tare`, `recipes`, `eta`, `fitNote` and `dried` must stay exactly as they are so old backup files keep loading.

## WhatsApp / supplier restock copy

The "Copy Restock Message" text is sent to an outside supplier. It may contain only:

- a friendly greeting using the supplier's cleaned-up name (no "(West MY)" tag, no "Shopee -" or "Lazada -" prefix, nothing at all if the supplier is a web link),
- the item name, the pack quantity, and the **Exact Size / Fit Note** if the item has one,
- the target delivery window.

It must NEVER contain **prices, job value, supplier ratings or badges, "Avoid" or "Bad Batch" flags, other suppliers' names, or any internal note**. Prices and sourcing notes may be shown to the shop owner on screen next to the button, labelled "For your eyes only (not in the message)", but never copied.

## Shelf / Spool Labels

The pattern on a label is a **visual item ID pattern** made from the item code. It is **not a scannable QR code**. Keep that clear: the README says so, and nothing on screen may call it a QR code or suggest it can be scanned.

## Tone checklist

- Short sentences, everyday words, Malaysian-workshop friendly.
- Say what to do next ("Restock missing parts before deducting."), not what went wrong in code terms.
- Money is written like `RM 0.38` or `RM 1,200.00`. Weights are in `g`, counts in `pcs`.
