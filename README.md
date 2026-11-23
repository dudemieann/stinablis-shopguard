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

The app ships with realistic Kuching/Malaysia sample data. Use the **Reset Demo Data** button in the app at any time to restore it.

## Status

Built in pieces, one at a time (see `CLAUDE.md` for the full rules and feature list). `index.html` will appear once Piece #1 is approved and built.
