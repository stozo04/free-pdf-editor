"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEditorStore } from "@/store/editorStore";
import { loadPdf, extractFormWidgets } from "@/lib/pdf/pdfjs";
import type { FormWidget, PageInfo } from "@/lib/types";
import { PdfDocProvider } from "@/components/editor/PdfDocContext";
import { EditorShell } from "@/components/editor/EditorShell";

export default function EditorPage() {
  const router = useRouter();
  const originalBytes = useEditorStore((s) => s.originalBytes);
  const setParsed = useEditorStore((s) => s.setParsed);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!originalBytes) {
      router.replace("/");
      return;
    }
    // Guard against React StrictMode's double-invoked effect: run the parse
    // exactly once. We intentionally do NOT cancel on cleanup, otherwise the
    // dev-only unmount/remount would discard the in-flight parse and the
    // spinner would hang forever.
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const d = await loadPdf(originalBytes);
        const pages: PageInfo[] = [];
        const widgets: FormWidget[] = [];
        let totalTextLen = 0;
        for (let i = 0; i < d.numPages; i++) {
          const page = await d.getPage(i + 1);
          const vp = page.getViewport({ scale: 1 });
          pages.push({
            index: i,
            widthPts: vp.width,
            heightPts: vp.height,
            rotation: (page.rotate ?? 0) % 360,
          });
          const tc = await page.getTextContent();
          for (const it of tc.items as { str?: string }[]) {
            if (it.str) totalTextLen += it.str.trim().length;
          }
          widgets.push(...(await extractFormWidgets(page, i)));
        }
        setParsed({
          pages,
          isScanned: totalTextLen < 3,
          formWidgets: widgets,
        });
        setDoc(d);
      } catch (e) {
        console.error(e);
        setError("Sorry, this PDF could not be opened.");
      }
    })();
  }, [originalBytes, router, setParsed]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-ink">{error}</p>
        <button
          onClick={() => router.replace("/")}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-white font-medium hover:bg-brand-700"
        >
          Choose another file
        </button>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>
        <p className="text-sm text-ink-muted">Opening your PDF…</p>
      </div>
    );
  }

  return (
    <PdfDocProvider doc={doc}>
      <EditorShell />
    </PdfDocProvider>
  );
}
