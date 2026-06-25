// Shared domain types.
//
// COORDINATE CONVENTION: all persisted geometry is in PDF *points* with a
// bottom-left origin (PDF-native, y-up). This makes pdf-lib export trivial and
// matches pdf.js text-item transforms (which are in the same space). Rendering
// converts to CSS pixels via the pdf.js viewport.

export type Tool = "select" | "edit-text" | "sign" | "place-text" | "check";

export type FontKey = "helvetica" | "times" | "courier" | "verdana" | "comic";

export interface PageInfo {
  index: number;
  widthPts: number;
  heightPts: number;
  rotation: number;
}

/** An edit of existing document text: whiteout the original, redraw new text. */
export interface TextEdit {
  id: string;
  kind: "text-edit";
  srcKey: string; // stable key of the source text run (dedupe clicks)
  pageIndex: number;
  x: number; // left (PDF pts)
  baselineY: number; // text baseline (PDF pts)
  width: number; // original run width (PDF pts)
  fontSize: number; // PDF pts
  fontFamily: FontKey;
  bold: boolean;
  italic: boolean;
  color: string; // hex text color
  bgColor: string; // hex whiteout fill
  ascent: number; // pts above baseline
  descent: number; // pts below baseline
  originalText: string;
  text: string; // current edited text
}

/** Free text placed by the user (used for filling flat/printed forms). */
export interface PlacedText {
  id: string;
  kind: "placed-text";
  pageIndex: number;
  x: number; // left (PDF pts)
  baselineY: number; // baseline (PDF pts)
  fontSize: number;
  color: string;
  text: string;
}

/** A checkmark placed by the user (flat form checkboxes). */
export interface CheckMark {
  id: string;
  kind: "check";
  pageIndex: number;
  x: number; // left (PDF pts)
  y: number; // bottom (PDF pts)
  size: number; // box size (PDF pts)
  color: string;
}

/** A signature image placed on the page. */
export interface SignaturePlacement {
  id: string;
  kind: "signature";
  pageIndex: number;
  x: number; // left (PDF pts)
  y: number; // bottom (PDF pts)
  width: number; // PDF pts
  height: number; // PDF pts
  pngDataUrl: string;
}

export type Annotation =
  | TextEdit
  | PlacedText
  | CheckMark
  | SignaturePlacement;

export type PlaceableAnnotation = PlacedText | CheckMark | SignaturePlacement;

/** Interactive AcroForm field value the user has set. */
export interface FormFieldValue {
  name: string;
  kind: "text" | "checkbox" | "radio" | "dropdown" | "optionlist";
  value: string | boolean;
}

/** Geometry of a detected interactive form-field widget (for overlay inputs). */
export interface FormWidget {
  name: string;
  kind: FormFieldValue["kind"];
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number }; // PDF pts, bottom-left
  options?: string[]; // for dropdown / radio
  exportValue?: string; // for checkbox/radio "on" value
}
