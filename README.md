# AIM AV — Booth Designer

A local-first, single-file PWA for laying out AV/trade-show booths and generating photorealistic renders with AI. No backend, no build step — everything runs in the browser and persists in IndexedDB.

## Quick start

Just open `aim-av.html` in a browser. That's it — no install, no server.

To deploy: drop the file into a GitHub Pages repo (rename to `index.html` if you want it at the repo root) or host it anywhere that serves static files.

## What it does

- **Layout a booth** — upload a floor plan or booth photo, drag items from the Item Bank onto it, resize/rotate/flip them freely
- **Item Bank** — 35 built-in generic AV/event items across 12 categories (displays, kiosks, projection, audio, computers, furniture, lighting, truss, staging, networking, mobile devices, accessories), plus upload your own PNGs
- **Bill of Materials** — auto-tallied from whatever's currently on the canvas
- **AI Render** — sends the layout to Google's Gemini image model, which re-renders it as a photorealistic booth photo while preserving exact item positions, sizes, and identities
- **Export** — flatten the layout to a print-quality PNG with optional header/footer/watermark
- **Backup/Restore** — dump the entire local database to a JSON file and reload it later or on another machine
- **Autosave** — every change saves to IndexedDB (debounced ~500ms); reload the page and your project is right where you left it
- **Undo/redo**, keyboard shortcuts, light/dark theme (defaults to system)

## Setting up AI Render

1. Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com)
2. Open **Settings** in the app, paste the key in
3. Pick a model — Nano Banana 2 (`gemini-3.1-flash-image`) is the default and recommended option; Nano Banana 2 Lite is faster/cheaper, Nano Banana Pro is higher quality/slower, and legacy 2.5 is kept as a fallback

**Note on billing:** image generation on the newer models appears to require a billing account linked to the Google Cloud project behind your key, even for light use (pay-as-you-go, a few cents per image — not a subscription). A `429` error on render is almost always this, not a bug — check your plan/billing at AI Studio, or try a different model from the Settings dropdown.

### Render Notes

Click **📝 Render Notes** to add per-project instructions the AI applies to every render — e.g. *"uplights should be blue," "put a rifle scope in the transparent case," "add a few people walking near the booth."* These stack on top of the automatic item legend (which tells the AI exactly what each placeholder icon is, where it sits, and how big it should be) rather than replacing it.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` | Redo |
| `Delete` / `Backspace` | Delete selected item |
| `[` / `]` | Rotate selected item −15° / +15° |
| `H` | Flip selected item horizontally |
| `V` | Flip selected item vertically |

(Shortcuts are disabled while typing in a text field.)

## Tech stack

Everything loads from CDN (jsDelivr) into one HTML file:

- **[Dexie.js](https://dexie.org)** — IndexedDB wrapper for local-first storage (projects, item library, settings)
- **[Konva](https://konvajs.org)** — canvas engine for drag/resize/rotate
- **[html2canvas](https://html2canvas.hertzen.com)** — fallback DOM-to-image export path
- **Gemini API** (`generativelanguage.googleapis.com`) — AI photorealistic rendering, called directly from the browser with your own API key

No React, no npm, no build tools — plain JS in one `<script>` tag.

## Data & privacy

Everything (projects, uploaded images, your library, your API key) lives in your browser's IndexedDB and `localStorage`. Nothing is sent anywhere except:
- The flattened layout image + text prompt, sent directly to Google's Gemini API when you click **Render with AI** (only then, only with your own key)

Use **Backup** in the toolbar periodically if you want a portable copy — it's a single JSON file with everything in it, restorable on any browser via **Restore**.

## Known limitations

- AI renders are generative — treat them as presentation output, not the engineering source of truth. The vector layout and BOM stay accurate; a render can drift slightly run to run
- Built-in item icons are simple vector shapes (rasterized once at first load), not photorealistic — that's intentional, so they resize cleanly to any real-world footprint without looking stretched. Swap in your own renders via upload for anything that needs to look polished pre-AI-render
- Single active project at a time (no project switcher yet)
- No true 3D — items are flat images composited in 2D; the AI render step is what adds real dimensionality and shadows

## File structure

Three files, still zero build tools:

```
aim-av.html    — the app itself: all HTML, CSS, JS, and the app icon (embedded as base64)
manifest.json  — PWA manifest (installable, icons embedded as base64, theme color)
sw.js          — service worker: caches the app shell + pinned CDN libs for offline use
```

Icons are embedded directly as base64 data URIs in both `aim-av.html` (favicon/apple-touch-icon) and `manifest.json` (install icons) — no separate `icons/` folder to keep track of.

Deploy all three files together — the manifest and service worker reference relative paths, so they need to sit alongside `aim-av.html`. On GitHub Pages, push them as-is; if you want the app at the repo root URL, rename `aim-av.html` to `index.html` and update `start_url` in `manifest.json` and `APP_SHELL[0]` in `sw.js` to match.

**Note:** the service worker only registers over `http(s)` — opening the file directly via `file://` (e.g. double-clicking it locally) still works fine as an app, it just won't install as a PWA or cache for offline use. Deploy it to GitHub Pages (or any static host) to get the full installable/offline experience.
