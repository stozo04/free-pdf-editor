"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFPageProxy, PageViewport } from "pdfjs-dist";
import { usePdfDoc } from "./PdfDocContext";
import { renderPageToCanvas, type RawTextBlock } from "@/lib/pdf/pdfjs";
import { sampleColors } from "@/lib/pdf/colors";
import { detectFont, cssForFont } from "@/lib/fonts";
import { useEditorStore, uid } from "@/store/editorStore";
import type {
  CheckMark,
  PlacedText,
  SignaturePlacement,
  TextEdit,
} from "@/lib/types";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function PageView({ index }: { index: number }) {
  const { getPage, getTextBlocks } = usePdfDoc();
  const scale = useEditorStore((s) => s.scale);
  const tool = useEditorStore((s) => s.tool);
  const isScanned = useEditorStore((s) => s.isScanned);
  const annotations = useEditorStore((s) => s.annotations);
  const formWidgets = useEditorStore((s) => s.formWidgets);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const select = useEditorStore((s) => s.select);
  const selectedId = useEditorStore((s) => s.selectedId);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [viewport, setViewport] = useState<PageViewport | null>(null);
  const [blocks, setBlocks] = useState<RawTextBlock[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPage(index).then((p) => !cancelled && setPage(p));
    getTextBlocks(index).then((b) => !cancelled && setBlocks(b));
    return () => {
      cancelled = true;
    };
  }, [getPage, getTextBlocks, index]);

  useEffect(() => {
    if (!page || !canvasRef.current) return;
    let cancelled = false;
    renderPageToCanvas(page, canvasRef.current, scale).then((vp) => {
      if (!cancelled) setViewport(vp);
    });
    return () => {
      cancelled = true;
    };
  }, [page, scale]);

  // Track which page is in view for the page indicator.
  useEffect(() => {
    const el = overlayRef.current?.parentElement;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.5) setCurrentPage(index);
        }
      },
      { threshold: [0.5] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index, setCurrentPage]);

  const toCss = useCallback(
    (xPts: number, yPts: number) => {
      const [x, y] = viewport!.convertToViewportPoint(xPts, yPts);
      return { x, y };
    },
    [viewport],
  );
  const toPdf = useCallback(
    (vx: number, vy: number) => {
      const [x, y] = viewport!.convertToPdfPoint(vx, vy);
      return { x, y };
    },
    [viewport],
  );

  const blockBox = useCallback(
    (b: { x: number; baselineY: number; width: number; ascent: number; descent: number }): Box => {
      const tl = toCss(b.x, b.baselineY + b.ascent);
      const br = toCss(b.x + b.width, b.baselineY - b.descent);
      return {
        left: Math.min(tl.x, br.x),
        top: Math.min(tl.y, br.y),
        width: Math.abs(br.x - tl.x),
        height: Math.abs(br.y - tl.y),
      };
    },
    [toCss],
  );

  const keyFor = (b: RawTextBlock) => `${index}:${Math.round(b.x)}:${Math.round(b.baselineY)}`;

  const claimedKeys = new Set(
    annotations
      .filter((a): a is TextEdit => a.kind === "text-edit" && a.pageIndex === index)
      .map((a) => a.srcKey),
  );

  const startEditBlock = (b: RawTextBlock) => {
    const key = keyFor(b);
    const existing = annotations.find(
      (a) => a.kind === "text-edit" && a.srcKey === key,
    );
    if (existing) {
      select(existing.id);
      return;
    }
    // Sample colours from the rendered canvas for a natural blend.
    let color = "#000000";
    let bg = "#ffffff";
    const canvas = canvasRef.current;
    if (canvas && viewport) {
      const dpr = canvas.width / viewport.width;
      const box = blockBox(b);
      const c = sampleColors(
        canvas.getContext("2d")!,
        box.left * dpr,
        box.top * dpr,
        box.width * dpr,
        box.height * dpr,
      );
      color = c.text;
      bg = c.bg;
    }
    const f = detectFont(b.family, b.fontName);
    const te: TextEdit = {
      id: uid(),
      kind: "text-edit",
      srcKey: key,
      pageIndex: index,
      x: b.x,
      baselineY: b.baselineY,
      width: b.width,
      fontSize: b.fontSize,
      fontFamily: f.key,
      bold: f.bold,
      italic: f.italic,
      color,
      bgColor: bg,
      ascent: b.ascent,
      descent: b.descent,
      originalText: b.str,
      text: b.str,
    };
    addAnnotation(te);
  };

  const onSurfacePointerDown = (e: React.PointerEvent) => {
    if (e.target !== overlayRef.current) return; // only clicks on empty page
    if (!viewport) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    const p = toPdf(vx, vy);
    if (tool === "place-text") {
      const fontSize = 16;
      const pt: PlacedText = {
        id: uid(),
        kind: "placed-text",
        pageIndex: index,
        x: p.x,
        baselineY: p.y - fontSize * 0.8,
        fontSize,
        color: "#000000",
        text: "",
      };
      addAnnotation(pt);
    } else if (tool === "check") {
      const size = 18;
      const ck: CheckMark = {
        id: uid(),
        kind: "check",
        pageIndex: index,
        x: p.x - size / 2,
        y: p.y - size / 2,
        size,
        color: "#0a7d2c",
      };
      addAnnotation(ck);
    } else {
      select(null);
    }
  };

  const pageAnnots = annotations.filter((a) => a.pageIndex === index);
  const pageForms = formWidgets.filter((w) => w.pageIndex === index);

  return (
    <div
      id={`page-${index}`}
      className="relative mx-auto my-4 w-fit shadow-card"
      data-testid={`page-${index}`}
    >
      <canvas ref={canvasRef} className="block select-none" />
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{
          cursor:
            tool === "place-text" || tool === "check" ? "crosshair" : "default",
        }}
        onPointerDown={onSurfacePointerDown}
      >
        {viewport && (
          <>
            {/* Editable-text hotspots */}
            {tool === "edit-text" &&
              !isScanned &&
              blocks
                .filter((b) => !claimedKeys.has(keyFor(b)))
                .map((b, i) => {
                  const box = blockBox(b);
                  if (box.width < 2 || box.height < 2) return null;
                  return (
                    <button
                      key={`hot-${i}`}
                      data-testid={`text-hotspot-${index}`}
                      title="Click to edit"
                      onClick={() => startEditBlock(b)}
                      className="absolute rounded-[2px] border border-transparent hover:border-brand-400 hover:bg-brand-500/10"
                      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                    />
                  );
                })}

            {/* Active annotations */}
            {pageAnnots.map((a) => {
              if (a.kind === "text-edit") {
                const box = blockBox({
                  x: a.x,
                  baselineY: a.baselineY,
                  width: a.width,
                  ascent: a.ascent,
                  descent: a.descent,
                });
                return (
                  <EditableBox
                    key={a.id}
                    box={box}
                    scale={scale}
                    fontFamily={cssForFont(a.fontFamily)}
                    fontSize={a.fontSize}
                    color={a.color}
                    bg={a.bgColor}
                    bold={a.bold}
                    italic={a.italic}
                    value={a.text}
                    selected={selectedId === a.id}
                    coverOriginal
                    onSelect={() => select(a.id)}
                    onChange={(text) => updateAnnotation(a.id, { text })}
                    testid={`edit-${index}`}
                  />
                );
              }
              if (a.kind === "placed-text") {
                const tl = toCss(a.x, a.baselineY + a.fontSize * 0.8);
                const box: Box = {
                  left: tl.x,
                  top: tl.y,
                  width: Math.max(40, a.text.length * a.fontSize * 0.5 * scale),
                  height: a.fontSize * 1.25 * scale,
                };
                return (
                  <Movable
                    key={a.id}
                    box={box}
                    selected={selectedId === a.id}
                    onSelect={() => select(a.id)}
                    onMove={(dx, dy) =>
                      updateAnnotation(a.id, {
                        x: a.x + dx / scale,
                        baselineY: a.baselineY - dy / scale,
                      })
                    }
                    dragHandleOnly
                  >
                    <EditableBox
                      box={{ ...box, left: 0, top: 0 }}
                      scale={scale}
                      fontFamily="Helvetica, Arial, sans-serif"
                      fontSize={a.fontSize}
                      color={a.color}
                      bg="transparent"
                      bold={false}
                      italic={false}
                      value={a.text}
                      selected={selectedId === a.id}
                      onSelect={() => select(a.id)}
                      onChange={(text) => updateAnnotation(a.id, { text })}
                      placeholder="Type…"
                      testid={`placed-${index}`}
                    />
                  </Movable>
                );
              }
              if (a.kind === "check") {
                const tl = toCss(a.x, a.y + a.size);
                const box: Box = { left: tl.x, top: tl.y, width: a.size * scale, height: a.size * scale };
                return (
                  <Movable
                    key={a.id}
                    box={box}
                    selected={selectedId === a.id}
                    onSelect={() => select(a.id)}
                    onMove={(dx, dy) =>
                      updateAnnotation(a.id, { x: a.x + dx / scale, y: a.y - dy / scale })
                    }
                  >
                    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={a.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" data-testid={`check-${index}`}>
                      <path d="m4 12 5 5 11-12" />
                    </svg>
                  </Movable>
                );
              }
              // signature
              const sa = a as SignaturePlacement;
              const tl = toCss(sa.x, sa.y + sa.height);
              const box: Box = { left: tl.x, top: tl.y, width: sa.width * scale, height: sa.height * scale };
              return (
                <Movable
                  key={sa.id}
                  box={box}
                  selected={selectedId === sa.id}
                  onSelect={() => select(sa.id)}
                  onMove={(dx, dy) =>
                    updateAnnotation(sa.id, { x: sa.x + dx / scale, y: sa.y - dy / scale })
                  }
                  onResize={(factor) =>
                    updateAnnotation(sa.id, {
                      width: Math.max(20, sa.width * factor),
                      height: Math.max(10, sa.height * factor),
                    })
                  }
                  resizable
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sa.pngDataUrl} alt="signature" className="pointer-events-none h-full w-full object-contain" data-testid={`signature-${index}`} />
                </Movable>
              );
            })}

            {/* Interactive form fields */}
            {pageForms.map((w) => {
              const tl = toCss(w.rect.x, w.rect.y + w.rect.height);
              const style = {
                left: tl.x,
                top: tl.y,
                width: w.rect.width * scale,
                height: w.rect.height * scale,
              } as const;
              return <FormField key={w.name + w.rect.x} widget={w} style={style} />;
            })}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- helper components ---------- */

function EditableBox({
  box,
  scale,
  fontFamily,
  fontSize,
  color,
  bg,
  bold,
  italic,
  value,
  selected,
  coverOriginal,
  onChange,
  onSelect,
  placeholder,
  testid,
}: {
  box: Box;
  scale: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  bg: string;
  bold: boolean;
  italic: boolean;
  value: string;
  selected: boolean;
  coverOriginal?: boolean;
  onChange: (text: string) => void;
  onSelect: () => void;
  placeholder?: string;
  testid?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed content once; thereafter let the DOM own it to avoid caret jumps.
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-testid={testid}
      onInput={(e) => onChange((e.currentTarget.textContent ?? "").replace(/\n/g, ""))}
      onFocus={onSelect}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute whitespace-pre rounded-[2px] outline-none"
      data-placeholder={placeholder}
      style={{
        left: box.left,
        top: box.top,
        minWidth: Math.max(box.width, 8),
        height: box.height,
        lineHeight: `${box.height}px`,
        fontFamily,
        fontSize: fontSize * scale,
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? "italic" : "normal",
        color,
        background: coverOriginal ? bg : "transparent",
        boxShadow: selected ? "0 0 0 2px #3563ff" : "0 0 0 1px rgba(53,99,255,.35)",
      }}
    />
  );
}

function Movable({
  box,
  selected,
  onSelect,
  onMove,
  onResize,
  resizable,
  dragHandleOnly,
  children,
}: {
  box: Box;
  selected: boolean;
  onSelect: () => void;
  onMove: (dxCss: number, dyCss: number) => void;
  onResize?: (factor: number) => void;
  resizable?: boolean;
  dragHandleOnly?: boolean;
  children: React.ReactNode;
}) {
  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    const startX = e.clientX;
    const startY = e.clientY;
    let lastX = startX;
    let lastY = startY;
    const move = (ev: PointerEvent) => {
      onMove(ev.clientX - lastX, ev.clientY - lastY);
      lastX = ev.clientX;
      lastY = ev.clientY;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onResize) return;
    const startX = e.clientX;
    const baseW = box.width;
    const move = (ev: PointerEvent) => {
      const factor = Math.max(0.2, (baseW + (ev.clientX - startX)) / baseW);
      onResize(factor / (lastFactor || 1));
      lastFactor = factor;
    };
    let lastFactor = 1;
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      className="absolute"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      onPointerDown={dragHandleOnly ? undefined : startDrag}
    >
      <div
        className="h-full w-full"
        style={{
          boxShadow: selected ? "0 0 0 2px #3563ff" : "0 0 0 1px rgba(53,99,255,.25)",
          cursor: dragHandleOnly ? "default" : "move",
        }}
        onClick={onSelect}
      >
        {children}
      </div>

      {dragHandleOnly && (
        <button
          aria-label="Move"
          onPointerDown={startDrag}
          className="absolute -left-2.5 -top-2.5 flex h-5 w-5 cursor-move items-center justify-center rounded-full bg-brand-600 text-white shadow"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" /></svg>
        </button>
      )}

      {resizable && selected && (
        <button
          aria-label="Resize"
          onPointerDown={startResize}
          className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-brand-600 shadow"
        />
      )}
    </div>
  );
}

function FormField({
  widget,
  style,
}: {
  widget: import("@/lib/types").FormWidget;
  style: { left: number; top: number; width: number; height: number };
}) {
  const value = useEditorStore((s) => s.formValues[widget.name]);
  const setFormValue = useEditorStore((s) => s.setFormValue);
  const common = "absolute box-border border border-brand-300/70 bg-brand-50/40 focus:bg-white focus:border-brand-500 outline-none text-ink";

  if (widget.kind === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => setFormValue(widget.name, e.target.checked)}
        data-testid={`form-${widget.name}`}
        className="absolute accent-brand-600"
        style={{ ...style, width: Math.min(style.width, style.height), height: Math.min(style.width, style.height) }}
      />
    );
  }
  if (widget.kind === "dropdown" || widget.kind === "optionlist") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => setFormValue(widget.name, e.target.value)}
        data-testid={`form-${widget.name}`}
        className={common + " px-1 text-sm"}
        style={style}
      >
        <option value="" />
        {(widget.options ?? []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  // text (and radio fallback as text)
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => setFormValue(widget.name, e.target.value)}
      data-testid={`form-${widget.name}`}
      className={common + " px-1"}
      style={{ ...style, fontSize: Math.min(16, style.height * 0.7) }}
    />
  );
}
