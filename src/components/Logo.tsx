import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2 group" aria-label="FreePDF Editor home">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-card transition group-hover:bg-brand-700">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9.5 14.5l2 2 3.5-4" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[17px] font-bold tracking-tight text-ink">
          FreePDF<span className="text-brand-600"> Editor</span>
        </span>
      )}
    </Link>
  );
}
