# FreePDF Editor

A free, **100% in-browser** PDF editor. Open a PDF, **fix the text**, **sign it**,
**fill its forms**, and **download** — your file never leaves your device. No
sign-up, no edit limits, no paywall, no ads, no analytics.

Inspired by iLovePDF's "Edit PDF" tool, rebuilt as a genuinely free alternative
focused only on the edit experience. See `PRD.md` for the full product spec and
`reference/README.md` for notes from the original capture.

## What it does (v1)

- **Edit existing text** — click any text run and retype it. The original is
  covered and matching text is redrawn (closest font / size / colour).
- **Sign** — draw, type, or upload a signature; place, move, and resize it.
- **Fill forms** — interactive AcroForm fields are detected and fillable; for
  flat/printed forms you can click-to-place text and checkmarks.
- **Download** — one click produces a flattened `‹name›-edited.pdf`.
- **Scanned-PDF detection** — image-only PDFs are detected; text editing is
  disabled with a clear message, while signing / add-text / checkmarks still
  work.
- Undo/redo, page thumbnails, zoom, fit-width, fully responsive (incl. touch).

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS**
- **pdf.js** (`pdfjs-dist`) — rendering, text-layer extraction, form-widget
  detection. Worker served from `/public/pdf.worker.min.mjs`.
- **pdf-lib** (+ `@pdf-lib/fontkit`) — write-back: whiteout + redraw, signature
  image embedding, AcroForm fill, vector checkmarks, flatten.
- **signature_pad** — the draw-signature canvas.
- **zustand** — editor state + undo/redo history.

Everything runs client-side. There is no backend and no network call carries
user file data (verified — see Testing). The app is statically deployable
(e.g. Vercel).

## Getting started

```bash
npm install         # also copies the pdf.js worker into /public (predev hook)
npm run dev         # http://localhost:3000
npm run build       # production build
```

## Project layout

```
src/
  app/
    page.tsx              landing + upload (drag/drop, validation)
    editor/page.tsx       parses the file, then renders the editor
  components/editor/
    EditorShell.tsx       layout: header, toolbar, rails, bottom bar
    PageView.tsx          page canvas + all interactive overlays
    Toolbar / BottomBar / ThumbnailRail / RightPanel / SignatureModal ...
  lib/
    pdf/pdfjs.ts          load, render, text + form extraction
    pdf/colors.ts         sample text/background colour for a clean blend
    export/exportPdf.ts   the pdf-lib write-back + flatten pipeline
    fonts.ts              font mapping + WinAnsi sanitising
  store/editorStore.ts    zustand store (document, annotations, history)
```

## How "edit existing text" works (and its one limitation)

We use the pdf.js **text layer** to find each text run's position, size and
font. Editing draws a background-coloured rectangle over the original run and
redraws your new text on the same baseline with the closest StandardFont. This
is **visually seamless** on normal, digitally-generated PDFs.

**Known limitation (by design, to stay free + client-side):** pdf-lib cannot
delete operators from a PDF's content stream, so the *original* text still
exists in the invisible text layer underneath the whiteout — it's hidden when
viewed or printed, but a copy/paste or text search of the exported file may
still surface the old characters. True content editing (clicking a word and
having it removed from the byte stream) requires a commercial engine such as
**Apryse/PDFTron WebViewer**, which is what iLovePDF licenses. We deliberately
don't, to keep this tool free and private. For the overwhelmingly common
"fix it, then print or send it" use case, the visual result is correct.

## Testing

Fixtures are generated with pdf-lib:

```bash
node scripts/make-fixtures.mjs      # -> fixtures/{digital,form,scanned}.pdf
```

The app was verified end-to-end in a real browser against these fixtures. All
scenarios pass:

1. **Hero** — open `digital.pdf`, fix a typo, export; the reopened export shows
   the corrected text in a matching font.
2. Non-PDF upload shows a friendly error; valid PDFs open in the editor.
3. Multi-page thumbnails / page nav / zoom / fit-width.
4. Sign — draw, type, and upload; place, resize, export (PNG embedded).
5. Interactive form fields detected, filled, and baked into the export.
6. Manual placement — click-to-place text + checkmark appear in the export.
7. Scanned PDF → "can't edit text" banner; text-edit disabled; signing works.
8. Undo/redo across mixed edits (buttons + Ctrl/Cmd+Z).
9. Responsive at phone / tablet / desktop widths.
10. **Privacy** — no network request carries file data during edit/export.

A dev-only test hook (`window.__freepdf`, gated by `NODE_ENV !== "production"`)
exposes `getState()`, `exportBytes()`, and `readText()` so the export can be
re-parsed and asserted. It is not included in production builds.
