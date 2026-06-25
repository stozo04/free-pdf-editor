"use client";

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Annotation, FormWidget } from "../types";
import { standardFontFor, sanitizeForWinAnsi } from "../fonts";
import { hexToRgb01 } from "../pdf/colors";

export interface ExportInput {
  originalBytes: Uint8Array;
  annotations: Annotation[];
  formValues: Record<string, string | boolean>;
  formWidgets: FormWidget[];
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Build the edited, flattened PDF as bytes. */
export async function exportEditedPdf(input: ExportInput): Promise<Uint8Array> {
  const { originalBytes, annotations, formValues, formWidgets } = input;

  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  // Embedded-font cache (StandardFonts only -> always available).
  const fontCache = new Map<string, PDFFont>();
  const getFont = async (std: StandardFonts): Promise<PDFFont> => {
    const cached = fontCache.get(std);
    if (cached) return cached;
    const f = await pdfDoc.embedFont(std);
    fontCache.set(std, f);
    return f;
  };

  // 1) Apply interactive form values, then flatten so they bake into the page.
  if (formWidgets.length > 0 && Object.keys(formValues).length > 0) {
    try {
      const form = pdfDoc.getForm();
      for (const [name, value] of Object.entries(formValues)) {
        const widget = formWidgets.find((w) => w.name === name);
        if (!widget) continue;
        try {
          if (widget.kind === "text") {
            form.getTextField(name).setText(sanitizeForWinAnsi(String(value)));
          } else if (widget.kind === "checkbox") {
            const cb = form.getCheckBox(name);
            value ? cb.check() : cb.uncheck();
          } else if (widget.kind === "radio") {
            if (value) form.getRadioGroup(name).select(String(value));
          } else if (widget.kind === "dropdown") {
            if (value) form.getDropdown(name).select(String(value));
          } else if (widget.kind === "optionlist") {
            if (value) form.getOptionList(name).select(String(value));
          }
        } catch {
          /* field name/type mismatch — skip gracefully */
        }
      }
      try {
        form.flatten();
      } catch {
        /* some forms can't flatten cleanly; values are still set */
      }
    } catch {
      /* document has no usable AcroForm */
    }
  }

  // 2) Draw annotations on top of (flattened) page content.
  for (const a of annotations) {
    const page = pages[a.pageIndex];
    if (!page) continue;

    if (a.kind === "text-edit") {
      const std = standardFontFor(a.fontFamily, a.bold, a.italic);
      const font = await getFont(std);
      const text = sanitizeForWinAnsi(a.text);
      const padX = Math.max(1, a.fontSize * 0.08);
      const padY = Math.max(1, a.fontSize * 0.12);
      const newWidth = text ? font.widthOfTextAtSize(text, a.fontSize) : 0;
      const coverWidth = Math.max(a.width, newWidth) + padX * 2;
      const bg = hexToRgb01(a.bgColor);
      // whiteout the original run
      page.drawRectangle({
        x: a.x - padX,
        y: a.baselineY - a.descent - padY,
        width: coverWidth,
        height: a.ascent + a.descent + padY * 2,
        color: rgb(bg.r, bg.g, bg.b),
      });
      // redraw new text on the same baseline
      if (text) {
        const c = hexToRgb01(a.color);
        page.drawText(text, {
          x: a.x,
          y: a.baselineY,
          size: a.fontSize,
          font,
          color: rgb(c.r, c.g, c.b),
        });
      }
    } else if (a.kind === "placed-text") {
      const text = sanitizeForWinAnsi(a.text);
      if (!text) continue;
      const font = await getFont(StandardFonts.Helvetica);
      const c = hexToRgb01(a.color);
      page.drawText(text, {
        x: a.x,
        y: a.baselineY,
        size: a.fontSize,
        font,
        color: rgb(c.r, c.g, c.b),
      });
    } else if (a.kind === "check") {
      const c = hexToRgb01(a.color);
      const col = rgb(c.r, c.g, c.b);
      const t = Math.max(1, a.size * 0.13);
      const p1 = { x: a.x + a.size * 0.16, y: a.y + a.size * 0.5 };
      const p2 = { x: a.x + a.size * 0.4, y: a.y + a.size * 0.24 };
      const p3 = { x: a.x + a.size * 0.84, y: a.y + a.size * 0.74 };
      page.drawLine({ start: p1, end: p2, thickness: t, color: col });
      page.drawLine({ start: p2, end: p3, thickness: t, color: col });
    } else if (a.kind === "signature") {
      try {
        const png = await pdfDoc.embedPng(dataUrlToBytes(a.pngDataUrl));
        page.drawImage(png, { x: a.x, y: a.y, width: a.width, height: a.height });
      } catch {
        /* malformed image — skip */
      }
    }
  }

  return pdfDoc.save();
}

/** Trigger a browser download of bytes as a PDF. */
export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function editedFileName(original: string | null): string {
  const base = (original ?? "document.pdf").replace(/\.pdf$/i, "");
  return `${base}-edited.pdf`;
}
