"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { exportEditedPdf, downloadBytes, editedFileName } from "@/lib/export/exportPdf";

export function DownloadButton() {
  const originalBytes = useEditorStore((s) => s.originalBytes);
  const fileName = useEditorStore((s) => s.fileName);
  const annotations = useEditorStore((s) => s.annotations);
  const formValues = useEditorStore((s) => s.formValues);
  const formWidgets = useEditorStore((s) => s.formWidgets);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onClick = async () => {
    if (!originalBytes || busy) return;
    setBusy(true);
    setDone(false);
    try {
      const bytes = await exportEditedPdf({ originalBytes, annotations, formValues, formWidgets });
      downloadBytes(bytes, editedFileName(fileName));
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      console.error("Export failed", e);
      alert("Sorry, something went wrong while creating your PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-testid="download"
      className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-float transition hover:bg-brand-700 active:scale-[.99] disabled:opacity-70 sm:text-base"
    >
      {busy ? (
        <>
          <Spinner /> Preparing…
        </>
      ) : done ? (
        <>
          <Check /> Downloaded
        </>
      ) : (
        <>
          Download
          <Arrow />
        </>
      )}
    </button>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function Check() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}
