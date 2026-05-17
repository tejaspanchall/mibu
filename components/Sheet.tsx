"use client";
import { useEffect } from "react";

let lockCount = 0;
function lockBody() {
  lockCount += 1;
  if (lockCount === 1 && typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
    document.body.classList.add("sheet-open");
  }
}
function unlockBody() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && typeof document !== "undefined") {
    document.body.style.overflow = "";
    document.body.classList.remove("sheet-open");
  }
}

export function Sheet({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    lockBody();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBody();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6 fade-in">
      <button
        aria-label="close"
        tabIndex={-1}
        className="fixed inset-0 bg-ink/55 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-h-[92%] bg-paper rounded-t-3xl sheet-anim flex flex-col overflow-hidden shadow-frame lg:w-[460px] lg:rounded-4xl lg:max-h-[85vh]">
        <div className="flex items-center justify-center pt-2 lg:hidden">
          <div className="w-9 h-1 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 lg:pt-5 pb-2">
          <h2 className="text-[15px] font-semibold lowercase tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="close sheet"
            className="w-8 h-8 grid place-items-center rounded-full bg-chip text-muted hover:text-ink active:scale-90 transition duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}
