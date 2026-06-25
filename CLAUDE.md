# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## What this is

**FreePDF Editor** — a free, **100% client-side**, in-browser PDF editor. Open a
PDF, fix its text, sign it, fill forms, and download. No backend, no sign-up, no
paywall, no ads, no analytics. Files never leave the browser.

See `PRD.md` for the product spec and `README.md` for the user-facing overview.

## Commands

```bash
npm install        # installs deps; the pdf.js worker is copied to /public by the predev/prebuild hook
npm run dev        # dev server on http://localhost:3000
npm run build      # production build (static-exportable)
node scripts/make-fixtures.mjs       # regenerate fixtures/{digital,form,scanned}.pdf
node scripts/copy-pdf-worker.mjs     # manually copy the pdf.js worker into /public
```

> ⚠️ **Do NOT run `npm run build` while `npm run dev` is running.** They share the
> `.next` folder; building over a live dev server corrupts its cache and produces
> the *"missing required error components, refreshing…"* overlay. Stop dev first,
> or `rm -rf .next` and restart dev to recover.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · `pdfjs-dist` (render
+ text layer + form detection) · `pdf-lib` + `@pdf-lib/fontkit` (write-back +
flatten) · `signature_pad` · `zustand` (state + undo/redo).

## Architecture map

```
src/app/page.tsx              landing + upload (drag/drop, validation)
src/app/editor/page.tsx       parses the staged file (pdf.js), then renders the editor
src/components/editor/
  EditorShell.tsx             layout: header, toolbar, rails, bottom bar, sig modal
  PageView.tsx                page canvas + ALL interactive overlays (the big one)
  Toolbar/BottomBar/ThumbnailRail/RightPanel/SignatureModal/NonEditableBanner/DownloadButton
  PdfDocContext.tsx           shares the parsed PDFDocumentProxy + cached text blocks
src/lib/
  pdf/pdfjs.ts                load, render, extractTextBlocks, extractFormWidgets
  pdf/colors.ts               sample canvas for text/bg colour (clean blend)
  export/exportPdf.ts         pdf-lib write-back: whiteout+redraw, signatures, checks, form fill, flatten
  fonts.ts                    font detection + StandardFont mapping + WinAnsi sanitising
src/store/editorStore.ts      zustand store: document, annotations, formValues, undo/redo
```

## Conventions & invariants

- **Coordinates:** all persisted geometry is in **PDF points, bottom-left origin**
  (PDF-native). This matches both pdf.js text-item transforms and pdf-lib's draw
  API, so export is a direct mapping. On-screen rendering converts via the pdf.js
  viewport (`convertToViewportPoint` / `convertToPdfPoint`).
- **pdf.js is browser-only.** Only import/use it inside client components/effects.
  The worker is served from `/public/pdf.worker.min.mjs` (copied by the npm hook;
  it is gitignored). If rendering hangs, check the worker exists.
- **Scanned detection:** a doc with < 3 chars of extractable text is treated as
  scanned (`isScanned`) — text editing is disabled, signing/placement still work.
- **Fonts:** `detectFont()` maps pdf.js font names to one of Arial/Times/Courier/
  Verdana/Comic. Note `"sans-serif"` contains `"serif"` — test sans before serif
  (regression we already fixed). Export uses pdf-lib StandardFonts (WinAnsi), so
  text is run through `sanitizeForWinAnsi()` to avoid encoding throws.
- **StrictMode:** `editor/page.tsx` runs its parse exactly once via a ref guard and
  intentionally does **not** abort on effect cleanup — otherwise React 18 dev
  StrictMode's double-invoke discards the in-flight parse and the spinner hangs.

## Known limitation (by design)

"Edit existing text" uses **whiteout + redraw**: the original run is covered with a
background-coloured rectangle and new text is drawn on top. It's visually seamless,
but pdf-lib cannot delete content-stream operators, so the *original* text still
lives in the invisible text layer (copy/paste or search of the export may surface
old characters). True content editing needs a commercial engine (Apryse/PDFTron),
which we deliberately avoid to stay free + client-side.

## Testing

Verification is done by driving the app in a real browser against the fixtures in
`fixtures/` (regenerate with `node scripts/make-fixtures.mjs`). To inject a file
without the native picker, construct a `File`, set it on `[data-testid=file-input]`
via `DataTransfer`, and dispatch a `change` event.

A **dev-only** hook `window.__freepdf` (gated by `NODE_ENV !== "production"`, set up
in `EditorShell`) exposes `getState()`, `exportBytes()`, and `readText(bytes)` so an
export can be re-parsed and asserted. It is absent from production builds.

## Repo hygiene

- `reference/ilovepdf-capture/` (iLovePDF's proprietary captured bundles) is **git-
  ignored** — do not commit it to the public repo (copyright). `reference/README.md`
  (our own notes) is kept.
- `node_modules`, `.next`, `/public/pdf.worker.min.mjs`, `/public/fixtures`, and
  `/fixtures` are gitignored (the last three are regenerable artifacts).
- `main` is the default branch and is protected by a ruleset (PR + 1 review, no
  force-push, no deletion). Work on a branch and open a PR.
