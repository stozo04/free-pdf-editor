"use client";

import { createContext, useContext, useMemo, useRef } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { extractTextBlocks, type RawTextBlock } from "@/lib/pdf/pdfjs";

interface PdfDocApi {
  doc: PDFDocumentProxy;
  getPage: (index: number) => Promise<PDFPageProxy>;
  getTextBlocks: (index: number) => Promise<RawTextBlock[]>;
}

const Ctx = createContext<PdfDocApi | null>(null);

export function PdfDocProvider({
  doc,
  children,
}: {
  doc: PDFDocumentProxy;
  children: React.ReactNode;
}) {
  const pageCache = useRef(new Map<number, Promise<PDFPageProxy>>());
  const blockCache = useRef(new Map<number, Promise<RawTextBlock[]>>());

  const api = useMemo<PdfDocApi>(() => {
    const getPage = (index: number) => {
      let p = pageCache.current.get(index);
      if (!p) {
        p = doc.getPage(index + 1);
        pageCache.current.set(index, p);
      }
      return p;
    };
    const getTextBlocks = (index: number) => {
      let b = blockCache.current.get(index);
      if (!b) {
        b = getPage(index).then((page) => extractTextBlocks(page));
        blockCache.current.set(index, b);
      }
      return b;
    };
    return { doc, getPage, getTextBlocks };
  }, [doc]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePdfDoc(): PdfDocApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePdfDoc must be used within PdfDocProvider");
  return ctx;
}
