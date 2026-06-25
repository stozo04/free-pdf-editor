"use client";

import { useEditorStore } from "@/store/editorStore";
import { FONT_OPTIONS } from "@/lib/fonts";
import type { Annotation } from "@/lib/types";

const SWATCHES = ["#000000", "#1d44f5", "#d11507", "#0a7d2c", "#6b21a8", "#b45309"];

export function RightPanel() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const annotations = useEditorStore((s) => s.annotations);
  const update = useEditorStore((s) => s.updateAnnotation);
  const remove = useEditorStore((s) => s.removeAnnotation);
  const tool = useEditorStore((s) => s.tool);

  const selected = annotations.find((a) => a.id === selectedId) ?? null;

  return (
    <aside className="hidden w-64 shrink-0 border-l border-slate-200 bg-white lg:block">
      <div className="p-4">
        {!selected ? (
          <EmptyHint tool={tool} />
        ) : (
          <Controls
            key={selected.id}
            annotation={selected}
            onPatch={(patch) => update(selected.id, patch)}
            onDelete={() => remove(selected.id)}
          />
        )}
      </div>
    </aside>
  );
}

function EmptyHint({ tool }: { tool: string }) {
  const hint =
    tool === "edit-text"
      ? "Click any text in the document to edit it."
      : tool === "place-text"
        ? "Click on the page to add text."
        : tool === "check"
          ? "Click on the page to drop a checkmark."
          : "Add a signature, then place it on the page.";
  return (
    <div className="rounded-lg bg-slate-50 p-4 text-sm text-ink-muted">
      <p className="font-medium text-ink-soft">Nothing selected</p>
      <p className="mt-1">{hint}</p>
    </div>
  );
}

function Controls({
  annotation,
  onPatch,
  onDelete,
}: {
  annotation: Annotation;
  onPatch: (patch: Partial<Annotation>) => void;
  onDelete: () => void;
}) {
  const hasText = annotation.kind === "text-edit" || annotation.kind === "placed-text";
  const hasColor = annotation.kind !== "signature";
  const hasFontFamily = annotation.kind === "text-edit";
  const sizeField =
    annotation.kind === "text-edit" || annotation.kind === "placed-text"
      ? "fontSize"
      : annotation.kind === "check"
        ? "size"
        : null;

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold text-ink">
        {labelFor(annotation)}
      </h2>

      {hasFontFamily && annotation.kind === "text-edit" && (
        <Field label="Font">
          <select
            value={annotation.fontFamily}
            onChange={(e) => onPatch({ fontFamily: e.target.value as never })}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            data-testid="ctrl-font"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </Field>
      )}

      {sizeField && (
        <Field label="Size">
          <input
            type="number"
            min={6}
            max={96}
            value={(annotation as any)[sizeField]}
            onChange={(e) => onPatch({ [sizeField]: Number(e.target.value) } as never)}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            data-testid="ctrl-size"
          />
        </Field>
      )}

      {annotation.kind === "text-edit" && (
        <Field label="Style">
          <div className="flex gap-2">
            <Toggle active={annotation.bold} onClick={() => onPatch({ bold: !annotation.bold })} label="Bold">
              <span className="font-bold">B</span>
            </Toggle>
            <Toggle active={annotation.italic} onClick={() => onPatch({ italic: !annotation.italic })} label="Italic">
              <span className="italic">I</span>
            </Toggle>
          </div>
        </Field>
      )}

      {hasColor && (
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => onPatch({ color: c } as never)}
                style={{ backgroundColor: c }}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-1 transition ${
                  (annotation as any).color === c ? "ring-brand-500" : "ring-transparent hover:ring-slate-200"
                }`}
              />
            ))}
            <input
              type="color"
              value={(annotation as any).color ?? "#000000"}
              onChange={(e) => onPatch({ color: e.target.value } as never)}
              className="h-7 w-7 cursor-pointer rounded-full border border-slate-200 bg-transparent p-0"
              aria-label="Custom color"
              data-testid="ctrl-color"
            />
          </div>
        </Field>
      )}

      {hasText && (
        <p className="text-xs text-ink-muted">
          Tip: click the text on the page to type directly.
        </p>
      )}

      <button
        type="button"
        onClick={onDelete}
        data-testid="ctrl-delete"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
        Remove
      </button>
    </div>
  );
}

function labelFor(a: Annotation): string {
  switch (a.kind) {
    case "text-edit": return "Edit text";
    case "placed-text": return "Text box";
    case "check": return "Checkmark";
    case "signature": return "Signature";
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 w-9 rounded-md border text-sm transition ${
        active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-ink-soft hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
