"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { usePdfDoc } from "./PdfDocContext";
import { renderPageToCanvas } from "@/lib/pdf/pdfjs";

export function ThumbnailRail() {
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);

  const goto = (i: number) => {
    setCurrentPage(i);
    document.getElementById(`page-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-3">
          {pages.map((p) => (
            <li key={p.index}>
              <button
                type="button"
                onClick={() => goto(p.index)}
                data-testid={`thumb-${p.index}`}
                className={`block w-full overflow-hidden rounded-lg border bg-white transition
                  ${currentPage === p.index ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200 hover:border-slate-300"}`}
              >
                <Thumbnail index={p.index} />
              </button>
              <p className="mt-1 text-center text-[11px] text-ink-muted">{p.index + 1}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <label className="mb-1 block text-[11px] font-medium text-ink-muted">Zoom</label>
        <input
          type="range"
          min={25}
          max={300}
          step={5}
          value={Math.round(scale * 100)}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          className="w-full accent-brand-600"
          aria-label="Zoom"
          data-testid="zoom-slider"
        />
      </div>
    </div>
  );
}

function Thumbnail({ index }: { index: number }) {
  const { getPage } = usePdfDoc();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await getPage(index);
      if (cancelled || !canvasRef.current) return;
      const vp = page.getViewport({ scale: 1 });
      const targetW = 150;
      await renderPageToCanvas(page, canvasRef.current, targetW / vp.width);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [getPage, index]);

  return (
    <div className="relative">
      {!ready && <div className="aspect-[1/1.3] w-full animate-pulse bg-slate-100" />}
      <canvas ref={canvasRef} className={`w-full ${ready ? "block" : "hidden"}`} />
    </div>
  );
}
