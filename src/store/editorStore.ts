"use client";

import { create } from "zustand";
import type {
  Annotation,
  FormWidget,
  PageInfo,
  Tool,
} from "@/lib/types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.floor(performance.now() * 1000)}-${idCounter++}`;
}
let idCounter = 0;

interface Snapshot {
  annotations: Annotation[];
  formValues: Record<string, string | boolean>;
}

interface EditorState {
  // document
  fileName: string | null;
  originalBytes: Uint8Array | null;
  pages: PageInfo[];
  isScanned: boolean;
  formWidgets: FormWidget[];

  // editable content
  annotations: Annotation[];
  formValues: Record<string, string | boolean>;

  // history
  past: Snapshot[];
  future: Snapshot[];

  // view / interaction
  tool: Tool;
  scale: number;
  currentPage: number;
  selectedId: string | null;

  // ---- actions ----
  /** Stage a freshly chosen file (bytes kept for parsing + export). */
  setInput: (fileName: string, bytes: Uint8Array) => void;
  /** Fill in results once pdf.js has parsed the staged file. */
  setParsed: (parsed: {
    pages: PageInfo[];
    isScanned: boolean;
    formWidgets: FormWidget[];
  }) => void;
  reset: () => void;

  setTool: (tool: Tool) => void;
  setScale: (scale: number) => void;
  setCurrentPage: (page: number) => void;
  select: (id: string | null) => void;

  addAnnotation: (a: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;

  setFormValue: (name: string, value: string | boolean) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const initial = {
  fileName: null,
  originalBytes: null,
  pages: [] as PageInfo[],
  isScanned: false,
  formWidgets: [] as FormWidget[],
  annotations: [] as Annotation[],
  formValues: {} as Record<string, string | boolean>,
  past: [] as Snapshot[],
  future: [] as Snapshot[],
  tool: "edit-text" as Tool,
  scale: 1.2,
  currentPage: 0,
  selectedId: null as string | null,
};

export const useEditorStore = create<EditorState>((set, get) => {
  // Push current editable content onto the undo stack before a mutation.
  const snapshot = (): Snapshot => ({
    annotations: get().annotations.map((a) => ({ ...a })),
    formValues: { ...get().formValues },
  });
  const withHistory = (
    mutate: (s: EditorState) => Partial<EditorState>,
  ) => {
    const before = snapshot();
    set((s) => ({ ...mutate(s), past: [...s.past, before].slice(-100), future: [] }));
  };

  return {
    ...initial,

    setInput: (fileName, bytes) =>
      set({ ...initial, fileName, originalBytes: bytes }),

    setParsed: ({ pages, isScanned, formWidgets }) =>
      set({
        pages,
        isScanned,
        formWidgets,
        tool: isScanned ? "sign" : "edit-text",
        currentPage: 0,
      }),

    reset: () => set({ ...initial }),

    setTool: (tool) => set({ tool, selectedId: null }),
    setScale: (scale) => set({ scale: Math.min(4, Math.max(0.25, scale)) }),
    setCurrentPage: (currentPage) => set({ currentPage }),
    select: (selectedId) => set({ selectedId }),

    addAnnotation: (a) =>
      withHistory((s) => ({ annotations: [...s.annotations, a], selectedId: a.id })),

    updateAnnotation: (id, patch) =>
      withHistory((s) => ({
        annotations: s.annotations.map((a) =>
          a.id === id ? ({ ...a, ...patch } as Annotation) : a,
        ),
      })),

    removeAnnotation: (id) =>
      withHistory((s) => ({
        annotations: s.annotations.filter((a) => a.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      })),

    setFormValue: (name, value) =>
      withHistory((s) => ({ formValues: { ...s.formValues, [name]: value } })),

    undo: () => {
      const { past } = get();
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      set((s) => ({
        past: s.past.slice(0, -1),
        future: [{ annotations: s.annotations.map((a) => ({ ...a })), formValues: { ...s.formValues } }, ...s.future],
        annotations: prev.annotations,
        formValues: prev.formValues,
        selectedId: null,
      }));
    },

    redo: () => {
      const { future } = get();
      if (future.length === 0) return;
      const next = future[0];
      set((s) => ({
        future: s.future.slice(1),
        past: [...s.past, { annotations: s.annotations.map((a) => ({ ...a })), formValues: { ...s.formValues } }],
        annotations: next.annotations,
        formValues: next.formValues,
        selectedId: null,
      }));
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});
