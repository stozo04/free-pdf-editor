"use client";

// Thin wrapper around pdf.js (pdfjs-dist v4). Browser-only; all callers run in
// client components / effects. The worker is served as a static file copied to
// /public by scripts/copy-pdf-worker.mjs.

import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from "pdfjs-dist";
import type { FormWidget } from "../types";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

export async function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

/** Load a PDF. The input bytes are cloned because pdf.js detaches the buffer. */
export async function loadPdf(
  data: ArrayBuffer | Uint8Array,
): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  const bytes =
    data instanceof Uint8Array
      ? data.slice()
      : new Uint8Array(data.slice(0));
  return pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
}

export interface RawTextBlock {
  x: number; // left, PDF pts (bottom-left origin)
  baselineY: number; // baseline, PDF pts
  width: number; // run width, PDF pts
  fontSize: number; // PDF pts
  ascent: number; // pts above baseline
  descent: number; // pts below baseline
  family: string;
  fontName: string;
  str: string;
}

/** Extract combined text runs with their PDF-space geometry for editing. */
export async function extractTextBlocks(
  page: PDFPageProxy,
): Promise<RawTextBlock[]> {
  const tc = await page.getTextContent();
  const styles = tc.styles as Record<
    string,
    { fontFamily: string; ascent: number; descent: number }
  >;
  const blocks: RawTextBlock[] = [];
  for (const item of tc.items) {
    if (!("str" in item)) continue;
    const it = item as any;
    if (!it.str || !it.str.trim()) continue;
    const [a, b, , d, e, f] = it.transform as number[];
    const fontSize = Math.hypot(a, b) || Math.abs(d) || it.height || 10;
    const style = styles[it.fontName] || { fontFamily: "", ascent: 0.8, descent: -0.2 };
    const ascent = (style.ascent || 0.8) * fontSize;
    const descent = (Math.abs(style.descent) || 0.2) * fontSize;
    blocks.push({
      x: e,
      baselineY: f,
      width: it.width || fontSize * 0.5 * it.str.length,
      fontSize,
      ascent,
      descent,
      family: style.fontFamily,
      fontName: it.fontName,
      str: it.str,
    });
  }
  return blocks;
}

/** Detect interactive AcroForm widgets on a page (positions in PDF pts). */
export async function extractFormWidgets(
  page: PDFPageProxy,
  pageIndex: number,
): Promise<FormWidget[]> {
  const annots = await page.getAnnotations();
  const out: FormWidget[] = [];
  for (const a of annots as any[]) {
    if (a.subtype !== "Widget" || !a.fieldName) continue;
    const [x1, y1, x2, y2] = a.rect as number[];
    const rect = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
    let kind: FormWidget["kind"];
    if (a.fieldType === "Tx") kind = "text";
    else if (a.fieldType === "Btn") kind = a.radioButton ? "radio" : "checkbox";
    else if (a.fieldType === "Ch") kind = a.combo ? "dropdown" : "optionlist";
    else continue;
    out.push({
      name: a.fieldName,
      kind,
      pageIndex,
      rect,
      options: Array.isArray(a.options)
        ? a.options.map((o: any) => o.displayValue ?? o.exportValue)
        : undefined,
      exportValue: a.exportValue,
    });
  }
  return out;
}

export function getViewport(page: PDFPageProxy, scale: number): PageViewport {
  return page.getViewport({ scale });
}

/** Render a page into a canvas at the given scale. Returns the viewport used. */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<PageViewport> {
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return viewport;
}
