"use client";

import { useEditorStore } from "@/store/editorStore";

export function BottomBar({ onFitWidth }: { onFitWidth: () => void }) {
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);

  const total = pages.length;
  const goto = (i: number) => {
    const clamped = Math.max(0, Math.min(total - 1, i));
    setCurrentPage(clamped);
    document
      .getElementById(`page-${clamped}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1.5 shadow-float ring-1 ring-slate-200 backdrop-blur">
      <RoundBtn label="Previous page" testid="page-prev" onClick={() => goto(currentPage - 1)} disabled={currentPage <= 0}>
        <ChevronUp />
      </RoundBtn>
      <span className="px-1 text-xs font-medium text-ink-soft tabular-nums" data-testid="page-indicator">
        {total ? currentPage + 1 : 0} / {total}
      </span>
      <RoundBtn label="Next page" testid="page-next" onClick={() => goto(currentPage + 1)} disabled={currentPage >= total - 1}>
        <ChevronDown />
      </RoundBtn>

      <span className="mx-1 h-5 w-px bg-slate-200" />

      <RoundBtn label="Zoom out" testid="zoom-out" onClick={() => setScale(scale - 0.2)}>
        <Minus />
      </RoundBtn>
      <span className="w-12 text-center text-xs font-medium text-ink-soft tabular-nums" data-testid="zoom-level">
        {Math.round(scale * 100)}%
      </span>
      <RoundBtn label="Zoom in" testid="zoom-in" onClick={() => setScale(scale + 0.2)}>
        <Plus />
      </RoundBtn>
      <RoundBtn label="Fit width" testid="fit-width" onClick={onFitWidth}>
        <FitIcon />
      </RoundBtn>
    </div>
  );
}

function RoundBtn({
  children,
  label,
  onClick,
  disabled,
  testid,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testid?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <span className="h-4 w-4">{children}</span>
    </button>
  );
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function ChevronUp() { return <svg viewBox="0 0 24 24" {...s}><path d="m6 15 6-6 6 6" /></svg>; }
function ChevronDown() { return <svg viewBox="0 0 24 24" {...s}><path d="m6 9 6 6 6-6" /></svg>; }
function Plus() { return <svg viewBox="0 0 24 24" {...s}><path d="M12 5v14M5 12h14" /></svg>; }
function Minus() { return <svg viewBox="0 0 24 24" {...s}><path d="M5 12h14" /></svg>; }
function FitIcon() { return <svg viewBox="0 0 24 24" {...s}><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" /></svg>; }
