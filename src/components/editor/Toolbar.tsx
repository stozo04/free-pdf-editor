"use client";

import { useEditorStore } from "@/store/editorStore";
import type { Tool } from "@/lib/types";

interface ToolDef {
  id: Tool;
  label: string;
  icon: React.ReactNode;
  disabledWhenScanned?: boolean;
}

export function Toolbar({ onOpenSignature }: { onOpenSignature: () => void }) {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const isScanned = useEditorStore((s) => s.isScanned);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);

  const tools: ToolDef[] = [
    { id: "edit-text", label: "Edit text", disabledWhenScanned: true, icon: <EditIcon /> },
    { id: "place-text", label: "Add text", icon: <TextIcon /> },
    { id: "check", label: "Checkmark", icon: <CheckSquareIcon /> },
    { id: "sign", label: "Sign", icon: <SignIcon /> },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {tools.map((t) => {
        const disabled = t.disabledWhenScanned && isScanned;
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            title={disabled ? "Not available on scanned PDFs" : t.label}
            data-testid={`tool-${t.id}`}
            data-active={active}
            onClick={() => {
              if (t.id === "sign") {
                setTool("sign");
                onOpenSignature();
              } else {
                setTool(t.id);
              }
            }}
            className={`group inline-flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition
              ${active ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "text-ink-soft hover:bg-slate-100"}
              ${disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
          >
            <span className="h-5 w-5">{t.icon}</span>
            <span className="hidden sm:block">{t.label}</span>
          </button>
        );
      })}

      <div className="mx-1 h-8 w-px bg-slate-200" />

      <IconBtn label="Undo" disabled={!canUndo} onClick={undo} testid="undo">
        <UndoIcon />
      </IconBtn>
      <IconBtn label="Redo" disabled={!canRedo} onClick={redo} testid="redo">
        <RedoIcon />
      </IconBtn>
    </div>
  );
}

function IconBtn({
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
      title={label}
      aria-label={label}
      disabled={disabled}
      data-testid={testid}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <span className="h-5 w-5">{children}</span>
    </button>
  );
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function EditIcon() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
}
function TextIcon() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M4 7V5h16v2" /><path d="M9 19h6" /><path d="M12 5v14" /></svg>;
}
function CheckSquareIcon() {
  return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m8 12 3 3 5-6" /></svg>;
}
function SignIcon() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M3 17c3 0 4-8 6-8s2 5 4 5 2-3 4-3" /><path d="M3 21h18" /></svg>;
}
function UndoIcon() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M3 7v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></svg>;
}
function RedoIcon() {
  return <svg viewBox="0 0 24 24" {...s}><path d="M21 7v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 8" /></svg>;
}
