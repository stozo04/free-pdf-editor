# PRD — FreePDF Editor (working name)

> **For the build agent:** This is a complete, build-ready spec. Build the entire
> app, run it locally, and **verify every acceptance test in a real browser**
> before declaring done. Ground yourself in `reference/README.md` and the two
> screenshots in `reference/ilovepdf-capture/` for the target UX. Do **not** ship
> or import anything from that reference folder — it is inspiration only.

---

## 1. One-liner

A free, 100% in-browser PDF editor that lets anyone open a PDF, **fix the text**,
**sign it**, **fill its forms**, and **download** — without the file ever leaving
their device. No sign-up, no edit limits, no paywall, no ads.

## 2. Origin & positioning

Inspired by **iLovePDF's "Edit PDF"** tool (`ilovepdf.com/edit-pdf`), which is
delightful but caps you at a few edits and then forces sign-up + payment. We
build a genuinely free alternative focused **only** on the edit experience.
iLovePDF has many other tools (convert, compress, etc.) — **we deliberately do
not.** One thing, done well.

**Honest engineering note:** iLovePDF's seamless "click any existing word and
retype it" is powered by **Apryse/PDFTron WebViewer** (`trueedit`/`contentEdit`),
a paid commercial SDK. We are intentionally *not* using it (it breaks "free").
Instead we build a strong **best-effort** editor on open-source libraries. It
will be excellent on normal, digitally-generated PDFs and will **gracefully
detect and explain** when a PDF (e.g. scanned/image-only) can't have its text
edited. Matching Apryse pixel-for-pixel on every document is a non-goal.

## 3. Target user & core promise

- **User:** general consumers — anyone who occasionally needs to fix or complete
  a PDF. Zero learning curve. Works on desktop, tablet, and phone.
- **Promise:** *"Open a PDF, fix it, download it — privately, for free."*
- **Privacy is the differentiator:** all processing is client-side; files are
  never uploaded to any server.

## 4. Goals & non-goals

### Goals (v1)
1. Open a PDF entirely in the browser.
2. **Edit existing text** in the document (the hero feature) — click a text
   block, change it, keep the look as close as possible.
3. **Sign** — draw, type, or upload a signature and place it.
4. **Fill forms** — fill real interactive fields *and* click-to-place text /
   checkmarks on flat/printed forms.
5. **Export** — one-click download of the flattened, edited PDF.
6. Detect and clearly message PDFs that can't be text-edited.
7. Fully responsive incl. touch.

### Non-goals (explicitly OUT of v1)
- ❌ Page management (reorder / delete / rotate / merge / split / insert).
- ❌ General markup toolbar (free-draw, shapes, arrows, highlight, sticky notes).
- ❌ Standalone "Add Text" overlay tool and "Add Image" tool *as general tools*
  (note: click-to-place text **within form-filling** is in scope; a general
  image-insert tool is not).
- ❌ Conversions to/from Word/Excel/JPG, compress, OCR.
- ❌ Accounts, login, cloud storage, Google Drive/Dropbox import.
- ❌ Monetization, ads, analytics, cookies.
- ❌ Legal pages (privacy/terms) for v1.
- ❌ Any server-side processing or file upload.
- ❌ Non-PDF input (no images, no Office files).

## 5. Constraints / principles

- **100% client-side.** No backend, no network calls with user file data. The
  app may be statically exported.
- **Free forever.** No paywalls, edit counters, or upsells.
- **Privacy-first.** Files stay in memory/IndexedDB on-device only.
- **Reliability over breadth.** A small set of features that always work beats a
  big set that sometimes break.

## 6. Tech stack

- **Framework:** Next.js (App Router) + React + TypeScript.
- **Styling:** Tailwind CSS. Use the **`frontend-design` skill** for the visual
  polish pass.
- **PDF render + text layer:** `pdfjs-dist` (pdf.js).
- **PDF write-back:** `pdf-lib` (and `@pdf-lib/fontkit` for custom font
  embedding). Use pdf-lib for whiteout rectangles, drawing replacement text,
  filling AcroForm fields, embedding signature images, and flattening on export.
- **Signature drawing:** a small canvas signature pad (e.g. `signature_pad`).
- **State/undo:** lightweight store (Zustand or React context) with an
  undo/redo command stack.
- **Deploy target:** static-exportable; Vercel-ready. No env secrets required.

> If a listed library is unavailable, pick the closest well-maintained
> open-source equivalent and note the substitution in the README.

## 7. Information architecture

Keep it tiny — a focused app with a thin landing.

| Route | Purpose |
|-------|---------|
| `/` | Landing + upload. Hero ("PDF Editor"), short value prop, **Select PDF file** button + drag-and-drop zone. On file selected → go straight into the editor (same page or `/editor`). |
| `/editor` (or in-place) | The editor workspace. Only reachable with a loaded file; if none, redirect to `/`. |

