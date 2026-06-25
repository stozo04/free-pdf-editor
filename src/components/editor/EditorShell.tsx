"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore, uid } from "@/store/editorStore";
import { Logo } from "@/components/Logo";
import { Toolbar } from "./Toolbar";
import { BottomBar } from "./BottomBar";
import { ThumbnailRail } from "./ThumbnailRail";
import { RightPanel } from "./RightPanel";
import { PageView } from "./PageView";
import { NonEditableBanner } from "./NonEditableBanner";
import { DownloadButton } from "./DownloadButton";
import { SignatureModal, type SignatureResult } from "./SignatureModal";
import type { SignaturePlacement } from "@/lib/types";
import { exportEditedPdf } from "@/lib/export/exportPdf";
import { loadPdf } from "@/lib/pdf/pdfjs";

export function EditorShell() {
  const router = useRouter();
  const pages = useEditorStore((s) => s.pages);
  const fileName = useEditorStore((s) => s.fileName);
  const reset = useEditorStore((s) => s.reset);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const removeAnnotation = useEditorStore((s) => s.removeAnnotation);
  const selectedId = useEditorStore((s) => s.selectedId);
  const currentPage = useEditorStore((s) => s.currentPage);

  const [showSig, setShowSig] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);

  // Dev-only test harness: lets the browser test pass export the edited PDF and
  // re-read its text to verify edits actually landed in the output bytes.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as any).__freepdf = {
      getState: () => useEditorStore.getState(),
      exportBytes: async () => {
        const s = useEditorStore.getState();
        if (!s.originalBytes) return null;
        return exportEditedPdf({
          originalBytes: s.originalBytes,
          annotations: s.annotations,
          formValues: s.formValues,
          formWidgets: s.formWidgets,
        });
      },
      readText: async (bytes: Uint8Array) => {
        const d = await loadPdf(bytes);
        let t = "";
        for (let i = 0; i < d.numPages; i++) {
          const p = await d.getPage(i + 1);
          const tc = await p.getTextContent();
          t += (tc.items as { str?: string }[]).map((it) => it.str ?? "").join(" ") + "\n";
        }
        return t;
      },
    };
  }, []);

  // Keyboard: undo / redo / delete selected.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const editing =
        document.activeElement &&
        (document.activeElement as HTMLElement).isContentEditable;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !editing
      ) {
        e.preventDefault();
        removeAnnotation(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedId, removeAnnotation]);

  const fitWidth = () => {
    const page = pages[currentPage] ?? pages[0];
    if (!page) return;
    const container = document.getElementById("page-scroll");
    if (!container) return;
    const avail = container.clientWidth - 48;
    useEditorStore.getState().setScale(avail / page.widthPts);
  };

  const onCreateSignature = (r: SignatureResult) => {
    const page = pages[currentPage] ?? pages[0];
    if (!page) return;
    const targetW = Math.min(200, page.widthPts * 0.4);
    const aspect = r.height / r.width;
    const w = targetW;
    const h = targetW * aspect;
    const sig: SignaturePlacement = {
      id: uid(),
      kind: "signature",
      pageIndex: currentPage,
      x: (page.widthPts - w) / 2,
      y: (page.heightPts - h) / 2,
      width: w,
      height: h,
      pngDataUrl: r.dataUrl,
    };
    addAnnotation(sig);
    setShowSig(false);
  };

  const startOver = () => {
    reset();
    router.replace("/");
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Logo compact />
          <span className="hidden truncate text-sm text-ink-muted sm:block" data-testid="file-name">
            {fileName}
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={startOver}
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-slate-100 sm:inline-block"
          data-testid="open-another"
        >
          Open another
        </button>
        <DownloadButton />
      </header>

      {/* Toolbar row */}
      <div className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-2 py-1.5 sm:px-4">
        <button
          onClick={() => setShowThumbs((v) => !v)}
          aria-label="Toggle pages"
          className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-slate-100 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          </svg>
        </button>
        <div className="mx-auto">
          <Toolbar onOpenSignature={() => setShowSig(true)} />
        </div>
      </div>

      <NonEditableBanner />

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        {/* Thumbnail rail (desktop) */}
        <aside className="hidden w-44 shrink-0 border-r border-slate-200 bg-white lg:block">
          <ThumbnailRail />
        </aside>

        {/* Thumbnail drawer (mobile) */}
        {showThumbs && (
          <div className="absolute inset-0 z-30 flex lg:hidden">
            <aside className="w-44 border-r border-slate-200 bg-white shadow-float">
              <ThumbnailRail />
            </aside>
            <div className="flex-1 bg-ink/30" onClick={() => setShowThumbs(false)} />
          </div>
        )}

        {/* Page canvas scroll area */}
        <main id="page-scroll" className="canvas-backdrop min-h-0 flex-1 overflow-auto px-2 py-2 sm:px-6">
          {pages.map((p) => (
            <PageView key={p.index} index={p.index} />
          ))}
          <div className="h-24" />
        </main>

        {/* Right contextual panel (desktop) */}
        <RightPanel />

        {/* Floating bottom bar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <BottomBar onFitWidth={fitWidth} />
        </div>
      </div>

      {showSig && (
        <SignatureModal onClose={() => setShowSig(false)} onCreate={onCreateSignature} />
      )}
    </div>
  );
}
