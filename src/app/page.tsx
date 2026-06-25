"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  const router = useRouter();
  const setInput = useEditorStore((s) => s.setInput);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      setError(null);
      if (!file) return;
      const isPdf =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        setError("That doesn't look like a PDF. Please choose a .pdf file.");
        return;
      }
      try {
        setBusy(true);
        const buf = new Uint8Array(await file.arrayBuffer());
        // Cheap sanity check for the PDF signature.
        const header = new TextDecoder().decode(buf.slice(0, 5));
        if (!header.startsWith("%PDF-")) {
          setError("This file isn't a valid PDF.");
          setBusy(false);
          return;
        }
        setInput(file.name, buf);
        router.push("/editor");
      } catch {
        setError("Could not read that file. Please try again.");
        setBusy(false);
      }
    },
    [router, setInput],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-8 py-4">
        <Logo />
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink-soft shadow-card">
          <LockIcon className="h-3.5 w-3.5 text-brand-600" />
          Files never leave your device
        </span>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Edit your PDF, <span className="text-brand-600">free.</span>
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Fix text, sign, and fill forms right in your browser. No sign-up,
            no edit limits, no ads — and your file is never uploaded.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-8 rounded-xl2 border-2 border-dashed bg-white p-8 sm:p-12 shadow-card transition-colors ${
              dragging ? "border-brand-500 bg-brand-50" : "border-slate-200"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              data-testid="file-input"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-4 text-base font-semibold text-white shadow-float transition hover:bg-brand-700 active:scale-[.99] disabled:opacity-60"
              data-testid="select-pdf"
            >
              {busy ? (
                <>
                  <Spinner /> Opening…
                </>
              ) : (
                <>
                  <UploadIcon className="h-5 w-5" /> Select PDF file
                </>
              )}
            </button>
            <p className="mt-3 text-sm text-ink-muted">or drop a PDF here</p>
          </div>

          {error && (
            <p
              className="mt-4 text-sm font-medium text-red-600"
              role="alert"
              data-testid="upload-error"
            >
              {error}
            </p>
          )}

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-ink-soft">
            {["Fix existing text", "Sign documents", "Fill in forms"].map(
              (f) => (
                <li
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-card"
                >
                  <CheckIcon className="h-4 w-4 text-brand-600" />
                  {f}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <footer className="px-5 py-6 text-center text-xs text-ink-muted">
        100% in your browser · Open-source friendly · No tracking
      </footer>
    </main>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M5 11l7-7 7 7" />
      <path d="M4 20h16" />
    </svg>
  );
}
function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}