No nav menu, blog, footer links, or marketing pages needed. A minimal header
(logo "FreePDF Editor") and a one-line privacy reassurance ("Your files never
leave your device") are enough.

## 8. Feature specifications

### F1 — Open / load PDF
- Drag-and-drop anywhere on the landing drop zone, **and** a "Select PDF file"
  button (file picker, `accept=application/pdf`).
- Validate it's a real PDF; show a friendly error otherwise.
- Load fully in-browser (FileReader → ArrayBuffer). **No upload.**
- Show a brief loading state while pdf.js parses and renders.
- **Accept:** picking a valid PDF lands the user in the editor with page 1
  rendered; picking a non-PDF shows a clear inline error and no crash.

### F2 — Viewer / canvas
- Render pages with pdf.js to canvas; overlay an interactive layer for editing.
- **Left rail:** page thumbnails (view/navigate only — no reorder/delete), and a
  **zoom slider**.
- **Bottom bar:** page up/down, "current / total", zoom out/in, zoom %,
  fit-width.
- Smooth zoom and scroll. Multi-page documents supported (navigate, no page ops).
- **Accept:** a 3-page PDF shows 3 thumbnails, page nav moves between them, zoom
  changes render scale crisply, fit-width works.

### F3 — Edit existing text  ⭐ HERO
**Interaction:** *click a text block → edit inline.*
- On load, build the pdf.js **text layer**: extract text items with their
  position, size, font, and color per page.
- Group text items into clickable blocks (line/word level). Render an invisible/
  subtle interactive overlay aligned to the PDF (like the dashed regions in the
  reference screenshot `image-2.png`).
- Clicking a block turns it into an inline editable field **pre-filled with the
  current text**, positioned exactly over the original, rendered in the
  closest-matching font, size, and color.
- On commit (blur/Enter): write the change into the PDF via pdf-lib —
  **whiteout** the original text's bounding box with the detected background
  color (usually white), then **draw** the new text at the same baseline,
  size, and color, using the closest embedded/standard font.
- **Minimal styling only** (per scope): auto-match the original by default;
  expose at most a small inline control for font **size** and **color** for when
  the match needs a nudge. No full rich-text panel.
- **Undo/redo** supported for every edit.
- **Accept:** open a digitally-generated PDF, click a word with a typo, retype
  it, and on export the corrected text appears in the right place with a visually
  close font; the original word is gone (covered); undo restores it.

### F4 — Non-editable detection (paired with F3)
- If a page/document has **no extractable text layer** (scanned/image-only) or
  text that can't be reliably mapped, **detect it** and show a clear,
  non-alarming message, e.g. a banner: *"This PDF looks scanned, so its text
  can't be edited. You can still sign it and fill it in."*
- In that state, disable text-editing affordances but keep **Sign** and
  **manual form-fill** working (they overlay, so they don't need a text layer).
- **Accept:** open an image-only/scanned PDF → the "can't edit text" message
  appears, text-edit is disabled, but Sign and manual placement still work.

### F5 — Sign
- A **Sign** action opens a signature creator with three tabs:
  1. **Draw** — canvas pad (mouse + touch).
  2. **Type** — type a name, pick from a few handwriting-style fonts.
  3. **Upload** — upload a PNG/JPG signature (ideally drop near-white background
     to transparent; at minimum place as-is).
- After creating, the signature becomes a placeable object: drop it on the page,
  then **move / resize** it. Multiple placements allowed.
- On export, signatures are flattened into the PDF via pdf-lib (embed image or
  draw typed text).
- **Accept:** create a drawn signature, place + resize it on page 1, export, and
  the signature appears at the correct position/size in the output PDF. Repeat
  for typed and uploaded signatures.

### F6 — Fill forms
- **Auto-detect interactive (AcroForm) fields:** if present, surface them as
  fillable inputs (text fields, checkboxes, radios, dropdowns) and write values
  back with pdf-lib's form API.
- **Manual placement (flat/printed forms):** let the user click anywhere to drop
  a **text** value or a **checkmark/✓**, then move/resize it. This is the
  in-scope click-to-place capability.
- On export, fields are filled and (by default) flattened.
- **Accept:** open a PDF with real form fields → fields are detected and
  fillable, values persist to the exported file. Open a flat form → user can
  click-place text and a checkmark that appear correctly in the output.

### F7 — Export / download
- Single primary **"Save changes / Download"** button (prominent, like the red
  "Save changes →" in the reference).
- Produces the edited, **flattened** PDF and triggers a browser download named
  `<originalname>-edited.pdf`.
- All edits (text changes, signatures, form values, placed items) are baked in.
- **Accept:** after any combination of edits, clicking Download yields a valid
  PDF that opens in another viewer with all edits present and the correct
  filename.

### F8 — Undo / redo + reset
- Global undo/redo (buttons + Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z) across all edit
  types. A "start over / load another PDF" affordance returns to landing.
- **Accept:** undo/redo correctly steps through a sequence of mixed edits.

## 9. UX / design spec

Match the **clean & friendly (Smallpdf-like)** vibe and the anatomy in
`reference/ilovepdf-capture/image-2.png`:

- **Landing:** centered hero — large title "PDF Editor", one-line subtitle
  ("Edit your PDF — fix text, sign, and fill forms. Free and private."), a big
  primary **Select PDF file** button, and "or drop PDF here". Generous
  whitespace, rounded cards, a friendly accent color.
- **Editor layout:**
  - **Left rail:** page thumbnails + zoom slider.
  - **Center:** the PDF canvas with the interactive edit overlay.
  - **Top toolbar:** the small set of in-scope tools (Edit text, Sign, Fill/
    checkmark). Keep it minimal — do **not** add the markup tools we cut.
  - **Right panel:** contextual — appears only when relevant (e.g. minimal
    size/color when editing text; signature options when signing).
  - **Bottom bar:** page nav + zoom controls.
  - **Bottom-right:** prominent primary **Download** button.
- **Responsive / touch (required):** on phones/tablets the editor must remain
  usable — collapsible rails, touch-friendly hit targets, touch signing, pinch/
  buttons for zoom. Validate at ~375px, ~768px, and desktop widths.
- **Type & color:** friendly system/`Inter`-style UI font (Graphik is the
  reference's UI font — use a free near-equivalent like Inter). Editor document
  fonts to offer where matching is needed: **Arial, Times New Roman, Courier,
  Verdana, Comic Sans MS** (regular/bold/italic), matching iLovePDF's set.
- **Accessibility:** keyboard operable, visible focus states, sufficient
  contrast, alt text on icons/buttons.
- Use the **`frontend-design` skill** to make it distinctive and polished, not
  generic.

## 10. Build order (suggested milestones)

1. **Scaffold** Next.js + TS + Tailwind; landing page with upload + drag/drop;
   route into editor with the loaded file.
2. **Render** PDF via pdf.js (canvas + thumbnails + zoom + page nav).
3. **Hero: edit existing text** (text layer → editable overlay → pdf-lib
   write-back) + **non-editable detection**.
4. **Export** flattened PDF with correct filename. (Now the hero flow is
   end-to-end testable.)
5. **Sign** (draw/type/upload, place/resize, flatten).
6. **Fill forms** (AcroForm detect + manual placement).
7. **Undo/redo**, polish, **responsive/touch** pass, design polish.
8. **Browser test pass** (Section 11) — fix until green.

## 11. Verification — browser test plan (required)

The agent must run the app locally and **drive it in a real browser** (the
`claude-in-chrome` tools or Playwright) to verify behavior, not just unit tests.
Create small test fixtures programmatically with pdf-lib:

- **`digital.pdf`** — a 1–2 page PDF with known, selectable text (incl. a word to
  "fix"), generated so the text layer is reliable.
- **`form.pdf`** — a PDF containing real AcroForm fields (a text field + a
  checkbox).
- **`scanned.pdf`** — an image-only PDF (embed a PNG of text, no text layer) to
  exercise non-editable detection.

**Test scenarios (all must pass):**

1. **Hero — fix a typo (critical):** load `digital.pdf` → click the target word
   → retype the correct spelling → Download → re-open the downloaded file and
   assert the corrected text is present and the old text is gone.
2. **Open/validate:** selecting a non-PDF shows a friendly error; valid PDF
   enters the editor with page 1 rendered.
3. **Multi-page nav/zoom:** thumbnails count matches pages; page nav and
   fit-width/zoom work.
4. **Sign (all 3 methods):** draw, type, and upload a signature; place + resize;
   export; assert it appears in the output at the right spot.
5. **Forms — interactive:** `form.pdf` fields are detected, fillable, and persist
   to the exported file.
6. **Forms — manual placement:** click-place text + a checkmark on a flat area;
   export; assert they appear.
7. **Non-editable detection:** `scanned.pdf` shows the "can't edit text" message;
   text-edit disabled; Sign + manual placement still work.
8. **Undo/redo:** a mixed sequence of edits undoes/redoes correctly.
9. **Responsive:** the editor is usable and not broken at ~375px, ~768px, and
   desktop; touch signing works.
10. **Privacy guarantee:** monitor network during a full edit session and assert
    **no user file bytes are sent over the network** (no upload requests).

Capture screenshots/GIFs of scenarios 1, 4, and 9 as evidence.

## 12. Definition of Done

- All Section 11 scenarios pass in a real browser.
- The hero flow (open → fix a typo → download) is flawless on `digital.pdf`.
- No network upload of file data (verified).
- Responsive on phone/tablet/desktop; basic a11y in place.
- App builds clean and runs from a documented `npm install && npm run dev`; a
  short README explains the architecture, libraries (and any substitutions), and
  how to run the tests.
- Works fully offline after load (no runtime dependence on third-party services).

## 13. Open assumptions (proceed unless told otherwise)

- Working name **"FreePDF Editor"** for logo/title/copy; trivially swappable via
  a single config/constant.
- Friendly accent color is the agent's choice (a clean blue or red is fine);
  prioritize a trustworthy, approachable feel.
- "Flatten on export" is the default; keeping fields editable is a possible later
  option, not v1.
- IndexedDB/in-memory only; no persistence between sessions required for v1.

---

### Appendix A — Reference material
See `reference/README.md` and `reference/ilovepdf-capture/` (captured iLovePDF
edit-pdf session: HTML, bundles, pdf.js, plupload, PDF worker, and two
screenshots). Reference only — do not import or ship.
