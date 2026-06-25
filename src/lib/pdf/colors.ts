// Best-effort colour sampling from a rendered page canvas. Used to pick a
// whiteout fill (the page background behind a text run) and the text colour so
// edited text blends in. Falls back to white bg / black text on low contrast.

export interface SampledColors {
  text: string; // hex
  bg: string; // hex
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Sample a device-pixel rectangle of a rendered page canvas.
 * @param ctx        2D context of the rendered page canvas
 * @param dx,dy,dw,dh device-pixel rect to sample
 */
export function sampleColors(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): SampledColors {
  const fallback: SampledColors = { text: "#000000", bg: "#ffffff" };
  const x = Math.max(0, Math.floor(dx));
  const y = Math.max(0, Math.floor(dy));
  const w = Math.floor(dw);
  const h = Math.floor(dh);
  if (w <= 0 || h <= 0) return fallback;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x, y, w, h).data;
  } catch {
    return fallback;
  }

  const pixels: { r: number; g: number; b: number; lum: number }[] = [];
  // Stride to keep large regions cheap.
  const step = Math.max(1, Math.floor((w * h) / 4000));
  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a < 8) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    pixels.push({ r, g, b, lum: luminance(r, g, b) });
  }
  if (pixels.length < 4) return fallback;

  pixels.sort((p, q) => p.lum - q.lum);
  const avg = (arr: typeof pixels) => {
    const s = arr.reduce(
      (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
      { r: 0, g: 0, b: 0 },
    );
    return { r: s.r / arr.length, g: s.g / arr.length, b: s.b / arr.length };
  };

  const darkCount = Math.max(1, Math.floor(pixels.length * 0.1));
  const brightCount = Math.max(1, Math.floor(pixels.length * 0.25));
  const dark = avg(pixels.slice(0, darkCount));
  const bright = avg(pixels.slice(pixels.length - brightCount));

  const contrast = luminance(bright.r, bright.g, bright.b) - luminance(dark.r, dark.g, dark.b);
  // If there's no real dark cluster (blank-ish area), keep text black.
  const text = contrast > 40 ? toHex(dark.r, dark.g, dark.b) : "#000000";
  const bg = toHex(bright.r, bright.g, bright.b);
  return { text, bg };
}

export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
