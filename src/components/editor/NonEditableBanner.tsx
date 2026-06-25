"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";

export function NonEditableBanner() {
  const isScanned = useEditorStore((s) => s.isScanned);
  const [dismissed, setDismissed] = useState(false);
  if (!isScanned || dismissed) return null;

  return (
    <div
      className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
      data-testid="scanned-banner"
      role="status"
    >
      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <p className="flex-1">
        <span className="font-semibold">This PDF looks scanned.</span> Its text
        can&apos;t be edited, but you can still{" "}
        <span className="font-medium">sign</span> it, add text, and place
        checkmarks.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="rounded p-1 text-amber-700 hover:bg-amber-100"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
