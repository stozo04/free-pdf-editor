import { StandardFonts } from "pdf-lib";
import type { FontKey } from "./types";

// The editor's offered font set (mirrors iLovePDF's: Arial, Times, Courier,
// Verdana, Comic Sans). We map each to the closest pdf-lib StandardFont for
// export and to a CSS stack for on-screen editing. StandardFonts cover the
// "best-effort" goal without shipping/embedding custom font files.

export const FONT_OPTIONS: { key: FontKey; label: string; css: string }[] = [
  { key: "helvetica", label: "Arial", css: "Arial, Helvetica, sans-serif" },
  { key: "times", label: "Times New Roman", css: "'Times New Roman', Times, serif" },
  { key: "courier", label: "Courier", css: "'Courier New', Courier, monospace" },
  { key: "verdana", label: "Verdana", css: "Verdana, Geneva, sans-serif" },
  { key: "comic", label: "Comic Sans MS", css: "'Comic Sans MS', 'Comic Sans', cursive" },
];

export function cssForFont(key: FontKey): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.css ?? FONT_OPTIONS[0].css;
}

/** Choose the pdf-lib StandardFont for a font key + style. */
export function standardFontFor(
  key: FontKey,
  bold: boolean,
  italic: boolean,
): StandardFonts {
  switch (key) {
    case "times":
      if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
      if (bold) return StandardFonts.TimesRomanBold;
      if (italic) return StandardFonts.TimesRomanItalic;
      return StandardFonts.TimesRoman;
    case "courier":
      if (bold && italic) return StandardFonts.CourierBoldOblique;
      if (bold) return StandardFonts.CourierBold;
      if (italic) return StandardFonts.CourierOblique;
      return StandardFonts.Courier;
    // Verdana/Comic have no Standard equivalents; Helvetica is the closest
    // metric-compatible sans for best-effort layout.
    case "helvetica":
    case "verdana":
    case "comic":
    default:
      if (bold && italic) return StandardFonts.HelveticaBoldOblique;
      if (bold) return StandardFonts.HelveticaBold;
      if (italic) return StandardFonts.HelveticaOblique;
      return StandardFonts.Helvetica;
  }
}

/** Map a pdf.js font family / fontName string to one of our font keys + style. */
export function detectFont(
  family: string | undefined,
  fontName: string | undefined,
): { key: FontKey; bold: boolean; italic: boolean } {
  const s = `${family ?? ""} ${fontName ?? ""}`.toLowerCase();
  const bold = /bold|black|heavy|semibold/.test(s);
  const italic = /italic|oblique/.test(s);
  // Order matters: test mono and "sans" signals before "serif" — note that
  // "sans-serif" contains the substring "serif", which would otherwise
  // misclassify Helvetica/Arial as Times.
  const isSerif = /serif/.test(s) && !/sans/.test(s);
  let key: FontKey = "helvetica";
  if (/courier|mono|consol/.test(s)) key = "courier";
  else if (/comic/.test(s)) key = "comic";
  else if (/times|georgia|roman|minion|garamond|cambria/.test(s) || isSerif) key = "times";
  else if (/verdana|tahoma/.test(s)) key = "verdana";
  return { key, bold, italic };
}

// Common unicode punctuation -> ASCII look-alikes, keyed by code point.
const PUNCT: Record<number, string> = {
  0x2018: "'", 0x2019: "'", 0x201a: "'", 0x2032: "'",
  0x201c: '"', 0x201d: '"', 0x201e: '"', 0x2033: '"',
  0x2013: "-", 0x2014: "-",
  0x2026: "...",
  0x00a0: " ",
  0x2022: "*",
  0x2713: "", 0x2714: "",
};

/**
 * pdf-lib StandardFonts use WinAnsi encoding and cannot draw arbitrary unicode.
 * Map common punctuation to ASCII, then drop control chars and anything outside
 * printable Latin-1 so export never throws on a stray glyph.
 */
export function sanitizeForWinAnsi(input: string): string {
  let out = "";
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp in PUNCT) {
      out += PUNCT[cp];
      continue;
    }
    // printable ASCII + Latin-1 supplement (skip C0/C1 control ranges)
    if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa1 && cp <= 0xff)) {
      out += ch;
    }
  }
  return out;
}
