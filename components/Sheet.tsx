"use client";
import { useEffect } from "react";

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
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6 fade-in">
      <button
        aria-label="close"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-h-[92%] bg-paper rounded-t-3xl sheet-anim flex flex-col overflow-hidden lg:w-[460px] lg:rounded-3xl lg:shadow-frame lg:max-h-[85vh]">
        <div className="flex items-center justify-center pt-2.5 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 lg:pt-5 pb-2">
          <h2 className="text-base font-semibold lowercase">{title}</h2>
          <button
            onClick={onClose}
            className="text-sm text-muted px-2 py-1 -mr-2"
            aria-label="close sheet"
          >
            done
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
}
