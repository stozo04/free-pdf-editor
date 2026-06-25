# Reference capture — iLovePDF "Edit PDF" (F12 session)

This folder holds assets captured from a live editing session at
https://www.ilovepdf.com/edit-pdf. It is **reference only** — the new app does
not import or ship any of it. Use it to understand the UX and behavior we want
to approximate, not as code to reuse.

## What's here (`ilovepdf-capture/`)

| File | What it is |
|------|------------|
| `main.html` | The edit-pdf page HTML (asset graph, inline config, font list). |
| `image-1.png` | Screenshot: landing/upload state ("PDF Editor — add text, shapes, comments, highlights"). |
| `image-2.png` | Screenshot: the editor in action on a receipt — note the dashed editable text regions and the "Text Styles" right panel. |
| `dist/editpdf.d57e5bf.js` | Minified editor bundle (2.4 MB). |
| `dist/web.d57e5bf.js` | Minified shared/web bundle (font ids, options). |
| `js/pdfjs/pdf.min.js` | pdf.js — used for rendering + page thumbnails. |
| `js/plupload/plupload.full.min.js` | plupload — file upload widget. |
| `js/ilove.min.js` | Small iLovePDF glue script. |
| `PDFworker.js/PDFworker.js` | A PDF web worker (304 KB). |

## Key findings (important)

1. **The "edit existing text" magic is a commercial engine.** The page loads
   Apryse / PDFTron **WebViewer** (`trueedit_libpdf`, `preloadWorker=contentEdit`,
   `pdfnet=1`, `webViewerJSVersion=11.9.1`). Apryse "Content Edit" (WASM) is what
   lets you click any existing word and retype it with matching fonts. **Apryse is
   a paid, licensed SDK** — not free to operate. iLovePDF licensed it rather than
   building it.
2. **iLovePDF monetizes this page** with Google ads (`doubleclick`/`gpt`) plus the
   edit-count paywall. Our app is intentionally free / no-ads / no-paywall.
3. **Editor font set:** Arial, Times New Roman, Courier, Verdana, Comic Sans MS
   (regular/bold/italic variants). UI font: Graphik.
4. **UX anatomy** (from `image-2.png`):
   - Top center tools: Add Text (¶), Add Image, active text/sign tool (A).
   - Right "Text Styles" panel: font, size, B/I/U, color (current + custom),
     alignment, link, undo/redo.
   - Left rail: page-view toggles, zoom slider, page thumbnails.
   - Bottom pill: page nav, zoom %, fit-width, search.
   - Bottom-right: big red **"Save changes →"**.

## Implication for our build

Matching Apryse's seamless content editing for **free + 100% client-side** is not
realistic. Our approach approximates it with open-source libs (pdf.js text layer +
pdf-lib write-back: locate the text run, whiteout, redraw with the closest font).
This is strong on digitally-generated PDFs and degrades gracefully on complex or
scanned ones (which we detect and message). See the PRD for the full spec.
