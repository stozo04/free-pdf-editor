"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export interface SignatureResult {
  dataUrl: string;
  width: number;
  height: number;
}

type Tab = "draw" | "type" | "upload";

const TYPE_FONTS = [
  { label: "Signature", css: "'Segoe Script', 'Bradley Hand', 'Brush Script MT', cursive" },
  { label: "Classic", css: "'Brush Script MT', 'Snell Roundhand', cursive" },
  { label: "Casual", css: "'Comic Sans MS', 'Comic Sans', cursive" },
];
const INK_COLORS = ["#16235b", "#000000", "#0a3aa3"];

/** Crop a canvas to its non-transparent bounds; returns a PNG data URL + dims. */
function trimToInk(src: HTMLCanvasElement): SignatureResult | null {
  const ctx = src.getContext("2d");
  if (!ctx) return null;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);
  const w = maxX - minX;
  const h = maxY - minY;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(src, minX, minY, w, h, 0, 0, w, h);
  return { dataUrl: out.toDataURL("image/png"), width: w, height: h };
}

export function SignatureModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (r: SignatureResult) => void;
}) {
  const [tab, setTab] = useState<Tab>("draw");
  const [ink, setInk] = useState(INK_COLORS[0]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      data-testid="signature-modal"
    >
      <div className="w-full max-w-lg animate-pop-in rounded-xl2 bg-white p-5 shadow-float">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Add your signature</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-ink-muted hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
          {(["draw", "type", "upload"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`sig-tab-${t}`}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${
                tab === t ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-medium text-ink-muted">Ink:</span>
          {INK_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setInk(c)}
              aria-label={`Ink ${c}`}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full ring-2 ring-offset-1 ${ink === c ? "ring-brand-500" : "ring-transparent"}`}
            />
          ))}
        </div>

        {tab === "draw" && <DrawTab ink={ink} onCreate={onCreate} />}
        {tab === "type" && <TypeTab ink={ink} onCreate={onCreate} />}
        {tab === "upload" && <UploadTab onCreate={onCreate} />}
      </div>
    </div>
  );
}

function DrawTab({ ink, onCreate }: { ink: string; onCreate: (r: SignatureResult) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")!.scale(ratio, ratio);
    const pad = new SignaturePad(canvas, { penColor: ink, minWidth: 1.2, maxWidth: 2.8 });
    padRef.current = pad;
    return () => pad.off();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (padRef.current) padRef.current.penColor = ink;
  }, [ink]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-44 w-full cursor-crosshair touch-none rounded-lg border border-slate-200 bg-slate-50"
        data-testid="sig-canvas"
      />
      <div className="mt-3 flex justify-between">
        <button onClick={() => padRef.current?.clear()} className="text-sm font-medium text-ink-muted hover:text-ink">
          Clear
        </button>
        <ConfirmBtn
          testid="sig-confirm-draw"
          onClick={() => {
            const pad = padRef.current;
            if (!pad || pad.isEmpty()) return;
            const r = trimToInk(canvasRef.current!);
            if (r) onCreate(r);
          }}
        />
      </div>
    </div>
  );
}

function TypeTab({ ink, onCreate }: { ink: string; onCreate: (r: SignatureResult) => void }) {
  const [text, setText] = useState("");
  const [fontIdx, setFontIdx] = useState(0);

  const make = () => {
    if (!text.trim()) return;
    const fontCss = TYPE_FONTS[fontIdx].css;
    const fontPx = 72;
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = `${fontPx}px ${fontCss}`;
    const w = Math.ceil(measure.measureText(text).width) + 40;
    const h = Math.ceil(fontPx * 1.6);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = ink;
    ctx.font = `${fontPx}px ${fontCss}`;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 20, h / 2);
    const r = trimToInk(canvas);
    if (r) onCreate(r);
  };

  return (
    <div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your name"
        data-testid="sig-type-input"
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-lg"
        style={{ fontFamily: TYPE_FONTS[fontIdx].css }}
        autoFocus
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {TYPE_FONTS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setFontIdx(i)}
            style={{ fontFamily: f.css }}
            className={`rounded-md border px-3 py-1.5 text-base transition ${
              fontIdx === i ? "border-brand-300 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            {text.trim() || "Signature"}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <ConfirmBtn testid="sig-confirm-type" onClick={make} />
      </div>
    </div>
  );
}

function UploadTab({ onCreate }: { onCreate: (r: SignatureResult) => void }) {
  const [preview, setPreview] = useState<SignatureResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        setPreview({ dataUrl: canvas.toDataURL("image/png"), width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        data-testid="sig-upload-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-ink-muted hover:border-brand-300"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.dataUrl} alt="signature preview" className="max-h-36 max-w-full object-contain" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M5 11l7-7 7 7M4 20h16" />
            </svg>
            <span className="text-sm">Click to upload a PNG or JPG</span>
          </>
        )}
      </button>
      <div className="mt-3 flex justify-end">
        <ConfirmBtn testid="sig-confirm-upload" disabled={!preview} onClick={() => preview && onCreate(preview)} />
      </div>
    </div>
  );
}

function ConfirmBtn({ onClick, disabled, testid }: { onClick: () => void; disabled?: boolean; testid?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:opacity-40"
    >
      Add signature
    </button>
  );
}
